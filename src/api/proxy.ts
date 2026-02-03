// =========================================================
// Manus <-> OpenAI API Proxy (完整移植自 workers.js)
// - /v1/models (GET)
// - /v1/chat/completions (POST) + stream (SSE)
// - /v1/responses (POST) + stream (SSE with event:)
// - 支持图片/文件：解析 OpenAI 输入 -> Manus presign 上传 -> attachments 注入
// =========================================================

import {
    selectRandomAvailableVendorKey,
    incrementVendorKeyUsage,
    validateCustomKey,
    incrementCustomKeyUsage,
} from "../db/queries";
import { logRequest } from "../db/logs";
import { extractBearerToken, errorResponse, jsonResponse, corsHeaders } from "../utils/helpers";
import { verifyWatermark } from "../utils/watermark";

// -------------------- Configuration Interface --------------------
interface ProxyConfig {
    modelName: string;
    manusHost: string;
    manusLocale: string;
    manusTz: string;
    manusTaskMode: string;
    manusCountryIso: string;
    wsTimeoutMs: number;
    wsResponseTimeoutMs: number;
}

// Default configuration (can be overridden by env)
const DEFAULT_CONFIG: ProxyConfig = {
    modelName: "vbdo-007",
    manusHost: "api.manus.im",
    manusLocale: "zh-CN",
    manusTz: "Asia/Hong_Kong",
    manusTaskMode: "discuss",
    manusCountryIso: "HK",
    wsTimeoutMs: 15000,
    wsResponseTimeoutMs: 25000,
};

const WATERMARK_FAIL_MESSAGE = "Hello, I am vb.do";

function getConfig(env?: Env): ProxyConfig {
    if (!env) return DEFAULT_CONFIG;
    return {
        modelName: env.MODEL_NAME || DEFAULT_CONFIG.modelName,
        manusHost: env.MANUS_HOST || DEFAULT_CONFIG.manusHost,
        manusLocale: env.MANUS_LOCALE || DEFAULT_CONFIG.manusLocale,
        manusTz: env.MANUS_TZ || DEFAULT_CONFIG.manusTz,
        manusTaskMode: env.MANUS_TASK_MODE || DEFAULT_CONFIG.manusTaskMode,
        manusCountryIso: env.MANUS_COUNTRY_ISO || DEFAULT_CONFIG.manusCountryIso,
        wsTimeoutMs: parseInt(env.WS_TIMEOUT_MS) || DEFAULT_CONFIG.wsTimeoutMs,
        wsResponseTimeoutMs: parseInt(env.WS_RESPONSE_TIMEOUT_MS) || DEFAULT_CONFIG.wsResponseTimeoutMs,
    };
}

function isWatermarkCheckEnabled(env?: Env): boolean {
    if (!env) return true;
    const raw = env.PROMPT_WATERMARK_ENABLED;
    if (raw == null || String(raw).trim() === "") return true;
    const normalized = String(raw).trim().toLowerCase();
    if (["0", "false", "off", "no"].includes(normalized)) return false;
    if (["1", "true", "on", "yes"].includes(normalized)) return true;
    return true;
}

const MANUS_CLIENT_TYPE = "web";
const MANUS_BRANCH = "";

// -------------------- Random IDs ------------------------
const _ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randId(length: number): string {
    let out = "";
    for (let i = 0; i < length; i++) {
        out += _ALNUM.charAt(Math.floor(Math.random() * _ALNUM.length));
    }
    return out;
}

function nowUnixS(): number {
    return Math.floor(Date.now() / 1000);
}

function nowMs(): number {
    return Date.now();
}

function cryptoRandomHex(bytesLen: number): string {
    const u8 = new Uint8Array(bytesLen);
    crypto.getRandomValues(u8);
    return [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function guessMimeFromFilename(filename: string): string {
    const lower = String(filename || "").toLowerCase();
    const ext = lower.includes(".") ? lower.split(".").pop() || "" : "";
    const map: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
        svg: "image/svg+xml",
        pdf: "application/pdf",
        txt: "text/plain",
        md: "text/markdown",
        json: "application/json",
        zip: "application/zip",
    };
    return map[ext] || "application/octet-stream";
}

// -------------------- Type Definitions -------------------
interface ContentPart {
    type?: string;
    text?: string;
    value?: string;
    image_url?: string | { url?: string };
    filename?: string;
    file_data?: string;
    file_url?: string;
    mime_type?: string;
}

interface Message {
    role?: string;
    content?: string | ContentPart[] | { text?: string };
}

interface ChatCompletionsBody {
    model?: string;
    messages?: Message[];
    stream?: boolean;
}

interface ResponsesBody {
    model?: string;
    instructions?: string;
    input?: string | (string | Message)[];
    stream?: boolean;
    max_output_tokens?: number;
    parallel_tool_calls?: boolean;
    previous_response_id?: string;
    store?: boolean;
    temperature?: number;
    tool_choice?: string;
    tools?: unknown[];
    top_p?: number;
    truncation?: string;
    metadata?: Record<string, unknown>;
}

interface AttachmentItem {
    kind: string;
    url?: string;
    data?: string;
    filename?: string;
    mime?: string;
}

interface ManusAttachment {
    filename: string;
    id: string;
    type: string;
    url: string;
    contentType: string;
}

interface ManusEvent {
    event?: {
        type?: string;
        delta?: { content?: string };
        agentStatus?: string;
        sender?: string;
        content?: string;
    };
}

// -------------------- Prompt Building -------------------
function extractTextFromContent(content: unknown): string {
    if (content == null) return "";
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        const parts: string[] = [];
        for (const p of content) {
            if (typeof p === "string") {
                parts.push(p);
                continue;
            }
            if (!p || typeof p !== "object") continue;
            const part = p as ContentPart;
            const t = part.type;
            if (t === "text" || t === "input_text" || t === "output_text") {
                parts.push(part.text || part.value || "");
            }
        }
        return parts.join("");
    }
    if (typeof content === "object") {
        const obj = content as { text?: string };
        if (typeof obj.text === "string") return obj.text;
    }
    return "";
}

function verifyWatermarkFromMessages(messages: Message[]): { ok: boolean; error?: string } {
    const systemTexts: string[] = [];
    let lastError = "Prompt watermark verification failed";

    for (const m of messages) {
        const role = String(m?.role || "").trim();
        if (role !== "system") continue;
        const text = extractTextFromContent(m?.content);
        if (!text) continue;
        systemTexts.push(text);
        const result = verifyWatermark(text);
        if (result.ok) {
            return { ok: true };
        }
        if (result.error) lastError = result.error;
    }

    if (systemTexts.length > 1) {
        const combined = systemTexts.join("\n");
        const result = verifyWatermark(combined);
        if (result.ok) return { ok: true };
        if (result.error) lastError = result.error;
    }

    if (systemTexts.length === 0) {
        return { ok: false, error: "No system prompt" };
    }

    return { ok: false, error: lastError };
}

function buildPromptFromChatMessages(messages: Message[] | undefined, attachmentNotes: string = ""): string {
    const sysMsgs: string[] = [];
    const lines: string[] = [];
    for (const m of messages || []) {
        const role = String(m?.role || "").trim();
        const text = extractTextFromContent(m?.content);
        if (role === "system") {
            if (text) sysMsgs.push(text);
        } else {
            if (!text) continue;
            if (role === "user") lines.push(`User: ${text}`);
            else if (role === "assistant") lines.push(`Assistant: ${text}`);
            else lines.push(`${role}: ${text}`);
        }
    }

    const parts: string[] = [];
    if (sysMsgs.length) parts.push("【System】\n" + sysMsgs.join("\n").trim());
    if (lines.length) parts.push(lines.join("\n").trim());
    if (attachmentNotes) parts.push(String(attachmentNotes).trim());

    const lastRole = messages?.length ? String(messages[messages.length - 1]?.role || "").trim() : "";
    if (lastRole && lastRole !== "user") parts.push("User: 请继续。");

    return parts.filter(Boolean).join("\n\n").trim();
}

// Extract system prompt and user prompt for logging
function extractPromptsForLogging(messages: Message[] | undefined): { systemPrompt: string | null; userPrompt: string | null } {
    if (!messages || messages.length === 0) {
        return { systemPrompt: null, userPrompt: null };
    }

    const systemMsgs: string[] = [];
    let lastUserPrompt: string | null = null;
    let hasFile = false;

    for (const m of messages) {
        const role = String(m?.role || "").trim();
        const content = m?.content;

        // Check if content has files/images
        if (Array.isArray(content)) {
            for (const p of content) {
                if (p && typeof p === "object") {
                    const part = p as ContentPart;
                    if (part.type === "image_url" || part.type === "input_image" || part.type === "input_file") {
                        hasFile = true;
                    }
                }
            }
        }

        const text = extractTextFromContent(content);

        if (role === "system" && text) {
            systemMsgs.push(text);
        } else if (role === "user") {
            // Only keep the last user message
            lastUserPrompt = text || null;
        }
    }

    // Append [文件] indicator if there are files
    if (hasFile && lastUserPrompt) {
        lastUserPrompt = lastUserPrompt + " [文件]";
    } else if (hasFile && !lastUserPrompt) {
        lastUserPrompt = "[文件]";
    }

    return {
        systemPrompt: systemMsgs.length > 0 ? systemMsgs.join("\n") : null,
        userPrompt: lastUserPrompt,
    };
}

// Extract prompts from Responses API request for logging
function extractPromptsFromResponsesForLogging(body: ResponsesBody): { systemPrompt: string | null; userPrompt: string | null } {
    const instructions = body?.instructions;
    const input = body?.input;

    let systemPrompt: string | null = null;
    let userPrompt: string | null = null;
    let hasFile = false;

    if (typeof instructions === "string" && instructions.trim()) {
        systemPrompt = instructions.trim();
    }

    if (typeof input === "string") {
        userPrompt = input.trim() || null;
    } else if (Array.isArray(input)) {
        // Find last user message
        for (let i = input.length - 1; i >= 0; i--) {
            const item = input[i];
            if (typeof item === "string") {
                userPrompt = item.trim() || null;
                break;
            }
            if (item && typeof item === "object") {
                const msg = item as Message;
                const role = String(msg.role || "user").trim();
                if (role === "user") {
                    // Check for files
                    if (Array.isArray(msg.content)) {
                        for (const p of msg.content) {
                            if (p && typeof p === "object") {
                                const part = p as ContentPart;
                                if (part.type === "image_url" || part.type === "input_image" || part.type === "input_file") {
                                    hasFile = true;
                                }
                            }
                        }
                    }
                    userPrompt = extractTextFromContent(msg.content) || null;
                    break;
                }
            }
        }
    }

    // Append [文件] indicator if there are files
    if (hasFile && userPrompt) {
        userPrompt = userPrompt + " [文件]";
    } else if (hasFile && !userPrompt) {
        userPrompt = "[文件]";
    }

    return { systemPrompt, userPrompt };
}

function buildPromptFromResponsesRequest(body: ResponsesBody, attachmentNotes: string = ""): string {
    const instructions = body?.instructions;
    const input = body?.input;

    const parts: string[] = [];
    if (typeof instructions === "string" && instructions.trim()) {
        parts.push("【System】\n" + instructions.trim());
    }

    const lines: string[] = [];
    if (typeof input === "string") {
        if (input.trim()) lines.push(`User: ${input.trim()}`);
    } else if (Array.isArray(input)) {
        for (const item of input) {
            if (typeof item === "string") {
                if (item.trim()) lines.push(`User: ${item.trim()}`);
                continue;
            }
            if (!item || typeof item !== "object") continue;
            const msg = item as Message;
            const role = String(msg.role || "user").trim();
            const text = extractTextFromContent(msg.content);
            if (!text) continue;
            if (role === "user") lines.push(`User: ${text}`);
            else if (role === "assistant") lines.push(`Assistant: ${text}`);
            else lines.push(`${role}: ${text}`);
        }
    }

    if (lines.length) parts.push(lines.join("\n"));
    if (attachmentNotes) parts.push(String(attachmentNotes).trim());

    return parts.filter(Boolean).join("\n\n").trim();
}

// -------------------- Attachments Parsing ----------------
function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } {
    if (!String(dataUrl).startsWith("data:")) throw new Error("not data url");
    const [header, b64] = String(dataUrl).split(",", 2);
    const mime = header.slice(5).split(";")[0] || "application/octet-stream";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime, bytes };
}

function extractAttachmentsFromChat(messages: Message[] | undefined): AttachmentItem[] {
    let lastUser: Message | null = null;
    for (let i = (messages?.length || 0) - 1; i >= 0; i--) {
        if (String(messages![i]?.role || "").trim() === "user") {
            lastUser = messages![i];
            break;
        }
    }
    if (!lastUser) return [];

    const content = lastUser.content;
    if (!Array.isArray(content)) return [];

    const items: AttachmentItem[] = [];
    for (const p of content) {
        if (!p || typeof p !== "object") continue;
        const part = p as ContentPart;
        const t = part.type;

        if (t === "image_url") {
            const iu = part.image_url;
            const url = typeof iu === "string" ? iu : (iu && typeof iu === "object" ? iu.url : null);
            if (typeof url === "string" && url) {
                items.push({ kind: "image", url, filename: part.filename });
            }
            continue;
        }

        if (t === "input_image") {
            const url = part.image_url;
            if (typeof url === "string" && url) {
                items.push({ kind: "image", url, filename: part.filename });
            }
            continue;
        }

        if (t === "input_file") {
            const filename = part.filename || "file";
            const fileData = part.file_data;
            const fileUrl = part.file_url;
            const mime = part.mime_type || guessMimeFromFilename(filename);
            if (typeof fileUrl === "string" && fileUrl) {
                items.push({ kind: "file", url: fileUrl, filename, mime });
            } else if (typeof fileData === "string" && fileData) {
                items.push({ kind: "file", data: fileData, filename, mime });
            }
            continue;
        }
    }

    return items;
}

function extractAttachmentsFromResponses(body: ResponsesBody): AttachmentItem[] {
    const inp = body?.input;
    if (!Array.isArray(inp)) return [];
    let lastUser: Message | null = null;
    for (let i = inp.length - 1; i >= 0; i--) {
        const it = inp[i];
        if (it && typeof it === "object" && String((it as Message).role || "user") === "user") {
            lastUser = it as Message;
            break;
        }
    }
    if (!lastUser || !Array.isArray(lastUser.content)) return [];
    return extractAttachmentsFromChat([{ role: "user", content: lastUser.content as ContentPart[] }]);
}

// -------------------- Manus Upload ----------------------
function manusHeaders(token: string, clientId: string, config: ProxyConfig): Record<string, string> {
    return {
        accept: "*/*",
        "content-type": "application/json",
        origin: "https://manus.im",
        referer: "https://manus.im/",
        "user-agent": "Mozilla/5.0",
        "x-client-type": MANUS_CLIENT_TYPE,
        "x-client-locale": config.manusLocale,
        "x-client-timezone": config.manusTz,
        "x-client-timezone-offset": "-480",
        "x-client-id": clientId,
        authorization: `Bearer ${token}`,
    };
}

async function manusUploadBytes(
    token: string,
    filename: string,
    contentType: string,
    bytes: Uint8Array,
    config: ProxyConfig
): Promise<{ fileId: string; fileUrl: string }> {
    const clientId = randId(22);
    const headers = manusHeaders(token, clientId, config);

    const MANUS_BASE_API = `https://${config.manusHost}`;
    const MANUS_UPLOAD_PRESIGN = `${MANUS_BASE_API}/api/chat/getPresignedUploadUrl`;
    const MANUS_UPLOAD_COMPLETE = `${MANUS_BASE_API}/api/chat/uploadComplete`;

    const tempId = `temp-${randId(22)}`;
    const payload = {
        filename,
        fileType: contentType,
        fileSize: bytes.byteLength,
        id: tempId,
    };

    const r1 = await fetch(MANUS_UPLOAD_PRESIGN, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
    });
    if (!r1.ok) {
        const t = await r1.text().catch(() => "");
        throw new Error(`getPresignedUploadUrl failed: ${r1.status} ${t}`);
    }
    const j1 = (await r1.json()) as { data?: { uploadUrl?: string; id?: string } };
    if (!j1?.data?.uploadUrl || !j1?.data?.id) {
        throw new Error(`getPresignedUploadUrl bad response: ${JSON.stringify(j1)}`);
    }

    const uploadUrl = j1.data.uploadUrl;
    const fileId = j1.data.id;

    const r2 = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            Accept: "*/*",
            "Content-Type": contentType,
            Origin: "https://manus.im",
            Referer: "https://manus.im/",
        },
        body: bytes,
    });
    if (!r2.ok) {
        const t = await r2.text().catch(() => "");
        throw new Error(`S3 PUT failed: ${r2.status} ${t}`);
    }

    const payload2 = { filename, fileSize: bytes.byteLength, id: fileId };
    const r3 = await fetch(MANUS_UPLOAD_COMPLETE, {
        method: "POST",
        headers,
        body: JSON.stringify(payload2),
        cache: "no-store",
    });
    if (!r3.ok) {
        const t = await r3.text().catch(() => "");
        throw new Error(`uploadComplete failed: ${r3.status} ${t}`);
    }
    const j3 = (await r3.json()) as { data?: { fileUrl?: string } };
    if (!j3?.data?.fileUrl) {
        throw new Error(`uploadComplete bad response: ${JSON.stringify(j3)}`);
    }

    return { fileId, fileUrl: j3.data.fileUrl };
}

async function materializeOpenAIAttachment(token: string, item: AttachmentItem, config: ProxyConfig): Promise<ManusAttachment> {
    const kind = item.kind || "image";
    const filename = item.filename || (kind === "image" ? "image.png" : "file.bin");
    let mime = item.mime || guessMimeFromFilename(filename);

    let bytes: Uint8Array;

    if (typeof item.url === "string" && item.url) {
        const url = item.url;
        if (url.startsWith("data:")) {
            const parsed = parseDataUrl(url);
            mime = parsed.mime || mime;
            bytes = parsed.bytes;
        } else {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`Failed to download attachment url: ${r.status}`);
            const ct = r.headers.get("Content-Type");
            if (ct) mime = ct.split(";")[0].trim() || mime;
            const ab = await r.arrayBuffer();
            bytes = new Uint8Array(ab);
        }
    } else if (typeof item.data === "string" && item.data) {
        const dataStr = item.data;
        if (dataStr.startsWith("data:")) {
            const parsed = parseDataUrl(dataStr);
            mime = parsed.mime || mime;
            bytes = parsed.bytes;
        } else {
            const bin = atob(dataStr);
            const u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            bytes = u8;
        }
    } else {
        throw new Error("Unsupported attachment format");
    }

    const up = await manusUploadBytes(token, filename, mime, bytes, config);

    return {
        filename,
        id: up.fileId,
        type: mime.startsWith("image/") ? "image" : "file",
        url: up.fileUrl,
        contentType: mime,
    };
}

// -------------------- Manus WebSocket with Reconnect -------------------
function createManusWebSocket(token: string, config: ProxyConfig): WebSocket {
    const url =
        `wss://${config.manusHost}/socket.io/?token=${encodeURIComponent(token)}` +
        `&locale=${encodeURIComponent(config.manusLocale)}` +
        `&tz=${encodeURIComponent(config.manusTz)}` +
        `&clientType=${encodeURIComponent(MANUS_CLIENT_TYPE)}` +
        `&branch=${encodeURIComponent(MANUS_BRANCH)}` +
        `&EIO=4&transport=websocket`;
    return new WebSocket(url);
}

function sendMessage(ws: WebSocket, content: string, attachments: ManusAttachment[], config: ProxyConfig): void {
    const payload = [
        "message",
        {
            id: randId(22),
            timestamp: nowMs(),
            messageStatus: "pending",
            type: "user_message",
            sessionId: randId(22),
            content,
            contents: [],
            messageType: "text",
            taskMode: config.manusTaskMode,
            attachments: attachments || [],
            extData: { capabilities: { enabledConnectors: [] }, mode: "standard" },
            countryIsoCode: config.manusCountryIso,
        },
    ];
    ws.send(`42${JSON.stringify(payload)}`);
}

// WebSocket with retry logic
async function withWebSocketRetry<T>(
    token: string,
    config: ProxyConfig,
    operation: (ws: WebSocket) => Promise<T>,
    maxRetries: number = 3
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const ws = createManusWebSocket(token, config);
            return await operation(ws);
        } catch (e) {
            lastError = e as Error;
            const isRetryable = lastError.message.includes("WebSocket") ||
                               lastError.message.includes("timed out") ||
                               lastError.message.includes("closed unexpectedly");

            if (!isRetryable || attempt === maxRetries - 1) {
                throw lastError;
            }

            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }

    throw lastError || new Error("WebSocket operation failed");
}

// Chat Completions streaming (OpenAI chunk)
function streamManusToOpenAI(
    token: string,
    content: string,
    attachments: ManusAttachment[],
    writer: WritableStreamDefaultWriter<Uint8Array>,
    encoder: TextEncoder,
    chatId: string,
    config: ProxyConfig
): Promise<void> {
    const ws = createManusWebSocket(token, config);

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("WebSocket connection timed out")), config.wsTimeoutMs);

        const cleanup = () => {
            clearTimeout(timeout);
            ws.removeEventListener("message", messageHandler);
            ws.removeEventListener("close", closeHandler);
            ws.removeEventListener("error", errorHandler);
        };

        const safeWrite = (str: string) => {
            try {
                writer.write(encoder.encode(str));
            } catch (_) {}
        };

        const messageHandler = (event: MessageEvent) => {
            const packet = event.data as string;

            if (packet === "2") {
                ws.send("3");
                return;
            }

            if (packet.startsWith("0")) {
                ws.send("40");
                return;
            }

            if (packet.startsWith("40")) {
                clearTimeout(timeout);
                sendMessage(ws, content, attachments, config);
                return;
            }

            if (packet.startsWith("42")) {
                const payload = (JSON.parse(packet.substring(2)) as unknown[])?.[1] as ManusEvent | undefined;
                if (!payload?.event) return;
                const { type, delta, agentStatus } = payload.event;

                if (type === "chatDelta" && delta && typeof delta.content !== "undefined") {
                    const chunk = {
                        id: chatId,
                        object: "chat.completion.chunk",
                        created: nowUnixS(),
                        model: config.modelName,
                        choices: [{ index: 0, delta: { content: delta.content }, finish_reason: null }],
                    };
                    safeWrite(`data: ${JSON.stringify(chunk)}\n\n`);
                }

                if (type === "statusUpdate" && agentStatus === "stopped") {
                    const finalChunk = {
                        id: chatId,
                        object: "chat.completion.chunk",
                        created: nowUnixS(),
                        model: config.modelName,
                        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                    };
                    safeWrite(`data: ${JSON.stringify(finalChunk)}\n\n`);
                    safeWrite("data: [DONE]\n\n");
                    ws.close(1000, "Stream complete");
                    cleanup();
                    resolve();
                }
            }
        };

        const closeHandler = () => {
            cleanup();
            resolve();
        };

        const errorHandler = () => {
            cleanup();
            reject(new Error("WebSocket connection error"));
        };

        ws.addEventListener("message", messageHandler);
        ws.addEventListener("close", closeHandler);
        ws.addEventListener("error", errorHandler);
    });
}

// Responses streaming (OpenAI responses SSE with event:)
interface RespInfo {
    seq: number;
    acc: string;
    msgId: string;
    makeResponseObj: (status: string, text: string | null) => unknown;
}

function streamManusToResponses(
    token: string,
    content: string,
    attachments: ManusAttachment[],
    writer: WritableStreamDefaultWriter<Uint8Array>,
    encoder: TextEncoder,
    respInfo: RespInfo,
    config: ProxyConfig
): Promise<void> {
    const ws = createManusWebSocket(token, config);

    const sseEvent = (eventName: string, dataObj: unknown): string => {
        return `event: ${eventName}\n` + `data: ${JSON.stringify(dataObj)}\n\n`;
    };

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("WebSocket connection timed out")), config.wsTimeoutMs);

        const cleanup = () => {
            clearTimeout(timeout);
            ws.removeEventListener("message", messageHandler);
            ws.removeEventListener("close", closeHandler);
            ws.removeEventListener("error", errorHandler);
        };

        const safeWrite = (str: string) => {
            try {
                writer.write(encoder.encode(str));
            } catch (_) {}
        };

        const messageHandler = (event: MessageEvent) => {
            const packet = event.data as string;

            if (packet === "2") {
                ws.send("3");
                return;
            }
            if (packet.startsWith("0")) {
                ws.send("40");
                return;
            }
            if (packet.startsWith("40")) {
                clearTimeout(timeout);
                sendMessage(ws, content, attachments, config);
                return;
            }

            if (packet.startsWith("42")) {
                const payload = (JSON.parse(packet.substring(2)) as unknown[])?.[1] as ManusEvent | undefined;
                if (!payload?.event) return;
                const { type, delta, agentStatus } = payload.event;

                if (type === "chatDelta" && delta && typeof delta.content !== "undefined") {
                    respInfo.acc += String(delta.content || "");
                    const obj = {
                        type: "response.output_text.delta",
                        item_id: respInfo.msgId,
                        output_index: 0,
                        content_index: 0,
                        delta: String(delta.content || ""),
                        sequence_number: respInfo.seq++,
                    };
                    safeWrite(sseEvent("response.output_text.delta", obj));
                }

                if (type === "statusUpdate" && agentStatus === "stopped") {
                    const doneObj = {
                        type: "response.output_text.done",
                        item_id: respInfo.msgId,
                        output_index: 0,
                        content_index: 0,
                        text: respInfo.acc,
                        sequence_number: respInfo.seq++,
                    };
                    safeWrite(sseEvent("response.output_text.done", doneObj));

                    const completedObj = {
                        type: "response.completed",
                        response: respInfo.makeResponseObj("completed", respInfo.acc),
                        sequence_number: respInfo.seq++,
                    };
                    safeWrite(sseEvent("response.completed", completedObj));

                    ws.close(1000, "Stream complete");
                    cleanup();
                    resolve();
                }
            }
        };

        const closeHandler = () => {
            cleanup();
            resolve();
        };

        const errorHandler = () => {
            cleanup();
            reject(new Error("WebSocket connection error"));
        };

        ws.addEventListener("message", messageHandler);
        ws.addEventListener("close", closeHandler);
        ws.addEventListener("error", errorHandler);
    });
}

// Non-stream: collect all deltas then return (with retry)
async function getFullManusResponse(
    token: string,
    content: string,
    attachments: ManusAttachment[],
    config: ProxyConfig
): Promise<{ finalAssistantMessage: ManusEvent | undefined; assembledContent: string; fullEventStream: ManusEvent[] }> {
    return withWebSocketRetry(token, config, (ws) => {
        return new Promise((resolve, reject) => {
            let isDone = false;
            const allEvents: ManusEvent[] = [];
            const timeout = setTimeout(() => {
                if (!isDone) {
                    isDone = true;
                    try {
                        ws.close();
                    } catch (_) {}
                    reject(new Error("Operation timed out"));
                }
            }, config.wsResponseTimeoutMs);

            const cleanup = () => {
                clearTimeout(timeout);
                ws.removeEventListener("message", messageHandler);
                ws.removeEventListener("close", closeHandler);
                ws.removeEventListener("error", errorHandler);
            };

            const closeHandler = (evt: CloseEvent) => {
                if (!isDone) {
                    isDone = true;
                    cleanup();
                    reject(new Error(`WebSocket closed unexpectedly: ${evt.code}`));
                }
            };

            const errorHandler = () => {
                if (!isDone) {
                    isDone = true;
                    cleanup();
                    reject(new Error("WebSocket error"));
                }
            };

            const messageHandler = (event: MessageEvent) => {
                const packet = event.data as string;

                if (packet === "2") {
                    ws.send("3");
                    return;
                }
                if (packet.startsWith("0")) {
                    ws.send("40");
                    return;
                }
                if (packet.startsWith("40")) {
                    sendMessage(ws, content, attachments, config);
                    return;
                }
                if (packet.startsWith("42")) {
                    const payload = (JSON.parse(packet.substring(2)) as unknown[])?.[1] as ManusEvent | undefined;
                    if (payload && payload.event) {
                        allEvents.push(payload);
                        if (payload.event.type === "statusUpdate" && payload.event.agentStatus === "stopped") {
                            isDone = true;
                            cleanup();
                            ws.close(1000, "Task complete");

                            const finalAssistantMessage = allEvents.find(
                                (e) => e?.event?.type === "chat" && e?.event?.sender === "assistant"
                            );
                            const assembledContent = allEvents
                                .filter((e) => e?.event?.type === "chatDelta" && e?.event?.delta?.content)
                                .map((e) => e.event!.delta!.content)
                                .join("");

                            resolve({ finalAssistantMessage, assembledContent, fullEventStream: allEvents });
                        }
                    }
                }
            };

            ws.addEventListener("message", messageHandler);
            ws.addEventListener("error", errorHandler);
            ws.addEventListener("close", closeHandler);
        });
    });
}

// -------------------- Handlers --------------------------
export function handleModels(env?: Env): Response {
    const config = getConfig(env);
    return jsonResponse({
        object: "list",
        data: [
            {
                id: config.modelName,
                object: "model",
                created: 0,
                owned_by: "proxy",
            },
        ],
    });
}

export async function handleChatCompletions(request: Request, db: D1Database, env?: Env): Promise<Response> {
    const startTime = Date.now();
    const config = getConfig(env);
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null;
    const userAgent = request.headers.get("User-Agent") || null;

    // Extract and validate custom API key
    const customApiKey = extractBearerToken(request);
    if (!customApiKey) {
        await logRequest(db, {
            endpoint: "/v1/chat/completions",
            method: "POST",
            statusCode: 401,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: "Missing Authorization header",
        });
        return errorResponse("Missing Authorization header", 401);
    }

    const validation = await validateCustomKey(db, customApiKey);
    if (!validation.valid || !validation.key) {
        await logRequest(db, {
            endpoint: "/v1/chat/completions",
            method: "POST",
            statusCode: 401,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: validation.error || "Invalid API key",
        });
        return errorResponse(validation.error || "Invalid API key", 401);
    }

    const body = (await request.json().catch(() => null)) as ChatCompletionsBody | null;
    if (!body) {
        await logRequest(db, {
            customKeyId: validation.key.id,
            endpoint: "/v1/chat/completions",
            method: "POST",
            statusCode: 400,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: "Invalid JSON body",
        });
        return errorResponse("Invalid JSON body.", 400);
    }

    const model = body.model || config.modelName;
    if (model !== config.modelName) {
        await logRequest(db, {
            customKeyId: validation.key.id,
            endpoint: "/v1/chat/completions",
            method: "POST",
            statusCode: 400,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: `Model not supported: ${model}`,
        });
        return errorResponse(`Model not supported. This endpoint only supports '${config.modelName}'.`, 400);
    }

    const messages = body.messages || [];
    if (!Array.isArray(messages) || messages.length === 0) {
        await logRequest(db, {
            customKeyId: validation.key.id,
            endpoint: "/v1/chat/completions",
            method: "POST",
            statusCode: 400,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: "Messages array is required",
        });
        return errorResponse("The 'messages' array is required.", 400);
    }

    const stream = !!body.stream;

    // Extract prompts for logging
    const { systemPrompt, userPrompt } = extractPromptsForLogging(messages);

    if (isWatermarkCheckEnabled(env)) {
        const watermarkResult = verifyWatermarkFromMessages(messages);
        if (!watermarkResult.ok) {
            await incrementCustomKeyUsage(db, validation.key.id);
            await logRequest(db, {
                customKeyId: validation.key.id,
                endpoint: "/v1/chat/completions",
                method: "POST",
                statusCode: 200,
                responseTimeMs: Date.now() - startTime,
                ip,
                userAgent,
                error: watermarkResult.error || "Prompt watermark verification failed",
                systemPrompt,
                userPrompt,
            });

            if (!stream) {
                const chatId = `chatcmpl-${randId(29)}`;
                const openAIResponse = {
                    id: chatId,
                    object: "chat.completion",
                    created: nowUnixS(),
                    model: config.modelName,
                    choices: [
                        {
                            index: 0,
                            message: { role: "assistant", content: WATERMARK_FAIL_MESSAGE },
                            finish_reason: "stop",
                        },
                    ],
                    usage: null,
                };
                return jsonResponse(openAIResponse);
            }

            const { readable, writable } = new TransformStream<Uint8Array>();
            const writer = writable.getWriter();
            const encoder = new TextEncoder();
            const chatId = `chatcmpl-${randId(29)}`;
            const firstChunk = {
                id: chatId,
                object: "chat.completion.chunk",
                created: nowUnixS(),
                model: config.modelName,
                choices: [
                    {
                        index: 0,
                        delta: { role: "assistant", content: WATERMARK_FAIL_MESSAGE },
                        finish_reason: null,
                    },
                ],
            };
            const finalChunk = {
                id: chatId,
                object: "chat.completion.chunk",
                created: nowUnixS(),
                model: config.modelName,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            };
            writer.write(encoder.encode(`data: ${JSON.stringify(firstChunk)}\n\n`));
            writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
            writer.write(encoder.encode("data: [DONE]\n\n"));
            writer.close();

            return new Response(readable, {
                headers: {
                    ...corsHeaders(),
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        }
    }

    // Select the least used available vendor key
    const vendorKey = await selectRandomAvailableVendorKey(db);
    if (!vendorKey) {
        await logRequest(db, {
            customKeyId: validation.key.id,
            endpoint: "/v1/chat/completions",
            method: "POST",
            statusCode: 503,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: "No available vendor keys",
            systemPrompt,
            userPrompt,
        });
        return errorResponse("No available vendor keys", 503);
    }

    const token = vendorKey.api_key;

    // 1) Attachment parsing + upload
    const rawItems = extractAttachmentsFromChat(messages);
    const attachments: ManusAttachment[] = [];
    for (const it of rawItems) {
        attachments.push(await materializeOpenAIAttachment(token, it, config));
    }

    // 2) prompt + attachment notes
    let notes = "";
    if (attachments.length) {
        notes =
            "【Attachments】\n" +
            attachments.map((a) => `- ${a.filename} (${a.contentType})`).join("\n");
    }
    const prompt = buildPromptFromChatMessages(messages, notes);

    // Increment usage counters
    await Promise.all([
        incrementVendorKeyUsage(db, vendorKey.id),
        incrementCustomKeyUsage(db, validation.key.id),
    ]);

    // Capture key IDs for use in async closures
    const customKeyId = validation.key.id;

    // 3) Return response
    try {
        if (!stream) {
            const manusResult = await getFullManusResponse(token, prompt, attachments, config);
            const responseContent =
                manusResult.assembledContent || manusResult.finalAssistantMessage?.event?.content || "";

            const chatId = `chatcmpl-${randId(29)}`;
            const openAIResponse = {
                id: chatId,
                object: "chat.completion",
                created: nowUnixS(),
                model: config.modelName,
                choices: [
                    {
                        index: 0,
                        message: { role: "assistant", content: responseContent },
                        finish_reason: "stop",
                    },
                ],
                usage: null,
            };

            await logRequest(db, {
                customKeyId,
                vendorKeyId: vendorKey.id,
                endpoint: "/v1/chat/completions",
                method: "POST",
                statusCode: 200,
                responseTimeMs: Date.now() - startTime,
                ip,
                userAgent,
                systemPrompt,
                userPrompt,
            });

            return jsonResponse(openAIResponse);
        }

        // stream = true
        const { readable, writable } = new TransformStream<Uint8Array>();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const chatId = `chatcmpl-${randId(29)}`;

        (async () => {
            try {
                await streamManusToOpenAI(token, prompt, attachments, writer, encoder, chatId, config);
                await logRequest(db, {
                    customKeyId,
                    vendorKeyId: vendorKey.id,
                    endpoint: "/v1/chat/completions",
                    method: "POST",
                    statusCode: 200,
                    responseTimeMs: Date.now() - startTime,
                    ip,
                    userAgent,
                    systemPrompt,
                    userPrompt,
                });
            } catch (e) {
                const err = e as Error;
                const errJson = JSON.stringify({ error: { message: err.message, type: "internal_server_error" } });
                try {
                    writer.write(encoder.encode(`data: ${errJson}\n\n`));
                    writer.write(encoder.encode("data: [DONE]\n\n"));
                } catch (_) {}
                await logRequest(db, {
                    customKeyId,
                    vendorKeyId: vendorKey.id,
                    endpoint: "/v1/chat/completions",
                    method: "POST",
                    statusCode: 500,
                    responseTimeMs: Date.now() - startTime,
                    ip,
                    userAgent,
                    error: err.message,
                    systemPrompt,
                    userPrompt,
                });
            } finally {
                try {
                    await writer.close();
                } catch (_) {}
            }
        })();

        return new Response(readable, {
            headers: {
                ...corsHeaders(),
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (e) {
        const err = e as Error;
        await logRequest(db, {
            customKeyId,
            vendorKeyId: vendorKey.id,
            endpoint: "/v1/chat/completions",
            method: "POST",
            statusCode: 500,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: err.message,
            systemPrompt,
            userPrompt,
        });
        return errorResponse(`Request failed: ${err.message}`, 500);
    }
}

export async function handleResponses(request: Request, db: D1Database, env?: Env): Promise<Response> {
    const startTime = Date.now();
    const config = getConfig(env);
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null;
    const userAgent = request.headers.get("User-Agent") || null;

    // Extract and validate custom API key
    const customApiKey = extractBearerToken(request);
    if (!customApiKey) {
        await logRequest(db, {
            endpoint: "/v1/responses",
            method: "POST",
            statusCode: 401,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: "Missing Authorization header",
        });
        return errorResponse("Missing Authorization header", 401);
    }

    const validation = await validateCustomKey(db, customApiKey);
    if (!validation.valid || !validation.key) {
        await logRequest(db, {
            endpoint: "/v1/responses",
            method: "POST",
            statusCode: 401,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: validation.error || "Invalid API key",
        });
        return errorResponse(validation.error || "Invalid API key", 401);
    }

    const body = (await request.json().catch(() => null)) as ResponsesBody | null;
    if (!body) {
        await logRequest(db, {
            customKeyId: validation.key.id,
            endpoint: "/v1/responses",
            method: "POST",
            statusCode: 400,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: "Invalid JSON body",
        });
        return errorResponse("Invalid JSON body.", 400);
    }

    const model = body.model || config.modelName;
    if (model !== config.modelName) {
        await logRequest(db, {
            customKeyId: validation.key.id,
            endpoint: "/v1/responses",
            method: "POST",
            statusCode: 400,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: `Model not supported: ${model}`,
        });
        return errorResponse(`Model not supported. This endpoint only supports '${config.modelName}'.`, 400);
    }

    const stream = !!body.stream;

    // 3) Build response object (used for normal and watermark fallback)
    const respId = `resp_${cryptoRandomHex(16)}`;
    const msgId = `msg_${cryptoRandomHex(16)}`;
    const createdAt = nowUnixS();

    // Cache body properties for closure
    const bodyInstructions = body.instructions ?? null;
    const bodyMaxOutputTokens = body.max_output_tokens ?? null;
    const bodyParallelToolCalls = body.parallel_tool_calls ?? true;
    const bodyPreviousResponseId = body.previous_response_id ?? null;
    const bodyStore = body.store ?? false;
    const bodyTemperature = body.temperature ?? 1;
    const bodyToolChoice = body.tool_choice ?? "auto";
    const bodyTools = body.tools ?? [];
    const bodyTopP = body.top_p ?? 1;
    const bodyTruncation = body.truncation ?? "disabled";
    const bodyMetadata = body.metadata ?? {};

    function makeResponseObj(status: string, text: string | null): unknown {
        const output: unknown[] = [];
        if (text != null) {
            output.push({
                type: "message",
                id: msgId,
                status: status === "completed" ? "completed" : status,
                role: "assistant",
                content: [{ type: "output_text", text, annotations: [] }],
            });
        }
        return {
            id: respId,
            object: "response",
            created_at: createdAt,
            status,
            error: null,
            incomplete_details: null,
            instructions: bodyInstructions,
            max_output_tokens: bodyMaxOutputTokens,
            model,
            output,
            parallel_tool_calls: bodyParallelToolCalls,
            previous_response_id: bodyPreviousResponseId,
            reasoning: { effort: null, summary: null },
            store: bodyStore,
            temperature: bodyTemperature,
            text: { format: { type: "text" } },
            tool_choice: bodyToolChoice,
            tools: bodyTools,
            top_p: bodyTopP,
            truncation: bodyTruncation,
            usage: null,
            user: null,
            metadata: bodyMetadata,
        };
    }

    // Extract prompts for logging
    const { systemPrompt, userPrompt } = extractPromptsFromResponsesForLogging(body);

    if (isWatermarkCheckEnabled(env)) {
        const instructions = typeof body.instructions === "string" ? body.instructions : "";
        const watermarkResult = instructions ? verifyWatermark(instructions) : { ok: false, error: "No system prompt" };
        if (!watermarkResult.ok) {
            await incrementCustomKeyUsage(db, validation.key.id);
            await logRequest(db, {
                customKeyId: validation.key.id,
                endpoint: "/v1/responses",
                method: "POST",
                statusCode: 200,
                responseTimeMs: Date.now() - startTime,
                ip,
                userAgent,
                error: watermarkResult.error || "Prompt watermark verification failed",
                systemPrompt,
                userPrompt,
            });

            if (!stream) {
                return jsonResponse(makeResponseObj("completed", WATERMARK_FAIL_MESSAGE));
            }

            const { readable, writable } = new TransformStream<Uint8Array>();
            const writer = writable.getWriter();
            const encoder = new TextEncoder();

            const sseEvent = (eventName: string, dataObj: unknown): string => {
                return `event: ${eventName}\n` + `data: ${JSON.stringify(dataObj)}\n\n`;
            };

            let seq = 1;
            const createdEvent = sseEvent("response.created", {
                type: "response.created",
                response: makeResponseObj("in_progress", null),
                sequence_number: seq++,
            });
            const deltaEvent = sseEvent("response.output_text.delta", {
                type: "response.output_text.delta",
                item_id: msgId,
                output_index: 0,
                content_index: 0,
                delta: WATERMARK_FAIL_MESSAGE,
                sequence_number: seq++,
            });
            const doneEvent = sseEvent("response.output_text.done", {
                type: "response.output_text.done",
                item_id: msgId,
                output_index: 0,
                content_index: 0,
                text: WATERMARK_FAIL_MESSAGE,
                sequence_number: seq++,
            });
            const completedEvent = sseEvent("response.completed", {
                type: "response.completed",
                response: makeResponseObj("completed", WATERMARK_FAIL_MESSAGE),
                sequence_number: seq++,
            });

            writer.write(encoder.encode(createdEvent));
            writer.write(encoder.encode(deltaEvent));
            writer.write(encoder.encode(doneEvent));
            writer.write(encoder.encode(completedEvent));
            writer.close();

            return new Response(readable, {
                headers: {
                    ...corsHeaders(),
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        }
    }

    // Select the least used available vendor key
    const vendorKey = await selectRandomAvailableVendorKey(db);
    if (!vendorKey) {
        await logRequest(db, {
            customKeyId: validation.key.id,
            endpoint: "/v1/responses",
            method: "POST",
            statusCode: 503,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: "No available vendor keys",
            systemPrompt,
            userPrompt,
        });
        return errorResponse("No available vendor keys", 503);
    }

    const token = vendorKey.api_key;

    // 1) Attachment parsing + upload
    const rawItems = extractAttachmentsFromResponses(body);
    const attachments: ManusAttachment[] = [];
    for (const it of rawItems) {
        attachments.push(await materializeOpenAIAttachment(token, it, config));
    }

    // 2) prompt + attachment notes
    let notes = "";
    if (attachments.length) {
        notes =
            "【Attachments】\n" +
            attachments.map((a) => `- ${a.filename} (${a.contentType})`).join("\n");
    }
    const prompt = buildPromptFromResponsesRequest(body, notes);

    // Increment usage counters
    await Promise.all([
        incrementVendorKeyUsage(db, vendorKey.id),
        incrementCustomKeyUsage(db, validation.key.id),
    ]);

    // Capture key IDs for use in async closures
    const customKeyId = validation.key.id;

    try {
        if (!stream) {
            const manusResult = await getFullManusResponse(token, prompt, attachments, config);
            const text = manusResult.assembledContent || manusResult.finalAssistantMessage?.event?.content || "";

            await logRequest(db, {
                customKeyId,
                vendorKeyId: vendorKey.id,
                endpoint: "/v1/responses",
                method: "POST",
                statusCode: 200,
                responseTimeMs: Date.now() - startTime,
                ip,
                userAgent,
                systemPrompt,
                userPrompt,
            });

            return jsonResponse(makeResponseObj("completed", text));
        }

        // stream = true
        const { readable, writable } = new TransformStream<Uint8Array>();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        const respInfo: RespInfo = {
            seq: 1,
            acc: "",
            msgId,
            makeResponseObj,
        };

        // Write response.created first
        const createdEvent =
            `event: response.created\n` +
            `data: ${JSON.stringify({
                type: "response.created",
                response: makeResponseObj("in_progress", null),
                sequence_number: respInfo.seq++,
            })}\n\n`;

        writer.write(encoder.encode(createdEvent));

        (async () => {
            try {
                await streamManusToResponses(token, prompt, attachments, writer, encoder, respInfo, config);
                await logRequest(db, {
                    customKeyId,
                    vendorKeyId: vendorKey.id,
                    endpoint: "/v1/responses",
                    method: "POST",
                    statusCode: 200,
                    responseTimeMs: Date.now() - startTime,
                    ip,
                    userAgent,
                    systemPrompt,
                    userPrompt,
                });
            } catch (e) {
                const err = e as Error;
                const errEvent =
                    `event: response.error\n` +
                    `data: ${JSON.stringify({
                        type: "response.error",
                        error: { message: err.message, type: "internal_server_error" },
                        sequence_number: respInfo.seq++,
                    })}\n\n`;
                try {
                    writer.write(encoder.encode(errEvent));
                } catch (_) {}
                await logRequest(db, {
                    customKeyId,
                    vendorKeyId: vendorKey.id,
                    endpoint: "/v1/responses",
                    method: "POST",
                    statusCode: 500,
                    responseTimeMs: Date.now() - startTime,
                    ip,
                    userAgent,
                    error: err.message,
                    systemPrompt,
                    userPrompt,
                });
            } finally {
                try {
                    await writer.close();
                } catch (_) {}
            }
        })();

        return new Response(readable, {
            headers: {
                ...corsHeaders(),
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (e) {
        const err = e as Error;
        await logRequest(db, {
            customKeyId: validation.key.id,
            vendorKeyId: vendorKey.id,
            endpoint: "/v1/responses",
            method: "POST",
            statusCode: 500,
            responseTimeMs: Date.now() - startTime,
            ip,
            userAgent,
            error: err.message,
            systemPrompt,
            userPrompt,
        });
        return errorResponse(`Request failed: ${err.message}`, 500);
    }
}

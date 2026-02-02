// API Proxy Logic for Manus API

import {
    selectRandomAvailableVendorKey,
    incrementVendorKeyUsage,
    validateCustomKey,
    incrementCustomKeyUsage,
} from "../db/queries";
import { extractBearerToken, errorResponse, jsonResponse } from "../utils/helpers";

const MANUS_API_BASE = "https://api.manus.ai";

// Available models
const AVAILABLE_MODELS = [
    {
        id: "manus-1",
        object: "model",
        created: 1699000000,
        owned_by: "manus",
    },
    {
        id: "manus-2",
        object: "model",
        created: 1699000000,
        owned_by: "manus",
    },
];

export async function handleModels(): Promise<Response> {
    return jsonResponse({
        object: "list",
        data: AVAILABLE_MODELS,
    });
}

export async function handleChatCompletions(
    request: Request,
    db: D1Database
): Promise<Response> {
    return handleProxyRequest(request, db, "/v1/chat/completions");
}

export async function handleResponses(
    request: Request,
    db: D1Database
): Promise<Response> {
    return handleProxyRequest(request, db, "/v1/responses");
}

async function handleProxyRequest(
    request: Request,
    db: D1Database,
    endpoint: string
): Promise<Response> {
    // Extract and validate custom API key
    const customApiKey = extractBearerToken(request);
    if (!customApiKey) {
        return errorResponse("Missing Authorization header", 401);
    }

    const validation = await validateCustomKey(db, customApiKey);
    if (!validation.valid || !validation.key) {
        return errorResponse(validation.error || "Invalid API key", 401);
    }

    // Select a random available vendor key
    const vendorKey = await selectRandomAvailableVendorKey(db);
    if (!vendorKey) {
        return errorResponse("No available vendor keys", 503);
    }

    try {
        // Clone the request body
        const body = await request.text();

        // Check if this is a streaming request
        let isStreaming = false;
        try {
            const parsedBody = JSON.parse(body);
            isStreaming = parsedBody.stream === true;
        } catch {
            // Not JSON or no stream field, continue with non-streaming
        }

        // Forward the request to Manus API
        const proxyResponse = await fetch(`${MANUS_API_BASE}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${vendorKey.api_key}`,
            },
            body,
        });

        // If the request was successful, increment usage counters
        if (proxyResponse.ok) {
            // Increment both counters in parallel
            await Promise.all([
                incrementVendorKeyUsage(db, vendorKey.id),
                incrementCustomKeyUsage(db, validation.key.id),
            ]);
        }

        // Handle streaming responses
        if (isStreaming && proxyResponse.ok) {
            return new Response(proxyResponse.body, {
                status: proxyResponse.status,
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }

        // Handle non-streaming responses
        const responseData = await proxyResponse.text();
        return new Response(responseData, {
            status: proxyResponse.status,
            headers: {
                "Content-Type": proxyResponse.headers.get("Content-Type") || "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("Proxy error:", error);
        return errorResponse("Internal server error", 500);
    }
}

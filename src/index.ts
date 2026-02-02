// Main entry point - Route dispatcher

import { handleModels, handleChatCompletions, handleResponses } from "./api/proxy";
import {
    handleGetVendorKeys,
    handleCreateVendorKey,
    handleUpdateVendorKey,
    handleDeleteVendorKey,
    handleGetCustomKeys,
    handleCreateCustomKey,
    handleUpdateCustomKey,
    handleDeleteCustomKey,
} from "./api/keys";
import { renderAdminUI, renderLoginPage } from "./admin/ui";
import { handleCors, errorResponse, corsHeaders } from "./utils/helpers";

// Session token storage (in-memory, will reset on worker restart)
const validSessions = new Set<string>();

function generateSessionToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 64; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function getSessionFromCookie(request: Request): string | null {
    const cookie = request.headers.get("Cookie");
    if (!cookie) return null;
    const match = cookie.match(/session=([^;]+)/);
    return match ? match[1] : null;
}

function isValidSession(request: Request): boolean {
    const session = getSessionFromCookie(request);
    return session !== null && validSessions.has(session);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Handle CORS preflight
        const corsResponse = handleCors(request);
        if (corsResponse) return corsResponse;

        // API Proxy Routes (require custom API key authentication)
        if (path === "/v1/models" && method === "GET") {
            return handleModels();
        }

        if (path === "/v1/chat/completions" && method === "POST") {
            return handleChatCompletions(request, env.DB);
        }

        if (path === "/v1/responses" && method === "POST") {
            return handleResponses(request, env.DB);
        }

        // Admin Login Routes
        if (path === "/admin/login" && method === "GET") {
            return new Response(renderLoginPage(), {
                headers: { "Content-Type": "text/html" },
            });
        }

        if (path === "/admin/login" && method === "POST") {
            const formData = await request.formData();
            const password = formData.get("password");

            if (password === env.ADMIN_PASSWORD) {
                const sessionToken = generateSessionToken();
                validSessions.add(sessionToken);

                return new Response(null, {
                    status: 302,
                    headers: {
                        "Location": "/admin",
                        "Set-Cookie": `session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
                    },
                });
            }

            return new Response(renderLoginPage("Invalid password"), {
                status: 401,
                headers: { "Content-Type": "text/html" },
            });
        }

        if (path === "/admin/logout") {
            const session = getSessionFromCookie(request);
            if (session) {
                validSessions.delete(session);
            }
            return new Response(null, {
                status: 302,
                headers: {
                    "Location": "/admin/login",
                    "Set-Cookie": "session=; Path=/; HttpOnly; Max-Age=0",
                },
            });
        }

        // Admin UI Route (requires session authentication)
        if (path === "/admin" || path === "/admin/") {
            if (!isValidSession(request)) {
                return new Response(null, {
                    status: 302,
                    headers: { "Location": "/admin/login" },
                });
            }
            return new Response(renderAdminUI(), {
                headers: { "Content-Type": "text/html" },
            });
        }

        // Admin API Routes (require session authentication)
        if (path.startsWith("/admin/api/")) {
            if (!isValidSession(request)) {
                return errorResponse("Unauthorized", 401);
            }

            // Vendor Keys API
            if (path === "/admin/api/vendor-keys") {
                if (method === "GET") {
                    return handleGetVendorKeys(env.DB);
                }
                if (method === "POST") {
                    return handleCreateVendorKey(request, env.DB);
                }
            }

            const vendorKeyMatch = path.match(/^\/admin\/api\/vendor-keys\/(\d+)$/);
            if (vendorKeyMatch) {
                const id = parseInt(vendorKeyMatch[1]);
                if (method === "PUT") {
                    return handleUpdateVendorKey(request, env.DB, id);
                }
                if (method === "DELETE") {
                    return handleDeleteVendorKey(env.DB, id);
                }
            }

            // Custom Keys API
            if (path === "/admin/api/custom-keys") {
                if (method === "GET") {
                    return handleGetCustomKeys(env.DB);
                }
                if (method === "POST") {
                    return handleCreateCustomKey(request, env.DB);
                }
            }

            const customKeyMatch = path.match(/^\/admin\/api\/custom-keys\/(\d+)$/);
            if (customKeyMatch) {
                const id = parseInt(customKeyMatch[1]);
                if (method === "PUT") {
                    return handleUpdateCustomKey(request, env.DB, id);
                }
                if (method === "DELETE") {
                    return handleDeleteCustomKey(env.DB, id);
                }
            }
        }

        // Root redirect to admin
        if (path === "/" || path === "") {
            return new Response(null, {
                status: 302,
                headers: { "Location": "/admin" },
            });
        }

        // 404 for unknown routes
        return errorResponse("Not found", 404);
    },
} satisfies ExportedHandler<Env>;

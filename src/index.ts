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
import { handleCors, errorResponse, corsHeaders, jsonResponse } from "./utils/helpers";
import { createSession, validateSession, deleteSession, cleanExpiredSessions } from "./db/sessions";
import { getRequestStats, getRecentLogs, getKeyRanking, getIPRanking } from "./db/logs";
import { checkRateLimit, incrementRateLimit, cleanOldRateLimits } from "./db/ratelimit";

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

async function isValidSession(request: Request, db: D1Database): Promise<boolean> {
    const session = getSessionFromCookie(request);
    if (!session) return false;
    return validateSession(db, session);
}

function getClientIP(request: Request): string {
    return request.headers.get("CF-Connecting-IP") ||
           request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
           "unknown";
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Handle CORS preflight
        const corsResponse = handleCors(request);
        if (corsResponse) return corsResponse;

        // Health check endpoint
        if (path === "/health" && method === "GET") {
            return jsonResponse({
                status: "healthy",
                timestamp: new Date().toISOString(),
            });
        }

        // API Proxy Routes (require custom API key authentication + rate limiting)
        if (path === "/v1/models" && method === "GET") {
            return handleModels(env);
        }

        if (path === "/v1/chat/completions" && method === "POST") {
            // Rate limiting
            const ip = getClientIP(request);
            const limit = parseInt(env.RATE_LIMIT_REQUESTS) || 60;
            const windowSeconds = parseInt(env.RATE_LIMIT_WINDOW_SECONDS) || 60;

            const rateLimitResult = await checkRateLimit(env.DB, ip, "ip", limit, windowSeconds);
            if (!rateLimitResult.allowed) {
                return new Response(JSON.stringify({
                    error: "Rate limit exceeded",
                    retry_after: rateLimitResult.resetAt,
                }), {
                    status: 429,
                    headers: {
                        ...corsHeaders(),
                        "Content-Type": "application/json",
                        "X-RateLimit-Limit": String(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": rateLimitResult.resetAt,
                    },
                });
            }

            await incrementRateLimit(env.DB, ip, "ip", windowSeconds);

            const response = await handleChatCompletions(request, env.DB, env);

            // Add rate limit headers to response
            const newHeaders = new Headers(response.headers);
            newHeaders.set("X-RateLimit-Limit", String(limit));
            newHeaders.set("X-RateLimit-Remaining", String(rateLimitResult.remaining - 1));
            newHeaders.set("X-RateLimit-Reset", rateLimitResult.resetAt);

            return new Response(response.body, {
                status: response.status,
                headers: newHeaders,
            });
        }

        if (path === "/v1/responses" && method === "POST") {
            // Rate limiting
            const ip = getClientIP(request);
            const limit = parseInt(env.RATE_LIMIT_REQUESTS) || 60;
            const windowSeconds = parseInt(env.RATE_LIMIT_WINDOW_SECONDS) || 60;

            const rateLimitResult = await checkRateLimit(env.DB, ip, "ip", limit, windowSeconds);
            if (!rateLimitResult.allowed) {
                return new Response(JSON.stringify({
                    error: "Rate limit exceeded",
                    retry_after: rateLimitResult.resetAt,
                }), {
                    status: 429,
                    headers: {
                        ...corsHeaders(),
                        "Content-Type": "application/json",
                        "X-RateLimit-Limit": String(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": rateLimitResult.resetAt,
                    },
                });
            }

            await incrementRateLimit(env.DB, ip, "ip", windowSeconds);

            const response = await handleResponses(request, env.DB, env);

            // Add rate limit headers to response
            const newHeaders = new Headers(response.headers);
            newHeaders.set("X-RateLimit-Limit", String(limit));
            newHeaders.set("X-RateLimit-Remaining", String(rateLimitResult.remaining - 1));
            newHeaders.set("X-RateLimit-Reset", rateLimitResult.resetAt);

            return new Response(response.body, {
                status: response.status,
                headers: newHeaders,
            });
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
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

                await createSession(env.DB, sessionToken, expiresAt);

                // Clean up expired sessions periodically
                await cleanExpiredSessions(env.DB);

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
                await deleteSession(env.DB, session);
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
            if (!(await isValidSession(request, env.DB))) {
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
            if (!(await isValidSession(request, env.DB))) {
                return errorResponse("Unauthorized", 401);
            }

            // Stats API
            if (path === "/admin/api/stats" && method === "GET") {
                const [todayStats, weekStats, monthStats, recentLogs] = await Promise.all([
                    getRequestStats(env.DB, "today"),
                    getRequestStats(env.DB, "week"),
                    getRequestStats(env.DB, "month"),
                    getRecentLogs(env.DB, 100),
                ]);

                return jsonResponse({
                    today: todayStats,
                    week: weekStats,
                    month: monthStats,
                    recentLogs,
                });
            }

            // Ranking API
            if (path === "/admin/api/ranking" && method === "GET") {
                const period = (url.searchParams.get("period") as "today" | "week" | "month") || "today";
                const [keyRanking, ipRanking] = await Promise.all([
                    getKeyRanking(env.DB, period, 100),
                    getIPRanking(env.DB, period, 100),
                ]);

                return jsonResponse({
                    period,
                    keyRanking,
                    ipRanking,
                });
            }

            // Cleanup API (for maintenance)
            if (path === "/admin/api/cleanup" && method === "POST") {
                const [expiredSessions, oldRateLimits] = await Promise.all([
                    cleanExpiredSessions(env.DB),
                    cleanOldRateLimits(env.DB),
                ]);

                return jsonResponse({
                    cleaned: {
                        expiredSessions,
                        oldRateLimits,
                    },
                });
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

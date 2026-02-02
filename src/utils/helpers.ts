// Utility helper functions

export function jsonResponse(data: unknown, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
    });
}

export function errorResponse(message: string, status: number = 400): Response {
    return jsonResponse({ error: message }, status);
}

export function extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.substring(7);
}

export function corsHeaders(): HeadersInit {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}

export function handleCors(request: Request): Response | null {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(),
        });
    }
    return null;
}

export function generateApiKey(prefix: string = "sk"): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < 48; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${key}`;
}

// JWT parsing utilities
export interface JwtPayload {
    exp?: number;
    iat?: number;
    [key: string]: unknown;
}

export function parseJwt(token: string): JwtPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        // Decode base64url payload
        const payload = parts[1];
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = atob(base64);
        return JSON.parse(jsonStr);
    } catch {
        return null;
    }
}

export function getJwtExpiration(token: string): Date | null {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return null;
    return new Date(payload.exp * 1000);
}

export function isJwtExpired(token: string): boolean {
    const exp = getJwtExpiration(token);
    if (!exp) return false; // If no expiration, assume not expired
    return exp.getTime() < Date.now();
}

export function formatExpirationDate(date: Date | null): string {
    if (!date) return "Unknown";
    return date.toISOString().split("T")[0];
}

export function getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
}

// Rate limiting functions

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: string;
}

function getWindowStart(windowSeconds: number): string {
    const now = new Date();
    const windowMs = windowSeconds * 1000;
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
    return windowStart.toISOString();
}

export async function checkRateLimit(
    db: D1Database,
    identifier: string,
    identifierType: "ip" | "api_key",
    limit: number,
    windowSeconds: number
): Promise<RateLimitResult> {
    const windowStart = getWindowStart(windowSeconds);

    const record = await db.prepare(`
        SELECT request_count FROM rate_limits
        WHERE identifier = ? AND identifier_type = ? AND window_start = ?
    `).bind(identifier, identifierType, windowStart).first<{ request_count: number }>();

    const currentCount = record?.request_count || 0;
    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount);

    // Calculate reset time
    const windowStartDate = new Date(windowStart);
    const resetAt = new Date(windowStartDate.getTime() + windowSeconds * 1000).toISOString();

    return { allowed, remaining, resetAt };
}

export async function incrementRateLimit(
    db: D1Database,
    identifier: string,
    identifierType: "ip" | "api_key",
    windowSeconds: number
): Promise<void> {
    const windowStart = getWindowStart(windowSeconds);

    await db.prepare(`
        INSERT INTO rate_limits (identifier, identifier_type, window_start, request_count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(identifier, identifier_type, window_start)
        DO UPDATE SET request_count = request_count + 1
    `).bind(identifier, identifierType, windowStart).run();
}

export async function cleanOldRateLimits(db: D1Database, maxAgeSeconds: number = 3600): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeSeconds * 1000).toISOString();

    const result = await db.prepare(`
        DELETE FROM rate_limits WHERE window_start < ?
    `).bind(cutoff).run();

    return result.meta.changes;
}

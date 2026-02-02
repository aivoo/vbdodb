// Request logging functions

export interface RequestLog {
    id: number;
    custom_key_id: number | null;
    vendor_key_id: number | null;
    endpoint: string;
    method: string;
    status_code: number | null;
    response_time_ms: number | null;
    ip_address: string | null;
    user_agent: string | null;
    error_message: string | null;
    created_at: string;
}

export interface LogRequestParams {
    customKeyId?: number | null;
    vendorKeyId?: number | null;
    endpoint: string;
    method: string;
    statusCode?: number | null;
    responseTimeMs?: number | null;
    ip?: string | null;
    userAgent?: string | null;
    error?: string | null;
}

export async function logRequest(db: D1Database, params: LogRequestParams): Promise<void> {
    await db.prepare(`
        INSERT INTO request_logs (
            custom_key_id, vendor_key_id, endpoint, method,
            status_code, response_time_ms, ip_address, user_agent, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        params.customKeyId ?? null,
        params.vendorKeyId ?? null,
        params.endpoint,
        params.method,
        params.statusCode ?? null,
        params.responseTimeMs ?? null,
        params.ip ?? null,
        params.userAgent ?? null,
        params.error ?? null
    ).run();
}

export interface RequestStats {
    period: string;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    avg_response_time_ms: number | null;
}

export async function getRequestStats(
    db: D1Database,
    period: "today" | "week" | "month"
): Promise<RequestStats> {
    let dateFilter: string;
    switch (period) {
        case "today":
            dateFilter = "date(created_at) = date('now')";
            break;
        case "week":
            dateFilter = "created_at >= datetime('now', '-7 days')";
            break;
        case "month":
            dateFilter = "created_at >= datetime('now', '-30 days')";
            break;
    }

    const result = await db.prepare(`
        SELECT
            COUNT(*) as total_requests,
            SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) as successful_requests,
            SUM(CASE WHEN status_code >= 400 OR error_message IS NOT NULL THEN 1 ELSE 0 END) as failed_requests,
            AVG(response_time_ms) as avg_response_time_ms
        FROM request_logs
        WHERE ${dateFilter}
    `).first<{
        total_requests: number;
        successful_requests: number;
        failed_requests: number;
        avg_response_time_ms: number | null;
    }>();

    return {
        period,
        total_requests: result?.total_requests || 0,
        successful_requests: result?.successful_requests || 0,
        failed_requests: result?.failed_requests || 0,
        avg_response_time_ms: result?.avg_response_time_ms || null,
    };
}

export async function getRecentLogs(db: D1Database, limit: number = 50): Promise<RequestLog[]> {
    const { results } = await db.prepare(`
        SELECT * FROM request_logs
        ORDER BY created_at DESC
        LIMIT ?
    `).bind(limit).all<RequestLog>();

    return results || [];
}

export async function getRequestStatsByKey(
    db: D1Database,
    customKeyId: number,
    period: "today" | "week" | "month"
): Promise<RequestStats> {
    let dateFilter: string;
    switch (period) {
        case "today":
            dateFilter = "date(created_at) = date('now')";
            break;
        case "week":
            dateFilter = "created_at >= datetime('now', '-7 days')";
            break;
        case "month":
            dateFilter = "created_at >= datetime('now', '-30 days')";
            break;
    }

    const result = await db.prepare(`
        SELECT
            COUNT(*) as total_requests,
            SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) as successful_requests,
            SUM(CASE WHEN status_code >= 400 OR error_message IS NOT NULL THEN 1 ELSE 0 END) as failed_requests,
            AVG(response_time_ms) as avg_response_time_ms
        FROM request_logs
        WHERE custom_key_id = ? AND ${dateFilter}
    `).bind(customKeyId).first<{
        total_requests: number;
        successful_requests: number;
        failed_requests: number;
        avg_response_time_ms: number | null;
    }>();

    return {
        period,
        total_requests: result?.total_requests || 0,
        successful_requests: result?.successful_requests || 0,
        failed_requests: result?.failed_requests || 0,
        avg_response_time_ms: result?.avg_response_time_ms || null,
    };
}

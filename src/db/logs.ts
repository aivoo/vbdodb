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
    system_prompt: string | null;
    user_prompt: string | null;
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
    systemPrompt?: string | null;
    userPrompt?: string | null;
}

export async function logRequest(db: D1Database, params: LogRequestParams): Promise<void> {
    await db.prepare(`
        INSERT INTO request_logs (
            custom_key_id, vendor_key_id, endpoint, method,
            status_code, response_time_ms, ip_address, user_agent, error_message,
            system_prompt, user_prompt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        params.customKeyId ?? null,
        params.vendorKeyId ?? null,
        params.endpoint,
        params.method,
        params.statusCode ?? null,
        params.responseTimeMs ?? null,
        params.ip ?? null,
        params.userAgent ?? null,
        params.error ?? null,
        params.systemPrompt ?? null,
        params.userPrompt ?? null
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

// Ranking interfaces and functions
export interface KeyRanking {
    key_id: number;
    key_name: string;
    request_count: number;
    successful_count: number;
    failed_count: number;
    avg_response_time_ms: number | null;
}

export interface IPRanking {
    ip_address: string;
    request_count: number;
    successful_count: number;
    failed_count: number;
}

// Get request ranking by custom keys
export async function getKeyRanking(
    db: D1Database,
    period: "today" | "week" | "month",
    limit: number = 20
): Promise<KeyRanking[]> {
    let dateFilter: string;
    switch (period) {
        case "today":
            dateFilter = "date(rl.created_at) = date('now')";
            break;
        case "week":
            dateFilter = "rl.created_at >= datetime('now', '-7 days')";
            break;
        case "month":
            dateFilter = "rl.created_at >= datetime('now', '-30 days')";
            break;
    }

    const { results } = await db.prepare(`
        SELECT
            ck.id as key_id,
            ck.key_name,
            COUNT(*) as request_count,
            SUM(CASE WHEN rl.status_code >= 200 AND rl.status_code < 400 THEN 1 ELSE 0 END) as successful_count,
            SUM(CASE WHEN rl.status_code >= 400 OR rl.error_message IS NOT NULL THEN 1 ELSE 0 END) as failed_count,
            AVG(rl.response_time_ms) as avg_response_time_ms
        FROM request_logs rl
        LEFT JOIN custom_keys ck ON rl.custom_key_id = ck.id
        WHERE rl.custom_key_id IS NOT NULL AND ${dateFilter}
        GROUP BY rl.custom_key_id
        ORDER BY request_count DESC
        LIMIT ?
    `).bind(limit).all<KeyRanking>();

    return results || [];
}

// Get request ranking by IP address
export async function getIPRanking(
    db: D1Database,
    period: "today" | "week" | "month",
    limit: number = 20
): Promise<IPRanking[]> {
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

    const { results } = await db.prepare(`
        SELECT
            ip_address,
            COUNT(*) as request_count,
            SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) as successful_count,
            SUM(CASE WHEN status_code >= 400 OR error_message IS NOT NULL THEN 1 ELSE 0 END) as failed_count
        FROM request_logs
        WHERE ip_address IS NOT NULL AND ${dateFilter}
        GROUP BY ip_address
        ORDER BY request_count DESC
        LIMIT ?
    `).bind(limit).all<IPRanking>();

    return results || [];
}

// Session persistence functions

export interface Session {
    id: number;
    token: string;
    created_at: string;
    expires_at: string;
}

export async function createSession(
    db: D1Database,
    token: string,
    expiresAt: Date
): Promise<Session | null> {
    await db.prepare(
        "INSERT INTO sessions (token, expires_at) VALUES (?, ?)"
    ).bind(token, expiresAt.toISOString()).run();

    return db.prepare(
        "SELECT * FROM sessions WHERE token = ?"
    ).bind(token).first<Session>();
}

export async function validateSession(db: D1Database, token: string): Promise<boolean> {
    const session = await db.prepare(
        "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    ).bind(token).first<Session>();

    return session !== null;
}

export async function deleteSession(db: D1Database, token: string): Promise<boolean> {
    const result = await db.prepare(
        "DELETE FROM sessions WHERE token = ?"
    ).bind(token).run();

    return result.meta.changes > 0;
}

export async function cleanExpiredSessions(db: D1Database): Promise<number> {
    const result = await db.prepare(
        "DELETE FROM sessions WHERE expires_at <= datetime('now')"
    ).run();

    return result.meta.changes;
}

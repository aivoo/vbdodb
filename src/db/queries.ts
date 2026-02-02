// Database query helpers for key management

import { getTodayDate, getJwtExpiration, isJwtExpired } from "../utils/helpers";

export interface VendorKey {
    id: number;
    vendor_name: string;
    api_key: string;
    usage_limit: number;
    used_count: number;
    is_active: number;
    last_reset_date: string | null;
    created_at: string;
    updated_at: string;
}

export interface VendorKeyWithExpiration extends VendorKey {
    expires_at: string | null;
    is_expired: boolean;
}

export interface CustomKey {
    id: number;
    key_name: string;
    api_key: string;
    usage_limit: number;
    used_count: number;
    is_active: number;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CustomKeyWithExpiration extends CustomKey {
    is_expired: boolean;
}

// Vendor Keys Queries
export async function getVendorKeys(db: D1Database): Promise<VendorKeyWithExpiration[]> {
    const { results } = await db.prepare(
        "SELECT * FROM vendor_keys ORDER BY created_at DESC"
    ).all<VendorKey>();

    // Add expiration info from JWT
    return (results || []).map(key => {
        const expiresAt = getJwtExpiration(key.api_key);
        return {
            ...key,
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            is_expired: isJwtExpired(key.api_key),
        };
    });
}

export async function getVendorKeyById(db: D1Database, id: number): Promise<VendorKey | null> {
    const result = await db.prepare(
        "SELECT * FROM vendor_keys WHERE id = ?"
    ).bind(id).first<VendorKey>();
    return result || null;
}

export async function createVendorKey(
    db: D1Database,
    vendorName: string,
    apiKey: string,
    usageLimit: number = 500
): Promise<VendorKey | null> {
    await db.prepare(
        "INSERT INTO vendor_keys (vendor_name, api_key, usage_limit) VALUES (?, ?, ?)"
    ).bind(vendorName, apiKey, usageLimit).run();

    return db.prepare(
        "SELECT * FROM vendor_keys WHERE api_key = ?"
    ).bind(apiKey).first<VendorKey>();
}

export async function updateVendorKey(
    db: D1Database,
    id: number,
    updates: Partial<Pick<VendorKey, "vendor_name" | "api_key" | "usage_limit" | "is_active">>
): Promise<VendorKey | null> {
    const setClauses: string[] = [];
    const values: (string | number)[] = [];

    if (updates.vendor_name !== undefined) {
        setClauses.push("vendor_name = ?");
        values.push(updates.vendor_name);
    }
    if (updates.api_key !== undefined) {
        setClauses.push("api_key = ?");
        values.push(updates.api_key);
    }
    if (updates.usage_limit !== undefined) {
        setClauses.push("usage_limit = ?");
        values.push(updates.usage_limit);
    }
    if (updates.is_active !== undefined) {
        setClauses.push("is_active = ?");
        values.push(updates.is_active);
    }

    if (setClauses.length === 0) return getVendorKeyById(db, id);

    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await db.prepare(
        `UPDATE vendor_keys SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...values).run();

    return getVendorKeyById(db, id);
}

export async function deleteVendorKey(db: D1Database, id: number): Promise<boolean> {
    const result = await db.prepare(
        "DELETE FROM vendor_keys WHERE id = ?"
    ).bind(id).run();
    return result.meta.changes > 0;
}

export async function selectRandomAvailableVendorKey(db: D1Database): Promise<VendorKey | null> {
    const today = getTodayDate();

    // First, reset usage count for keys that haven't been reset today
    await db.prepare(`
        UPDATE vendor_keys
        SET used_count = 0, last_reset_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE last_reset_date IS NULL OR last_reset_date < ?
    `).bind(today, today).run();

    // Then select the least used available key (not expired, not exhausted)
    const { results } = await db.prepare(`
        SELECT * FROM vendor_keys
        WHERE is_active = 1
        AND used_count < usage_limit
        ORDER BY used_count ASC, RANDOM()
    `).all<VendorKey>();

    // Filter out expired JWT keys
    const validKeys = (results || []).filter(key => !isJwtExpired(key.api_key));

    return validKeys.length > 0 ? validKeys[0] : null;
}

// Alias for backwards compatibility - now selects least used key
export const selectLeastUsedAvailableVendorKey = selectRandomAvailableVendorKey;

export async function incrementVendorKeyUsage(db: D1Database, id: number): Promise<void> {
    await db.prepare(
        "UPDATE vendor_keys SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(id).run();
}

// Custom Keys Queries
export async function getCustomKeys(db: D1Database): Promise<CustomKeyWithExpiration[]> {
    const { results } = await db.prepare(
        "SELECT * FROM custom_keys ORDER BY created_at DESC"
    ).all<CustomKey>();

    // Add expiration check
    return (results || []).map(key => {
        const isExpired = key.expires_at ? new Date(key.expires_at).getTime() < Date.now() : false;
        return {
            ...key,
            is_expired: isExpired,
        };
    });
}

export async function getCustomKeyById(db: D1Database, id: number): Promise<CustomKey | null> {
    const result = await db.prepare(
        "SELECT * FROM custom_keys WHERE id = ?"
    ).bind(id).first<CustomKey>();
    return result || null;
}

export async function getCustomKeyByApiKey(db: D1Database, apiKey: string): Promise<CustomKey | null> {
    const result = await db.prepare(
        "SELECT * FROM custom_keys WHERE api_key = ?"
    ).bind(apiKey).first<CustomKey>();
    return result || null;
}

export async function createCustomKey(
    db: D1Database,
    keyName: string,
    apiKey: string,
    usageLimit: number = -1,
    expiresAt: string | null = null
): Promise<CustomKey | null> {
    await db.prepare(
        "INSERT INTO custom_keys (key_name, api_key, usage_limit, expires_at) VALUES (?, ?, ?, ?)"
    ).bind(keyName, apiKey, usageLimit, expiresAt).run();

    return db.prepare(
        "SELECT * FROM custom_keys WHERE api_key = ?"
    ).bind(apiKey).first<CustomKey>();
}

export async function updateCustomKey(
    db: D1Database,
    id: number,
    updates: Partial<Pick<CustomKey, "key_name" | "api_key" | "usage_limit" | "is_active" | "expires_at">>
): Promise<CustomKey | null> {
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.key_name !== undefined) {
        setClauses.push("key_name = ?");
        values.push(updates.key_name);
    }
    if (updates.api_key !== undefined) {
        setClauses.push("api_key = ?");
        values.push(updates.api_key);
    }
    if (updates.usage_limit !== undefined) {
        setClauses.push("usage_limit = ?");
        values.push(updates.usage_limit);
    }
    if (updates.is_active !== undefined) {
        setClauses.push("is_active = ?");
        values.push(updates.is_active);
    }
    if (updates.expires_at !== undefined) {
        setClauses.push("expires_at = ?");
        values.push(updates.expires_at);
    }

    if (setClauses.length === 0) return getCustomKeyById(db, id);

    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await db.prepare(
        `UPDATE custom_keys SET ${setClauses.join(", ")} WHERE id = ?`
    ).bind(...values).run();

    return getCustomKeyById(db, id);
}

export async function deleteCustomKey(db: D1Database, id: number): Promise<boolean> {
    const result = await db.prepare(
        "DELETE FROM custom_keys WHERE id = ?"
    ).bind(id).run();
    return result.meta.changes > 0;
}

export async function validateCustomKey(db: D1Database, apiKey: string): Promise<{ valid: boolean; key?: CustomKey; error?: string }> {
    const key = await getCustomKeyByApiKey(db, apiKey);

    if (!key) {
        return { valid: false, error: "Invalid API key" };
    }

    if (key.is_active !== 1) {
        return { valid: false, error: "API key is disabled" };
    }

    // Check if key has expired
    if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) {
        return { valid: false, error: "API key has expired" };
    }

    if (key.usage_limit !== -1 && key.used_count >= key.usage_limit) {
        return { valid: false, error: "API key usage limit exceeded" };
    }

    return { valid: true, key };
}

export async function incrementCustomKeyUsage(db: D1Database, id: number): Promise<void> {
    await db.prepare(
        "UPDATE custom_keys SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(id).run();
}

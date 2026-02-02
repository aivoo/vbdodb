// Database query helpers for key management

export interface VendorKey {
    id: number;
    vendor_name: string;
    api_key: string;
    usage_limit: number;
    used_count: number;
    is_active: number;
    created_at: string;
    updated_at: string;
}

export interface CustomKey {
    id: number;
    key_name: string;
    api_key: string;
    usage_limit: number;
    used_count: number;
    is_active: number;
    created_at: string;
    updated_at: string;
}

// Vendor Keys Queries
export async function getVendorKeys(db: D1Database): Promise<VendorKey[]> {
    const { results } = await db.prepare(
        "SELECT * FROM vendor_keys ORDER BY created_at DESC"
    ).all<VendorKey>();
    return results || [];
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
    const result = await db.prepare(`
        SELECT * FROM vendor_keys
        WHERE is_active = 1
        AND used_count < usage_limit
        ORDER BY RANDOM()
        LIMIT 1
    `).first<VendorKey>();
    return result || null;
}

export async function incrementVendorKeyUsage(db: D1Database, id: number): Promise<void> {
    await db.prepare(
        "UPDATE vendor_keys SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(id).run();
}

// Custom Keys Queries
export async function getCustomKeys(db: D1Database): Promise<CustomKey[]> {
    const { results } = await db.prepare(
        "SELECT * FROM custom_keys ORDER BY created_at DESC"
    ).all<CustomKey>();
    return results || [];
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
    usageLimit: number = -1
): Promise<CustomKey | null> {
    await db.prepare(
        "INSERT INTO custom_keys (key_name, api_key, usage_limit) VALUES (?, ?, ?)"
    ).bind(keyName, apiKey, usageLimit).run();

    return db.prepare(
        "SELECT * FROM custom_keys WHERE api_key = ?"
    ).bind(apiKey).first<CustomKey>();
}

export async function updateCustomKey(
    db: D1Database,
    id: number,
    updates: Partial<Pick<CustomKey, "key_name" | "api_key" | "usage_limit" | "is_active">>
): Promise<CustomKey | null> {
    const setClauses: string[] = [];
    const values: (string | number)[] = [];

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

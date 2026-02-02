// Key Management API

import {
    getVendorKeys,
    getVendorKeyById,
    createVendorKey,
    updateVendorKey,
    deleteVendorKey,
    getCustomKeys,
    getCustomKeyById,
    createCustomKey,
    updateCustomKey,
    deleteCustomKey,
} from "../db/queries";
import { jsonResponse, errorResponse, generateApiKey } from "../utils/helpers";

// Vendor Keys API
export async function handleGetVendorKeys(db: D1Database): Promise<Response> {
    const keys = await getVendorKeys(db);
    // Mask API keys for security
    const maskedKeys = keys.map((k) => ({
        ...k,
        api_key: maskApiKey(k.api_key),
    }));
    return jsonResponse(maskedKeys);
}

export async function handleCreateVendorKey(
    request: Request,
    db: D1Database
): Promise<Response> {
    try {
        const body = await request.json() as {
            vendor_name?: string;
            api_key?: string;
            usage_limit?: number;
        };

        if (!body.vendor_name) {
            return errorResponse("vendor_name is required");
        }
        if (!body.api_key) {
            return errorResponse("api_key is required");
        }

        const key = await createVendorKey(
            db,
            body.vendor_name,
            body.api_key,
            body.usage_limit ?? 500
        );

        if (!key) {
            return errorResponse("Failed to create vendor key", 500);
        }

        return jsonResponse(key, 201);
    } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            return errorResponse("API key already exists", 409);
        }
        return errorResponse("Invalid request body");
    }
}

export async function handleUpdateVendorKey(
    request: Request,
    db: D1Database,
    id: number
): Promise<Response> {
    try {
        const existing = await getVendorKeyById(db, id);
        if (!existing) {
            return errorResponse("Vendor key not found", 404);
        }

        const body = await request.json() as {
            vendor_name?: string;
            api_key?: string;
            usage_limit?: number;
            is_active?: number;
        };

        const key = await updateVendorKey(db, id, {
            vendor_name: body.vendor_name,
            api_key: body.api_key,
            usage_limit: body.usage_limit,
            is_active: body.is_active,
        });

        return jsonResponse(key);
    } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            return errorResponse("API key already exists", 409);
        }
        return errorResponse("Invalid request body");
    }
}

export async function handleDeleteVendorKey(
    db: D1Database,
    id: number
): Promise<Response> {
    const deleted = await deleteVendorKey(db, id);
    if (!deleted) {
        return errorResponse("Vendor key not found", 404);
    }
    return jsonResponse({ success: true });
}

// Custom Keys API
export async function handleGetCustomKeys(db: D1Database): Promise<Response> {
    const keys = await getCustomKeys(db);
    // Mask API keys for security
    const maskedKeys = keys.map((k) => ({
        ...k,
        api_key: maskApiKey(k.api_key),
    }));
    return jsonResponse(maskedKeys);
}

export async function handleCreateCustomKey(
    request: Request,
    db: D1Database
): Promise<Response> {
    try {
        const body = await request.json() as {
            key_name?: string;
            api_key?: string;
            usage_limit?: number;
        };

        if (!body.key_name) {
            return errorResponse("key_name is required");
        }

        // Generate API key if not provided
        const apiKey = body.api_key || generateApiKey("ck");

        const key = await createCustomKey(
            db,
            body.key_name,
            apiKey,
            body.usage_limit ?? -1
        );

        if (!key) {
            return errorResponse("Failed to create custom key", 500);
        }

        // Return full API key on creation (only time it's shown)
        return jsonResponse(key, 201);
    } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            return errorResponse("API key already exists", 409);
        }
        return errorResponse("Invalid request body");
    }
}

export async function handleUpdateCustomKey(
    request: Request,
    db: D1Database,
    id: number
): Promise<Response> {
    try {
        const existing = await getCustomKeyById(db, id);
        if (!existing) {
            return errorResponse("Custom key not found", 404);
        }

        const body = await request.json() as {
            key_name?: string;
            api_key?: string;
            usage_limit?: number;
            is_active?: number;
        };

        const key = await updateCustomKey(db, id, {
            key_name: body.key_name,
            api_key: body.api_key,
            usage_limit: body.usage_limit,
            is_active: body.is_active,
        });

        return jsonResponse(key);
    } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            return errorResponse("API key already exists", 409);
        }
        return errorResponse("Invalid request body");
    }
}

export async function handleDeleteCustomKey(
    db: D1Database,
    id: number
): Promise<Response> {
    const deleted = await deleteCustomKey(db, id);
    if (!deleted) {
        return errorResponse("Custom key not found", 404);
    }
    return jsonResponse({ success: true });
}

// Helper function to mask API keys
function maskApiKey(key: string): string {
    if (key.length <= 8) return "****";
    return key.substring(0, 4) + "****" + key.substring(key.length - 4);
}

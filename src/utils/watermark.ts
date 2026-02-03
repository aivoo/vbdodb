// Zero-width watermark verification for vb.do system prompt

// Zero-width characters used for encoding
const ZW_CHARS = ["\u200b", "\u200c", "\u200d", "\u200e"];
const ZW_REGEX = /[\u200b\u200c\u200d\u200e]+/g;

// Default salt for watermark
const DEFAULT_SALT = "vbdo-wm-2026";

/**
 * FNV-1a 32-bit hash function
 * IMPORTANT: Must match frontend implementation - iterate by character code point,
 * not by UTF-8 bytes. This ensures consistent hashing for non-ASCII characters.
 */
function fnv1a32(str: string): number {
    let hash = 2166136261; // FNV offset basis (0x811c9dc5)

    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        // FNV prime: 16777619 (0x01000193)
        // Use Math.imul for proper 32-bit multiplication
        hash = Math.imul(hash, 16777619);
    }

    // Convert to unsigned 32-bit integer
    return hash >>> 0;
}

/**
 * Decode zero-width characters to token string
 * Each byte is encoded as 4 zero-width chars (2 bits each)
 */
function decodeZeroWidth(text: string): string | null {
    // Extract all zero-width character sequences
    const matches = text.match(ZW_REGEX);
    if (!matches) return null;

    // Concatenate all zero-width chars
    const zwString = matches.join("");

    // Need at least 4 chars to decode 1 byte
    if (zwString.length < 4) return null;

    // Must be multiple of 4
    if (zwString.length % 4 !== 0) return null;

    const bytes: number[] = [];

    for (let i = 0; i < zwString.length; i += 4) {
        let byte = 0;
        for (let j = 0; j < 4; j++) {
            const char = zwString[i + j];
            const idx = ZW_CHARS.indexOf(char);
            if (idx === -1) return null; // Invalid char
            // Each char represents 2 bits, from high to low
            byte = (byte << 2) | idx;
        }
        bytes.push(byte);
    }

    // Convert bytes to string
    try {
        const decoder = new TextDecoder("utf-8");
        return decoder.decode(new Uint8Array(bytes));
    } catch {
        return null;
    }
}

/**
 * Remove all zero-width characters from text
 */
function removeZeroWidth(text: string): string {
    return text.replace(ZW_REGEX, "");
}

/**
 * Verify watermark in system prompt
 * @param systemPrompt The system prompt with potential watermark
 * @param salt The salt used for signing (default: vbdo-wm-2026)
 * @param toleranceBuckets Number of buckets to tolerate for clock skew (default: 1)
 * @returns Verification result with stripped prompt if successful
 */
export function verifyWatermark(
    systemPrompt: string,
    salt: string = DEFAULT_SALT,
    toleranceBuckets: number = 1
): { ok: boolean; strippedPrompt?: string; error?: string } {
    // Decode the token from zero-width chars
    const token = decodeZeroWidth(systemPrompt);
    if (!token) {
        return { ok: false, error: "No watermark found" };
    }

    // Remove zero-width chars to get stripped prompt
    const strippedPrompt = removeZeroWidth(systemPrompt);

    // Parse token: v1|bucket|sig
    const parts = token.split("|");
    if (parts.length !== 3) {
        return { ok: false, error: "Invalid token format" };
    }

    const [version, bucketStr, sig] = parts;

    // Validate version
    if (version !== "v1") {
        return { ok: false, error: `Unsupported version: ${version}` };
    }

    // Parse bucket
    const bucket = parseInt(bucketStr, 10);
    if (isNaN(bucket)) {
        return { ok: false, error: "Invalid bucket" };
    }

    // Get current bucket
    const currentBucket = Math.floor(Date.now() / 60000);

    // Check if bucket is within tolerance
    const bucketDiff = Math.abs(currentBucket - bucket);
    if (bucketDiff > toleranceBuckets) {
        return { ok: false, error: `Bucket expired (diff: ${bucketDiff})` };
    }

    // Calculate expected signature
    const payload = `${version}|${bucketStr}|${strippedPrompt}|${salt}`;
    const expectedSig = fnv1a32(payload).toString(36);

    // Verify signature
    if (sig !== expectedSig) {
        return { ok: false, error: "Signature mismatch" };
    }

    return { ok: true, strippedPrompt };
}

/**
 * Check if system prompt contains zero-width watermark
 */
export function hasWatermark(text: string): boolean {
    return ZW_REGEX.test(text);
}

// Export for testing
export { fnv1a32, decodeZeroWidth, removeZeroWidth, DEFAULT_SALT };

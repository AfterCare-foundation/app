// What a push (or the stub inbox) carries, read defensively. Plain TypeScript, no React Native,
// so it can be tested in Node.

export interface PushItem {
  /** The generic lock-screen text. */
  alert: string;
  /** First ciphertext. */
  enc: string;
  /** Further ciphertexts bundled into the same push. */
  more?: string[];
}

/** `more` arrives as a list from APNs and as a JSON string from FCM. */
export function normalizeMore(more: unknown): string[] | undefined {
  if (typeof more === "string") {
    try {
      const parsed: unknown = JSON.parse(more);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : undefined;
    } catch {
      return undefined;
    }
  }
  return Array.isArray(more) ? more.filter((x): x is string => typeof x === "string") : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

/**
 * Looks for `enc` (and `more`) in each place the OS library may have put the custom fields of a
 * push: the content data, or the raw payload, at the top level or under `data`. Returns null for
 * anything that is not an AfterCare push.
 */
export function pushItemFrom(sources: unknown[], alert: string): PushItem | null {
  for (const source of sources) {
    const record = asRecord(source);
    if (!record) {
      continue;
    }
    for (const candidate of [record, asRecord(record.data)]) {
      if (candidate && typeof candidate.enc === "string" && candidate.enc.length > 0) {
        const more = normalizeMore(candidate.more);
        return { alert, enc: candidate.enc, ...(more && more.length > 0 ? { more } : {}) };
      }
    }
  }
  return null;
}

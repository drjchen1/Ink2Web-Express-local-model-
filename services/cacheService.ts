/**
 * Local offline mode: server-side context caching is disabled.
 * Local Ollama processes images directly and privately in-memory.
 */

export async function createDocumentContextCache(): Promise<string | null> {
  return null;
}

export function getActiveCacheName(): string | null {
  return null;
}

export function isContextCacheActive(): boolean {
  return false;
}

export async function clearActiveCache(): Promise<void> {
  // No-op for local Ollama
}

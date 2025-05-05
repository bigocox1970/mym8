// Audio cache for journal entries
// This shared module allows audio to be cached across different components

// Store cache in memory for journal entries - up to 10 entries
export const journalAudioCache = new Map<string, Blob>();

/**
 * Get audio from cache
 * @param id Entry ID to look up
 * @returns Cached audio blob or null if not found
 */
export function getCachedAudio(id: string): Blob | null {
  if (journalAudioCache.has(id)) {
    console.log('[CACHE-DEBUG] Found journal audio in cache:', id);
    // Log the current cache contents for debugging
    console.log('[CACHE-DEBUG] Current cache keys:', Array.from(journalAudioCache.keys()));
    return journalAudioCache.get(id) as Blob;
  }
  console.log('[CACHE-DEBUG] Cache miss for:', id);
  return null;
}

/**
 * Store audio in cache
 * @param id Entry ID to store
 * @param audioBlob Audio blob to cache
 */
export function cacheAudio(id: string, audioBlob: Blob): void {
  journalAudioCache.set(id, audioBlob);
  console.log(`[CACHE-DEBUG] Added to journal cache, entry: ${id}, size: ${audioBlob.size} bytes`);
  console.log(`[CACHE-DEBUG] Total cache entries: ${journalAudioCache.size}`);
  console.log(`[CACHE-DEBUG] Current cache keys:`, Array.from(journalAudioCache.keys()));
  
  // Limit cache size
  if (journalAudioCache.size > 10) {
    // Remove oldest entry (first key)
    const firstKey = journalAudioCache.keys().next().value;
    journalAudioCache.delete(firstKey);
    console.log(`[CACHE-DEBUG] Removed oldest cache entry: ${firstKey}`);
  }
} 
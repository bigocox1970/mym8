// Audio cache for journal entries
// This shared module allows audio to be cached across different components

import { set, get, del, keys } from 'idb-keyval';

// Store cache in memory for journal entries - up to 10 entries
export const journalAudioCache = new Map<string, Blob>();

/**
 * Get audio from cache (in-memory, fast)
 * @param id Entry ID to look up
 * @returns Cached audio blob or null if not found
 */
export function getCachedAudio(id: string): Blob | null {
  if (journalAudioCache.has(id)) {
    console.log('[CACHE-DEBUG] Found journal audio in cache:', id);
    return journalAudioCache.get(id) as Blob;
  }
  return null;
}

/**
 * Store audio in cache (in-memory, fast)
 * @param id Entry ID to store
 * @param audioBlob Audio blob to cache
 */
export function cacheAudio(id: string, audioBlob: Blob): void {
  journalAudioCache.set(id, audioBlob);
  // Limit cache size
  if (journalAudioCache.size > 10) {
    const firstKey = journalAudioCache.keys().next().value;
    journalAudioCache.delete(firstKey);
  }
}

/**
 * Get audio from persistent cache (IndexedDB)
 * @param id Entry ID to look up
 * @returns Promise<Blob|null>
 */
export async function getCachedAudioAsync(id: string): Promise<Blob | null> {
  // Check in-memory first
  if (journalAudioCache.has(id)) {
    console.log('[AUDIO CACHE DEBUG] getCachedAudioAsync: Found in memory for', id);
    return journalAudioCache.get(id) as Blob;
  }
  // Check IndexedDB
  const blob = await get(id);
  if (blob) {
    console.log('[AUDIO CACHE DEBUG] getCachedAudioAsync: Found in IndexedDB for', id, 'size:', blob.size);
    // Also cache in memory for fast access
    journalAudioCache.set(id, blob as Blob);
    return blob as Blob;
  }
  console.log('[AUDIO CACHE DEBUG] getCachedAudioAsync: Not found for', id);
  return null;
}

/**
 * Store audio in persistent cache (IndexedDB)
 * @param id Entry ID to store
 * @param audioBlob Audio blob to cache
 * @param keepIds Array of last 10 assistant message IDs to keep
 */
export async function cacheAudioAsync(id: string, audioBlob: Blob, keepIds: string[] = []): Promise<void> {
  journalAudioCache.set(id, audioBlob);
  await set(id, audioBlob);
  console.log('[AUDIO CACHE DEBUG] cacheAudioAsync: Stored in IndexedDB for', id, 'size:', audioBlob.size);
  // Ensure the just-cached id is always in the keep list
  const keepSet = new Set(keepIds);
  keepSet.add(id);
  const allKeys = await keys();
  // Only delete keys not in keepSet
  const keysToDelete = allKeys.filter(key => !keepSet.has(key as string));
  while (allKeys.length - keepSet.size > 0 && keysToDelete.length > 0) {
    const oldest = keysToDelete.shift();
    if (oldest) {
      await del(oldest);
      journalAudioCache.delete(oldest as string);
      console.log('[AUDIO CACHE DEBUG] cacheAudioAsync: Deleted from IndexedDB', oldest);
    }
  }
} 
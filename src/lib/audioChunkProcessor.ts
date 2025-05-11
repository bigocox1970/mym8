import { textToSpeech } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { getCachedAudio, cacheAudio } from '@/lib/audioCache';

// Maximum length of a text chunk for optimal TTS performance
const MAX_CHUNK_LENGTH = 300;

interface ChunkOptions {
  voiceService: string;
  voice: string;
  entryId?: string; // Optional entry ID for caching
  onChunkStart?: (chunkIndex: number, totalChunks: number) => void;
  onChunkEnd?: (chunkIndex: number, totalChunks: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// Global audio element reference for controlling playback across calls
let globalAudioElement: HTMLAudioElement | null = null;

// Global flag to track if processing should be aborted
let abortProcessing = false;

// Global state to track currently playing entry
let currentlyPlayingEntryId: string | null = null;

/**
 * Stops any currently playing audio from this module
 */
export function stopAllAudio(): void {
  console.log('stopAllAudio called, previous playing ID:', currentlyPlayingEntryId);
  
  // Cancel browser's speech synthesis
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  
  // Stop any playing audio element
  if (globalAudioElement) {
    globalAudioElement.pause();
    globalAudioElement.src = '';
    globalAudioElement = null;
  }
  
  // Set abort flag to true to stop any ongoing processing
  abortProcessing = true;
  
  // Clear the currently playing entry ID
  currentlyPlayingEntryId = null;
  
  console.log('Audio stopped, abortProcessing:', abortProcessing);
}

/**
 * Check if an entry is currently playing
 * @param entryId The ID of the entry to check
 * @returns True if the entry is currently playing, false otherwise
 */
export function isEntryPlaying(entryId: string): boolean {
  return currentlyPlayingEntryId === entryId;
}

/**
 * Splits text into chunks for more efficient TTS processing
 * Tries to split on sentence boundaries when possible
 */
export function splitTextIntoChunks(text: string): string[] {
  if (!text || text.length <= MAX_CHUNK_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    // Try to find a sentence boundary within the acceptable range
    let endIndex = Math.min(currentIndex + MAX_CHUNK_LENGTH, text.length);
    
    // If we're not at the end, try to find a sentence boundary (period followed by space or newline)
    if (endIndex < text.length) {
      // Look for sentence boundaries (., !, ?) followed by space or newline
      const sentenceEndRegex = /[.!?][\s\n]/g;
      let match;
      let lastMatch = null;
      
      // Clone the regex for each search to reset its state
      const regex = new RegExp(sentenceEndRegex);
      regex.lastIndex = currentIndex;
      
      // Find the last sentence boundary within our chunk limit
      while ((match = regex.exec(text)) !== null) {
        if (match.index > endIndex) {
          break;
        }
        lastMatch = match;
      }
      
      // If found a sentence boundary, use it
      if (lastMatch) {
        endIndex = lastMatch.index + 1; // Include the period but not the space
      } else {
        // Otherwise try to find a space or newline
        const lastSpace = text.lastIndexOf(' ', endIndex);
        const lastNewline = text.lastIndexOf('\n', endIndex);
        const lastBreak = Math.max(lastSpace, lastNewline);
        
        if (lastBreak > currentIndex && lastBreak < endIndex) {
          endIndex = lastBreak;
        }
      }
    }
    
    chunks.push(text.substring(currentIndex, endIndex).trim());
    currentIndex = endIndex;
  }

  return chunks;
}

/**
 * Process text in chunks and play each chunk sequentially
 */
export async function processAndPlayChunks(
  text: string, 
  options: ChunkOptions
): Promise<void> {
  if (!text?.trim()) {
    return;
  }
  
  console.log('processAndPlayChunks called with entry ID:', options.entryId);
  console.log('Current playing ID:', currentlyPlayingEntryId);
  
  // If this entry is already playing, stop it and return
  if (options.entryId && currentlyPlayingEntryId === options.entryId) {
    console.log('Same entry already playing, stopping');
    stopAllAudio();
    return;
  }
  
  try {
    // Stop any currently playing audio before starting a new one
    stopAllAudio();
    
    // Reset abort flag AFTER stopping previous audio
    abortProcessing = false;
    
    // Set the currently playing entry ID
    if (options.entryId) {
      currentlyPlayingEntryId = options.entryId;
      console.log('Set current playing ID to:', currentlyPlayingEntryId);
    }
    
    // Split text into chunks
    const chunks = splitTextIntoChunks(text);
    console.log(`Text split into ${chunks.length} chunks`);
    
    // Process and play each chunk
    let audioElement: HTMLAudioElement | null = null;
    
    for (let i = 0; i < chunks.length; i++) {
      // Check if processing should be aborted before each chunk
      if (abortProcessing) {
        console.log('Audio processing aborted');
        currentlyPlayingEntryId = null; // Clear playing state
        break;
      }
      
      const chunk = chunks[i];
      
      // Skip empty chunks
      if (!chunk.trim()) continue;
      
      try {
        // Notify chunk start
        if (options.onChunkStart) {
          options.onChunkStart(i, chunks.length);
        }
        
        if (options.voiceService === 'browser') {
          // Use browser's built-in TTS for this chunk
          console.log('[JOURNAL-DEBUG] Using browser TTS', options.entryId || 'unknown-entry');
          if ('speechSynthesis' in window) {
            await new Promise<void>((resolve, reject) => {
              // Check abort flag again before starting speech
              if (abortProcessing) {
                resolve();
                return;
              }
              
              const utterance = new SpeechSynthesisUtterance(chunk);
              
              // Find appropriate voice
              const voices = window.speechSynthesis.getVoices();
              const preferredGender = 'female'; // Default
              
              let selectedVoice = voices.find(voice => 
                voice.name.includes(options.voice) || 
                (preferredGender.toLowerCase() === 'male' ? 
                  voice.name.toLowerCase().includes('male') : 
                  voice.name.toLowerCase().includes('female'))
              );
              
              if (!selectedVoice && voices.length > 0) {
                selectedVoice = voices[0]; // Fallback to first available voice
              }
              
              if (selectedVoice) {
                utterance.voice = selectedVoice;
              }
              
              utterance.onstart = () => {
                console.log('Browser TTS started');
              };
              
              utterance.onend = () => {
                console.log('Browser TTS ended');
                if (options.onChunkEnd) {
                  options.onChunkEnd(i, chunks.length);
                }
                resolve();
              };
              
              utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                // Don't treat 'interrupted' or 'canceled' as errors, as they're expected during normal operation
                if (event.error !== 'interrupted' && event.error !== 'canceled') {
                  reject(new Error(`Speech synthesis error: ${event.error}`));
                } else {
                  console.log(`Expected speech synthesis event: ${event.error}, resolving normally`);
                  resolve(); // Resolve normally for expected interruptions
                }
              };
              
              window.speechSynthesis.speak(utterance);
            });
          } else {
            throw new Error('Browser does not support speech synthesis');
          }
        } else {
          // Use API-based TTS
          // Clean up previous audio if it exists
          if (audioElement) {
            audioElement.pause();
            audioElement.src = '';
          }
          
          // Generate a chunk-specific cache key if we have an entry ID
          // Include voice service and voice name for better caching
          const cacheKey = options.entryId ? 
            `${options.entryId}_${options.voiceService}_${options.voice}_chunk_${i}` : '';
          
          console.log(`[CACHE-DEBUG] Journal chunk cache key: ${cacheKey}`);
          
          // Check cache first if we have a cache key
          let audioBlob: Blob | null = null;
          if (cacheKey && options.entryId) {
            audioBlob = getCachedAudio(cacheKey);
            if (audioBlob) {
              console.log(`[JOURNAL-DEBUG] Found chunk ${i} in cache for entry ${options.entryId}`);
              console.log(`[CACHE-DEBUG] Journal chunk cache hit, size: ${audioBlob.size} bytes`);
            }
          }
          
          // If not in cache, get audio for this chunk from API
          if (!audioBlob) {
            // Check abort flag before API call
            if (abortProcessing) {
              break;
            }
            
            console.log(`[JOURNAL-DEBUG] Chunk ${i} not in cache for entry ${options.entryId || 'unknown'}, fetching from API`);
            
            audioBlob = await textToSpeech(chunk, options.voiceService, { voice: options.voice }) as Blob;
            
            // Cache the chunk if we have a cache key
            if (audioBlob && cacheKey && options.entryId) {
              cacheAudio(cacheKey, audioBlob);
              console.log(`[JOURNAL-DEBUG] Added chunk ${i} to cache for entry ${options.entryId}`);
            }
          }
          
          if (!audioBlob) {
            throw new Error('No audio returned from TTS API');
          }
          
          // Check abort flag before playing
          if (abortProcessing) {
            break;
          }
          
          // Play the audio
          const audioUrl = URL.createObjectURL(audioBlob);
          audioElement = new Audio(audioUrl);
          // Ensure mobile speaker playback
          audioElement.setAttribute('playsinline', 'true');
          audioElement.setAttribute('autoplay', 'true');
          audioElement.setAttribute('webkit-playsinline', 'true');
          audioElement.crossOrigin = 'anonymous';
          globalAudioElement = audioElement; // Set global reference for control
          
          await new Promise<void>((resolve, reject) => {
            if (!audioElement) {
              reject(new Error('Audio element not created'));
              return;
            }
            
            audioElement.onplay = () => {
              console.log('Audio playback started');
            };
            
            audioElement.onended = () => {
              console.log('Audio playback ended');
              if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
              }
              
              if (options.onChunkEnd) {
                options.onChunkEnd(i, chunks.length);
              }
              
              resolve();
            };
            
            audioElement.onerror = (e) => {
              console.error('Audio playback error:', e);
              if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
              }
              reject(new Error(`Audio playback error: ${e}`));
            };
            
            // Check abort flag one last time before playing
            if (abortProcessing) {
              resolve();
              return;
            }
            
            // Play audio with error handling for mobile
            audioElement.play().catch(error => {
              console.error('Error playing audio:', error);
              if (error.name === 'NotAllowedError') {
                console.error('Audio playback requires user interaction');
              }
              reject(error);
            });
          });
        }
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
        if (options.onError) {
          options.onError(error instanceof Error ? error : new Error(String(error)));
        }
        // Continue with next chunk despite error
      }
    }
    
    // All chunks processed
    if (!abortProcessing && options.onComplete) {
      console.log('All chunks complete');
      options.onComplete();
    }
  } catch (error) {
    console.error('Error in processAndPlayChunks:', error);
    
    if (options.onError) {
      options.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
} 
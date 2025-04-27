export interface Config {
  tts: {
    voice: 'male' | 'female';
    rate: number;
  };
}

export function getConfig(): Config {
  // For now, return default config
  // In the future, this could be loaded from localStorage or a backend
  return {
    tts: {
      voice: 'female',
      rate: 1.0
    }
  };
} 
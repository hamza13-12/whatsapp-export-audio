export const AUDIO_EXTENSIONS = ['opus', 'ogg', 'm4a', 'mp3', 'wav'];
export const RUPEE_RATE = 0.25;
export const GOAL = 100;
export const CONCURRENT_UPLOADS = 10;
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_BASE = 2000;

export const API_URL = 'https://5e3yxuz0vf.execute-api.me-south-1.amazonaws.com/dev/upload';
export const CHECK_URL = 'https://5e3yxuz0vf.execute-api.me-south-1.amazonaws.com/dev/check-uploads';

export interface VoiceItem {
  path: string;
  name: string;
  fileHash?: string;
  duration?: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  timestamp: string;
}

export interface RetryInfo {
  attempts: number;
  lastAttempt: number;
}
// ============================================================
// User Session Management
// ============================================================
// Handles device-specific user identity with localStorage persistence.
// No authentication required — each device gets a unique anonymous session.
// ============================================================

import { UserSession } from './types';
import { generateRandomUsername, generateRandomColor } from './utils';

const STORAGE_KEY = 'whiteboard-session';

/** Generate a UUID v4 (crypto-based, no external dependency) */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Generate a random seed string for avatar generation */
function generateAvatarSeed(): string {
  const adjectives = [
    'swift', 'calm', 'bold', 'bright', 'kind', 'warm', 'cool', 'neat',
    'keen', 'wild', 'gentle', 'sharp', 'quick', 'fresh', 'solid', 'lucky',
  ];
  const nouns = [
    'panda', 'fox', 'owl', 'hawk', 'wolf', 'bear', 'deer', 'lion',
    'tiger', 'eagle', 'otter', 'raven', 'lynx', 'crow', 'hawk', 'seal',
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}-${noun}-${num}`;
}

/**
 * Create a new user session with random identity
 */
function createNewSession(): UserSession {
  return {
    id: generateUUID(),
    username: generateRandomUsername(),
    avatarSeed: generateAvatarSeed(),
    color: generateRandomColor(),
  };
}

/**
 * Get or create the current user session.
 * Reads from localStorage if available, creates a new one otherwise.
 * Sessions persist across page reloads but are device-specific.
 */
export function getSession(): UserSession {
  if (typeof window === 'undefined') {
    // Server-side: return a temporary session (will be replaced on client)
    return createNewSession();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as UserSession;
      // Validate the stored session has all required fields
      if (parsed.id && parsed.username && parsed.avatarSeed && parsed.color) {
        return parsed;
      }
    }
  } catch {
    // localStorage unavailable or corrupted — create new session
  }

  const session = createNewSession();
  saveSession(session);
  return session;
}

/**
 * Save the user session to localStorage
 */
export function saveSession(session: UserSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage full or unavailable — silently fail
    console.warn('Failed to save session to localStorage');
  }
}

/**
 * Clear the current session (effectively logs out / generates new identity)
 */
export function clearSession(): UserSession {
  if (typeof window === 'undefined') return createNewSession();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  const session = createNewSession();
  saveSession(session);
  return session;
}

/**
 * Get avatar URL from the session's avatar seed
 * Uses DiceBear open-source avatar API (no API key needed)
 */
export function getAvatarUrl(seed: string, size: number = 40): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}

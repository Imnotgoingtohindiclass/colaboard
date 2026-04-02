import { UserSession } from './types';
import { generateRandomUsername, generateRandomColor } from './utils';

const STORAGE_KEY = 'whiteboard-session';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

function createNewSession(): UserSession {
  return {
    id: generateUUID(),
    username: generateRandomUsername(),
    avatarSeed: generateAvatarSeed(),
    color: generateRandomColor(),
  };
}

export function getSession(): UserSession {
  if (typeof window === 'undefined') {
    return createNewSession();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as UserSession;
      if (parsed.id && parsed.username && parsed.avatarSeed && parsed.color) {
        return parsed;
      }
    }
  } catch {
  }

  const session = createNewSession();
  saveSession(session);
  return session;
}

export function saveSession(session: UserSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    console.warn('Failed to save session to localStorage');
  }
}

export function clearSession(): UserSession {
  if (typeof window === 'undefined') return createNewSession();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
  const session = createNewSession();
  saveSession(session);
  return session;
}

export function getAvatarUrl(seed: string, size: number = 40): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}

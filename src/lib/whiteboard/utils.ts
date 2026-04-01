// ============================================================
// Whiteboard Utility Functions
// ============================================================

import { Point, Stroke } from './types';

/**
 * Generate a visually distinct random username.
 * Format: "Adjective Noun" (e.g., "Swift Panda", "Bold Fox")
 */
export function generateRandomUsername(): string {
  const adjectives = [
    'Swift', 'Calm', 'Bold', 'Bright', 'Kind', 'Warm', 'Cool', 'Neat',
    'Keen', 'Wild', 'Gentle', 'Sharp', 'Quick', 'Fresh', 'Solid', 'Lucky',
    'Brave', 'Clever', 'Happy', 'Proud', 'Silent', 'Vivid', 'Agile', 'Dense',
  ];
  const nouns = [
    'Panda', 'Fox', 'Owl', 'Hawk', 'Wolf', 'Bear', 'Deer', 'Lion',
    'Tiger', 'Eagle', 'Otter', 'Raven', 'Lynx', 'Crow', 'Seal', 'Orca',
    'Hare', 'Moth', 'Swan', 'Gecko', 'Shark', 'Robin', 'Dove', 'Wren',
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

/**
 * Generate a random color from a curated palette.
 * Colors are chosen to be visually distinct and pleasant on a white background.
 */
export function generateRandomColor(): string {
  const palette = [
    '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C',
    '#3498DB', '#9B59B6', '#E91E63', '#FF5722', '#795548',
    '#607D8B', '#00BCD4', '#8BC34A', '#FF9800', '#673AB7',
    '#F44336', '#4CAF50', '#2196F3', '#FFC107', '#009688',
    '#D32F2F', '#C2185B', '#7B1FA2', '#512DA8', '#303F9F',
    '#1976D2', '#0288D1', '#0097A7', '#00796B', '#388E3C',
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}

/**
 * Calculate the distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Interpolate between two points with a given number of intermediate points.
 * This produces smooth curves even when pointer events fire at low frequency.
 */
export function interpolatePoints(p1: Point, p2: Point, spacing: number = 3): Point[] {
  const dist = distance(p1, p2);
  const points: Point[] = [];

  if (dist <= spacing) {
    return [p2];
  }

  const steps = Math.ceil(dist / spacing);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
      pressure: p1.pressure !== undefined && p2.pressure !== undefined
        ? p1.pressure + (p2.pressure - p1.pressure) * t
        : 0.5,
    });
  }

  return points;
}

/**
 * Calculate the total bounding box of a stroke
 */
export function getStrokeBounds(stroke: Stroke): { x: number; y: number; width: number; height: number } {
  if (stroke.points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of stroke.points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const halfThick = stroke.thickness / 2;
  return {
    x: minX - halfThick,
    y: minY - halfThick,
    width: maxX - minX + stroke.thickness,
    height: maxY - minY + stroke.thickness,
  };
}

/**
 * Generate a unique board ID (short, URL-friendly)
 */
export function generateBoardId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate a unique ID for strokes/messages
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Predefined color palette for the toolbar
 */
export const COLOR_PALETTE = [
  '#000000', '#434343', '#999999', '#FFFFFF',
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71',
  '#1ABC9C', '#3498DB', '#9B59B6', '#E91E63',
  '#FF5722', '#795548', '#607D8B', '#00BCD4',
];

/**
 * Predefined thickness options for the toolbar
 */
export const THICKNESS_OPTIONS = [2, 4, 6, 10, 16, 24];

/**
 * Throttle a function call to run at most once per interval
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * Format a timestamp for chat messages
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

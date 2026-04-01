import { Point } from './types';

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

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function interpolatePoints(p1: Point, p2: Point, spacing: number = 3): Point[] {
  const dist = distance(p1, p2);
  if (dist <= spacing) return [p2];

  const points: Point[] = [];
  const steps = Math.ceil(dist / spacing);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: p1.x + (p2.x - p1.x) *t,
      y: p1.y + (p2.y - p1.y) * t,
      pressure: p1.pressure !== undefined && p2.pressure !== undefined
        ? p1.pressure + (p2.pressure - p1.pressure) * t
        : 0.5,
    });
  }
  return points;
}

export function generateBoardId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const COLOR_PALETTE = [
  '#000000', '#434343', '#999999', '#FFFFFF',
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71',
  '#1ABC9C', '#3498DB', '#9B59B6', '#E91E63',
  '#FF5722', '#795548', '#607D8B', '#00BCD4',
];

export const THICKNESS_OPTIONS = [2, 4, 6, 10, 16, 24];

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
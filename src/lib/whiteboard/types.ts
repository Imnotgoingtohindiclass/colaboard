export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  userId: string;
  points: Point[];
  color: string;
  thickness: number;
  tool: DrawingTool;
  createdAt: number;
  completedAt?: number;
}

export type DrawingTool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'ellipse';

export interface UserSession {
  id: string;
  username: string;
  avatarSeed: string;
  color: string;
}

export interface AwarenessUserState {
  user: UserSession;
  cursor: { x: number; y: number } | null;
  isDrawing: boolean;
  currentTool: DrawingTool;
  lastActive: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: number;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface DrawingConfig {
  tool: DrawingTool;
  color: string;
  thickness: number;
  viewport: ViewportState;
}

export const DEFAULT_DRAWING_CONFIG: DrawingConfig = {
  tool: 'pen',
  color: '#000000',
  thickness: 3,
  viewport: { x: 0, y: 0, scale:1 },
}
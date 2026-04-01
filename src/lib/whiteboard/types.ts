// ============================================================
// Whiteboard Type Definitions
// ============================================================

/** A single point in a stroke path */
export interface Point {
  x: number;
  y: number;
  /** Pressure from pointer events (0-1), defaults to 0.5 for mouse */
  pressure?: number;
}

/** A complete stroke drawn by a user */
export interface Stroke {
  /** Unique stroke identifier */
  id: string;
  /** The user who drew this stroke */
  userId: string;
  /** Array of points that form the path */
  points: Point[];
  /** Stroke color (hex string) */
  color: string;
  /** Stroke thickness in pixels */
  thickness: number;
  /** Tool used to create this stroke */
  tool: DrawingTool;
  /** Timestamp when the stroke was created */
  createdAt: number;
  /** Timestamp when the stroke was completed */
  completedAt?: number;
}

/** Available drawing tools */
export type DrawingTool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'ellipse';

/** User session data persisted in localStorage */
export interface UserSession {
  /** Unique user identifier (UUID v4) */
  id: string;
  /** Randomly generated display name */
  username: string;
  /** Randomly generated avatar seed */
  avatarSeed: string;
  /** User's drawing color */
  color: string;
}

/** Awareness state broadcast to other users */
export interface AwarenessUserState {
  /** User session data */
  user: UserSession;
  /** Current cursor position on the canvas (null when not on canvas) */
  cursor: { x: number; y: number } | null;
  /** Whether the user is currently drawing */
  isDrawing: boolean;
  /** Current tool being used */
  currentTool: DrawingTool;
  /** Last activity timestamp */
  lastActive: number;
}

/** Chat message sent between users */
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: number;
}

/** Canvas viewport state for zoom/pan */
export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

/** Yjs sync protocol message types (client ↔ server) */
export enum SyncMessageType {
  /** Client sends its state vector, server responds with the diff */
  SYNC_STEP_1 = 'sync-step-1',
  /** Server responds with the update diff */
  SYNC_STEP_2 = 'sync-step-2',
  /** Broadcast incremental document update */
  SYNC_UPDATE = 'sync-update',
  /** Broadcast awareness update */
  AWARENESS_UPDATE = 'awareness-update',
  /** Client requests full awareness state */
  AWARENESS_QUERY = 'awareness-query',
  /** Server responds with full awareness state */
  AWARENESS_RESPONSE = 'awareness-response',
  /** Chat message */
  CHAT_MESSAGE = 'chat-message',
  /** Client joins a board room */
  JOIN_ROOM = 'join-room',
  /** Clear all strokes */
  CLEAR_BOARD = 'clear-board',
}

/** Drawing configuration */
export interface DrawingConfig {
  /** Current active tool */
  tool: DrawingTool;
  /** Current stroke color */
  color: string;
  /** Current stroke thickness */
  thickness: number;
  /** Canvas viewport */
  viewport: ViewportState;
}

/** Default drawing configuration */
export const DEFAULT_DRAWING_CONFIG: DrawingConfig = {
  tool: 'pen',
  color: '#000000',
  thickness: 3,
  viewport: { x: 0, y: 0, scale: 1 },
};

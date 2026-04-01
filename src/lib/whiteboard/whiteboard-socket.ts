import { io, Socket } from 'socket.io-client';
import { Stroke, ChatMessage, UserSession } from './types';

export interface BoardUser {
  id: string;
  username: string;
  avatarSeed: string;
  color: string;
  cursor: { x: number; y: number } | null;
  isDrawing: boolean;
  lastActive: number;
}

export interface RemoteCursor {
  userId: string;
  x: number;
  y: number;
  username: string;
  color: string;
}

export type StrokeListener = (stroke: Stroke) => void;
export type StrokeRemovedListener = (strokeId: string) => void;
export type BoardClearedListener = () => void;
export type UserJoinedListener = (user: BoardUser) => void;
export type UserLeftListener = (userId: string) => void;
export type CursorUpdateListener = (cursor: RemoteCursor) => void;
export type DrawingStateListener = (userId: string, isDrawing: boolean) => void;
export type ChatListener = (message: ChatMessage) => void;
export type StateListener = (strokes: Stroke[], users: BoardUser[]) => void;

export class WhiteboardSocket {
  public connected = false;
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  constructor() {}

  connect(serverUrl: string, roomId: string, user: UserSession): void {
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('connection-change', true);
      this.socket!.emit('join-room', { roomId, user });
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.emit('connection-change', false);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      this.connected = false;
      this.emit('connection-change', false);
    });

    this.socket.on('room-state', (data: { strokes: Stroke[]; users: BoardUser[] }) => {
      this.emit('state', data.strokes, data.users);
    });

    this.socket.on('stroke-added', (data: { stroke: Stroke }) => {
      this.emit('stroke-added', data.stroke);
    });

    this.socket.on('stroke-removed', (data: { strokeId: string }) => {
      this.emit('stroke-removed', data.strokeId);
    });

    this.socket.on('board-cleared', () => {
      this.emit('board-cleared');
    });

    this.socket.on('user-joined', (data: { user: BoardUser }) => {
      this.emit('user-joined', data.user);
    });

    this.socket.on('user-left', (data: { userId: string }) => {
      this.emit('user-left', data.userId);
    });

    this.socket.on('cursor-update', (data: RemoteCursor) => {
      this.emit('cursor-update', data);
    });

    this.socket.on('drawing-state', (data: { userId: string; isDrawing: boolean }) => {
      this.emit('drawing-state', data.userId, data.isDrawing);
    });

    this.socket.on('chat-message', (data: ChatMessage) => {
      this.emit('chat-message', data);
    });
  }

  on(event: string, listener: (...args: unknown[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  private emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }

  addStroke(stroke: Stroke): void {
    this.socket?.emit('add-stroke', { roomId: '', stroke });
  }

  requestUndo(userId: string): void {
    this.socket?.emit('request-undo', { roomId: '', userId });
  }

  requestRedo(userId: string): void {
    this.socket?.emit('request-redo', { roomId: '', userId });
  }

  clearBoard(): void {
    this.socket?.emit('clear-board', { roomId: '' });
  }

  sendCursorMove(userId: string, x: number, y: number): void {
    this.socket?.emit('cursor-move', { roomId: '', userId, x, y });
  }

  sendDrawingChange(userId: string, isDrawing: boolean): void {
    this.socket?.emit('drawing-change', { roomId: '', userId, isDrawing });
  }

  sendChatMessage(message: ChatMessage): void {
    this.socket?.emit('chat-message', message);
  }

  destroy(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
    this.listeners.clear();
  }
}
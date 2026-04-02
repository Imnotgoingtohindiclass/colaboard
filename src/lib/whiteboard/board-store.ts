import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Stroke, ChatMessage, UserSession } from './types';

export interface BoardUser {
  id: string;
  username: string;
  avatarSeed: string;
  color: string;
}

export interface RemoteCursor {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
}

type Listener = (...args: any[]) => void;

const PRESENCE_TIMEOUT = 8000;
let storeCounter = 0;

function mapStrokeRow(row: Record<string, unknown>): Stroke {
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? '',
    points: (row.points as Stroke['points']) ?? [],
    color: (row.color as string) ?? '#000',
    thickness: (row.thickness as number) ?? 2,
    tool: (row.tool as Stroke['tool']) ?? 'pen',
    createdAt: new Date(row.created_at as string).getTime(),
    completedAt: row.completed_at
      ? new Date(row.completed_at as string).getTime()
      : undefined,
  };
}

function mapChatRow(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? '',
    username: (row.username as string) ?? '',
    content: (row.content as string) ?? '',
    timestamp: new Date(row.created_at as string).getTime(),
  };
}

interface BridgeEntry {
  bridge: RealtimeBridge;
}

const bridges = new Map<string, BridgeEntry>();

class RealtimeBridge {
  readonly boardId: string;
  private channel: RealtimeChannel;
  private stores = new Set<BoardStore>();
  private destroyed = false;

  constructor(boardId: string) {
    this.boardId = boardId;
    this.channel = supabase.channel(`board:${boardId}`, {
      config: { broadcast: { self: true } },
    });

    this.channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'strokes', filter: `board_id=eq.${boardId}` },
      (payload) => {
        const stroke = mapStrokeRow((payload as any).new);
        for (const store of this.stores) {
          store.dispatch('stroke-added', stroke);
        }
      },
    );

    this.channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'strokes', filter: `board_id=eq.${boardId}` },
      (payload) => {
        const id = (payload as any).old?.id as string;
        if (id) {
          for (const store of this.stores) {
            store.dispatch('stroke-removed', id);
          }
        }
      },
    );

    this.channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `board_id=eq.${boardId}` },
      (payload) => {
        const msg = mapChatRow((payload as any).new);
        for (const store of this.stores) {
          store.dispatch('chat-message', msg);
        }
      },
    );

    this.channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        for (const store of this.stores) {
          store.dispatch('connection-change', true);
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        for (const store of this.stores) {
          store.dispatch('connection-change', false);
        }
      }
    });
  }

  addStore(store: BoardStore) {
    this.stores.add(store);
  }

  removeStore(store: BoardStore) {
    this.stores.delete(store);
    if (this.stores.size === 0) {
      this.destroy();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.channel.unsubscribe();
    bridges.delete(this.boardId);
  }
}

function getBridge(boardId: string): RealtimeBridge {
  if (!bridges.has(boardId)) {
    bridges.set(boardId, { bridge: new RealtimeBridge(boardId) });
  }
  return bridges.get(boardId)!.bridge;
}

const bcCache = new Map<string, BroadcastChannel>();
function getBc(boardId: string): BroadcastChannel {
  if (!bcCache.has(boardId)) {
    bcCache.set(boardId, new BroadcastChannel(`wb:${boardId}`));
  }
  return bcCache.get(boardId)!;
}

export class BoardStore {
  private boardId: string | null = null;
  private user: UserSession | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private redoStack: Stroke[] = [];

  private storeId = ++storeCounter;

  private bc: BroadcastChannel | null = null;
  private _bcHandler: ((ev: MessageEvent) => void) | null = null;
  private _keepalive: ReturnType<typeof setInterval> | null = null;
  private _cleanup: ReturnType<typeof setInterval> | null = null;

  private lastCursorBroadcast = 0;

  private remoteUsers = new Map<string, { user: BoardUser; lastSeen: number }>();
  private remoteCursors = new Map<string, RemoteCursor>();

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => { this.listeners.get(event)?.delete(listener); };
  }

  private emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((l) => l(...args));
  }

  dispatch(event: string, ...args: unknown[]) {
    if (!this.boardId) return;
    this.emit(event, ...args);
  }

  private emitUsersUpdate() {
    const users = Array.from(this.remoteUsers.values()).map((u) => u.user);
    const cursors = Array.from(this.remoteCursors.values());
    this.emit('users-update', users, cursors);
  }

  private announcePresence() {
    if (!this.user || !this.bc) return;
    this.bc.postMessage({
      type: 'presence-sync',
      senderId: this.storeId,
      payload: {
        users: [{
          id: this.user.id, username: this.user.username,
          avatarSeed: this.user.avatarSeed, color: this.user.color,
        }],
        cursors: [],
      },
    });
  }

  async connect(boardId: string, user: UserSession): Promise<void> {
    if (this.boardId === boardId) return;
    this.doCleanup();
    this.boardId = boardId;
    this.user = user;
    this.redoStack = [];
    this.remoteUsers.clear();
    this.remoteCursors.clear();

    const { data: strokeRows, error: strokeErr } = await supabase
      .from('strokes').select('*').eq('board_id', boardId)
      .order('created_at', { ascending: true });

    if (this.boardId !== boardId) return;
    if (strokeErr) console.error('[BoardStore] Failed to load strokes:', strokeErr);

    const strokes = (strokeRows || []).map(mapStrokeRow);
    this.emit('strokes-loaded', strokes);

    const { data: chatRows } = await supabase
      .from('chat_messages').select('*').eq('board_id', boardId)
      .order('created_at', { ascending: true }).limit(50);

    if (this.boardId !== boardId) return;
    if (chatRows?.length) {
      this.emit('chat-history', chatRows.map(mapChatRow));
    }

    const bridge = getBridge(boardId);
    bridge.addStore(this);

    this.bc = getBc(boardId);

    this._bcHandler = (ev: MessageEvent) => {
      const msg = ev.data as { type: string; senderId?: number; payload: unknown };
      if (!msg?.type) return;
      if (msg.senderId === this.storeId) return;

      switch (msg.type) {
        case 'presence-sync': {
          const p = msg.payload as { users: BoardUser[]; cursors: RemoteCursor[] };
          const now = Date.now();
          for (const u of (p.users || [])) {
            this.remoteUsers.set(u.id, { user: u, lastSeen: now });
          }
          for (const c of (p.cursors || [])) {
            this.remoteCursors.set(c.userId, c);
          }
          this.emitUsersUpdate();
          break;
        }
        case 'cursor-move': {
          const p = msg.payload as { cursors: RemoteCursor[] };
          for (const c of (p.cursors || [])) {
            this.remoteCursors.set(c.userId, c);
          }
          this.emit('cursors-update', Array.from(this.remoteCursors.values()));
          break;
        }
      }
    };
    this.bc.addEventListener('message', this._bcHandler);

    this.announcePresence();
    this._keepalive = setInterval(() => this.announcePresence(), 3000);

    this._cleanup = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, entry] of this.remoteUsers) {
        if (now - entry.lastSeen > PRESENCE_TIMEOUT) {
          this.remoteUsers.delete(id);
          this.remoteCursors.delete(id);
          changed = true;
        }
      }
      if (changed) this.emitUsersUpdate();
    }, 5000);

    this.emit('connection-change', true);
  }

  async addStroke(stroke: Stroke): Promise<void> {
    if (!this.boardId) return;

    this.emit('stroke-added', stroke);

    const { error } = await supabase.from('strokes').insert({
      id: stroke.id,
      board_id: this.boardId,
      user_id: stroke.userId,
      points: stroke.points.map((p) => ({ x: p.x, y: p.y, pressure: p.pressure ?? 0.5 })),
      color: stroke.color,
      thickness: stroke.thickness,
      tool: stroke.tool,
      created_at: new Date(stroke.createdAt).toISOString(),
      completed_at: stroke.completedAt ? new Date(stroke.completedAt).toISOString() : null,
    });

    if (error) {
      console.error('[BoardStore] Failed to persist stroke:', error);
    }
  }

  async removeStroke(strokeId: string): Promise<void> {
    if (!this.boardId) return;

    this.emit('stroke-removed', strokeId);

    const { error } = await supabase.from('strokes').delete().eq('id', strokeId);
    if (error) {
      console.error('[BoardStore] Failed to delete stroke:', error);
    }
  }

  async requestUndo(): Promise<void> {
    if (!this.boardId || !this.user) return;
    const { data } = await supabase
      .from('strokes').select('*').eq('board_id', this.boardId).eq('user_id', this.user.id)
      .order('created_at', { ascending: false }).limit(1);
    if (!data?.length) return;
    const s = data[0];

    this.redoStack.push(mapStrokeRow(s));
    const strokeId = s.id as string;

    this.emit('stroke-removed', strokeId);

    await supabase.from('strokes').delete().eq('id', strokeId);
  }

  async requestRedo(): Promise<void> {
    const stroke = this.redoStack.pop();
    if (!stroke || !this.boardId) return;

    this.emit('stroke-added', stroke);

    await supabase.from('strokes').insert({
      id: stroke.id,
      board_id: this.boardId,
      user_id: stroke.userId,
      points: stroke.points.map((p) => ({ x: p.x, y: p.y, pressure: p.pressure ?? 0.5 })),
      color: stroke.color,
      thickness: stroke.thickness,
      tool: stroke.tool,
      created_at: new Date(stroke.createdAt).toISOString(),
      completed_at: stroke.completedAt ? new Date(stroke.completedAt).toISOString() : null,
    });
  }

  async clearBoard(): Promise<void> {
    if (!this.boardId) return;

    this.emit('board-cleared');

    await supabase.from('strokes').delete().eq('board_id', this.boardId);
  }

  sendCursorMove(cursor: { x: number; y: number } | null): void {
    if (!this.user) return;
    const now = Date.now();
    if (now - this.lastCursorBroadcast < 50) return;
    this.lastCursorBroadcast = now;
    this.bc?.postMessage({
      type: 'cursor-move',
      senderId: this.storeId,
      payload: {
        cursors: cursor
          ? [{ userId: this.user.id, username: this.user.username, color: this.user.color, x: cursor.x, y: cursor.y }]
          : [],
      },
    });
  }

  sendDrawingChange(_isDrawing: boolean): void {
    if (!this.user) return;
    this.bc?.postMessage({
      type: 'presence-sync',
      senderId: this.storeId,
      payload: {
        users: [{
          id: this.user.id, username: this.user.username,
          avatarSeed: this.user.avatarSeed, color: this.user.color,
        }],
        cursors: [],
      },
    });
  }

  async sendChatMessage(message: ChatMessage): Promise<void> {
    if (!this.boardId) return;

    this.emit('chat-message', message);

    const { error } = await supabase.from('chat_messages').insert({
      id: message.id,
      board_id: this.boardId,
      user_id: message.userId,
      username: message.username,
      content: message.content,
      created_at: new Date(message.timestamp).toISOString(),
    });

    if (error) {
      console.error('[BoardStore] Failed to persist chat:', error);
    }
  }

  private doCleanup() {
    if (this._keepalive) { clearInterval(this._keepalive); this._keepalive = null; }
    if (this._cleanup) { clearInterval(this._cleanup); this._cleanup = null; }
    if (this.bc && this._bcHandler) {
      this.bc.removeEventListener('message', this._bcHandler);
    }
    this._bcHandler = null;
    this.bc = null;
  }

  disconnect(): void {
    this.doCleanup();

    if (this.boardId) {
      const entry = bridges.get(this.boardId);
      if (entry) {
        entry.bridge.removeStore(this);
      }
    }

    this.boardId = null;
    this.user = null;
    this.redoStack = [];
    this.remoteUsers.clear();
    this.remoteCursors.clear();
    this.listeners.clear();
  }
}

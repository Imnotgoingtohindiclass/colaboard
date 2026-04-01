'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { WhiteboardSocket, type BoardUser, type RemoteCursor } from '@/lib/whiteboard/whiteboard-socket';
import { getSession } from '@/lib/whiteboard/session';
import {
  Stroke,
  DrawingConfig,
  DEFAULT_DRAWING_CONFIG,
  ChatMessage,
} from '@/lib/whiteboard/types';
import Canvas, { CanvasHandle } from '@/components/whiteboard/Canvas';
import Toolbar from '@/components/whiteboard/Toolbar';
import CursorOverlay from '@/components/whiteboard/CursorOverlay';
import UserList from '@/components/whiteboard/UserList';
import ChatPanel from '@/components/whiteboard/ChatPanel';

interface WhiteboardAppProps {
  boardId: string;
  onBack: () => void;
  serverUrl: string;
}

export default function WhiteboardApp({ boardId, onBack, serverUrl }: WhiteboardAppProps) {
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [showUsers, setShowUsers] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [config, setConfig] = useState<DrawingConfig>({ ...DEFAULT_DRAWING_CONFIG });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [users, setUsers] = useState<BoardUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [drawingUsers, setDrawingUsers] = useState<Set<string>>(new Set());

  const canvasRef = useRef<CanvasHandle>(null);
  const socketRef = useRef<WhiteboardSocket | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const session = useMemo(() => getSession(), []);

  const strokesArray = useMemo(() => ({
    toArray: () => strokesRef.current,
    push: (items: unknown[]) => {
      if (items[0]) socketRef.current?.addStroke(items[0] as Stroke);
    },
    length: strokesRef.current.length,
  }), [strokes]);

  useEffect(() => {
    const socket = new WhiteboardSocket();
    socketRef.current = socket;

    socket.on('connection-change', (c: unknown) => {
      setConnected(c as boolean);
      if (!(c as boolean)) setSynced(false);
    });

    socket.on('state', (s: unknown, u: unknown) => {
      const newStrokes = s as Stroke[];
      const newUsers = u as BoardUser[];
      setStrokes(newStrokes);
      strokesRef.current = newStrokes;
      setUsers(newUsers);
      setSynced(true);
    });

    socket.on('stroke-added', (stroke: unknown) => {
      const s = stroke as Stroke;
      strokesRef.current = [...strokesRef.current, s];
      setStrokes([...strokesRef.current]);
    });

    socket.on('stroke-removed', (data: unknown) => {
      const { strokeId } = data as { strokeId: string };
      strokesRef.current = strokesRef.current.filter((st) => st.id !== strokeId);
      setStrokes([...strokesRef.current]);
    });

    socket.on('board-cleared', () => {
      strokesRef.current = [];
      setStrokes([]);
    });

        socket.on('user-joined', (data: unknown) => {
      const raw = data as Record<string, unknown>;
      const user = (raw?.user ?? raw) as BoardUser | null | undefined;
      if (!user?.id) return;
      setUsers((prev) => {
        if (prev.find((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    socket.on('user-left', (data: unknown) => {
      const { userId } = data as { userId: string };
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setRemoteCursors((prev) => { const n = new Map(prev); n.delete(userId); return n; });
      setDrawingUsers((prev) => { const n = new Set(prev); n.delete(userId); return n; });
    });

    socket.on('cursor-update', (data: unknown) => {
      const cursor = data as RemoteCursor;
      setRemoteCursors((prev) => new Map(prev).set(cursor.userId, cursor));
    });

    socket.on('drawing-state', (userId: unknown, isDrawing: unknown) => {
      const id = userId as string;
      const drawing = isDrawing as boolean;
      setDrawingUsers((prev) => { const n = new Set(prev); if (drawing) n.add(id); else n.delete(id); return n; });
    });

    socket.on('chat-message', (msg: unknown) => {
      const message = msg as ChatMessage;
      if (message.id && message.userId && message.content && message.userId !== session.id) {
        setChatMessages((prev) => [...prev, message]);
      }
    });

    socket.connect(serverUrl, boardId, session);

    return () => {
      socket.destroy();
      socketRef.current = null;
    };
  }, [boardId, session, serverUrl]);

  const handleDrawingChange = useCallback((isDrawing: boolean) => {
    socketRef.current?.sendDrawingChange(session.id, isDrawing);
  }, [session.id]);

  const handleCursorMove = useCallback((cursor: { x: number; y: number } | null) => {
    if (!cursor) return;
    socketRef.current?.sendCursorMove(session.id, cursor.x, cursor.y);
  }, [session.id]);

  const handleConfigChange = useCallback((update: Partial<DrawingConfig>) => {
    setConfig((prev) => ({ ...prev, ...update }));
  }, []);

  const handleUndo = useCallback(() => {
    socketRef.current?.requestUndo(session.id);
  }, [session.id]);

  const handleRedo = useCallback(() => {
    socketRef.current?.requestRedo(session.id);
  }, [session.id]);

  const handleClear = useCallback(() => {
    socketRef.current?.clearBoard();
  }, []);

  const handleExportPng = useCallback(() => {
    const dataUrl = canvasRef.current?.exportAsPng();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${boardId}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [boardId]);

  const handleZoomIn = useCallback(() => {
    const vp = canvasRef.current?.getViewport();
    if (!vp) return;
    const s = Math.min(10, vp.scale * 1.2);
    canvasRef.current?.setViewport(vp.x, vp.y, s);
    setConfig((prev) => ({ ...prev, viewport: { ...vp, scale: s } }));
  }, []);

  const handleZoomOut = useCallback(() => {
    const vp = canvasRef.current?.getViewport();
    if (!vp) return;
    const s = Math.max(0.1, vp.scale / 1.2);
    canvasRef.current?.setViewport(vp.x, vp.y, s);
    setConfig((prev) => ({ ...prev, viewport: { ...vp, scale: s } }));
  }, []);

  const handleZoomReset = useCallback(() => {
    canvasRef.current?.setViewport(0, 0, 1);
    setConfig((prev) => ({ ...prev, viewport: { x: 0, y: 0, scale: 1 } }));
  }, []);

  const handleSendMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
    socketRef.current?.sendChatMessage(message);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
      else if (e.key === 'b' || e.key === 'B') { setShowUsers((p) => !p); }
      else if (e.key === 'c' && !e.ctrlKey && !e.metaKey) { setShowChat((p) => !p); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  if (!connected) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Connecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-gray-100 overflow-hidden">
      <Canvas
        ref={canvasRef}
        strokesArray={strokesArray}
        config={config}
        userId={session.id}
        onDrawingChange={handleDrawingChange}
        onCursorMove={handleCursorMove}
      />

      <CursorOverlay
        cursors={remoteCursors}
        drawingUsers={drawingUsers}
        ownUserId={session.id}
        viewport={config.viewport}
      />

      <Toolbar
        config={config}
        onConfigChange={handleConfigChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onExportPng={handleExportPng}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onToggleChat={() => setShowChat((p) => !p)}
        onToggleUsers={() => setShowUsers((p) => !p)}
        showChat={showChat}
        showUsers={showUsers}
        connected={connected}
      />

      <UserList
        users={users}
        ownUserId={session.id}
        visible={showUsers}
        onClose={() => setShowUsers(false)}
        boardId={boardId}
      />

      <ChatPanel
        userId={session.id}
        username={session.username}
        visible={showChat}
        onClose={() => setShowChat(false)}
        onSendMessage={handleSendMessage}
        messages={chatMessages}
      />

      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <button onClick={onBack} className="px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <div className="px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-xs text-gray-400">
          Board: <span className="font-mono text-gray-600">{boardId}</span>
          {!synced && <span className="ml-1.5 text-yellow-500">Syncing...</span>}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center gap-3 text-[10px] text-gray-400">
        <span>Ctrl+Z Undo</span>
        <span>Ctrl+Shift+Z Redo</span>
        <span>Ctrl+Scroll Zoom</span>
        <span>Alt+Drag Pan</span>
        <span>B Users</span>
        <span>C Chat</span>
      </div>
    </div>
  );
}
'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { BoardStore, BoardUser, RemoteCursor } from '@/lib/whiteboard/board-store';
import { getSession } from '@/lib/whiteboard/session';
import {
  DrawingConfig,
  DEFAULT_DRAWING_CONFIG,
  ChatMessage,
  Stroke,
} from '@/lib/whiteboard/types';
import Canvas, { CanvasHandle } from '@/components/whiteboard/Canvas';
import Toolbar from '@/components/whiteboard/Toolbar';
import CursorOverlay from '@/components/whiteboard/CursorOverlay';
import UserList from '@/components/whiteboard/UserList';
import ChatPanel from '@/components/whiteboard/ChatPanel';

interface WhiteboardAppProps {
  boardId: string;
  onBack: () => void;
}

export default function WhiteboardApp({ boardId, onBack }: WhiteboardAppProps) {
  const [connected, setConnected] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [showUsers, setShowUsers] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<BoardUser[]>([]);
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [config, setConfig] = useState<DrawingConfig>({ ...DEFAULT_DRAWING_CONFIG });

  const storeRef = useRef<BoardStore | null>(null);
  const canvasRef = useRef<CanvasHandle>(null);
  const session = useMemo(() => getSession(), []);

  useEffect(() => {
    const store = new BoardStore();
    storeRef.current = store;

    store.on('connection-change', (isConnected: boolean) => {
      setConnected(isConnected);
    });

    store.on('strokes-loaded', (loadedStrokes: Stroke[]) => {
      setStrokes(loadedStrokes);
    });

    store.on('stroke-added', (stroke: Stroke) => {
      setStrokes((prev) => {
        if (prev.some((s) => s.id === stroke.id)) return prev;
        return [...prev, stroke];
      });
    });

    store.on('stroke-removed', (strokeId: string) => {
      setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
    });

    store.on('board-cleared', () => {
      setStrokes([]);
    });

    store.on('chat-message', (message: ChatMessage) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    store.on('chat-history', (history: ChatMessage[]) => {
      setChatMessages(history);
    });

    // board-store emits 'users-update' with (users, cursors) as two args
    store.on('users-update', (...args: unknown[]) => {
      const newUsers = args[0] as BoardUser[];
      const newCursors = args[1] as RemoteCursor[];
      setUsers(newUsers ?? []);
      if (newCursors) setCursors(newCursors);
    });

    // board-store emits 'cursors-update' with just cursors array
    store.on('cursors-update', (newCursors: RemoteCursor[]) => {
      setCursors(newCursors ?? []);
    });

    store.connect(boardId, session);

    return () => {
      store.disconnect();
      storeRef.current = null;
    };
  }, [boardId, session]);

  // ── Handlers ──────────────────────────────────────────────

  const handleAddStroke = useCallback((stroke: Stroke) => {
    storeRef.current?.addStroke(stroke);
  }, []);

  const handleRemoveStroke = useCallback((strokeId: string) => {
    storeRef.current?.removeStroke(strokeId);
  }, []);

  const handleDrawingChange = useCallback((isDrawing: boolean) => {
    storeRef.current?.sendDrawingChange(isDrawing);
  }, []);

  const handleCursorMove = useCallback((cursor: { x: number; y: number } | null) => {
    storeRef.current?.sendCursorMove(cursor);
  }, []);

  const handleConfigChange = useCallback((update: Partial<DrawingConfig>) => {
    setConfig((prev) => ({ ...prev, ...update }));
  }, []);

  // Sync camera from Canvas → CursorOverlay (runs during pan/zoom)
  const handleCameraChange = useCallback((cam: { x: number; y: number; zoom: number }) => {
    setConfig((prev) => ({
      ...prev,
      viewport: { x: cam.x, y: cam.y, scale: cam.zoom },
    }));
  }, []);

  const handleUndo = useCallback(() => {
    storeRef.current?.requestUndo();
  }, []);

  const handleRedo = useCallback(() => {
    storeRef.current?.requestRedo();
  }, []);

  const handleClear = useCallback(() => {
    storeRef.current?.clearBoard();
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
    const newScale = Math.min(10, vp.scale * 1.2);
    canvasRef.current?.setViewport(vp.x, vp.y, newScale);
    setConfig((prev) => ({ ...prev, viewport: { ...vp, scale: newScale } }));
  }, []);

  const handleZoomOut = useCallback(() => {
    const vp = canvasRef.current?.getViewport();
    if (!vp) return;
    const newScale = Math.max(0.1, vp.scale / 1.2);
    canvasRef.current?.setViewport(vp.x, vp.y, newScale);
    setConfig((prev) => ({ ...prev, viewport: { ...vp, scale: newScale } }));
  }, []);

  const handleZoomReset = useCallback(() => {
    canvasRef.current?.setViewport(0, 0, 1);
    setConfig((prev) => ({ ...prev, viewport: { x: 0, y: 0, scale: 1 } }));
  }, []);

  const handleSendMessage = useCallback((message: ChatMessage) => {
    storeRef.current?.sendChatMessage(message);
  }, []);

  // Keyboard shortcuts
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

  return (
    <div className="w-full h-screen relative bg-gray-100 overflow-hidden">
      <Canvas
        ref={canvasRef}
        strokes={strokes}
        config={config}
        userId={session.id}
        onAddStroke={handleAddStroke}
        onRemoveStroke={handleRemoveStroke}
        onDrawingChange={handleDrawingChange}
        onCursorMove={handleCursorMove}
        onCameraChange={handleCameraChange}
      />

      <CursorOverlay
        cursors={cursors}
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
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <div className="px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-200 text-xs text-gray-400">
          Board: <span className="font-mono text-gray-600">{boardId}</span>
          {!connected && <span className="ml-1.5 text-yellow-500">Connecting...</span>}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center gap-3 text-[10px] text-gray-400">
        <span>Ctrl+Z Undo</span>
        <span>Ctrl+Shift+Z Redo</span>
        <span>Ctrl+Scroll Zoom</span>
        <span>Scroll / Alt+Drag Pan</span>
        <span>B Users</span>
        <span>C Chat</span>
      </div>
    </div>
  );
}

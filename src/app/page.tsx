'use client';

// ============================================================
// Main Page — Hash-based Router
// ============================================================
// Routes between LandingPage and WhiteboardApp based on URL hash.
//   /#               → Landing Page
//   /#board=abc123   → Whiteboard for board "abc123"
//
// Uses a `mounted` guard to prevent hydration mismatch:
// server always renders a spinner; client reads the hash
// only after mount and switches to the correct view.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from '@/components/whiteboard/LandingPage';
import WhiteboardApp from '@/components/whiteboard/WhiteboardApp';

type View =
  | { type: 'landing' }
  | { type: 'board'; boardId: string };

function parseHash(hash: string): View {
  if (!hash || hash === '#') return { type: 'landing' };

  const match = hash.match(/^#board=(.+)$/);
  if (match && match[1]) {
    return { type: 'board', boardId: match[1] };
  }

  return { type: 'landing' };
}

export default function Home() {
  // Default to landing; read hash only on client (window is undefined during SSR)
  const [view, setView] = useState<View>({ type: 'landing' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setView(parseHash(window.location.hash));
    setMounted(true);

    const handleHashChange = () => {
      setView(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Navigate to a board
  const handleEnterBoard = useCallback((boardId: string) => {
    window.location.hash = `board=${boardId}`;
    setView({ type: 'board', boardId });
  }, []);

  // Navigate back to landing
  const handleBack = useCallback(() => {
    window.location.hash = '';
    setView({ type: 'landing' });
  }, []);

  // Prevent hydration flash while client takes over
  if (!mounted) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (view.type === 'board') {
    return <WhiteboardApp boardId={view.boardId} onBack={handleBack} />;
  }

  return <LandingPage onEnterBoard={handleEnterBoard} />;
}

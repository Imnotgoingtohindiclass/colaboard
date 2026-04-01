'use client';

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

  const handleEnterBoard = useCallback((boardId: string) => {
    window.location.hash = `board=${boardId}`;
    setView({ type: 'board', boardId });
  }, []);

  const handleBack = useCallback(() => {
    window.location.hash = '';
    setView({ type: 'landing' });
  }, []);

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

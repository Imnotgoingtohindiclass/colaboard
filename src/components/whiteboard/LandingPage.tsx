'use client';

// ============================================================
// Landing Page Component
// ============================================================
// Entry point for the whiteboard app.
// Users can create a new board or join an existing one via ID or link.
// Board ID is stored in the URL hash for easy sharing.
//
// Uses useState + useEffect to avoid hydration mismatch:
// getSession() reads localStorage which is unavailable during SSR.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { generateBoardId } from '@/lib/whiteboard/utils';
import { getSession, getAvatarUrl } from '@/lib/whiteboard/session';
import {
  Pencil,
  Link2,
  Sparkles,
  Users,
  Zap,
  Shield,
} from 'lucide-react';

interface LandingPageProps {
  /** Called when user wants to enter a board */
  onEnterBoard: (boardId: string) => void;
}

export default function LandingPage({ onEnterBoard }: LandingPageProps) {
  const [boardInput, setBoardInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [session, setSession] = useState<ReturnType<typeof getSession> | null>(null);

  // Load session only on the client to avoid hydration mismatch
  // (getSession() reads localStorage which is undefined during SSR)
  useEffect(() => {
    setSession(getSession());
  }, []);

  const handleCreate = useCallback(() => {
    setIsCreating(true);
    // Small delay for visual feedback
    setTimeout(() => {
      const boardId = generateBoardId();
      onEnterBoard(boardId);
    }, 300);
  }, [onEnterBoard]);

  function handleJoin() {
    const id = boardInput.trim().toLowerCase();
    if (id.length >= 4) {
      onEnterBoard(id);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleJoin();
    }
  }

  // Show spinner while session loads (avoids hydration flash)
  if (!session) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-2xl mb-4 shadow-lg">
            <Pencil className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            colaboard
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Real-time collaborative whiteboard. Draw together!
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-gray-200/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gray-400" />
              Get Started
            </CardTitle>
            <CardDescription>
              Create a new board or join an existing one
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* User identity */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <img
                src={getAvatarUrl(session.avatarSeed, 40)}
                alt="Your avatar"
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {session.username}
                </p>
                <p className="text-xs text-gray-400">Your identity for this session</p>
              </div>
              <div
                className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: session.color }}
              />
            </div>

            {/* Create new board */}
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full h-12 text-base font-medium rounded-xl bg-gray-900 hover:bg-gray-800 transition-all"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Create New Board
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR JOIN EXISTING</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Join existing board */}
            <div className="flex gap-2">
              <Input
                value={boardInput}
                onChange={(e) => setBoardInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter board ID..."
                className="h-12 rounded-xl border-gray-200"
                maxLength={16}
              />
              <Button
                onClick={handleJoin}
                disabled={boardInput.trim().length < 4}
                variant="outline"
                className="h-12 px-6 rounded-xl border-gray-200"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Join
              </Button>
            </div>

            {boardInput.trim().length > 0 && boardInput.trim().length < 4 && (
              <p className="text-xs text-amber-600">
                Board ID must be at least 4 characters
              </p>
            )}
          </CardContent>
        </Card>

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <FeatureCard icon={<Users className="h-4 w-4" />} title="Multi-User" desc="Draw together in real time" />
          <FeatureCard icon={<Zap className="h-4 w-4" />} title="Low Latency" desc="Instant sync" />
          <FeatureCard icon={<Shield className="h-4 w-4" />} title="No Login" desc="Just open and start" />
        </div>
      </div>
    </div>
  );
}

/** Small feature highlight card */
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="text-center p-3">
      <div className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg mb-2 text-gray-500">
        {icon}
      </div>
      <p className="text-xs font-medium text-gray-700">{title}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
    </div>
  );
}

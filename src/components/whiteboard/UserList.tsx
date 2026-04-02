'use client';

// ============================================================
// User List Component
// ============================================================
// Displays all active users in the current whiteboard room.
// Receives users from WhiteboardApp via BroadcastChannel + presence.
// ============================================================

import React from 'react';
import type { BoardUser } from '@/lib/whiteboard/board-store';
import { getAvatarUrl } from '@/lib/whiteboard/session';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Copy, Users } from 'lucide-react';

interface UserListProps {
  /** Array of active users from BoardStore */
  users: BoardUser[];
  /** Current user's ID (to highlight "You") */
  ownUserId: string;
  /** Whether the panel is visible */
  visible: boolean;
  /** Close callback */
  onClose: () => void;
  /** Board ID for display */
  boardId: string;
}

export default function UserList({ users, ownUserId, visible, onClose, boardId }: UserListProps) {
  if (!visible) return null;

  const copyBoardLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#board=${boardId}`;
    navigator.clipboard.writeText(url).catch(() => {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    });
  };

  return (
    <div className="absolute right-4 top-14 z-20 w-64 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-right-2">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Users ({users.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md"
            onClick={copyBoardLink}
            title="Copy board link"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="max-h-80">
        <div className="p-2 space-y-1">
          {users.map((user) => (
            <div
              key={user.id}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors ${
                user.id === ownUserId
                  ? 'bg-gray-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={getAvatarUrl(user.avatarSeed, 32)}
                  alt={user.username}
                  className="w-7 h-7 rounded-full"
                />
              </div>

              {/* Username */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {user.username}
                  </span>
                  {user.id === ownUserId && (
                    <span className="text-[10px] px-1 py-0.5 bg-gray-200 text-gray-500 rounded font-medium">
                      You
                    </span>
                  )}
                </div>
              </div>

              {/* Color indicator */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-200"
                style={{ backgroundColor: user.color }}
              />
            </div>
          ))}

          {users.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              No users connected
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Share link hint */}
      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
        <p className="text-[11px] text-gray-400 text-center">
          Share the URL to invite others
        </p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import type { RemoteCursor } from '@/lib/whiteboard/board-store';

interface CursorOverlayProps {
  cursors: RemoteCursor[];
  viewport: { x: number; y: number; scale: number };
}

export default function CursorOverlay({ cursors, viewport }: CursorOverlayProps) {
  if (cursors.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {cursors.map(({ userId, username, color, x, y }) => {
        const screenX = x * viewport.scale + viewport.x;
        const screenY = y * viewport.scale + viewport.y;

        if (screenX < -50 || screenY < -50 || screenX > window.innerWidth + 50 || screenY > window.innerHeight + 50) {
          return null;
        }

        return (
          <div
            key={userId}
            className="absolute transition-all duration-75 ease-out"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
              transition: 'transform 75ms ease-out, opacity 200ms',
            }}
          >
            {/* Cursor pointer */}
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              className="drop-shadow-sm"
            >
              <path
                d="M1 1L6 18L8.5 10.5L15 8L1 1Z"
                fill={color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Username label */}
            <div
              className="absolute left-3 top-4 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap shadow-sm"
              style={{
                backgroundColor: color,
                color: 'white',
              }}
            >
              <span>{username}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

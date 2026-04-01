'use client';

import React from 'react';
import { RemoteCursor } from '@/lib/whiteboard/whiteboard-socket';

interface CursorOverlayProps {
  cursors: Map<string, RemoteCursor>;
  drawingUsers: Set<string>;
  ownUserId: string;
  viewport: { x: number; y: number; scale: number };
}

export default function CursorOverlay({ cursors, drawingUsers, ownUserId, viewport }: CursorOverlayProps) {
  if (cursors.size === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {Array.from(cursors.entries()).map(([userId, cursor]) => {
        if (userId === ownUserId) return null;

        const screenX = cursor.x * viewport.scale + viewport.x;
        const screenY = cursor.y * viewport.scale + viewport.y;

        if (screenX < -20 || screenY < -20 || screenX > window.innerWidth + 20 || screenY > window.innerHeight + 20) {
          return null;
        }

        return (
          <div
            key={userId}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${screenX}px, ${screenY}px)`,
              transition: 'transform 75ms ease-out',
              willChange: 'transform',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            {/* Small cursor arrow */}
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" style={{ display: 'block' }}>
              <path
                d="M1 1L4.5 14L6 8L11 6L1 1Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            {/* Username label - compact */}
            <div
              style={{
                position: 'absolute',
                left: 10,
                top: 10,
                backgroundColor: cursor.color,
                color: 'white',
                fontSize: '10px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                padding: '1px 5px',
                borderRadius: '4px',
                lineHeight: '1.3',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {cursor.username}
              {drawingUsers.has(userId) && (
                <span style={{
                  display: 'inline-block',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  marginLeft: '3px',
                  animation: 'pulse 1s infinite',
                }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
# [colaboard](https://colaboard.vercel.app)

Real-time collaborative whiteboard. No sign-up required.

---

## Features

- **Live drawing** — Pen and eraser with color and adjustable thickness
- **Real-time sync** — Strokes and chat appear instantly across all sessions
- **Chat** — Built-in text chat alongside the canvas
- **Zoom & pan** — Ctrl+Scroll to zoom, Alt+Drag to pan
- **Undo / redo** — Per-user undo stack (Ctrl+Z / Ctrl+Shift+Z)
- **Export** — Save as PNG or SVG
- **Board sharing** — Each board gets a unique shareable URL

## How It Works

Drawing and chat data is persisted in Supabase (PostgreSQL). When a stroke is drawn or a message is sent, it's written to the database and simultaneously pushed to all connected clients via Supabase Realtime's `postgres_changes` WebSocket channel. The drawing user sees changes immediately via optimistic local rendering — everyone else receives them through the WebSocket with minimal latency.

Cursor positions and presence updates use the browser's native BroadcastChannel API for instant same-browser tab-to-tab delivery with zero network overhead. These are ephemeral and don't need to persist across devices.

## Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/imnotgoingtohindiclass/colaboard.git
cd colaboard
npm install
```

### 2. Create database tables

In your Supabase project's **SQL Editor**, run:

```sql
CREATE TABLE IF NOT EXISTS public.strokes (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  points JSONB NOT NULL DEFAULT '[]',
  color TEXT NOT NULL DEFAULT '#000000',
  thickness REAL NOT NULL DEFAULT 3,
  tool TEXT NOT NULL DEFAULT 'pen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT 'Anonymous',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strokes_board ON public.strokes(board_id);
CREATE INDEX IF NOT EXISTS idx_chat_board ON public.chat_messages(board_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.strokes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
```

### 3. Environment variables

```bash
touch .env.local
```

Add your Supabase credentials (found in **Supabase → Settings → API**):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run

```bash
npm run dev
```

Open `http://localhost:3000`. Create a board, then open the same URL in another tab to test real-time sync.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+Scroll` | Zoom |
| `Alt+Drag` | Pan |
| `B` | Toggle users |
| `C` | Toggle chat |
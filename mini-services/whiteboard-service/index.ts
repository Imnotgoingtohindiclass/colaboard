import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = 3004;

interface Stroke {
  id: string;
  userId: string;
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  thickness: number;
  tool: string;
  createdAt: number;
}

interface UserPresence {
  id: string;
  username: string;
  avatarSeed: string;
  color: string;
  cursor: { x: number; y: number } | null;
  isDrawing: boolean;
  lastActive: number;
}

interface Room {
  strokes: Stroke[];
  users: Map<string, UserPresence>;
  undoStacks: Map<string, Stroke[]>;
}

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = { strokes: [], users: new Map(), undoStacks: new Map() };
    rooms.set(roomId, room);
    console.log(`[Room ${roomId}] Created`);
  }
  return room;
}

function cleanupRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room && room.users.size === 0) {
    rooms.delete(roomId);
    console.log(`[Room ${roomId}] Cleaned up. Active: ${rooms.size}`);
  }
}

io.on('connection', (socket) => {
  console.log(`[Server] Connected: ${socket.id}`);
  let currentRoomId: string | null = null;

  socket.on('join-room', (data: { roomId: string; user: UserPresence }) => {
    if (currentRoomId) {
      const oldRoom = rooms.get(currentRoomId);
      if (oldRoom) {
        oldRoom.users.delete(data.user.id);
        socket.to(currentRoomId).emit('user-left', { userId: data.user.id });
        cleanupRoom(currentRoomId);
      }
    }

    currentRoomId = data.roomId;
    const room = getOrCreateRoom(currentRoomId);
    room.users.set(data.user.id, { ...data.user, cursor: null, isDrawing: false, lastActive: Date.now() });
    socket.join(currentRoomId);

    // Send current state to the new user
    socket.emit('room-state', {
      strokes: room.strokes,
      users: Array.from(room.users.values()),
    });

    // Notify others
    socket.to(currentRoomId).emit('user-joined', { user: data.user });
    console.log(`[Room ${currentRoomId}] ${data.user.username} joined. Users: ${room.users.size}`);
  });

  socket.on('add-stroke', (data: { roomId: string; stroke: Stroke }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.strokes.push(data.stroke);
    // Clear the user's redo stack when they draw something new
    room.undoStacks.set(data.stroke.userId, []);
    socket.to(currentRoomId).emit('stroke-added', { stroke: data.stroke });
  });

  socket.on('request-undo', (data: { roomId: string; userId: string }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    // Find the last stroke by this user
    let removedIdx = -1;
    for (let i = room.strokes.length - 1; i >= 0; i--) {
      if (room.strokes[i].userId === data.userId) {
        removedIdx = i;
        break;
      }
    }

    if (removedIdx === -1) return;

    const removed = room.strokes.splice(removedIdx, 1)[0];
    const undoStack = room.undoStacks.get(data.userId) || [];
    undoStack.push(removed);
    room.undoStacks.set(data.userId, undoStack);

    io.to(currentRoomId).emit('stroke-removed', { strokeId: removed.id });
  });

  socket.on('request-redo', (data: { roomId: string; userId: string }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const undoStack = room.undoStacks.get(data.userId);
    if (!undoStack || undoStack.length === 0) return;

    const restored = undoStack.pop();
    room.undoStacks.set(data.userId, undoStack);
    if (restored) {
      room.strokes.push(restored);
    }
    room.undoStacks.set(data.userId, undoStack);

    io.to(currentRoomId).emit('stroke-added', { stroke: restored });
  });

  socket.on('clear-board', (data: { roomId: string }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.strokes = [];
    room.undoStacks.clear();
    io.to(currentRoomId).emit('board-cleared');
  });

  socket.on('cursor-move', (data: { roomId: string; userId: string; x: number; y: number }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const user = room.users.get(data.userId);
    if (user) {
      user.cursor = { x: data.x, y: data.y };
      user.lastActive = Date.now();
      socket.to(currentRoomId).emit('cursor-update', {
        userId: data.userId,
        x: data.x,
        y: data.y,
        username: user.username,
        color: user.color,
      });
    }
  });

  socket.on('drawing-change', (data: { roomId: string; userId: string; isDrawing: boolean }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const user = room.users.get(data.userId);
    if (user) {
      user.isDrawing = data.isDrawing;
      user.lastActive = Date.now();
      socket.to(currentRoomId).emit('drawing-state', {
        userId: data.userId,
        isDrawing: data.isDrawing,
      });
    }
  });

  socket.on('chat-message', (data: unknown) => {
    if (!currentRoomId) return;
    io.to(currentRoomId).emit('chat-message', data);
  });

  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (room) {
      room.users.delete(socket.id);
      socket.to(currentRoomId).emit('user-left', { userId: socket.id });
      cleanupRoom(currentRoomId);
    }
    console.log(`[Server] Disconnected: ${socket.id}`);
  });

  socket.on('error', (err) => {
    console.error(`[Server] Error (${socket.id}):`, err);
  });
});

// Cleanup stale users every 30s
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    for (const [userId, user] of room.users) {
      if (now - user.lastActive > 60000) {
        room.users.delete(userId);
        io.to(roomId).emit('user-left', { userId });
      }
    }
    if (room.users.size === 0) cleanupRoom(roomId);
  }
}, 30000);

httpServer.listen(PORT, () => {
  console.log(`[Server] Whiteboard sync server running on port ${PORT}`);
});

function shutdown(signal: string) {
  console.log(`[Server] ${signal}, shutting down...`);
  io.close();
  httpServer.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
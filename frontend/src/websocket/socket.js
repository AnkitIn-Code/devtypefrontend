import { io } from 'socket.io-client';
import { WS_URL } from '@constants';

let socket = null;

export const getSocket = () => socket;

/**
 * Initialize and connect the Socket.IO client.
 *
 * netty-socketio reads the JWT from query parameters (?token=…),
 * NOT from the socket.io-client `auth` object.
 * The frontend passes the access token so the server can validate on connect.
 */
export const initSocket = (token) => {
  if (socket?.connected) return socket;

  // Disconnect stale socket if any
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(WS_URL, {
    // Pass JWT as query param — netty-socketio AuthorizationListener reads this
    query: { token: token || '' },
    // Also pass in auth for forward-compat with other socket.io servers
    auth: { token: token || '' },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    // BUG-L06: exponential backoff — starts at 1s, caps at 5s, ±50% jitter
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('error', (data) => {
    console.error('[Socket] Server error:', data?.code, data?.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const emit = (event, data) => {
  if (socket?.connected) {
    socket.emit(event, data);
  } else if (socket) {
    socket.connect();
    setTimeout(() => {
      if (socket?.connected) socket.emit(event, data);
    }, 500);
  } else {
    console.warn('[Socket] Not connected. Cannot emit:', event);
  }
};

export const on = (event, callback) => {
  socket?.on(event, callback);
  return () => socket?.off(event, callback);
};

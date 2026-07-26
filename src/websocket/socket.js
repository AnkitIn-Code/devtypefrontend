import { io } from 'socket.io-client';
import { WS_URL } from '@constants';

let socket = null;

export const getSocket = () => socket;

export const initSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
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
  } else {
    console.warn('[Socket] Not connected. Cannot emit:', event);
  }
};

export const on = (event, callback) => {
  socket?.on(event, callback);
  return () => socket?.off(event, callback);
};

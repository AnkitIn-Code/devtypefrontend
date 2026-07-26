import { useEffect, useRef, useState, useCallback } from 'react';
import { initSocket, disconnectSocket, emit as socketEmit, on as socketOn, getSocket } from './socket';
import { useAuthStore } from '@store/auth.store';

export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = initSocket(accessToken);
    socketRef.current = socket;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated, accessToken]);

  const emit = useCallback((event, data) => {
    socketEmit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    return socketOn(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    getSocket()?.off(event, handler);
  }, []);

  return { isConnected, emit, on, off, socket: socketRef.current };
};

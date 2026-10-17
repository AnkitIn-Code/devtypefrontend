import api from './axios';

export const multiplayerApi = {
  /** 
   * @deprecated Room creation is handled exclusively in real-time via Socket.IO `room:create` event.
   */
  createRoom: async () => {
    console.warn('[multiplayerApi] REST createRoom is deprecated. Rooms must be created via Socket.IO room:create.');
    return { data: null };
  },

  /** Get live room info — tries REST /api/rooms/{code} which reads from RoomStateStore. */
  getRoomInfo: async (roomCode) => {
    const res = await api.get(`/rooms/${roomCode.toUpperCase()}`);
    return { data: res.data };
  },

  /** List open lobby rooms from the live RoomStateStore. */
  listRooms: async () => {
    const res = await api.get('/rooms');
    return { data: res.data };
  },

  /** Get user's multiplayer match history */
  getMatchHistory: async (limit = 10) => {
    const res = await api.get('/rooms/history/me', { params: { limit } });
    return { data: res.data || [] };
  },
};

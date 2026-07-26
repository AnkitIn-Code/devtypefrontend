const delay = (ms = 500) => new Promise(res => setTimeout(res, ms));

export const multiplayerApi = {
  createRoom: async (settings) => {
    await delay();
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    return {
      data: {
        roomCode,
        roomId: 'room_' + Date.now(),
        hostId: settings.userId,
        templateId: settings.templateId || 'tpl_001',
        maxPlayers: settings.maxPlayers || 4,
        status: 'WAITING',
        inviteLink: `${window.location.origin}/multiplayer/${roomCode}`,
      },
    };
  },

  joinRoom: async (roomCode, userId) => {
    await delay();
    return {
      data: {
        roomCode,
        roomId: 'room_existing',
        templateId: 'tpl_001',
        players: [
          { id: 'usr_host', name: 'RoomHost', isReady: false, progress: 0 },
        ],
        status: 'WAITING',
      },
    };
  },

  getRoomInfo: async (roomCode) => {
    await delay(300);
    return {
      data: {
        roomCode,
        template: { id: 'tpl_001', title: 'Binary Search', language: 'java' },
        players: [
          { id: 'usr_001', name: 'Player1', isReady: true, progress: 0 },
          { id: 'usr_002', name: 'Player2', isReady: false, progress: 0 },
        ],
        status: 'WAITING',
        maxPlayers: 4,
      },
    };
  },
};

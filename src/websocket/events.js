// WebSocket Event Constants
export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Typing Session
  SESSION_START: 'session:start',
  SESSION_PAUSE: 'session:pause',
  SESSION_RESUME: 'session:resume',
  SESSION_FINISH: 'session:finish',
  TYPING_UPDATE: 'typing:update',
  STATISTICS: 'statistics:update',

  // Multiplayer
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_UPDATE: 'room:update',
  PLAYER_READY: 'player:ready',
  COUNTDOWN: 'countdown',
  RACE_START: 'race:start',
  PLAYER_PROGRESS: 'player:progress',
  RACE_FINISH: 'race:finish',
  PLAYER_FINISHED: 'player:finished',

  // Leaderboard
  LEADERBOARD_UPDATE: 'leaderboard:update',

  // Notifications
  NOTIFICATION: 'notification',
  ACHIEVEMENT_UNLOCK: 'achievement:unlock',
};

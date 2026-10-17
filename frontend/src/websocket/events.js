// WebSocket Event Constants — keep in sync with SocketEventConstants.java on the backend
export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Typing Session (solo)
  SESSION_START: 'session:start',
  SESSION_PAUSE: 'session:pause',
  SESSION_RESUME: 'session:resume',
  SESSION_FINISH: 'session:finish',
  TYPING_UPDATE: 'typing:update',
  STATISTICS: 'statistics:update',

  // ── Room lifecycle ──────────────────────────────────────────────────────
  ROOM_CREATE:        'room:create',
  ROOM_JOIN:          'room:join',
  ROOM_JOINED:        'room:joined',
  ROOM_PLAYER_JOINED: 'room:playerJoined',
  ROOM_PLAYER_LEFT:   'room:playerLeft',
  ROOM_LEAVE:         'room:leave',
  ROOM_KICK:          'room:kick',
  ROOM_KICKED:        'room:kicked',
  ROOM_CLOSE:         'room:close',
  ROOM_CLOSED:        'room:closed',
  ROOM_START:         'room:start',
  ROOM_CHAT:          'room:chat',
  ROOM_TEMPLATE_CHANGE:'room:templateChange',

  // ── Race ─────────────────────────────────────────────────────────────────
  PLAYER_READY:        'player:ready',
  RACE_COUNTDOWN:      'race:countdown',
  RACE_START:          'race:start',
  // BUG-C04: emitted when the race is aborted because player count < 2 at countdown end
  RACE_CANCELLED:      'race:cancelled',
  RACE_PROGRESS:       'race:progress',
  RACE_PLAYER_FINISHED:'race:playerFinished',
  RACE_RESULTS:        'race:results',

  // Legacy aliases (used in some places)
  ROOM_UPDATE:         'room:update',
  COUNTDOWN:           'race:countdown',
  PLAYER_PROGRESS:     'race:progress',
  PLAYER_FINISHED:     'race:playerFinished',
  RACE_FINISH:         'race:results',

  // ── Duel ─────────────────────────────────────────────────────────────────
  DUEL_QUEUE:          'duel:queue',
  DUEL_MATCH_FOUND:    'duel:matchFound',
  DUEL_RATING_UPDATE:  'duel:ratingUpdate',

  // ── Battle Royale ─────────────────────────────────────────────────────────
  ROYALE_ELIMINATED:   'royale:eliminated',
  ROYALE_ROUND_START:  'royale:roundStart',

  // ── Relay ─────────────────────────────────────────────────────────────────
  RELAY_TURN_CHANGE:   'relay:turnChange',

  // ── Ghost / Boss ──────────────────────────────────────────────────────────
  GHOST_START:         'ghost:start',
  BOSS_START:          'boss:start',

  // ── Misc ──────────────────────────────────────────────────────────────────
  LEADERBOARD_UPDATE:  'leaderboard:update',
  NOTIFICATION:        'notification',
  ACHIEVEMENT_UNLOCK:  'achievement:unlock',
};

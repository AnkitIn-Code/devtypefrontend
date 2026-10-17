const io = require('./frontend/node_modules/socket.io-client');
const axios = require('./frontend/node_modules/axios');

const API_BASE = 'http://localhost:8080/api';
const WS_URL = 'http://localhost:9092';

async function createAuthenticatedUser(prefix) {
  const rand = Math.floor(Math.random() * 1000000);
  const user = {
    username: `${prefix}_${rand}`,
    email: `${prefix}_${rand}@devtype.test`,
    password: 'Password123!'
  };
  const regRes = await axios.post(`${API_BASE}/auth/register`, user);
  return {
    ...user,
    id: regRes.data.user.id,
    token: regRes.data.accessToken
  };
}

function connectSocket(token) {
  return io(WS_URL, {
    query: { token },
    transports: ['websocket', 'polling'],
    forceNew: true,
    reconnection: false
  });
}

function waitForEvent(socket, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeoutMs);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function runMultiplayerAudit() {
  console.log('========================================');
  console.log('RUNNING FULL MULTIPLAYER & REALTIME AUDIT');
  console.log('========================================\n');

  const results = {};

  // Setup test users
  console.log('[SETUP] Creating test racers...');
  const hostUser = await createAuthenticatedUser('host');
  const racer2 = await createAuthenticatedUser('racer2');
  const racer3 = await createAuthenticatedUser('racer3');
  const spectatorUser = await createAuthenticatedUser('spectator');
  console.log('  Created racers:', hostUser.username, racer2.username, racer3.username, spectatorUser.username);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: BUG-C01 — Refresh mid-lobby as same user (no duplicate player)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 1] BUG-C01 — Refresh mid-lobby (Deduplication Check)');
  const hostSock1 = connectSocket(hostUser.token);
  let roomCode = null;

  try {
    await new Promise((resolve) => hostSock1.on('connect', resolve));
    hostSock1.emit('room:create', { mode: 'CLASSIC_RACE', maxPlayers: 8 });
    const createData = await waitForEvent(hostSock1, 'room:joined');
    roomCode = createData.roomCode;
    console.log(`  Room created: ${roomCode} with ${createData.players.length} player(s)`);

    // Simulate tab refresh: new socket connection for same hostUser joining the same room
    const hostSock2 = connectSocket(hostUser.token);
    await new Promise((resolve) => hostSock2.on('connect', resolve));
    hostSock2.emit('room:join', { roomCode });
    const refreshData = await waitForEvent(hostSock2, 'room:joined');
    console.log(`  After refresh/re-join, players list length: ${refreshData.players.length}`);
    const hostEntries = refreshData.players.filter(p => p.userId === hostUser.id);
    console.log(`  Host user entries count: ${hostEntries.length}`);

    results.bugC01_lobbyDeduplication = (hostEntries.length === 1 && refreshData.players.length === 1) ? 'FIXED' : 'STILL BROKEN';
    hostSock1.disconnect();
  } catch (e) {
    console.error('  Error in Test 1:', e.message);
    results.bugC01_lobbyDeduplication = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: BUG-H12 & BUG-L09 — Non-host permissions check
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 2] BUG-H12 & BUG-L09 — Non-host start & templateChange Rejection');
  const racer2Sock = connectSocket(racer2.token);
  try {
    await new Promise((resolve) => racer2Sock.on('connect', resolve));
    racer2Sock.emit('room:join', { roomCode });
    await waitForEvent(racer2Sock, 'room:joined');
    console.log('  Racer 2 joined room');

    // Non-host attempts room:start
    let startErrorReceived = false;
    racer2Sock.on('error', (err) => {
      if (err.code === 'FORBIDDEN') {
        console.log('  Received expected FORBIDDEN on non-host room:start');
        startErrorReceived = true;
      }
    });
    racer2Sock.emit('room:start', { roomCode });
    await new Promise(r => setTimeout(r, 600));

    // Non-host attempts room:templateChange
    let templateErrorReceived = false;
    racer2Sock.on('error', (err) => {
      if (err.code === 'FORBIDDEN') {
        console.log('  Received expected FORBIDDEN on non-host room:templateChange');
        templateErrorReceived = true;
      }
    });
    racer2Sock.emit('room:templateChange', {
      roomCode,
      title: 'Hacked Template',
      code: 'alert(1);'
    });
    await new Promise(r => setTimeout(r, 600));

    results.bugH12_nonHostStart = startErrorReceived ? 'FIXED (Blocked)' : 'STILL BROKEN (Allowed)';
    results.bugL09_nonHostTemplate = templateErrorReceived ? 'FIXED (Blocked)' : 'STILL BROKEN (Allowed)';
  } catch (e) {
    results.bugH12_nonHostStart = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: BUG-L08 & SEC-06 — Chat rate limit & HTML sanitization
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 3] BUG-L08 & SEC-06 — Chat Rate Limit & HTML Sanitization');
  try {
    let receivedChat = null;
    racer2Sock.on('room:chat', (msg) => {
      receivedChat = msg;
    });

    // Send XSS test message
    racer2Sock.emit('room:chat', {
      roomCode,
      message: '<script>alert("XSS")</script><b>Hello</b>'
    });
    await new Promise(r => setTimeout(r, 500));
    console.log('  Sanitized chat received:', receivedChat?.message);
    const isSanitized = receivedChat && !receivedChat.message.includes('<script>') && receivedChat.message.includes('&lt;script&gt;');

    // Test chat rate limit (send 7 rapid messages)
    let hitRateLimit = false;
    racer2Sock.on('error', (err) => {
      if (err.code === 'RATE_LIMITED') {
        hitRateLimit = true;
      }
    });
    for (let i = 0; i < 7; i++) {
      racer2Sock.emit('room:chat', { roomCode, message: `Spam message #${i}` });
    }
    await new Promise(r => setTimeout(r, 600));
    console.log('  Hit chat rate limit (max 5 per 5s):', hitRateLimit);

    results.sec06_chatSanitization = isSanitized ? 'FIXED (HTML Escaped)' : 'STILL BROKEN';
    results.bugL08_chatRateLimit = hitRateLimit ? 'FIXED (Rate limited)' : 'STILL BROKEN';
  } catch (e) {
    results.sec06_chatSanitization = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: FEAT-S01 — Spectator Mode
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 4] FEAT-S01 — Spectator Mode');
  const spectatorSock = connectSocket(spectatorUser.token);
  try {
    await new Promise((resolve) => spectatorSock.on('connect', resolve));
    spectatorSock.emit('room:spectate', { roomCode });
    const spectateJoined = await waitForEvent(spectatorSock, 'room:joined');
    console.log(`  Spectator joined. Total players in room state: ${spectateJoined.players.length}`);
    console.log(`  Spectator isSpectator flag: ${spectateJoined.isSpectator}`);
    const spectatorInPlayersList = spectateJoined.players.some(p => p.userId === spectatorUser.id);
    console.log(`  Spectator is listed as racing player: ${spectatorInPlayersList}`);

    results.featS01_spectatorMode = (spectateJoined.isSpectator === true && !spectatorInPlayersList) ? 'WORKING' : 'BROKEN';
  } catch (e) {
    results.featS01_spectatorMode = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: BUG-C04 — Disconnect player mid-countdown (Clean cancel)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 5] BUG-C04 — Disconnect Mid-Countdown');
  try {
    // Create new 2-player room
    const c4Host = await createAuthenticatedUser('c4_host');
    const c4Guest = await createAuthenticatedUser('c4_guest');
    const c4HostSock = connectSocket(c4Host.token);
    const c4GuestSock = connectSocket(c4Guest.token);

    await new Promise(r => c4HostSock.on('connect', r));
    await new Promise(r => c4GuestSock.on('connect', r));

    c4HostSock.emit('room:create', { mode: 'CLASSIC_RACE' });
    const c4RoomData = await waitForEvent(c4HostSock, 'room:joined');
    const c4Code = c4RoomData.roomCode;

    c4GuestSock.emit('room:join', { roomCode: c4Code });
    await waitForEvent(c4GuestSock, 'room:joined');

    // Host starts countdown
    c4HostSock.emit('room:start', { roomCode: c4Code });
    await waitForEvent(c4HostSock, 'race:countdown');
    console.log('  Countdown started...');

    // Immediately disconnect guest during countdown
    c4GuestSock.disconnect();
    console.log('  Guest disconnected mid-countdown');

    // Wait for race:cancelled event
    let raceCancelled = false;
    let raceStarted = false;
    c4HostSock.on('race:cancelled', (data) => {
      console.log('  Received race:cancelled event:', data);
      raceCancelled = true;
    });
    c4HostSock.on('race:start', () => {
      raceStarted = true;
    });

    await new Promise(r => setTimeout(r, 4500));
    console.log('  Race cancelled cleanly:', raceCancelled, '| 1-player race started:', raceStarted);

    results.bugC04_countdownDisconnectCancel = (raceCancelled && !raceStarted) ? 'FIXED' : 'STILL BROKEN';
    c4HostSock.disconnect();
  } catch (e) {
    results.bugC04_countdownDisconnectCancel = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: BUG-C03 — 1v1 DUEL matchmaking, DB persistence & rating update
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 6] BUG-C03 — 1v1 Duel Matchmaking, DB Persistence & Results');
  try {
    const duelUser1 = await createAuthenticatedUser('duel1');
    const duelUser2 = await createAuthenticatedUser('duel2');
    const dSock1 = connectSocket(duelUser1.token);
    const dSock2 = connectSocket(duelUser2.token);

    await new Promise(r => dSock1.on('connect', r));
    await new Promise(r => dSock2.on('connect', r));

    // Player 1 queues
    dSock1.emit('duel:queue', {});
    await new Promise(r => setTimeout(r, 300));

    // Player 2 queues -> matchmaking triggers
    let match1 = null, match2 = null;
    dSock1.on('duel:matchFound', (data) => { match1 = data; });
    dSock2.on('duel:matchFound', (data) => { match2 = data; });
    dSock2.emit('duel:queue', {});

    await new Promise(r => setTimeout(r, 1000));
    console.log('  Duel match found roomCode:', match1?.roomCode);
    const duelCode = match1?.roomCode;

    if (duelCode) {
      // Check if room was saved to DB (BUG-C03 fix)
      let dbRoomFound = false;
      try {
        const dbRes = await axios.get(`${API_BASE}/rooms/${duelCode}`);
        dbRoomFound = !!dbRes.data;
      } catch (e) {
        // Fallback check through list
        const listRes = await axios.get(`${API_BASE}/rooms`);
        dbRoomFound = listRes.data?.content?.some(r => r.code === duelCode);
      }
      console.log('  Duel room persisted to DB before start:', dbRoomFound);

      // Finish the race and verify ELO rating update event
      let ratingUpdate1 = null;
      dSock1.on('duel:ratingUpdate', (data) => { ratingUpdate1 = data; });

      // Player 1 readies & starts
      dSock1.emit('player:ready', { roomCode: duelCode });
      dSock2.emit('player:ready', { roomCode: duelCode });

      await waitForEvent(dSock1, 'race:start', 6000);
      console.log('  Duel race started!');

      // Player 1 finishes with 100 WPM
      dSock1.emit('race:playerFinished', {
        roomCode: duelCode,
        wpm: 100,
        accuracy: 98
      });

      // Player 2 finishes with 70 WPM
      dSock2.emit('race:playerFinished', {
        roomCode: duelCode,
        wpm: 70,
        accuracy: 95
      });

      const raceResults = await waitForEvent(dSock1, 'race:results', 5000);
      console.log('  Duel race:results received, count:', raceResults?.results?.length);
      console.log('  Rating update received by winner:', ratingUpdate1);

      results.bugC03_duelPersistenceAndElo = (dbRoomFound && raceResults?.results?.length === 2 && ratingUpdate1) ? 'FIXED' : 'PARTIALLY FIXED';
    } else {
      results.bugC03_duelPersistenceAndElo = 'FAIL: No match found';
    }
    dSock1.disconnect();
    dSock2.disconnect();
  } catch (e) {
    results.bugC03_duelPersistenceAndElo = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Ghost / Boss Fight Mode & FEAT-M01 Fallback Button
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 7] Ghost & Boss Fight Bot Exclusions & Fallback');
  try {
    const bossUser = await createAuthenticatedUser('bossUser');
    const bossSock = connectSocket(bossUser.token);
    await new Promise(r => bossSock.on('connect', r));

    bossSock.emit('room:create', { mode: 'CLASSIC_RACE' });
    const bRoom = await waitForEvent(bossSock, 'room:joined');
    const bCode = bRoom.roomCode;

    // Trigger bot fallback button (FEAT-M01: boss:start)
    bossSock.emit('boss:start', { roomCode: bCode });
    await waitForEvent(bossSock, 'race:countdown', 5000);
    console.log('  boss:start successfully triggered countdown for solo player!');

    const bStart = await waitForEvent(bossSock, 'race:start', 5000);
    console.log('  Boss Fight race started!');

    // Player finishes
    bossSock.emit('race:playerFinished', {
      roomCode: bCode,
      wpm: 90,
      accuracy: 99
    });

    const bResults = await waitForEvent(bossSock, 'race:results', 5000);
    console.log('  Boss fight final results entries:', bResults?.results?.length);
    const botInResults = bResults?.results?.some(p => p.isBot || p.username.toLowerCase().includes('boss') || p.username.toLowerCase().includes('bot'));
    console.log('  Bot appears in ranked placements:', botInResults);

    results.featM01_bossFallbackButton = 'FIXED';
    results.bugH08_botExcludedFromResults = (!botInResults && bResults?.results?.length === 1) ? 'FIXED' : 'STILL BROKEN';
    bossSock.disconnect();
  } catch (e) {
    results.featM01_bossFallbackButton = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Relay Mode Turn Advancement (BUG-H01, BUG-H13, FEAT-M02)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 8] Relay Mode Turn Advancement');
  try {
    const relay1 = await createAuthenticatedUser('relay1');
    const relay2 = await createAuthenticatedUser('relay2');
    const rSock1 = connectSocket(relay1.token);
    const rSock2 = connectSocket(relay2.token);

    await new Promise(r => rSock1.on('connect', r));
    await new Promise(r => rSock2.on('connect', r));

    rSock1.emit('room:create', { mode: 'RELAY' });
    const rRoom = await waitForEvent(rSock1, 'room:joined');
    const rCode = rRoom.roomCode;

    rSock2.emit('room:join', { roomCode: rCode });
    await waitForEvent(rSock2, 'room:joined');

    // Host starts race
    rSock1.emit('room:start', { roomCode: rCode });
    await waitForEvent(rSock1, 'race:start', 6000);
    console.log('  Relay race started!');

    let turnChangeEvent = null;
    rSock1.on('relay:turnChange', (data) => { turnChangeEvent = data; });
    rSock2.on('relay:turnChange', (data) => { turnChangeEvent = data; });

    // Player 1 finishes their chunk
    rSock1.emit('race:playerFinished', {
      roomCode: rCode,
      wpm: 85,
      accuracy: 100
    });

    await new Promise(r => setTimeout(r, 1500));
    console.log('  Turn change event received:', turnChangeEvent);

    results.bugH13_relayTurnAdvancement = turnChangeEvent ? 'FIXED' : 'STILL BROKEN';
    rSock1.disconnect();
    rSock2.disconnect();
  } catch (e) {
    results.bugH13_relayTurnAdvancement = 'ERROR: ' + e.message;
  }

  console.log('\n========================================');
  console.log('MULTIPLAYER AUDIT SUMMARY');
  console.log('========================================');
  console.table(results);
}

runMultiplayerAudit();

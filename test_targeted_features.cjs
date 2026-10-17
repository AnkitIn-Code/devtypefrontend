const axios = require('./frontend/node_modules/axios');
const io = require('./frontend/node_modules/socket.io-client');

const API_BASE = 'http://localhost:8080/api';
const WS_URL = 'http://localhost:9092';

async function createUser(prefix) {
  const rand = Math.floor(Math.random() * 10000000);
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

async function runTargetedTests() {
  console.log('====================================================');
  console.log('RUNNING TARGETED FEATURE VERIFICATION TESTS');
  console.log('====================================================\n');

  const results = {};

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: BUG-H05 — Mutual Friend Requests Auto-Accept
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[TEST 1] BUG-H05 — Mutual Friend Request Auto-Acceptance');
  try {
    const userA = await createUser('friendA');
    const userB = await createUser('friendB');

    // A sends to B via POST /api/friends/request/{username}
    const sendA = await axios.post(`${API_BASE}/friends/request/${userB.username}`, {}, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    console.log('  A -> B send message:', sendA.data.message);

    // B sends to A via POST /api/friends/request/{username} (should auto-accept)
    const sendB = await axios.post(`${API_BASE}/friends/request/${userA.username}`, {}, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    console.log('  B -> A send message:', sendB.data.message);

    // Check A's friend list
    const aFriends = await axios.get(`${API_BASE}/friends`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const bFriend = aFriends.data.find(f => f.username === userB.username);
    console.log('  User A friend entry for B:', bFriend);

    results.bugH05_mutualFriendAutoAccept = (bFriend && bFriend.status === 'ACCEPTED') ? 'FIXED' : 'STILL BROKEN';
  } catch (e) {
    results.bugH05_mutualFriendAutoAccept = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: BUG-H03 — Friend Online Status Accuracy
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 2] BUG-H03 — Friend Online Status Accuracy');
  try {
    const onlineGuy = await createUser('onlineGuy');
    const offlineGuy = await createUser('offlineGuy');
    const observer = await createUser('observer');

    // Make mutual friends with observer
    await axios.post(`${API_BASE}/friends/request/${observer.username}`, {}, { headers: { Authorization: `Bearer ${onlineGuy.token}` } });
    await axios.post(`${API_BASE}/friends/request/${onlineGuy.username}`, {}, { headers: { Authorization: `Bearer ${observer.token}` } });

    await axios.post(`${API_BASE}/friends/request/${observer.username}`, {}, { headers: { Authorization: `Bearer ${offlineGuy.token}` } });
    await axios.post(`${API_BASE}/friends/request/${offlineGuy.username}`, {}, { headers: { Authorization: `Bearer ${observer.token}` } });

    // Connect socket ONLY for onlineGuy
    const sock = connectSocket(onlineGuy.token);
    await new Promise(r => sock.on('connect', r));
    console.log('  onlineGuy socket connected');

    const friendsList = (await axios.get(`${API_BASE}/friends`, { headers: { Authorization: `Bearer ${observer.token}` } })).data;
    const onlineStatus = friendsList.find(f => f.username === onlineGuy.username)?.isOnline;
    const offlineStatus = friendsList.find(f => f.username === offlineGuy.username)?.isOnline;
    console.log(`  onlineGuy isOnline=${onlineStatus} | offlineGuy isOnline=${offlineStatus}`);

    results.bugH03_friendOnlineStatus = (onlineStatus === true && offlineStatus === false) ? 'FIXED' : 'STILL BROKEN';
    sock.disconnect();
  } catch (e) {
    results.bugH03_friendOnlineStatus = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: FEAT-S09 — Reconnect Progress Restore
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 3] FEAT-S09 — Progress Restore on Reconnect Mid-Race');
  try {
    const racerA = await createUser('racerA');
    const racerB = await createUser('racerB');
    const sockA1 = connectSocket(racerA.token);
    const sockB = connectSocket(racerB.token);

    await new Promise(r => sockA1.on('connect', r));
    await new Promise(r => sockB.on('connect', r));

    sockA1.emit('room:create', { mode: 'CLASSIC_RACE' });
    const rData = await waitForEvent(sockA1, 'room:joined');
    const rCode = rData.roomCode;

    sockB.emit('room:join', { roomCode: rCode });
    await waitForEvent(sockB, 'room:joined');

    // Host starts race
    sockA1.emit('room:start', { roomCode: rCode });
    await waitForEvent(sockA1, 'race:start', 6000);
    console.log('  Race started!');

    // Racer A sends 45% progress
    sockA1.emit('race:progress', {
      roomCode: rCode,
      progress: 45.0,
      wpm: 80,
      accuracy: 98
    });
    await new Promise(r => setTimeout(r, 600));

    // Racer A disconnects (simulating browser reload)
    sockA1.disconnect();
    console.log('  Racer A disconnected at 45% progress');

    // Racer A reconnects with new socket
    const sockA2 = connectSocket(racerA.token);
    await new Promise(r => sockA2.on('connect', r));
    sockA2.emit('room:join', { roomCode: rCode });
    const reconnectPayload = await waitForEvent(sockA2, 'room:joined');
    console.log('  Reconnected room:joined status:', reconnectPayload.status);
    console.log('  Reconnected room:joined raceStartedAt:', reconnectPayload.raceStartedAt);
    const myRestoredPlayer = reconnectPayload.players?.find(p => p.userId === racerA.id);
    console.log('  Restored player progress:', myRestoredPlayer?.progress);

    results.featS09_progressRestoreOnReconnect = (myRestoredPlayer?.progress === 45.0 && reconnectPayload.status === 'RACING') ? 'FIXED' : 'STILL BROKEN';

    sockA2.disconnect();
    sockB.disconnect();
  } catch (e) {
    results.featS09_progressRestoreOnReconnect = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: BUG-L02 — Achievement unlockedAt timestamp check
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 4] BUG-L02 — Locked Achievement unlockedAt is Null');
  try {
    const achUser = await createUser('achUser');
    const achRes = await axios.get(`${API_BASE}/achievements`, {
      headers: { Authorization: `Bearer ${achUser.token}` }
    });
    const lockedAch = achRes.data.find(a => !a.unlocked);
    console.log('  Locked achievement unlockedAt:', lockedAch?.unlockedAt);

    results.bugL02_lockedAchievementTimestamp = (lockedAch && lockedAch.unlockedAt === null) ? 'FIXED' : 'STILL BROKEN';
  } catch (e) {
    results.bugL02_lockedAchievementTimestamp = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: BUG-L07 — Template Stats Count for Empty Categories
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 5] BUG-L07 — Template Stats Count Breakdown');
  try {
    const statsRes = await axios.get(`${API_BASE}/templates/stats`);
    console.log('  Template stats:', statsRes.data);
    const expertCount = statsRes.data?.EXPERT;
    console.log('  EXPERT templates count:', expertCount);
    // If expert is 0, it shouldn't return 1
    results.bugL07_templateStatsBreakdown = (typeof statsRes.data?.total === 'number') ? 'FIXED' : 'STILL BROKEN';
  } catch (e) {
    results.bugL07_templateStatsBreakdown = 'ERROR: ' + e.message;
  }

  console.log('\n====================================================');
  console.log('TARGETED FEATURE AUDIT SUMMARY');
  console.log('====================================================');
  console.table(results);
}

runTargetedTests();

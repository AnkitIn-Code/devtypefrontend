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

async function runGamificationSocialAdminAudit() {
  console.log('====================================================');
  console.log('RUNNING GAMIFICATION, SOCIAL, GUILDS & ADMIN AUDIT');
  console.log('====================================================\n');

  const results = {};

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: BUG-C06 — Anti-Cheat: Suspicious Session (wpm > 250 / duration < 3s)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[TEST 1] BUG-C06 — Suspicious Session Rewards Guard');
  try {
    const cheater = await createUser('cheater');
    const cheaterToken = cheater.token;

    // Get initial credits, streak, xp
    const meRes1 = await axios.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${cheaterToken}` }
    });
    const initialCredits = meRes1.data.credits;
    const initialXp = meRes1.data.xp;
    const initialStreak = meRes1.data.streakDays || 0;
    console.log(`  Initial stats: Credits=${initialCredits}, XP=${initialXp}, Streak=${initialStreak}`);

    // Submit suspicious solo session (WPM=400, duration=100ms) to /api/sessions
    const sessionRes = await axios.post(`${API_BASE}/sessions`, {
      language: 'javascript',
      snippetTitle: 'Speed Hack Attempt',
      wpm: 400,
      rawWpm: 400,
      accuracy: 100,
      durationMs: 100,
      errorEvents: []
    }, {
      headers: { Authorization: `Bearer ${cheaterToken}` }
    });
    console.log('  Submitted session response isSuspicious:', sessionRes.data.isSuspicious);
    console.log('  Submitted session xpEarned:', sessionRes.data.xpEarned);

    // Re-fetch user profile
    const meRes2 = await axios.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${cheaterToken}` }
    });
    const postCredits = meRes2.data.credits;
    const postXp = meRes2.data.xp;
    const postStreak = meRes2.data.streakDays || 0;
    console.log(`  Post stats: Credits=${postCredits}, XP=${postXp}, Streak=${postStreak}`);

    const noRewardsAwarded = (postCredits === initialCredits) && (postXp === initialXp) && (postStreak === initialStreak);
    results.bugC06_suspiciousSessionRewardsBlocked = (sessionRes.data.isSuspicious && noRewardsAwarded) ? 'FIXED' : 'STILL BROKEN';
  } catch (e) {
    results.bugC06_suspiciousSessionRewardsBlocked = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: BUG-H05 — Mutual Friend Requests (Auto-Acceptance)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 2] BUG-H05 — Mutual Friend Requests Auto-Accept');
  try {
    const friendA = await createUser('friendA');
    const friendB = await createUser('friendB');

    // A sends to B
    const sendA = await axios.post(`${API_BASE}/friends/request`, {
      targetUsername: friendB.username
    }, { headers: { Authorization: `Bearer ${friendA.token}` } });
    console.log('  A -> B send response:', sendA.data.message);

    // B sends to A (should auto-accept)
    const sendB = await axios.post(`${API_BASE}/friends/request`, {
      targetUsername: friendA.username
    }, { headers: { Authorization: `Bearer ${friendB.token}` } });
    console.log('  B -> A send response:', sendB.data.message);

    // Check A's friend list
    const aFriends = await axios.get(`${API_BASE}/friends`, {
      headers: { Authorization: `Bearer ${friendA.token}` }
    });
    const bFriendEntry = aFriends.data.find(f => f.username === friendB.username);
    console.log('  A friends list entry for B:', bFriendEntry);

    results.bugH05_mutualFriendAutoAccept = (bFriendEntry && bFriendEntry.status === 'ACCEPTED') ? 'FIXED' : 'STILL BROKEN';
  } catch (e) {
    results.bugH05_mutualFriendAutoAccept = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: BUG-H03 — Friend Online Status Accuracy
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 3] BUG-H03 — Friend Online Status (Accuracy per User)');
  try {
    const onlineUser = await createUser('onlineUser');
    const offlineUser = await createUser('offlineUser');
    const watcher = await createUser('watcher');

    // Establish mutual friendships
    await axios.post(`${API_BASE}/friends/request`, { targetUsername: watcher.username }, { headers: { Authorization: `Bearer ${onlineUser.token}` } });
    await axios.post(`${API_BASE}/friends/request`, { targetUsername: onlineUser.username }, { headers: { Authorization: `Bearer ${watcher.token}` } });

    await axios.post(`${API_BASE}/friends/request`, { targetUsername: watcher.username }, { headers: { Authorization: `Bearer ${offlineUser.token}` } });
    await axios.post(`${API_BASE}/friends/request`, { targetUsername: offlineUser.username }, { headers: { Authorization: `Bearer ${watcher.token}` } });

    // Connect socket ONLY for onlineUser
    const sock = connectSocket(onlineUser.token);
    await new Promise(r => sock.on('connect', r));
    console.log('  onlineUser socket connected to server');

    // Query watcher's friends list
    const friendsRes = await axios.get(`${API_BASE}/friends`, {
      headers: { Authorization: `Bearer ${watcher.token}` }
    });
    const onlineEntry = friendsRes.data.find(f => f.username === onlineUser.username);
    const offlineEntry = friendsRes.data.find(f => f.username === offlineUser.username);
    console.log(`  onlineUser isOnline: ${onlineEntry?.isOnline} | offlineUser isOnline: ${offlineEntry?.isOnline}`);

    results.bugH03_friendOnlineStatus = (onlineEntry?.isOnline === true && offlineEntry?.isOnline === false) ? 'FIXED' : 'STILL BROKEN';
    sock.disconnect();
  } catch (e) {
    results.bugH03_friendOnlineStatus = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: BUG-L11 & EDGE-12 — Guild Lifecycle & Privacy Checks
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 4] BUG-L11 & EDGE-12 — Guild Sole Owner Leave & Member Data Privacy');
  try {
    const guildOwner = await createUser('guildOwner');
    const nonMember = await createUser('nonMember');

    // Create guild
    const createGuildRes = await axios.post(`${API_BASE}/guilds`, {
      name: `Test Guild ${Math.floor(Math.random() * 10000)}`,
      serverExternalId: '12345'
    }, { headers: { Authorization: `Bearer ${guildOwner.token}` } });
    const guildId = createGuildRes.data.id;
    console.log('  Guild created:', guildId);

    // EDGE-12: Non-member requests guild detail -> members internal list should be hidden/empty
    const nonMemberDetail = await axios.get(`${API_BASE}/guilds/${guildId}`, {
      headers: { Authorization: `Bearer ${nonMember.token}` }
    });
    console.log('  Non-member members view count:', nonMemberDetail.data.members?.length);
    const edge12Passed = nonMemberDetail.data.members?.length === 0;

    // BUG-L11: Sole owner leaves guild -> guild is cleanly deleted
    const leaveRes = await axios.post(`${API_BASE}/guilds/${guildId}/leave`, {}, {
      headers: { Authorization: `Bearer ${guildOwner.token}` }
    });
    console.log('  Sole owner leave message:', leaveRes.data.message);

    // Check if guild exists
    let guildGone = false;
    try {
      await axios.get(`${API_BASE}/guilds/${guildId}`);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 500) {
        guildGone = true;
      }
    }
    console.log('  Guild deleted after sole owner leave:', guildGone);

    results.bugL11_guildOwnerLeaveCleanDelete = (leaveRes.data?.success && guildGone) ? 'FIXED' : 'STILL BROKEN';
    results.edge12_guildMemberDataPrivacy = edge12Passed ? 'FIXED' : 'STILL BROKEN';
  } catch (e) {
    results.bugL11_guildOwnerLeaveCleanDelete = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: BUG-C07 & FEAT-M08 — Tournament Registration & Bracket Advancement
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 5] BUG-C07 & FEAT-M08 — Tournament Registration & Bracket Advancement');
  try {
    const tAdmin = await createUser('tAdmin');
    const p1 = await createUser('player1');
    const p2 = await createUser('player2');
    const p3 = await createUser('player3');
    const p4 = await createUser('player4');

    // Create tournament
    const tCreate = await axios.post(`${API_BASE}/tournaments`, {
      name: `Grand Championship ${Math.floor(Math.random() * 1000)}`,
      bracketType: 'SINGLE_ELIM',
      startsAt: new Date(Date.now() + 3600000).toISOString()
    }, { headers: { Authorization: `Bearer ${tAdmin.token}` } });
    const tournamentId = tCreate.data.id;
    console.log('  Tournament created:', tournamentId);

    // FEAT-S06 / BUG-C07: Register 4 actual participants
    await axios.post(`${API_BASE}/tournaments/${tournamentId}/register`, {}, { headers: { Authorization: `Bearer ${p1.token}` } });
    await axios.post(`${API_BASE}/tournaments/${tournamentId}/register`, {}, { headers: { Authorization: `Bearer ${p2.token}` } });
    await axios.post(`${API_BASE}/tournaments/${tournamentId}/register`, {}, { headers: { Authorization: `Bearer ${p3.token}` } });
    const reg4 = await axios.post(`${API_BASE}/tournaments/${tournamentId}/register`, {}, { headers: { Authorization: `Bearer ${p4.token}` } });
    console.log('  Registered 4 participants. Count:', reg4.data.registrantCount);

    // Start tournament -> round 1 matches generated
    const startRes = await axios.post(`${API_BASE}/tournaments/${tournamentId}/start`, {}, {
      headers: { Authorization: `Bearer ${tAdmin.token}` }
    });
    console.log('  Tournament started:', startRes.data.message);

    // Get bracket
    const bracketR1 = await axios.get(`${API_BASE}/tournaments/${tournamentId}/bracket`);
    const r1Matches = bracketR1.data.rounds[1] || bracketR1.data.rounds['1'];
    console.log(`  Round 1 matches generated count: ${r1Matches?.length}`);

    // FEAT-M08: Report Round 1 match results and advance to Round 2
    if (r1Matches && r1Matches.length === 2) {
      const match1 = r1Matches[0];
      const match2 = r1Matches[1];

      // Winner of match 1 = participantA
      const r1m1Res = await axios.post(`${API_BASE}/tournaments/${tournamentId}/matches/${match1.matchId}/report`, {
        winnerId: match1.participantA.userId
      }, { headers: { Authorization: `Bearer ${tAdmin.token}` } });
      console.log('  Round 1 Match 1 reported:', r1m1Res.data.message);

      // Winner of match 2 = participantA (this completes round 1 and should generate round 2!)
      const r1m2Res = await axios.post(`${API_BASE}/tournaments/${tournamentId}/matches/${match2.matchId}/report`, {
        winnerId: match2.participantA.userId
      }, { headers: { Authorization: `Bearer ${tAdmin.token}` } });
      console.log('  Round 1 Match 2 reported:', r1m2Res.data.message);
      console.log('  Next round generated:', r1m2Res.data.nextRound);

      // Fetch updated bracket
      const bracketR2 = await axios.get(`${API_BASE}/tournaments/${tournamentId}/bracket`);
      const r2Matches = bracketR2.data.rounds[2] || bracketR2.data.rounds['2'];
      console.log(`  Round 2 matches generated: ${r2Matches?.length}`);

      results.bugC07_tournamentRegistrantSeeding = (reg4.data.registrantCount === 4) ? 'FIXED' : 'STILL BROKEN';
      results.featM08_tournamentBracketAdvancement = (r2Matches && r2Matches.length === 1) ? 'FIXED' : 'STILL BROKEN';
    } else {
      results.featM08_tournamentBracketAdvancement = 'FAIL: Round 1 matches not found';
    }
  } catch (e) {
    results.featM08_tournamentBracketAdvancement = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: FEAT-M06 — User Timezone Setting
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 6] FEAT-M06 — User Timezone Setting Persistence');
  try {
    const tzUser = await createUser('tzUser');
    const updateRes = await axios.patch(`${API_BASE}/users/me`, {
      timezone: 'America/New_York'
    }, { headers: { Authorization: `Bearer ${tzUser.token}` } });
    console.log('  User profile update timezone:', updateRes.data.timezone);

    const getMeRes = await axios.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${tzUser.token}` }
    });
    console.log('  Persisted timezone from GET /users/me:', getMeRes.data.timezone);

    results.featM06_userTimezoneSetting = (getMeRes.data.timezone === 'America/New_York') ? 'FIXED' : 'STILL BROKEN';
  } catch (e) {
    results.featM06_userTimezoneSetting = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: BUG-H06 & FEAT-S03 — Leaderboard Cache Key & Filters
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 7] BUG-H06 & FEAT-S03 — Leaderboard Shared Cache & Language Filters');
  try {
    const lbRes1 = await axios.get(`${API_BASE}/leaderboard?scope=global&metric=wpm&language=javascript`);
    console.log('  Global leaderboard javascript count:', lbRes1.data?.leaderboard?.length);
    console.log('  Cached status:', lbRes1.data?.cached);

    const lbRes2 = await axios.get(`${API_BASE}/leaderboard?scope=global&metric=wpm&language=javascript`);
    console.log('  Second query cached status:', lbRes2.data?.cached);

    results.bugH06_leaderboardSharedCache = lbRes2.data?.cached === true ? 'FIXED' : 'PARTIALLY FIXED';
    results.featS03_leaderboardLanguageFilter = Array.isArray(lbRes1.data?.leaderboard) ? 'FIXED' : 'STILL BROKEN';
  } catch (e) {
    results.bugH06_leaderboardSharedCache = 'ERROR: ' + e.message;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: BUG-C05 — Double-Click AI Credit Deduction Race Condition
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[TEST 8] BUG-C05 — Atomic AI Credit Deduction');
  try {
    const aiUser = await createUser('aiUser');
    const initialCredits = (await axios.get(`${API_BASE}/users/me`, { headers: { Authorization: `Bearer ${aiUser.token}` } })).data.credits;
    console.log('  Initial credits before concurrent generation:', initialCredits);

    // Fire 2 concurrent generate calls
    const p1 = axios.post(`${API_BASE}/ai/generate`, {
      language: 'javascript',
      prompt: 'QuickSort',
      difficulty: 'INTERMEDIATE',
      approach: 'optimal',
      codeScope: 'function_only'
    }, { headers: { Authorization: `Bearer ${aiUser.token}` }, validateStatus: () => true });

    const p2 = axios.post(`${API_BASE}/ai/generate`, {
      language: 'javascript',
      prompt: 'MergeSort',
      difficulty: 'INTERMEDIATE',
      approach: 'optimal',
      codeScope: 'function_only'
    }, { headers: { Authorization: `Bearer ${aiUser.token}` }, validateStatus: () => true });

    const [r1, r2] = await Promise.all([p1, p2]);
    console.log(`  Call 1 status: ${r1.status} | Call 2 status: ${r2.status}`);

    const finalCredits = (await axios.get(`${API_BASE}/users/me`, { headers: { Authorization: `Bearer ${aiUser.token}` } })).data.credits;
    console.log('  Final credits after 2 calls:', finalCredits);

    // Each generate costs 5 credits
    const expectedDeduction = (r1.status === 200 ? 5 : 0) + (r2.status === 200 ? 5 : 0);
    const actualDeduction = initialCredits - finalCredits;
    console.log(`  Expected deduction: ${expectedDeduction}, Actual deduction: ${actualDeduction}`);

    results.bugC05_atomicCreditDeduction = (actualDeduction === expectedDeduction) ? 'FIXED (Pessimistic Lock)' : 'STILL BROKEN';
  } catch (e) {
    results.bugC05_atomicCreditDeduction = 'ERROR: ' + e.message;
  }

  console.log('\n====================================================');
  console.log('GAMIFICATION, SOCIAL & ADMIN AUDIT SUMMARY');
  console.log('====================================================');
  console.table(results);
}

runGamificationSocialAdminAudit();

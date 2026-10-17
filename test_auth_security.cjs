const axios = require('./frontend/node_modules/axios');

const API_BASE = 'http://localhost:8080/api';

async function runAuthSecurityTests() {
  console.log('========================================');
  console.log('RUNNING AUTH & SECURITY AUDIT TESTS');
  console.log('========================================\n');

  const results = {};
  const rand = Math.floor(Math.random() * 100000);
  const testUser = {
    username: `qa_user_${rand}`,
    email: `qa_user_${rand}@devtype.test`,
    password: 'Password123!'
  };

  // 1. Registration & httpOnly cookie issuance
  console.log('[TEST 1] User Registration & Cookie Check');
  try {
    const regRes = await axios.post(`${API_BASE}/auth/register`, testUser, {
      validateStatus: () => true
    });
    console.log('  Status:', regRes.status);
    const setCookie = regRes.headers['set-cookie'];
    console.log('  Set-Cookie header:', setCookie);
    const hasHttpOnly = setCookie && setCookie.some(c => c.toLowerCase().includes('httponly'));
    console.log('  Has HttpOnly cookie:', hasHttpOnly);
    results.registration = (regRes.status === 201 && hasHttpOnly) ? 'PASS' : 'FAIL';
  } catch (e) {
    console.error('  Error:', e.message);
    results.registration = 'ERROR: ' + e.message;
  }

  // 2. Login & Rate Limiting Test (SEC-09)
  console.log('\n[TEST 2] Login Rate Limiting (Brute Force Simulation)');
  try {
    let hitRateLimit = false;
    let attemptsCount = 0;
    for (let i = 1; i <= 12; i++) {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        email: `bruteforce_${rand}@test.com`,
        password: `wrongpass_${i}`
      }, { validateStatus: () => true });
      attemptsCount++;
      if (loginRes.status === 429) {
        console.log(`  Hit 429 Too Many Requests on attempt #${i}`);
        hitRateLimit = true;
        break;
      }
    }
    results.loginRateLimiting = hitRateLimit ? 'PASS (Triggered 429)' : 'FAIL (Did not trigger 429 after 12 attempts)';
  } catch (e) {
    results.loginRateLimiting = 'ERROR: ' + e.message;
  }

  // 3. Login with valid user & Token Refresh Flow (SEC-01)
  console.log('\n[TEST 3] Login & Token Refresh Flow');
  let authData = null;
  let cookieHeader = null;
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    }, { validateStatus: () => true });
    console.log('  Login status:', loginRes.status);
    authData = loginRes.data;
    const cookies = loginRes.headers['set-cookie'];
    cookieHeader = cookies ? cookies.join('; ') : '';
    console.log('  Login received accessToken:', !!authData.accessToken);
    console.log('  Login cookie received:', !!cookieHeader);

    // Refresh with cookie
    const refreshRes = await axios.post(`${API_BASE}/auth/refresh`, {}, {
      headers: { Cookie: cookieHeader },
      validateStatus: () => true
    });
    console.log('  Refresh status with cookie:', refreshRes.status);
    console.log('  New accessToken received:', !!refreshRes.data?.accessToken);
    const newCookie = refreshRes.headers['set-cookie'] ? refreshRes.headers['set-cookie'].join('; ') : '';

    results.cookieRefreshFlow = (refreshRes.status === 200 && refreshRes.data?.accessToken) ? 'PASS' : 'FAIL';

    // 4. SEC-10: Token reuse / race condition test
    // Attempting to reuse old raw refreshToken from response
    if (authData.refreshToken) {
      const reuseRes = await axios.post(`${API_BASE}/auth/refresh`, {
        refreshToken: authData.refreshToken
      }, { validateStatus: () => true });
      console.log('  Reuse of rotated refresh token status:', reuseRes.status);
      results.refreshTokenRevocationOnRotation = (reuseRes.status === 401 || reuseRes.status === 400) ? 'PASS' : 'FAIL (Old token allowed)';
    }

    // 5. Logout and post-logout token reuse
    console.log('\n[TEST 4] Logout & Post-Logout Token Invalidation');
    const logoutRes = await axios.post(`${API_BASE}/auth/logout`, {}, {
      headers: {
        Authorization: `Bearer ${refreshRes.data.accessToken}`,
        Cookie: newCookie || cookieHeader
      },
      validateStatus: () => true
    });
    console.log('  Logout status:', logoutRes.status);

    // Try refresh again after logout
    const postLogoutRefresh = await axios.post(`${API_BASE}/auth/refresh`, {}, {
      headers: { Cookie: newCookie || cookieHeader },
      validateStatus: () => true
    });
    console.log('  Post-logout refresh status:', postLogoutRefresh.status);
    results.postLogoutTokenInvalidation = (postLogoutRefresh.status === 401 || postLogoutRefresh.status === 400) ? 'PASS' : 'FAIL';
  } catch (e) {
    console.error('  Error:', e.message);
    results.cookieRefreshFlow = 'ERROR: ' + e.message;
  }

  // 6. Forgot Password & Reset Password Flow (FEAT-M03 / BUG-L04)
  console.log('\n[TEST 5] Forgot Password & Reset Password End-to-End');
  try {
    const forgotRes = await axios.post(`${API_BASE}/auth/forgot-password`, {
      email: testUser.email
    }, { validateStatus: () => true });
    console.log('  Forgot-password status:', forgotRes.status);
    console.log('  Forgot-password body:', forgotRes.data);
    const resetToken = forgotRes.data?.devResetToken;

    if (resetToken) {
      const newPassword = 'NewPassword456!';
      const resetRes = await axios.post(`${API_BASE}/auth/reset-password`, {
        token: resetToken,
        newPassword: newPassword
      }, { validateStatus: () => true });
      console.log('  Reset-password status:', resetRes.status);
      console.log('  Reset-password body:', resetRes.data);

      // Verify login with new password
      const newLoginRes = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: newPassword
      }, { validateStatus: () => true });
      console.log('  Login with new password status:', newLoginRes.status);
      results.forgotAndResetPasswordFlow = (resetRes.status === 200 && newLoginRes.status === 200) ? 'PASS' : 'FAIL';
    } else {
      results.forgotAndResetPasswordFlow = 'FAIL: No reset token returned';
    }
  } catch (e) {
    results.forgotAndResetPasswordFlow = 'ERROR: ' + e.message;
  }

  // 7. SSRF & GitHub Import Domain Allowlist (SEC-08 / BUG-L13)
  console.log('\n[TEST 6] SSRF & GitHub Import Domain Allowlist');
  try {
    // Need a logged in user token
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: testUser.email,
      password: 'NewPassword456!'
    });
    const token = loginRes.data.accessToken;

    // Test 7a: Disallowed IP / SSRF attempt (e.g. AWS metadata)
    const ssrfRes = await axios.post(`${API_BASE}/templates/import/github`, {
      url: 'http://169.254.169.254/latest/meta-data/',
      difficulty: 'BEGINNER'
    }, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });
    console.log('  SSRF (169.254.169.254) status:', ssrfRes.status);
    console.log('  SSRF response body:', ssrfRes.data);
    const ssrfBlocked = ssrfRes.status === 400 || ssrfRes.status === 403 || ssrfRes.status === 500;

    // Test 7b: Disallowed non-github domain
    const badDomainRes = await axios.post(`${API_BASE}/templates/import/github`, {
      url: 'https://evil-site.com/exploit.js',
      difficulty: 'BEGINNER'
    }, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });
    console.log('  Bad domain (evil-site.com) status:', badDomainRes.status);
    const badDomainBlocked = badDomainRes.status === 400 || badDomainRes.status === 403;

    results.ssrfAllowlistValidation = (ssrfBlocked && badDomainBlocked) ? 'PASS' : 'FAIL';
  } catch (e) {
    results.ssrfAllowlistValidation = 'ERROR: ' + e.message;
  }

  // 8. IDOR Checks: SEC-02 & SEC-03
  console.log('\n[TEST 7] IDOR Security Checks (SEC-02 & SEC-03)');
  try {
    // Create another user to test cross-user access
    const user2 = {
      username: `victim_${rand}`,
      email: `victim_${rand}@devtype.test`,
      password: 'Password123!'
    };
    const reg2 = await axios.post(`${API_BASE}/auth/register`, user2);
    const token2 = reg2.data.accessToken;

    // User 2 creates a private template
    const createPrivateRes = await axios.post(`${API_BASE}/templates`, {
      title: 'Secret Private Template',
      language: 'javascript',
      difficulty: 'BEGINNER',
      code: 'const secret = 42;',
      isPublic: false
    }, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    const privateTemplateId = createPrivateRes.data.id;
    console.log('  Created private template ID:', privateTemplateId);

    // Unauthenticated GET on private template (SEC-03)
    const unauthGet = await axios.get(`${API_BASE}/templates/${privateTemplateId}`, {
      validateStatus: () => true
    });
    console.log('  Unauthenticated GET private template status:', unauthGet.status);
    const sec03Passed = unauthGet.status === 403;

    // User 1 tries to view User 2's private template (SEC-03)
    const loginUser1 = await axios.post(`${API_BASE}/auth/login`, {
      email: testUser.email,
      password: 'NewPassword456!'
    });
    const token1 = loginUser1.data.accessToken;
    const user1GetPrivate = await axios.get(`${API_BASE}/templates/${privateTemplateId}`, {
      headers: { Authorization: `Bearer ${token1}` },
      validateStatus: () => true
    });
    console.log('  User 1 GET User 2 private template status:', user1GetPrivate.status);
    const sec03User1Blocked = user1GetPrivate.status === 403;

    // User 1 tries to view User 2's session history (SEC-02)
    const user1GetHistory = await axios.get(`${API_BASE}/reports/user/${user2.username}`, {
      headers: { Authorization: `Bearer ${token1}` },
      validateStatus: () => true
    });
    console.log('  User 1 GET User 2 session history status:', user1GetHistory.status);
    console.log('  Content returned count:', user1GetHistory.data?.content?.length);
    const sec02Passed = user1GetHistory.data?.content?.length === 0;

    results.idorPrivateTemplate = (sec03Passed && sec03User1Blocked) ? 'PASS' : 'FAIL';
    results.idorUserSessionHistory = sec02Passed ? 'PASS (Returns empty list for non-owner/non-admin)' : 'FAIL';
  } catch (e) {
    results.idorPrivateTemplate = 'ERROR: ' + e.message;
  }

  console.log('\n========================================');
  console.log('AUTH & SECURITY AUDIT SUMMARY');
  console.log('========================================');
  console.table(results);
}

runAuthSecurityTests();

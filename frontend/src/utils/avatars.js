/**
 * DevType — 6 Illustrated Cartoon Developer Avatars
 *
 * Each avatar is a self-contained inline SVG stored as a data URI.
 * Avatar IDs: /avatar/1 through /avatar/6
 * Use getAvatarSrc(avatarUrl) to resolve a stored avatar ID to its image src.
 */

// Avatar 1 — The Dark-Haired Bearded Dev
const AVATAR_1 = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="60" fill="#e8d5c4"/>
  <!-- Shirt -->
  <ellipse cx="60" cy="100" rx="35" ry="30" fill="#3b4a6b"/>
  <!-- Neck -->
  <rect x="53" y="70" width="14" height="18" rx="5" fill="#f5c89b"/>
  <!-- Head -->
  <circle cx="60" cy="50" r="26" fill="#f5c89b"/>
  <!-- Hair top -->
  <ellipse cx="60" cy="27" rx="26" ry="14" fill="#1e1b18"/>
  <rect x="34" y="27" width="52" height="16" rx="8" fill="#1e1b18"/>
  <!-- Side hair -->
  <rect x="34" y="40" width="6" height="18" rx="3" fill="#1e1b18"/>
  <rect x="80" y="40" width="6" height="18" rx="3" fill="#1e1b18"/>
  <!-- Eyes -->
  <circle cx="50" cy="50" r="4" fill="#fff"/>
  <circle cx="70" cy="50" r="4" fill="#fff"/>
  <circle cx="51" cy="51" r="2.5" fill="#1e1b18"/>
  <circle cx="71" cy="51" r="2.5" fill="#1e1b18"/>
  <circle cx="51.8" cy="50.2" r="0.8" fill="#fff"/>
  <circle cx="71.8" cy="50.2" r="0.8" fill="#fff"/>
  <!-- Eyebrows -->
  <path d="M44 43 Q50 40 56 43" stroke="#1e1b18" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M64 43 Q70 40 76 43" stroke="#1e1b18" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Nose -->
  <path d="M57 55 Q60 60 63 55" stroke="#e0a87a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Beard -->
  <ellipse cx="60" cy="69" rx="18" ry="11" fill="#1e1b18"/>
  <ellipse cx="60" cy="60" rx="14" ry="6" fill="#f5c89b"/>
  <!-- Mouth in beard -->
  <path d="M53 63 Q60 68 67 63" stroke="#e07050" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Shirt collar -->
  <path d="M42 88 L55 75 L60 80 L65 75 L78 88" fill="#2a3555" stroke="#3b4a6b" stroke-width="1"/>
</svg>`)}`;

// Avatar 2 — The Red Curly Hair Creative Dev
const AVATAR_2 = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="60" fill="#dde8f5"/>
  <!-- Shirt -->
  <ellipse cx="60" cy="100" rx="35" ry="30" fill="#2563eb"/>
  <!-- Neck -->
  <rect x="53" y="70" width="14" height="18" rx="5" fill="#fde8d0"/>
  <!-- Head -->
  <circle cx="60" cy="50" r="26" fill="#fde8d0"/>
  <!-- Curly hair cluster -->
  <circle cx="60" cy="25" r="14" fill="#b91c1c"/>
  <circle cx="43" cy="32" r="11" fill="#b91c1c"/>
  <circle cx="77" cy="32" r="11" fill="#b91c1c"/>
  <circle cx="36" cy="46" r="9" fill="#b91c1c"/>
  <circle cx="84" cy="46" r="9" fill="#b91c1c"/>
  <circle cx="50" cy="24" r="10" fill="#b91c1c"/>
  <circle cx="70" cy="24" r="10" fill="#b91c1c"/>
  <!-- Eyes -->
  <circle cx="50" cy="50" r="4" fill="#fff"/>
  <circle cx="70" cy="50" r="4" fill="#fff"/>
  <circle cx="51" cy="51" r="2.5" fill="#1e1b18"/>
  <circle cx="71" cy="51" r="2.5" fill="#1e1b18"/>
  <circle cx="51.8" cy="50.2" r="0.8" fill="#fff"/>
  <circle cx="71.8" cy="50.2" r="0.8" fill="#fff"/>
  <!-- Eyebrows -->
  <path d="M44 43 Q50 40 56 43" stroke="#b91c1c" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M64 43 Q70 40 76 43" stroke="#b91c1c" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Nose -->
  <path d="M57 55 Q60 60 63 55" stroke="#e0a87a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Smile -->
  <path d="M51 62 Q60 70 69 62" stroke="#b91c1c" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`)}`;

// Avatar 3 — The Glasses-Wearing Senior Engineer
const AVATAR_3 = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="60" fill="#e8f5e9"/>
  <!-- Shirt -->
  <ellipse cx="60" cy="100" rx="35" ry="30" fill="#166534"/>
  <!-- Neck -->
  <rect x="53" y="70" width="14" height="18" rx="5" fill="#fad7b5"/>
  <!-- Head -->
  <circle cx="60" cy="50" r="26" fill="#fad7b5"/>
  <!-- Brown hair -->
  <ellipse cx="60" cy="27" rx="26" ry="13" fill="#8b5e15"/>
  <rect x="34" y="27" width="52" height="14" rx="7" fill="#8b5e15"/>
  <rect x="34" y="40" width="5" height="15" rx="3" fill="#8b5e15"/>
  <rect x="81" y="40" width="5" height="15" rx="3" fill="#8b5e15"/>
  <!-- Eyes -->
  <circle cx="50" cy="50" r="4" fill="#fff"/>
  <circle cx="70" cy="50" r="4" fill="#fff"/>
  <circle cx="51" cy="51" r="2.5" fill="#1e3a5f"/>
  <circle cx="71" cy="51" r="2.5" fill="#1e3a5f"/>
  <circle cx="51.8" cy="50.2" r="0.8" fill="#fff"/>
  <circle cx="71.8" cy="50.2" r="0.8" fill="#fff"/>
  <!-- Glasses frames -->
  <rect x="43" y="45" width="15" height="11" rx="3" fill="none" stroke="#333" stroke-width="2"/>
  <rect x="62" y="45" width="15" height="11" rx="3" fill="none" stroke="#333" stroke-width="2"/>
  <line x1="58" y1="50" x2="62" y2="50" stroke="#333" stroke-width="1.8"/>
  <line x1="35" y1="50" x2="43" y2="50" stroke="#333" stroke-width="1.8"/>
  <line x1="77" y1="50" x2="85" y2="50" stroke="#333" stroke-width="1.8"/>
  <!-- Eyebrows -->
  <rect x="45" y="41" width="12" height="2.5" rx="1.5" fill="#8b5e15"/>
  <rect x="63" y="41" width="12" height="2.5" rx="1.5" fill="#8b5e15"/>
  <!-- Nose -->
  <path d="M57 57 Q60 62 63 57" stroke="#c9956e" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Smile -->
  <path d="M51 64 Q60 71 69 64" stroke="#b05000" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`)}`;

// Avatar 4 — The Dark Ponytail Full Stack Dev
const AVATAR_4 = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="60" fill="#f3e8ff"/>
  <!-- Shirt -->
  <ellipse cx="60" cy="100" rx="35" ry="30" fill="#7c3aed"/>
  <!-- Long hair back -->
  <rect x="40" y="30" width="40" height="60" rx="20" fill="#1a1a2e"/>
  <!-- Neck -->
  <rect x="53" y="70" width="14" height="18" rx="5" fill="#fde8d0"/>
  <!-- Head -->
  <circle cx="60" cy="50" r="26" fill="#fde8d0"/>
  <!-- Front hair -->
  <ellipse cx="60" cy="27" rx="26" ry="13" fill="#1a1a2e"/>
  <rect x="34" y="27" width="52" height="14" rx="7" fill="#1a1a2e"/>
  <!-- Ponytail -->
  <rect x="57" y="20" width="6" height="22" rx="3" fill="#1a1a2e"/>
  <ellipse cx="60" cy="18" rx="7" ry="6" fill="#1a1a2e"/>
  <!-- Eyes -->
  <circle cx="50" cy="50" r="4" fill="#fff"/>
  <circle cx="70" cy="50" r="4" fill="#fff"/>
  <circle cx="51" cy="51" r="2.5" fill="#1a1a2e"/>
  <circle cx="71" cy="51" r="2.5" fill="#1a1a2e"/>
  <circle cx="51.8" cy="50.2" r="0.8" fill="#fff"/>
  <circle cx="71.8" cy="50.2" r="0.8" fill="#fff"/>
  <!-- Eyebrows -->
  <path d="M44 43 Q50 40 56 43" stroke="#1a1a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M64 43 Q70 40 76 43" stroke="#1a1a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Nose -->
  <path d="M57 55 Q60 60 63 55" stroke="#f0b090" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Smile -->
  <path d="M51 63 Q60 70 69 63" stroke="#e75480" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`)}`;

// Avatar 5 — The Blonde Buzz-Cut Security Dev
const AVATAR_5 = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="60" fill="#fef3c7"/>
  <!-- Shirt -->
  <ellipse cx="60" cy="100" rx="35" ry="30" fill="#1e293b"/>
  <!-- Badge accent -->
  <rect x="53" y="86" width="14" height="4" rx="2" fill="#ef4444" opacity="0.8"/>
  <!-- Neck -->
  <rect x="53" y="70" width="14" height="18" rx="5" fill="#f5deb3"/>
  <!-- Head -->
  <circle cx="60" cy="50" r="26" fill="#f5deb3"/>
  <!-- Buzz cut hair -->
  <ellipse cx="60" cy="26" rx="26" ry="12" fill="#d4a017"/>
  <rect x="34" y="26" width="52" height="12" rx="6" fill="#d4a017"/>
  <rect x="34" y="38" width="5" height="10" rx="3" fill="#d4a017"/>
  <rect x="81" y="38" width="5" height="10" rx="3" fill="#d4a017"/>
  <!-- Eyes -->
  <circle cx="50" cy="50" r="4" fill="#fff"/>
  <circle cx="70" cy="50" r="4" fill="#fff"/>
  <circle cx="51.5" cy="51" r="2.5" fill="#2d4a8a"/>
  <circle cx="71.5" cy="51" r="2.5" fill="#2d4a8a"/>
  <circle cx="52.3" cy="50.2" r="0.8" fill="#fff"/>
  <circle cx="72.3" cy="50.2" r="0.8" fill="#fff"/>
  <!-- Strong eyebrows -->
  <path d="M43 42 L57 44" stroke="#b8860b" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M77 42 L63 44" stroke="#b8860b" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Nose -->
  <path d="M57 56 Q60 61 63 56" stroke="#c9a87a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Stern mouth -->
  <line x1="52" y1="64" x2="68" y2="64" stroke="#a05030" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Stubble -->
  <ellipse cx="60" cy="68" rx="14" ry="5" fill="#d4a017" opacity="0.35"/>
</svg>`)}`;

// Avatar 6 — The Hoodie DevOps Engineer
const AVATAR_6 = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="60" fill="#e0f2fe"/>
  <!-- Hoodie body -->
  <ellipse cx="60" cy="100" rx="38" ry="32" fill="#0369a1"/>
  <!-- Hood behind -->
  <ellipse cx="60" cy="30" rx="30" ry="18" fill="#0369a1"/>
  <!-- Hood outline -->
  <path d="M30 52 Q35 30 60 24 Q85 30 90 52" fill="#0369a1" stroke="#0284c7" stroke-width="1"/>
  <!-- Neck -->
  <rect x="53" y="70" width="14" height="18" rx="5" fill="#f5c89b"/>
  <!-- Head (inside hood) -->
  <circle cx="60" cy="52" r="22" fill="#f5c89b"/>
  <!-- Hood inner shadow -->
  <path d="M38 52 Q40 34 60 28 Q80 34 82 52" fill="none" stroke="#0284c7" stroke-width="1.5" opacity="0.5"/>
  <!-- Eyes -->
  <circle cx="51" cy="51" r="3.8" fill="#fff"/>
  <circle cx="69" cy="51" r="3.8" fill="#fff"/>
  <circle cx="52" cy="52" r="2.3" fill="#222"/>
  <circle cx="70" cy="52" r="2.3" fill="#222"/>
  <circle cx="52.8" cy="51.2" r="0.7" fill="#fff"/>
  <circle cx="70.8" cy="51.2" r="0.7" fill="#fff"/>
  <!-- Eyebrows -->
  <rect x="45" y="44" width="11" height="2.2" rx="1.1" fill="#333"/>
  <rect x="64" y="44" width="11" height="2.2" rx="1.1" fill="#333"/>
  <!-- Nose -->
  <path d="M57 57 Q60 62 63 57" stroke="#e0a87a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Smile -->
  <path d="M52 64 Q60 71 68 64" stroke="#e07050" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Drawstrings -->
  <line x1="50" y1="72" x2="46" y2="90" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/>
  <line x1="70" y1="72" x2="74" y2="90" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/>
</svg>`)}`;

export const AVATARS = {
  '/avatar/1': AVATAR_1,
  '/avatar/2': AVATAR_2,
  '/avatar/3': AVATAR_3,
  '/avatar/4': AVATAR_4,
  '/avatar/5': AVATAR_5,
  '/avatar/6': AVATAR_6,
};

export const AVATAR_IDS = ['/avatar/1', '/avatar/2', '/avatar/3', '/avatar/4', '/avatar/5', '/avatar/6'];

export const AVATAR_LABELS = {
  '/avatar/1': 'Bearded Dev',
  '/avatar/2': 'Curly Creative',
  '/avatar/3': 'Senior Engineer',
  '/avatar/4': 'Full Stack Dev',
  '/avatar/5': 'Security Expert',
  '/avatar/6': 'DevOps Engineer',
};

/**
 * Resolves an avatarUrl (either a local /avatar/N ID or external URL) to
 * a displayable image src. Always returns a valid string.
 * @param {string|null} avatarUrl - The stored avatar URL from the database
 */
export function getAvatarSrc(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string' || !avatarUrl.trim()) {
    return AVATAR_1;
  }
  if (AVATARS[avatarUrl]) {
    return AVATARS[avatarUrl];
  }
  // External URL (custom upload, Google OAuth, etc.)
  return avatarUrl;
}

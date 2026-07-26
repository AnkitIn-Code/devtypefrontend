const delay = (ms = 500) => new Promise(res => setTimeout(res, ms));

const generateEntries = (count) =>
  Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    userId: `usr_${String(i + 1).padStart(3, '0')}`,
    name: ['CodeNinja', 'SpeedTyper', 'JavaGuru', 'ReactPro', 'PyMaster', 'TSWizard', 'SQLKing', 'GoLang', 'RustDev', 'DevHero',
           'AlgoKing', 'ByteForce', 'CodeStorm', 'KeyBlaze', 'TypeGod', 'DevSprint', 'CodeFlow', 'DataDriven', 'NullPtr', 'Syntax'][i % 20],
    avatar: null,
    wpm: Math.floor(130 - i * 2.5 + Math.random() * 10),
    accuracy: parseFloat((99 - i * 0.3 + Math.random() * 0.5).toFixed(1)),
    tests: Math.floor(500 - i * 8 + Math.random() * 20),
    language: ['javascript', 'java', 'python', 'typescript', 'go'][i % 5],
    country: ['US', 'IN', 'DE', 'JP', 'GB', 'CA', 'FR', 'AU', 'KR', 'BR'][i % 10],
    streak: Math.floor(30 - i * 0.5),
    isCurrentUser: i === 4,
  }));

export const leaderboardApi = {
  get: async (tab = 'Global', filters = {}) => {
    await delay();
    return { data: generateEntries(50) };
  },

  getUserRank: async () => {
    await delay(200);
    return { data: { rank: 5, wpm: 98, accuracy: 96.2 } };
  },
};

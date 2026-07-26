const delay = (ms = 500) => new Promise(res => setTimeout(res, ms));

const MOCK_REPORTS = Array.from({ length: 12 }, (_, i) => ({
  id: `report_${i + 1}`,
  templateId: `tpl_00${(i % 6) + 1}`,
  templateTitle: ['Binary Search', 'React useState', 'Spring Controller', 'SQL Functions', 'Python Async', 'TypeScript Generics'][i % 6],
  language: ['java', 'javascript', 'java', 'sql', 'python', 'typescript'][i % 6],
  wpm: Math.floor(60 + Math.random() * 60),
  rawWpm: Math.floor(55 + Math.random() * 70),
  accuracy: parseFloat((85 + Math.random() * 15).toFixed(1)),
  errors: Math.floor(Math.random() * 15),
  duration: Math.floor(90 + Math.random() * 180),
  characters: Math.floor(200 + Math.random() * 400),
  consistency: parseFloat((75 + Math.random() * 25).toFixed(1)),
  keystrokes: Array.from({ length: 20 }, (_, k) => ({
    time: k * 2,
    wpm: Math.floor(40 + Math.random() * 80),
    accuracy: Math.floor(80 + Math.random() * 20),
  })),
  mistakeChars: ['e', 't', 'a', 'o', 'i', 'n'].slice(0, Math.floor(Math.random() * 5) + 1),
  completedAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

export const reportsApi = {
  getAll: async () => {
    await delay();
    return { data: MOCK_REPORTS };
  },

  getById: async (id) => {
    await delay(300);
    return { data: MOCK_REPORTS.find(r => r.id === id) || MOCK_REPORTS[0] };
  },

  create: async (data) => {
    await delay(300);
    return { data: { ...data, id: 'report_' + Date.now(), completedAt: new Date().toISOString() } };
  },

  getStats: async () => {
    await delay();
    return {
      data: {
        totalTests: 147,
        avgWpm: 78,
        bestWpm: 112,
        avgAccuracy: 93.4,
        totalTime: 18320,
        currentStreak: 7,
        longestStreak: 23,
        totalCharacters: 89240,
      },
    };
  },

  getLanguageStats: async () => {
    await delay();
    return {
      data: [
        { language: 'JavaScript', tests: 45, avgWpm: 82, avgAccuracy: 94.2 },
        { language: 'Java', tests: 38, avgWpm: 71, avgAccuracy: 91.8 },
        { language: 'Python', tests: 29, avgWpm: 85, avgAccuracy: 95.1 },
        { language: 'TypeScript', tests: 21, avgWpm: 79, avgAccuracy: 93.7 },
        { language: 'SQL', tests: 14, avgWpm: 68, avgAccuracy: 90.2 },
      ],
    };
  },
};

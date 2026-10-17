import api from './axios';

export const aiApi = {
  chat: async (message, history = []) => {
    const res = await api.post('/ai/chat', { message, history });
    return res.data;
  },

  generate: async ({ language, topic, difficulty, approach, codeScope }) => {
    const res = await api.post('/ai/generate', {
      language,
      topic,
      difficulty,
      approach,
      codeScope,
    });
    return { data: res.data };
  },

  improve: async (code, language = 'javascript') => {
    const res = await api.post('/ai/improve', { code, language });
    return { data: res.data };
  },

  optimize: async (code, language = 'javascript') => {
    const res = await api.post('/ai/optimize', { code, language });
    return { data: res.data };
  },

  simplify: async (code, language = 'javascript') => {
    const res = await api.post('/ai/simplify', { code, language });
    return { data: res.data };
  },

  explain: async (code, language = 'javascript') => {
    const res = await api.post('/ai/explain', { code, language });
    return { data: res.data };
  },

  suggestTopic: async (prompt, language = 'javascript') => {
    const res = await api.post('/ai/suggest-topic', { prompt, language });
    return { data: res.data };
  },

  generateBuggyTemplate: async ({ language = 'javascript', prompt = '' }) => {
    const res = await api.post('/ai/bugfix/generate', { language, prompt });
    return { data: res.data };
  },

  verifyBugFix: async ({ language, description, originalBuggyCode, userSubmittedCode }) => {
    const res = await api.post('/ai/bugfix/verify', {
      language,
      description,
      originalBuggyCode,
      userSubmittedCode,
    });
    return { data: res.data };
  },
};

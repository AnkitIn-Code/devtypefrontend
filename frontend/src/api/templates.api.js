import api from './axios';

export const templatesApi = {
  getAll: async (params = {}) => {
    const queryParams = {
      page: params.page || 0,
      size: params.size || 100,
    };
    if (params.language) queryParams.language = params.language;
    if (params.difficulty) queryParams.difficulty = params.difficulty;
    if (params.tag) queryParams.tag = params.tag;
    if (params.systemOnly) queryParams.systemOnly = true;
    const q = params.search || params.q;
    if (q) queryParams.q = q;

    const res = await api.get('/templates', { params: queryParams });
    const items = res.data?.content || res.data || [];
    return { data: items };
  },

  getStats: async () => {
    return api.get('/templates/stats');
  },

  getMyTemplates: async (params = {}) => {
    const res = await api.get('/templates/mine', { params });
    const items = res.data?.content || res.data || [];
    return { data: items };
  },

  getById: async (id) => {
    const res = await api.get(`/templates/${id}`);
    return { data: res.data };
  },

  toggleLike: async (id) => {
    const res = await api.post(`/templates/${id}/like`);
    return { data: res.data };
  },

  recordPlay: async (id) => {
    const res = await api.post(`/templates/${id}/play`);
    return { data: res.data };
  },

  create: async (templateData) => {
    const res = await api.post('/templates', templateData);
    return { data: res.data };
  },

  update: async (id, data) => {
    const res = await api.patch(`/templates/${id}`, data);
    return { data: res.data };
  },

  delete: async (id) => {
    const res = await api.delete(`/templates/${id}`);
    return { data: res.data };
  },

  duplicate: async (id) => {
    const res = await api.post(`/templates/${id}/fork`);
    return { data: res.data };
  },

  importFromGitHub: async (importData) => {
    const res = await api.post('/templates/import-github', importData);
    return { data: res.data };
  },
};

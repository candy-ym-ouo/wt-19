const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `请求失败: ${res.status}`);
  }
  return res.json();
}

export const films = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/films${qs ? '?' + qs : ''}`);
  },
  get: (id) => request(`/films/${id}`),
  create: (data) => request('/films', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/films/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/films/${id}`, { method: 'DELETE' }),
};

export const screenings = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/screenings${qs ? '?' + qs : ''}`);
  },
  create: (data) => request('/screenings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/screenings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/screenings/${id}`, { method: 'DELETE' }),
};

export const reviews = {
  list: () => request('/reviews'),
  create: (data) => request('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),
};

export const favorites = {
  list: () => request('/favorites'),
  toggle: (filmId, data = {}) => request(`/favorites/${filmId}`, { method: 'POST', body: JSON.stringify(data) }),
  updateReminders: (filmId, data) => request(`/favorites/${filmId}/reminders`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (filmId) => request(`/favorites/${filmId}`, { method: 'DELETE' }),
};

export const notifications = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/notifications${qs ? '?' + qs : ''}`);
  },
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),
  delete: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
};

export const stats = {
  get: () => request('/stats'),
};

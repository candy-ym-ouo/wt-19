const API_BASE = '/api';
const LIKES_STORAGE_KEY = 'film_notes_liked_reviews';

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

export const likeStore = {
  getLikedIds: () => {
    try {
      const data = localStorage.getItem(LIKES_STORAGE_KEY);
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch {
      return new Set();
    }
  },
  isLiked: (reviewId) => {
    return likeStore.getLikedIds().has(String(reviewId));
  },
  addLike: (reviewId) => {
    const ids = likeStore.getLikedIds();
    ids.add(String(reviewId));
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...ids]));
  },
  removeLike: (reviewId) => {
    const ids = likeStore.getLikedIds();
    ids.delete(String(reviewId));
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...ids]));
  },
  getLikedArray: () => {
    return [...likeStore.getLikedIds()];
  }
};

export const films = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/films${qs ? '?' + qs : ''}`);
  },
  get: (id, params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/films/${id}${qs ? '?' + qs : ''}`);
  },
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
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/reviews${qs ? '?' + qs : ''}`);
  },
  create: (data) => request('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),
  like: (id) => request(`/reviews/${id}/like`, { method: 'PUT' }),
};

export const reports = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/reports${qs ? '?' + qs : ''}`);
  },
  create: (data) => request('/reports', { method: 'POST', body: JSON.stringify(data) }),
  handle: (id, data) => request(`/reports/${id}/handle`, { method: 'PUT', body: JSON.stringify(data) }),
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

export const collections = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
    return request(`/collections${qs ? '?' + qs : ''}`);
  },
  get: (id) => request(`/collections/${id}`),
  create: (data) => request('/collections', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/collections/${id}`, { method: 'DELETE' }),
  addFilm: (id, data) => request(`/collections/${id}/films`, { method: 'POST', body: JSON.stringify(data) }),
  updateFilm: (id, filmId, data) => request(`/collections/${id}/films/${filmId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeFilm: (id, filmId) => request(`/collections/${id}/films/${filmId}`, { method: 'DELETE' }),
  getDirectors: () => request('/collections/aggregate/directors'),
  getCountries: () => request('/collections/aggregate/countries'),
  getThemes: () => request('/collections/aggregate/themes'),
};

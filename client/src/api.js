const API_BASE = '/api';
const LIKES_STORAGE_KEY = 'film_notes_liked_reviews';
const DRAFTS_STORAGE_KEY = 'film_notes_review_drafts';
const DRAFT_EXPIRE_DAYS = 7;

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

export const draftStore = {
  getAll: () => {
    try {
      const data = localStorage.getItem(DRAFTS_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },
  getAllArray: () => {
    const drafts = draftStore.getAll();
    return Object.values(drafts).sort((a, b) => b.updated_at - a.updated_at);
  },
  get: (filmId) => {
    const drafts = draftStore.getAll();
    return drafts[String(filmId)] || null;
  },
  save: (filmId, formData, filmInfo = {}) => {
    const drafts = draftStore.getAll();
    const existing = drafts[String(filmId)];
    const now = Date.now();
    drafts[String(filmId)] = {
      ...existing,
      id: String(filmId),
      film_id: filmId,
      film_title: filmInfo.title || existing?.film_title || '',
      film_poster: filmInfo.poster || existing?.film_poster || '',
      film_director: filmInfo.director || existing?.film_director || '',
      film_year: filmInfo.year || existing?.film_year || '',
      author: formData.author || '',
      content: formData.content || '',
      rating: formData.rating || 5,
      mood: formData.mood || '',
      watched_date: formData.watched_date || '',
      is_spoiler: formData.is_spoiler || false,
      created_at: existing?.created_at || now,
      updated_at: now,
    };
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    window.dispatchEvent(new CustomEvent('draftUpdated', { detail: { filmId } }));
    return drafts[String(filmId)];
  },
  remove: (filmId) => {
    const drafts = draftStore.getAll();
    delete drafts[String(filmId)];
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    window.dispatchEvent(new CustomEvent('draftUpdated', { detail: { filmId } }));
  },
  hasDraft: (filmId) => {
    const draft = draftStore.get(filmId);
    return draft && draft.content?.trim().length > 0;
  },
  cleanupExpired: () => {
    const drafts = draftStore.getAll();
    const expireTime = DRAFT_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let removedCount = 0;
    Object.keys(drafts).forEach(key => {
      if (now - drafts[key].updated_at > expireTime) {
        delete drafts[key];
        removedCount++;
      }
    });
    if (removedCount > 0) {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
      window.dispatchEvent(new CustomEvent('draftUpdated'));
    }
    return removedCount;
  },
  clearAll: () => {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify({}));
    window.dispatchEvent(new CustomEvent('draftUpdated'));
  },
  getCount: () => {
    const drafts = draftStore.getAllArray();
    return drafts.filter(d => d.content?.trim().length > 0).length;
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
  similar: (id, params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/films/${id}/similar${qs ? '?' + qs : ''}`);
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

export const venues = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/venues${qs ? '?' + qs : ''}`);
  },
  get: (id) => request(`/venues/${id}`),
  create: (data) => request('/venues', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/venues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/venues/${id}`, { method: 'DELETE' }),
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
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/favorites${qs ? '?' + qs : ''}`);
  },
  toggle: (filmId, data = {}) => request(`/favorites/${filmId}`, { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (filmId, data) => request(`/favorites/${filmId}/status`, { method: 'PUT', body: JSON.stringify(data) }),
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

export const search = {
  all: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
    return request(`/search${qs ? '?' + qs : ''}`);
  },
};

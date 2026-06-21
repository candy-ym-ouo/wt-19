import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { films as filmsApi, screenings as screeningsApi, reviews as reviewsApi, stats as statsApi, notifications as notifApi, favorites as favApi } from '../api.js';

const emptyFilm = {
  title: '', original_title: '', director: '', year: '', country: '',
  genre: '', duration: '', language: '', synopsis: '', poster: '', rating: ''
};

const emptyScreening = {
  film_id: '', screening_date: '', screening_time: '', venue: '', location: '', notes: '',
  ticket_status: 'not_open', ticket_open_date: '', is_changed: 0, change_description: ''
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [filmList, setFilmList] = useState([]);
  const [screeningList, setScreeningList] = useState([]);
  const [reviewList, setReviewList] = useState([]);
  const [notificationList, setNotificationList] = useState([]);
  const [favoriteList, setFavoriteList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilmForm, setShowFilmForm] = useState(false);
  const [showScreeningForm, setShowScreeningForm] = useState(false);
  const [editingFilm, setEditingFilm] = useState(null);
  const [editingScreening, setEditingScreening] = useState(null);
  const [filmForm, setFilmForm] = useState(emptyFilm);
  const [screeningForm, setScreeningForm] = useState(emptyScreening);

  const fetchAll = async () => {
    setLoading(true);
    const [s, f, sc, r, n, fav] = await Promise.all([
      statsApi.get(), filmsApi.list(), screeningsApi.list(), reviewsApi.list(),
      notifApi.list(), favApi.list()
    ]);
    setStats(s);
    setFilmList(f);
    setScreeningList(sc);
    setReviewList(r);
    setNotificationList(n);
    setFavoriteList(fav);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openNewFilm = () => {
    setEditingFilm(null);
    setFilmForm(emptyFilm);
    setShowFilmForm(true);
  };

  const openEditFilm = (film) => {
    setEditingFilm(film);
    setFilmForm({
      title: film.title || '',
      original_title: film.original_title || '',
      director: film.director || '',
      year: film.year || '',
      country: film.country || '',
      genre: film.genre || '',
      duration: film.duration || '',
      language: film.language || '',
      synopsis: film.synopsis || '',
      poster: film.poster || '',
      rating: film.rating || ''
    });
    setShowFilmForm(true);
  };

  const openEditScreening = (s) => {
    setEditingScreening(s);
    setScreeningForm({
      film_id: s.film_id,
      screening_date: s.screening_date,
      screening_time: s.screening_time,
      venue: s.venue || '',
      location: s.location || '',
      notes: s.notes || '',
      ticket_status: s.ticket_status || 'not_open',
      ticket_open_date: s.ticket_open_date || '',
      is_changed: s.is_changed || 0,
      change_description: s.change_description || ''
    });
    setShowScreeningForm(true);
  };

  const handleFilmSubmit = async (e) => {
    e.preventDefault();
    if (!filmForm.title.trim()) {
      alert('请填写影片标题');
      return;
    }
    try {
      const data = {
        ...filmForm,
        year: filmForm.year ? parseInt(filmForm.year) : null,
        duration: filmForm.duration ? parseInt(filmForm.duration) : null,
        rating: filmForm.rating ? parseFloat(filmForm.rating) : null,
      };
      if (editingFilm) {
        await filmsApi.update(editingFilm.id, data);
      } else {
        await filmsApi.create(data);
      }
      setShowFilmForm(false);
      setEditingFilm(null);
      setFilmForm(emptyFilm);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleScreeningSubmit = async (e) => {
    e.preventDefault();
    if (!screeningForm.film_id || !screeningForm.screening_date || !screeningForm.screening_time) {
      alert('请选择影片、日期和时间');
      return;
    }
    try {
      const data = {
        ...screeningForm,
        is_changed: screeningForm.is_changed ? 1 : 0
      };
      if (editingScreening) {
        await screeningsApi.update(editingScreening.id, data);
      } else {
        await screeningsApi.create(data);
      }
      setShowScreeningForm(false);
      setEditingScreening(null);
      setScreeningForm(emptyScreening);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteFilm = async (id) => {
    if (!confirm('确定删除此影片？相关放映场次、评论和收藏也会被删除。')) return;
    try {
      await filmsApi.delete(id);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteScreening = async (id) => {
    if (!confirm('确定删除此放映场次？')) return;
    try {
      await screeningsApi.delete(id);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!confirm('确定删除此短评？')) return;
    try {
      await reviewsApi.delete(id);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await notifApi.markRead(id);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await notifApi.markAllRead();
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!confirm('确定删除此通知？')) return;
    try {
      await notifApi.delete(id);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateFavoriteReminders = async (filmId, field, value) => {
    try {
      await favApi.updateReminders(filmId, { [field]: value });
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const tabs = [
    { key: 'overview', label: '总览', icon: '📊' },
    { key: 'films', label: '影片管理', icon: '🎬' },
    { key: 'screenings', label: '放映场次', icon: '📅' },
    { key: 'reviews', label: '短评管理', icon: '✍️' },
    { key: 'favorites', label: '收藏与提醒', icon: '🔔' },
    { key: 'notifications', label: '通知中心', icon: '📬' },
  ];

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold">后台维护</h1>
        <p className="text-film-cream/60 mt-2">管理影片、放映场次和观影记录</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-film-gray/50 pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 rounded-t-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-film-dark text-film-gold border border-b-0 border-film-gray/50'
                : 'text-film-cream/60 hover:text-film-cream hover:bg-film-dark/50'
            }`}
          >
            <span className="mr-2">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {[
              { label: '影片总数', value: stats.filmCount, icon: '🎬', color: 'from-film-gold/20 to-film-gold/5' },
              { label: '放映场次', value: stats.screeningCount, icon: '📅', color: 'from-blue-500/20 to-blue-500/5' },
              { label: '短评数量', value: stats.reviewCount, icon: '✍️', color: 'from-pink-500/20 to-pink-500/5' },
              { label: '收藏数量', value: stats.favoriteCount, icon: '❤️', color: 'from-red-500/20 to-red-500/5' },
              { label: '未读通知', value: stats.unreadNotificationCount, icon: '🔔', color: 'from-orange-500/20 to-orange-500/5' },
              { label: '通知总数', value: notificationList.length, icon: '📬', color: 'from-purple-500/20 to-purple-500/5' },
            ].map(item => (
              <div key={item.label} className={`p-5 rounded-xl bg-gradient-to-br ${item.color} border border-film-gray/50`}>
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="text-3xl font-serif font-bold text-film-cream">{item.value}</div>
                <div className="text-sm text-film-cream/60 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-film-dark/50 rounded-xl border border-film-gray/50 p-6">
              <h3 className="text-lg font-semibold mb-4">即将放映</h3>
              {stats.upcomingScreenings.length === 0 ? (
                <p className="text-film-cream/50 text-sm">暂无安排</p>
              ) : (
                <div className="space-y-3">
                  {stats.upcomingScreenings.map(s => (
                    <Link key={s.id} to={`/films/${s.film_id}`} className="flex items-center gap-3 p-3 rounded-lg bg-film-black/40 hover:bg-film-black/60 transition-colors">
                      <div className="text-film-gold font-mono text-sm min-w-[80px]">
                        {s.screening_date}<br />
                        <span className="text-film-cream/50 text-xs">{s.screening_time}</span>
                      </div>
                      <div className="w-8 h-11 bg-film-gray rounded overflow-hidden flex-shrink-0">
                        {s.poster && <img src={s.poster} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="font-medium text-sm truncate flex-1">{s.title}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-film-dark/50 rounded-xl border border-film-gray/50 p-6">
              <h3 className="text-lg font-semibold mb-4">最新短评</h3>
              {stats.recentReviews.length === 0 ? (
                <p className="text-film-cream/50 text-sm">暂无短评</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentReviews.map(r => (
                    <div key={r.id} className="p-3 rounded-lg bg-film-black/40">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-film-gold/40 to-film-red/40 flex items-center justify-center text-xs">
                          {(r.author || '匿')[0]}
                        </div>
                        <span className="text-sm font-medium">{r.author || '匿名'}</span>
                        <span className="text-xs text-film-gold">{'★'.repeat(r.rating || 0)}</span>
                      </div>
                      <Link to={`/films/${r.film_id}`} className="text-xs text-film-cream/60 hover:text-film-gold">
                        《{r.title}》
                      </Link>
                      <p className="text-sm text-film-cream/80 mt-1 line-clamp-2">{r.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-film-dark/50 rounded-xl border border-film-gray/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">最近通知</h3>
                {stats.unreadNotificationCount > 0 && (
                  <button onClick={handleMarkAllNotificationsRead} className="text-xs text-film-gold hover:underline">
                    全部已读
                  </button>
                )}
              </div>
              {stats.recentNotifications && stats.recentNotifications.length === 0 ? (
                <p className="text-film-cream/50 text-sm">暂无通知</p>
              ) : (
                <div className="space-y-3">
                  {(stats.recentNotifications || []).map(n => (
                    <div key={n.id} className={`p-3 rounded-lg ${n.is_read ? 'bg-film-black/20' : 'bg-film-black/40 border-l-2 border-film-gold'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs">
                          {n.type === 'ticket_on_sale' ? '🎟️' : '📅'}
                        </span>
                        <Link to={`/films/${n.film_id}`} className="text-sm font-medium text-film-cream hover:text-film-gold truncate">
                          {n.title}
                        </Link>
                      </div>
                      {n.content && <p className="text-xs text-film-cream/50 line-clamp-2 ml-5">{n.content}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'films' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <p className="text-film-cream/60">共 {filmList.length} 部影片</p>
            <button
              onClick={openNewFilm}
              className="px-5 py-2 bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors"
            >
              + 新增影片
            </button>
          </div>

          <div className="bg-film-dark/50 rounded-xl border border-film-gray/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-film-black/50 text-film-cream/60">
                  <tr>
                    <th className="text-left p-4 font-medium">影片</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">导演</th>
                    <th className="text-left p-4 font-medium hidden lg:table-cell">年份</th>
                    <th className="text-left p-4 font-medium hidden lg:table-cell">国家</th>
                    <th className="text-left p-4 font-medium">评分</th>
                    <th className="text-right p-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filmList.map(f => (
                    <tr key={f.id} className="border-t border-film-gray/30 hover:bg-film-black/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 bg-film-gray rounded overflow-hidden flex-shrink-0">
                            {f.poster && <img src={f.poster} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <Link to={`/films/${f.id}`} className="font-medium text-film-cream hover:text-film-gold">
                              {f.title}
                            </Link>
                            {f.original_title && <div className="text-xs text-film-cream/40 italic">{f.original_title}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-film-cream/70 hidden md:table-cell">{f.director || '-'}</td>
                      <td className="p-4 text-film-cream/70 hidden lg:table-cell">{f.year || '-'}</td>
                      <td className="p-4 text-film-cream/70 hidden lg:table-cell">{f.country || '-'}</td>
                      <td className="p-4">
                        {f.rating ? <span className="text-film-gold font-semibold">★ {f.rating}</span> : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => openEditFilm(f)}
                          className="text-film-cream/60 hover:text-film-gold px-3 py-1 rounded transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteFilm(f.id)}
                          className="text-film-cream/60 hover:text-film-red px-3 py-1 rounded transition-colors"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'screenings' && (
        <div>
          <p className="text-film-cream/60 mb-6">共 {screeningList.length} 场放映</p>
          <div className="space-y-2">
            {screeningList.map(s => (
              <div key={s.id} className="group flex flex-wrap items-center gap-4 p-4 bg-film-dark/50 rounded-xl border border-film-gray/50">
                <div className="text-center min-w-[70px]">
                  <div className="text-2xl font-serif font-bold text-film-gold">{new Date(s.screening_date).getDate()}</div>
                  <div className="text-xs text-film-cream/50">
                    {new Date(s.screening_date).toLocaleDateString('zh-CN', { month: 'short' })}
                  </div>
                </div>
                <div className="font-mono text-film-gold">{s.screening_time}</div>
                <div className="w-10 h-14 bg-film-gray rounded overflow-hidden flex-shrink-0">
                  {s.poster && <img src={s.poster} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/films/${s.film_id}`} className="font-medium hover:text-film-gold">{s.title}</Link>
                  <div className="text-xs text-film-cream/50 flex flex-wrap gap-3 mt-0.5">
                    {s.venue && <span>🏛 {s.venue}</span>}
                    {s.location && <span>📍 {s.location}</span>}
                    {s.notes && <span className="text-film-gold">📝 {s.notes}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.ticket_status === 'on_sale' && (
                    <span className="bg-green-500/15 text-green-400 px-2.5 py-0.5 rounded-full text-xs">正在售票</span>
                  )}
                  {s.ticket_status === 'not_open' && (
                    <span className="bg-film-gray/50 text-film-cream/60 px-2.5 py-0.5 rounded-full text-xs">尚未开票</span>
                  )}
                  {s.ticket_status === 'sold_out' && (
                    <span className="bg-red-500/15 text-red-400 px-2.5 py-0.5 rounded-full text-xs">已售罄</span>
                  )}
                  {s.is_changed && (
                    <span className="bg-orange-500/15 text-orange-400 px-2.5 py-0.5 rounded-full text-xs" title={s.change_description}>场次变更</span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditScreening(s)}
                    className="text-film-cream/60 hover:text-film-gold px-3 py-1 rounded transition-colors text-sm"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteScreening(s.id)}
                    className="text-film-cream/60 hover:text-film-red px-3 py-1 rounded transition-colors text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div>
          <p className="text-film-cream/60 mb-6">共 {reviewList.length} 条短评</p>
          <div className="space-y-3">
            {reviewList.map(r => (
              <div key={r.id} className="group p-5 bg-film-dark/50 rounded-xl border border-film-gray/50">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-film-gold/40 to-film-red/40 flex items-center justify-center text-sm font-semibold">
                      {(r.author || '匿')[0]}
                    </div>
                    <div>
                      <div className="font-medium">{r.author || '匿名观众'}</div>
                      <div className="text-xs text-film-cream/40">
                        {r.watched_date && `观看于 ${r.watched_date}`}
                        {r.created_at && ` · 发布于 ${new Date(r.created_at).toLocaleDateString('zh-CN')}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.rating && <span className="text-film-gold text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>}
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      className="text-film-cream/30 hover:text-film-red p-1.5 rounded hover:bg-film-red/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <Link to={`/films/${r.film_id}`} className="text-sm text-film-gold hover:underline mb-2 inline-block">
                  《{r.title}》
                </Link>
                <p className="text-film-cream/85 leading-relaxed font-serif">{r.content}</p>
                {r.mood && (
                  <span className="inline-block mt-3 text-xs bg-film-gray text-film-cream/60 px-2.5 py-0.5 rounded-full">
                    {r.mood}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'favorites' && (
        <div>
          <p className="text-film-cream/60 mb-6">共 {favoriteList.length} 部收藏影片，可单独配置提醒开关</p>
          {favoriteList.length === 0 ? (
            <div className="py-16 text-center text-film-cream/50 border border-dashed border-film-gray rounded-xl">
              暂无收藏影片
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteList.map(fav => (
                <div key={fav.id} className="flex flex-wrap items-center gap-4 p-4 bg-film-dark/50 rounded-xl border border-film-gray/50">
                  <div className="w-12 h-16 bg-film-gray rounded overflow-hidden flex-shrink-0">
                    {fav.poster && <img src={fav.poster} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/films/${fav.film_id}`} className="font-medium hover:text-film-gold">{fav.title}</Link>
                    <div className="text-xs text-film-cream/50 mt-0.5">
                      {fav.director && `${fav.director} · `}{fav.year && `${fav.year}年`}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!fav.ticket_reminder_enabled}
                        onChange={(e) => handleUpdateFavoriteReminders(fav.film_id, 'ticket_reminder_enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-film-gray bg-film-black text-film-gold focus:ring-film-gold"
                      />
                      <span className="text-sm text-film-cream/80">🎟️ 开票提醒</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!fav.schedule_change_reminder_enabled}
                        onChange={(e) => handleUpdateFavoriteReminders(fav.film_id, 'schedule_change_reminder_enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-film-gray bg-film-black text-film-gold focus:ring-film-gold"
                      />
                      <span className="text-sm text-film-cream/80">📅 放映变更</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div>
          <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
            <p className="text-film-cream/60">共 {notificationList.length} 条通知，{notificationList.filter(n => !n.is_read).length} 条未读</p>
            {notificationList.some(n => !n.is_read) && (
              <button
                onClick={handleMarkAllNotificationsRead}
                className="px-4 py-1.5 text-sm bg-film-gold/10 text-film-gold rounded-lg hover:bg-film-gold/20 transition-colors"
              >
                全部标记已读
              </button>
            )}
          </div>
          {notificationList.length === 0 ? (
            <div className="py-16 text-center text-film-cream/50 border border-dashed border-film-gray rounded-xl">
              暂无通知
            </div>
          ) : (
            <div className="space-y-2">
              {notificationList.map(n => (
                <div key={n.id} className={`group p-4 rounded-xl border flex flex-wrap items-start gap-4 ${n.is_read ? 'bg-film-dark/30 border-film-gray/30' : 'bg-film-dark/60 border-film-gray/50 border-l-4 border-l-film-gold'}`}>
                  <div className="text-2xl mt-0.5">
                    {n.type === 'ticket_on_sale' ? '🎟️' : '📅'}
                  </div>
                  <div className="w-10 h-14 bg-film-gray rounded overflow-hidden flex-shrink-0">
                    {n.poster && <img src={n.poster} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/films/${n.film_id}`} className={`font-medium hover:text-film-gold ${n.is_read ? 'text-film-cream/70' : ''}`}>
                      {n.title}
                    </Link>
                    {n.content && <p className="text-sm text-film-cream/50 mt-1">{n.content}</p>}
                    <div className="text-xs text-film-cream/30 mt-2">
                      {new Date(n.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkNotificationRead(n.id)}
                        className="text-film-cream/60 hover:text-film-gold px-3 py-1 rounded transition-colors text-sm"
                      >
                        标记已读
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(n.id)}
                      className="text-film-cream/60 hover:text-film-red px-3 py-1 rounded transition-colors text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showScreeningForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowScreeningForm(false)}>
          <div className="bg-film-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-film-gray" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-film-dark border-b border-film-gray/50 p-5 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">{editingScreening ? '编辑放映场次' : '添加放映场次'}</h2>
              <button
                onClick={() => setShowScreeningForm(false)}
                className="p-2 rounded-lg hover:bg-film-gray transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleScreeningSubmit} className="p-5 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">选择影片 *</label>
                  <select
                    value={screeningForm.film_id}
                    onChange={(e) => setScreeningForm({ ...screeningForm, film_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  >
                    <option value="">请选择影片</option>
                    {filmList.map(f => (
                      <option key={f.id} value={f.id}>{f.title} ({f.year})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">放映日期 *</label>
                  <input
                    type="date"
                    value={screeningForm.screening_date}
                    onChange={(e) => setScreeningForm({ ...screeningForm, screening_date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">放映时间 *</label>
                  <input
                    type="time"
                    value={screeningForm.screening_time}
                    onChange={(e) => setScreeningForm({ ...screeningForm, screening_time: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">开票状态</label>
                  <select
                    value={screeningForm.ticket_status}
                    onChange={(e) => setScreeningForm({ ...screeningForm, ticket_status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  >
                    <option value="not_open">尚未开票</option>
                    <option value="on_sale">正在售票</option>
                    <option value="sold_out">已售罄</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">影院/场馆</label>
                  <input
                    type="text"
                    value={screeningForm.venue}
                    onChange={(e) => setScreeningForm({ ...screeningForm, venue: e.target.value })}
                    placeholder="如 中国电影资料馆"
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">地点</label>
                  <input
                    type="text"
                    value={screeningForm.location}
                    onChange={(e) => setScreeningForm({ ...screeningForm, location: e.target.value })}
                    placeholder="如 北京·小西天"
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">预计开票日期</label>
                  <input
                    type="date"
                    value={screeningForm.ticket_open_date}
                    onChange={(e) => setScreeningForm({ ...screeningForm, ticket_open_date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">备注</label>
                  <input
                    type="text"
                    value={screeningForm.notes}
                    onChange={(e) => setScreeningForm({ ...screeningForm, notes: e.target.value })}
                    placeholder="如 4K修复版、导演映后谈等"
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!screeningForm.is_changed}
                      onChange={(e) => setScreeningForm({ ...screeningForm, is_changed: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 rounded border-film-gray bg-film-black text-film-gold focus:ring-film-gold"
                    />
                    <span className="text-sm text-film-cream/80">标记为场次变更</span>
                  </label>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">变更说明</label>
                  <input
                    type="text"
                    value={screeningForm.change_description}
                    onChange={(e) => setScreeningForm({ ...screeningForm, change_description: e.target.value })}
                    placeholder="如 时间由15:00调整为14:00"
                    disabled={!screeningForm.is_changed}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-film-gray/50">
                <button
                  type="button"
                  onClick={() => setShowScreeningForm(false)}
                  className="px-5 py-2.5 rounded-lg text-film-cream/60 hover:text-film-cream transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-film-gold text-film-black font-medium hover:bg-film-gold/90 transition-colors"
                >
                  {editingScreening ? '保存修改' : '添加场次'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFilmForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowFilmForm(false)}>
          <div className="bg-film-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-film-gray" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-film-dark border-b border-film-gray/50 p-5 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">{editingFilm ? '编辑影片' : '新增影片'}</h2>
              <button
                onClick={() => setShowFilmForm(false)}
                className="p-2 rounded-lg hover:bg-film-gray transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleFilmSubmit} className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">片名 *</label>
                  <input
                    type="text"
                    value={filmForm.title}
                    onChange={(e) => setFilmForm({ ...filmForm, title: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">原名</label>
                  <input
                    type="text"
                    value={filmForm.original_title}
                    onChange={(e) => setFilmForm({ ...filmForm, original_title: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">导演</label>
                  <input
                    type="text"
                    value={filmForm.director}
                    onChange={(e) => setFilmForm({ ...filmForm, director: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">年份</label>
                  <input
                    type="number"
                    value={filmForm.year}
                    onChange={(e) => setFilmForm({ ...filmForm, year: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">国家/地区</label>
                  <input
                    type="text"
                    value={filmForm.country}
                    onChange={(e) => setFilmForm({ ...filmForm, country: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">类型</label>
                  <input
                    type="text"
                    value={filmForm.genre}
                    onChange={(e) => setFilmForm({ ...filmForm, genre: e.target.value })}
                    placeholder="如 剧情/爱情"
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">片长（分钟）</label>
                  <input
                    type="number"
                    value={filmForm.duration}
                    onChange={(e) => setFilmForm({ ...filmForm, duration: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">语言</label>
                  <input
                    type="text"
                    value={filmForm.language}
                    onChange={(e) => setFilmForm({ ...filmForm, language: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">评分（0-10）</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={filmForm.rating}
                    onChange={(e) => setFilmForm({ ...filmForm, rating: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">海报 URL</label>
                  <input
                    type="url"
                    value={filmForm.poster}
                    onChange={(e) => setFilmForm({ ...filmForm, poster: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">剧情简介</label>
                  <textarea
                    value={filmForm.synopsis}
                    onChange={(e) => setFilmForm({ ...filmForm, synopsis: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-film-gray/50">
                <button
                  type="button"
                  onClick={() => setShowFilmForm(false)}
                  className="px-5 py-2.5 rounded-lg text-film-cream/60 hover:text-film-cream transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-film-gold text-film-black font-medium hover:bg-film-gold/90 transition-colors"
                >
                  {editingFilm ? '保存修改' : '添加影片'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

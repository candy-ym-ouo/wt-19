import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { films as filmsApi, screenings as screeningsApi, reviews as reviewsApi, stats as statsApi } from '../api.js';

const emptyFilm = {
  title: '', original_title: '', director: '', year: '', country: '',
  genre: '', duration: '', language: '', synopsis: '', poster: '', rating: ''
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [filmList, setFilmList] = useState([]);
  const [screeningList, setScreeningList] = useState([]);
  const [reviewList, setReviewList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilmForm, setShowFilmForm] = useState(false);
  const [editingFilm, setEditingFilm] = useState(null);
  const [filmForm, setFilmForm] = useState(emptyFilm);

  const fetchAll = async () => {
    setLoading(true);
    const [s, f, sc, r] = await Promise.all([
      statsApi.get(), filmsApi.list(), screeningsApi.list(), reviewsApi.list()
    ]);
    setStats(s);
    setFilmList(f);
    setScreeningList(sc);
    setReviewList(r);
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

  const tabs = [
    { key: 'overview', label: '总览', icon: '📊' },
    { key: 'films', label: '影片管理', icon: '🎬' },
    { key: 'screenings', label: '放映场次', icon: '📅' },
    { key: 'reviews', label: '短评管理', icon: '✍️' },
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: '影片总数', value: stats.filmCount, icon: '🎬', color: 'from-film-gold/20 to-film-gold/5' },
              { label: '放映场次', value: stats.screeningCount, icon: '📅', color: 'from-blue-500/20 to-blue-500/5' },
              { label: '短评数量', value: stats.reviewCount, icon: '✍️', color: 'from-pink-500/20 to-pink-500/5' },
              { label: '收藏数量', value: stats.favoriteCount, icon: '❤️', color: 'from-red-500/20 to-red-500/5' },
            ].map(item => (
              <div key={item.label} className={`p-5 rounded-xl bg-gradient-to-br ${item.color} border border-film-gray/50`}>
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="text-3xl font-serif font-bold text-film-cream">{item.value}</div>
                <div className="text-sm text-film-cream/60 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
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
                      <div className="font-medium text-sm truncate">{s.title}</div>
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
          <p className="text-film-cream/60 mb-6">共 {screeningList.length} 场放映（可到「放映日历」页添加）</p>
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
                <button
                  onClick={() => handleDeleteScreening(s.id)}
                  className="text-film-cream/30 hover:text-film-red p-2 rounded hover:bg-film-red/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
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

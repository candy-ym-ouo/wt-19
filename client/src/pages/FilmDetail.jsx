import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { films as filmsApi, reviews as reviewsApi, favorites as favApi } from '../api.js';

const moodOptions = ['感动', '愉悦', '沉思', '震撼', '忧郁', '温暖'];
const ratingOptions = [1, 2, 3, 4, 5];

export default function FilmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [film, setFilm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ author: '', content: '', rating: 5, mood: '', watched_date: '' });

  const fetchData = () => {
    setLoading(true);
    filmsApi.get(id).then(data => {
      setFilm(data);
      setIsFavorite(data.isFavorite);
      setLoading(false);
    }).catch(() => {
      navigate('/films');
    });
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleToggleFavorite = async () => {
    try {
      const res = await favApi.toggle(id);
      setIsFavorite(res.isFavorite);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.content.trim()) {
      alert('请填写评论内容');
      return;
    }
    try {
      await reviewsApi.create({ ...reviewForm, film_id: id });
      setShowReviewForm(false);
      setReviewForm({ author: '', content: '', rating: 5, mood: '', watched_date: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;
  }
  if (!film) return null;

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-film-gold/5 via-film-black to-film-black" />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <Link to="/films" className="text-film-cream/60 hover:text-film-gold text-sm inline-flex items-center gap-2 mb-8 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回影片库
          </Link>

          <div className="grid md:grid-cols-[300px_1fr] gap-10">
            <div className="relative">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-film-gray border border-film-gray/50">
                {film.poster ? (
                  <img src={film.poster} alt={film.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-film-cream/30">
                    <svg className="w-20 h-20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-serif font-bold">{film.title}</h1>
                  {film.original_title && (
                    <p className="text-film-cream/50 mt-2 italic">{film.original_title}</p>
                  )}
                </div>
                {film.rating && (
                  <div className="flex items-center gap-2 bg-film-gold/10 px-4 py-2 rounded-lg">
                    <span className="text-film-gold text-xl">★</span>
                    <span className="text-2xl font-bold text-film-gold">{film.rating}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: '导演', value: film.director },
                  { label: '年份', value: film.year },
                  { label: '国家/地区', value: film.country },
                  { label: '类型', value: film.genre },
                  { label: '片长', value: film.duration ? `${film.duration} 分钟` : null },
                  { label: '语言', value: film.language },
                ].filter(x => x.value).map(item => (
                  <div key={item.label}>
                    <div className="text-xs text-film-cream/40 tracking-wider uppercase">{item.label}</div>
                    <div className="text-film-cream mt-1">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={handleToggleFavorite}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all inline-flex items-center gap-2 ${
                    isFavorite
                      ? 'bg-film-red text-white hover:bg-film-red/80'
                      : 'bg-film-gold/10 text-film-gold border border-film-gold/50 hover:bg-film-gold/20'
                  }`}
                >
                  <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {isFavorite ? '已收藏' : '加入收藏'}
                </button>
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-6 py-2.5 rounded-lg font-medium bg-film-gray text-film-cream hover:bg-film-gray/80 transition-all inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  写短评
                </button>
              </div>

              {film.synopsis && (
                <div className="mt-10">
                  <h3 className="text-sm text-film-gold tracking-wider uppercase mb-3">剧情简介</h3>
                  <p className="text-film-cream/80 leading-relaxed font-serif text-lg">
                    {film.synopsis}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-20">
        {film.screenings && film.screenings.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-serif font-bold mb-6">放映排期</h2>
            <div className="space-y-3">
              {film.screenings.map(s => (
                <div key={s.id} className="p-5 bg-film-dark/60 rounded-xl border border-film-gray/50 flex flex-wrap items-center gap-6">
                  <div className="flex-shrink-0 text-center min-w-[70px]">
                    <div className="text-xs text-film-cream/50">
                      {new Date(s.screening_date).toLocaleDateString('zh-CN', { month: 'long' })}
                    </div>
                    <div className="text-3xl font-serif font-bold text-film-gold">
                      {new Date(s.screening_date).getDate()}
                    </div>
                    <div className="text-xs text-film-cream/50">
                      {new Date(s.screening_date).toLocaleDateString('zh-CN', { weekday: 'short' })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 text-lg">
                      <span className="text-film-gold font-mono">{s.screening_time}</span>
                      {s.venue && <span className="text-film-cream/90">{s.venue}</span>}
                    </div>
                    {s.location && <p className="text-sm text-film-cream/50 mt-1">{s.location}</p>}
                  </div>
                  {s.notes && (
                    <span className="bg-film-gold/10 text-film-gold px-3 py-1 rounded-full text-sm">
                      {s.notes}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {showReviewForm && (
          <section className="mb-12">
            <div className="p-6 bg-film-dark rounded-xl border border-film-gray/50">
              <h3 className="text-lg font-semibold mb-5">发表观后短评</h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-film-cream/60 mb-1.5 block">昵称</label>
                    <input
                      type="text"
                      value={reviewForm.author}
                      onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })}
                      placeholder="匿名观众"
                      className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-film-cream/60 mb-1.5 block">观看日期</label>
                    <input
                      type="date"
                      value={reviewForm.watched_date}
                      onChange={(e) => setReviewForm({ ...reviewForm, watched_date: e.target.value })}
                      className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-film-cream/60 mb-1.5 block">观影心情</label>
                    <select
                      value={reviewForm.mood}
                      onChange={(e) => setReviewForm({ ...reviewForm, mood: e.target.value })}
                      className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                    >
                      <option value="">选择心情</option>
                      {moodOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">评分</label>
                  <div className="flex gap-2">
                    {ratingOptions.map(r => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setReviewForm({ ...reviewForm, rating: r })}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          reviewForm.rating >= r ? 'bg-film-gold text-film-black' : 'bg-film-gray text-film-cream/50'
                        }`}
                      >
                        {'★'.repeat(r)}{'☆'.repeat(5 - r)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">评论内容 *</label>
                  <textarea
                    value={reviewForm.content}
                    onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                    rows={4}
                    placeholder="写下你对这部电影的感受..."
                    className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-5 py-2.5 rounded-lg text-film-cream/60 hover:text-film-cream transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg bg-film-gold text-film-black font-medium hover:bg-film-gold/90 transition-colors"
                  >
                    发布短评
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-serif font-bold mb-6">
            观后短评 <span className="text-film-cream/40 text-base font-sans">({film.reviews?.length || 0})</span>
          </h2>
          {!film.reviews || film.reviews.length === 0 ? (
            <div className="py-12 text-center text-film-cream/50 border border-dashed border-film-gray rounded-xl">
              还没有短评，快来发表第一条吧
            </div>
          ) : (
            <div className="space-y-4">
              {film.reviews.map(r => (
                <div key={r.id} className="p-5 bg-film-dark/60 rounded-xl border border-film-gray/50">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-film-gold/40 to-film-red/40 flex items-center justify-center text-sm font-semibold">
                      {(r.author || '匿')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{r.author || '匿名观众'}</div>
                      <div className="text-xs text-film-cream/40">
                        {r.watched_date && `观看于 ${r.watched_date}`}
                        {r.mood && ` · 心情：${r.mood}`}
                      </div>
                    </div>
                    {r.rating && (
                      <div className="text-film-gold">
                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                      </div>
                    )}
                  </div>
                  <p className="text-film-cream/85 leading-relaxed font-serif">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

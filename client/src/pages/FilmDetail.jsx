import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { films as filmsApi, reviews as reviewsApi, favorites as favApi, reports as reportsApi, likeStore, draftStore } from '../api.js';
import FilmCard from '../components/FilmCard.jsx';

const moodOptions = ['感动', '愉悦', '沉思', '震撼', '忧郁', '温暖'];
const ratingOptions = [1, 2, 3, 4, 5];
const sortOptions = [
  { value: 'created_at_desc', label: '最新发布' },
  { value: 'likes_desc', label: '最多点赞' },
  { value: 'rating_desc', label: '评分最高' },
];
const reportReasons = ['剧透', '人身攻击', '垃圾广告', '违规内容', '其他'];

function computeScreeningWatchInfo(screenings, reviews) {
  const now = new Date();
  return screenings.map(s => {
    const [h, m] = String(s.screening_time || '00:00').split(':').map(Number);
    const duration = 120;
    const endDate = new Date(`${s.screening_date}T00:00:00`);
    endDate.setHours(h || 0, (m || 0) + duration, 0, 0);
    const isEnded = now > endDate;
    const endMinutes = (h || 0) * 60 + (m || 0) + duration;
    const endH = Math.floor((endMinutes % 1440) / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const hasReview = reviews && reviews.length > 0;
    const latestReview = hasReview ? reviews[0] : null;
    const hasMood = !!(latestReview && latestReview.mood);
    const hasShortReview = hasReview && latestReview.content && latestReview.content.trim().length >= 10;

    const pendingTasks = [];
    if (isEnded && !hasShortReview) pendingTasks.push('review');
    if (isEnded && !hasMood) pendingTasks.push('mood');

    const daysSinceEnded = isEnded ? Math.max(0, Math.floor((Date.now() - endDate.getTime()) / (24 * 60 * 60 * 1000))) : 0;
    const urgency = !isEnded ? null : (daysSinceEnded >= 7 ? 'high' : daysSinceEnded >= 3 ? 'medium' : 'low');

    return {
      ...s,
      is_ended: isEnded,
      end_time: endTime,
      pending_tasks: pendingTasks,
      has_review: hasShortReview,
      has_mood: hasMood,
      days_since_ended: daysSinceEnded,
      urgency,
    };
  });
}

function findMostUrgentPending(screeningsWithInfo) {
  const pending = screeningsWithInfo.filter(s => s.pending_tasks.length > 0);
  if (pending.length === 0) return null;
  pending.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return b.days_since_ended - a.days_since_ended;
  });
  return pending[0];
}

const WATCH_STATUS_CONFIG = {
  want_to_watch: { label: '想看', icon: '👁️', next: 'ticketed', color: 'bg-blue-500/15 text-blue-400 border-blue-500/50 hover:bg-blue-500/25', activeColor: 'bg-blue-500 text-white hover:bg-blue-500/90' },
  ticketed: { label: '已购票', icon: '🎟️', next: 'watched', color: 'bg-film-gold/15 text-film-gold border-film-gold/50 hover:bg-film-gold/25', activeColor: 'bg-film-gold text-film-black hover:bg-film-gold/90' },
  watched: { label: '已观看', icon: '✅', next: null, color: 'bg-green-500/15 text-green-400 border-green-500/50 hover:bg-green-500/25', activeColor: 'bg-green-500 text-white hover:bg-green-500/90' },
};

export default function FilmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [film, setFilm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [ticketReminder, setTicketReminder] = useState(false);
  const [scheduleReminder, setScheduleReminder] = useState(false);
  const [watchStatus, setWatchStatus] = useState(null);
  const [ticketDate, setTicketDate] = useState(null);
  const [watchedDate, setWatchedDate] = useState(null);
  const [planDate, setPlanDate] = useState(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ author: '', content: '', rating: 5, mood: '', watched_date: '', is_spoiler: false });
  const [reviewSort, setReviewSort] = useState('created_at_desc');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [hasExpiredDraft, setHasExpiredDraft] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const [showSpoilers, setShowSpoilers] = useState({});
  const [likedReviews, setLikedReviews] = useState(() => {
    const liked = {};
    likeStore.getLikedArray().forEach(id => {
      liked[id] = true;
    });
    return liked;
  });
  const [showReportModal, setShowReportModal] = useState(null);
  const [reportForm, setReportForm] = useState({ reason: '', reporter: '' });
  const [similarFilms, setSimilarFilms] = useState([]);
  const [screeningsWithWatchInfo, setScreeningsWithWatchInfo] = useState([]);
  const [mostUrgentPending, setMostUrgentPending] = useState(null);
  const statusDropdownRef = useRef(null);
  const reviewSectionRef = useRef(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      filmsApi.get(id, { sort: reviewSort }),
      filmsApi.similar(id, { limit: 6 }).catch(() => []),
    ]).then(([data, similar]) => {
      setFilm(data);
      setIsFavorite(data.isFavorite);
      setTicketReminder(data.ticketReminderEnabled);
      setScheduleReminder(data.scheduleChangeReminderEnabled);
      setWatchStatus(data.watchStatus);
      setTicketDate(data.ticketDate);
      setWatchedDate(data.watchedDate);
      setPlanDate(data.planDate);
      setSimilarFilms(similar || []);
      const swi = computeScreeningWatchInfo(data.screenings || [], data.reviews || []);
      setScreeningsWithWatchInfo(swi);
      setMostUrgentPending(findMostUrgentPending(swi));
      setLoading(false);
    }).catch(() => {
      navigate('/films');
    });
  };

  useEffect(() => {
    fetchData();
  }, [id, reviewSort]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSpoiler = (reviewId) => {
    setShowSpoilers(prev => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  const handleLike = async (reviewId) => {
    if (likeStore.isLiked(reviewId)) return;
    try {
      const res = await reviewsApi.like(reviewId);
      likeStore.addLike(reviewId);
      setLikedReviews(prev => ({ ...prev, [reviewId]: true }));
      setFilm(prev => ({
        ...prev,
        reviews: prev.reviews.map(r =>
          r.id === reviewId ? { ...r, likes: res.likes } : r
        )
      }));
      window.dispatchEvent(new CustomEvent('reviewLikeUpdated'));
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    const syncLikes = () => {
      const liked = {};
      likeStore.getLikedArray().forEach(id => {
        liked[id] = true;
      });
      setLikedReviews(liked);
    };
    window.addEventListener('reviewLikeUpdated', syncLikes);
    window.addEventListener('storage', syncLikes);
    return () => {
      window.removeEventListener('reviewLikeUpdated', syncLikes);
      window.removeEventListener('storage', syncLikes);
    };
  }, []);

  const autoSaveDraft = useCallback((form) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (film && (form.content?.trim() || form.author || form.mood || form.watched_date)) {
        draftStore.save(id, form, {
          title: film.title,
          poster: film.poster,
          director: film.director,
          year: film.year
        });
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
      setHasDraft(draftStore.hasDraft(id));
    }, 1000);
  }, [film, id]);

  useEffect(() => {
    const checkDraft = () => {
      const draft = draftStore.get(id);
      if (draft) {
        setHasDraft(true);
      } else {
        setHasDraft(false);
      }
    };
    checkDraft();
    draftStore.cleanupExpired();
    window.addEventListener('draftUpdated', checkDraft);
    return () => {
      window.removeEventListener('draftUpdated', checkDraft);
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [id]);

  const handleReport = async (e) => {
    e.preventDefault();
    if (!reportForm.reason) {
      alert('请选择举报原因');
      return;
    }
    try {
      await reportsApi.create({
        review_id: showReportModal,
        reason: reportForm.reason,
        reporter: reportForm.reporter || '匿名用户'
      });
      alert('举报已提交，我们会尽快处理');
      setShowReportModal(null);
      setReportForm({ reason: '', reporter: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleFavorite = async (targetStatus = 'want_to_watch') => {
    try {
      if (isFavorite) {
        await favApi.remove(id);
        setIsFavorite(false);
        setWatchStatus(null);
        setTicketDate(null);
        setWatchedDate(null);
        setPlanDate(null);
        setTicketReminder(false);
        setScheduleReminder(false);
      } else {
        const today = new Date().toISOString().split('T')[0];
        const statusData = { watch_status: targetStatus };
        if (targetStatus === 'ticketed') {
          statusData.ticket_date = today;
        } else if (targetStatus === 'watched') {
          statusData.watched_date = today;
        }
        const res = await favApi.toggle(id, {
          ticket_reminder_enabled: targetStatus !== 'watched',
          schedule_change_reminder_enabled: targetStatus !== 'watched',
          ...statusData
        });
        setIsFavorite(res.isFavorite);
        if (res.isFavorite) {
          if (res.ticket_reminder_enabled !== undefined) setTicketReminder(res.ticket_reminder_enabled);
          if (res.schedule_change_reminder_enabled !== undefined) setScheduleReminder(res.schedule_change_reminder_enabled);
          if (res.watch_status) setWatchStatus(res.watch_status);
          if (res.ticket_date !== undefined) setTicketDate(res.ticket_date);
          if (res.watched_date !== undefined) setWatchedDate(res.watched_date);
          if (res.plan_date !== undefined) setPlanDate(res.plan_date);
        }
      }
      setStatusDropdownOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const statusData = { watch_status: newStatus };
      if (newStatus === 'ticketed' && !ticketDate) {
        statusData.ticket_date = today;
      }
      if (newStatus === 'watched' && !watchedDate) {
        statusData.watched_date = today;
      }
      const res = await favApi.updateStatus(id, statusData);
      setWatchStatus(res.watch_status);
      if (res.ticket_date !== undefined) setTicketDate(res.ticket_date);
      if (res.watched_date !== undefined) setWatchedDate(res.watched_date);
      if (res.plan_date !== undefined) setPlanDate(res.plan_date);
      setStatusDropdownOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!watchStatus) return;
    const nextStatus = WATCH_STATUS_CONFIG[watchStatus]?.next;
    if (nextStatus) {
      await handleChangeStatus(nextStatus);
    }
  };

  const handleToggleReminder = async (type) => {
    if (!isFavorite) {
      alert('请先收藏影片再开启提醒');
      return;
    }
    try {
      const updates = {};
      if (type === 'ticket') {
        updates.ticket_reminder_enabled = !ticketReminder;
      } else {
        updates.schedule_change_reminder_enabled = !scheduleReminder;
      }
      const res = await favApi.updateReminders(id, updates);
      if (type === 'ticket') {
        setTicketReminder(res.ticket_reminder_enabled);
      } else {
        setScheduleReminder(res.schedule_change_reminder_enabled);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReviewFormChange = (updates) => {
    const newForm = { ...reviewForm, ...updates };
    setReviewForm(newForm);
    autoSaveDraft(newForm);
  };

  const handleOpenReviewForm = () => {
    const draft = draftStore.get(id);
    if (draft && draft.content?.trim()) {
      const confirmRestore = confirm(`发现未完成的草稿，最后编辑于 ${new Date(draft.updated_at).toLocaleString('zh-CN')}，是否恢复？`);
      if (confirmRestore) {
        setReviewForm({
          author: draft.author || '',
          content: draft.content || '',
          rating: draft.rating || 5,
          mood: draft.mood || '',
          watched_date: draft.watched_date || '',
          is_spoiler: draft.is_spoiler || false,
        });
      }
    }
    setShowReviewForm(true);
  };

  const handleCloseReviewForm = () => {
    if (reviewForm.content?.trim()) {
      const confirmClose = confirm('关闭后当前编辑内容将保存为草稿，是否继续？');
      if (!confirmClose) return;
    }
    setShowReviewForm(false);
    if (!reviewForm.content?.trim()) {
      draftStore.remove(id);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.content.trim()) {
      alert('请填写评论内容');
      return;
    }
    try {
      await reviewsApi.create({ ...reviewForm, film_id: id, is_spoiler: reviewForm.is_spoiler ? 1 : 0 });
      draftStore.remove(id);
      setShowReviewForm(false);
      setReviewForm({ author: '', content: '', rating: 5, mood: '', watched_date: '', is_spoiler: false });
      setHasDraft(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleQuickWriteReview = (preset = {}) => {
    const draft = draftStore.get(id);
    let baseForm = {
      author: '',
      content: '',
      rating: 5,
      mood: '',
      watched_date: mostUrgentPending?.screening_date || new Date().toISOString().split('T')[0],
      is_spoiler: false,
    };
    if (draft && draft.content?.trim()) {
      baseForm = {
        author: draft.author || '',
        content: draft.content || '',
        rating: draft.rating || 5,
        mood: draft.mood || '',
        watched_date: draft.watched_date || baseForm.watched_date,
        is_spoiler: draft.is_spoiler || false,
      };
    }
    setReviewForm({ ...baseForm, ...preset });
    setShowReviewForm(true);
    setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const textarea = document.getElementById('review-content-textarea');
      if (textarea) textarea.focus();
    }, 100);
  };

  const handleQuickSetMood = (mood) => {
    handleQuickWriteReview({ mood });
  };

  const handleClearDraft = () => {
    if (confirm('确定要删除当前草稿吗？')) {
      draftStore.remove(id);
      setReviewForm({ author: '', content: '', rating: 5, mood: '', watched_date: '', is_spoiler: false });
      setHasDraft(false);
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

              <div className="mt-8">
                <div className="flex flex-wrap gap-3">
                  {!isFavorite ? (
                    <>
                      <div className="relative" ref={statusDropdownRef}>
                        <button
                          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                          className="px-6 py-2.5 rounded-lg font-medium bg-film-gold/10 text-film-gold border border-film-gold/50 hover:bg-film-gold/20 transition-all inline-flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          加入观影计划
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {statusDropdownOpen && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-film-dark border border-film-gray rounded-xl shadow-2xl overflow-hidden z-20">
                            {Object.entries(WATCH_STATUS_CONFIG).map(([key, cfg]) => (
                              <button
                                key={key}
                                onClick={() => handleToggleFavorite(key)}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-film-gray/50 flex items-center gap-2 transition-colors border-b border-film-gray/30 last:border-b-0"
                              >
                                <span>{cfg.icon}</span>
                                <span>{cfg.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative" ref={statusDropdownRef}>
                        <button
                          onClick={handleAdvanceStatus}
                          disabled={!WATCH_STATUS_CONFIG[watchStatus]?.next}
                          className={`px-6 py-2.5 rounded-lg font-medium transition-all inline-flex items-center gap-2 disabled:cursor-default ${WATCH_STATUS_CONFIG[watchStatus]?.activeColor || 'bg-film-gold/10 text-film-gold border border-film-gold/50'}`}
                        >
                          <span>{WATCH_STATUS_CONFIG[watchStatus]?.icon || '🎬'}</span>
                          {WATCH_STATUS_CONFIG[watchStatus]?.label || '观影计划'}
                          {WATCH_STATUS_CONFIG[watchStatus]?.next && (
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                          e.stopPropagation();
                          setStatusDropdownOpen(!statusDropdownOpen);
                        }}
                          className="px-3 py-2.5 rounded-lg font-medium bg-film-gray text-film-cream/70 hover:bg-film-gray/80 transition-all inline-flex items-center"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {statusDropdownOpen && (
                          <div className="absolute top-full left-0 mt-2 w-52 bg-film-dark border border-film-gray rounded-xl shadow-2xl overflow-hidden z-20">
                            <div className="px-3 py-2 text-xs text-film-cream/40 border-b border-film-gray/30">切换状态</div>
                            {Object.entries(WATCH_STATUS_CONFIG).map(([key, cfg]) => (
                              <button
                                key={key}
                                onClick={() => handleChangeStatus(key)}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-film-gray/50 flex items-center gap-2 transition-colors border-b border-film-gray/30 last:border-b-0 ${watchStatus === key ? 'bg-film-gold/10 text-film-gold' : ''}`}
                              >
                                <span>{cfg.icon}</span>
                                <span className="flex-1">{cfg.label}</span>
                                {watchStatus === key && (
                                  <svg className="w-4 h-4 text-film-gold" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                  </svg>
                                )}
                              </button>
                            ))}
                            <div className="border-t border-film-gray/30">
                              <button
                                onClick={() => handleToggleFavorite()}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-film-red/10 flex items-center gap-2 transition-colors text-film-red"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656-5.656l1.414-1.414a4 4 0 00-5.656 5.656l-1.101 1.101" />
                                </svg>
                                移出观影计划
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {watchStatus && (
                        <div className="flex flex-wrap gap-2 text-xs text-film-cream/50 items-center py-2">
                          {ticketDate && <span>🎟️ 购票于 {ticketDate}</span>}
                          {watchedDate && <span>✅ 观看于 {watchedDate}</span>}
                          {planDate && <span>📅 计划 {planDate}</span>}
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleOpenReviewForm}
                      className="px-6 py-2.5 rounded-lg font-medium bg-film-gray text-film-cream hover:bg-film-gray/80 transition-all inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      写短评
                    </button>
                    {hasDraft && (
                      <span className="text-xs text-film-gold flex items-center gap-1">
                        <span className="w-2 h-2 bg-film-gold rounded-full animate-pulse"></span>
                        有草稿
                      </span>
                    )}
                  </div>
                </div>

                {mostUrgentPending && (
                  <div className={`mt-6 rounded-xl border-2 p-5 ${
                    mostUrgentPending.urgency === 'high'
                      ? 'bg-red-500/5 border-red-400/40'
                      : mostUrgentPending.urgency === 'medium'
                      ? 'bg-amber-500/5 border-amber-400/40'
                      : 'bg-purple-500/5 border-purple-400/40'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${
                        mostUrgentPending.urgency === 'high'
                          ? 'bg-red-500/20'
                          : mostUrgentPending.urgency === 'medium'
                          ? 'bg-amber-500/20'
                          : 'bg-purple-500/20'
                      }`}>
                        ✍️
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-lg mb-1 ${
                          mostUrgentPending.urgency === 'high'
                            ? 'text-red-300'
                            : mostUrgentPending.urgency === 'medium'
                            ? 'text-amber-300'
                            : 'text-purple-300'
                        }`}>
                          放映结束{mostUrgentPending.days_since_ended > 0 ? ` ${mostUrgentPending.days_since_ended} 天` : ''}，快去留下观影记录吧！
                        </div>
                        <div className="text-sm text-film-cream/70 mb-3">
                          {mostUrgentPending.screening_date} {mostUrgentPending.screening_time} 场次
                          {mostUrgentPending.venue && ` · ${mostUrgentPending.venue}`}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {mostUrgentPending.pending_tasks.includes('review') && (
                            <button
                              onClick={() => handleQuickWriteReview()}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 border border-red-500/30 transition-all font-medium text-sm"
                            >
                              📝 补写短评
                            </button>
                          )}
                          {mostUrgentPending.pending_tasks.includes('mood') && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-film-cream/50">补标心情：</span>
                              <div className="flex gap-1">
                                {moodOptions.map(m => (
                                  <button
                                    key={m}
                                    onClick={() => handleQuickSetMood(m)}
                                    className="px-2.5 py-1.5 text-xs bg-purple-500/15 text-purple-300 rounded-md hover:bg-purple-500/30 border border-purple-500/30 transition-all"
                                    title={`标记心情：${m}`}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-film-gray/30 flex items-center gap-4 text-xs">
                          {mostUrgentPending.pending_tasks.includes('review') && (
                            <span className="text-red-300/80 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                              还没有短评
                            </span>
                          )}
                          {mostUrgentPending.pending_tasks.includes('mood') && (
                            <span className="text-purple-300/80 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                              还没有观影心情
                            </span>
                          )}
                          <span className="text-film-cream/40 ml-auto">
                            {mostUrgentPending.urgency === 'high' ? '🔥 建议尽快完成' : mostUrgentPending.urgency === 'medium' ? '⏰ 记得完成哦' : '📌 有空来补记'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isFavorite && (
                  <div className="mt-5 p-4 bg-film-dark/60 rounded-xl border border-film-gray/50">
                    <div className="text-sm text-film-gold mb-3 font-medium">🔔 提醒设置</div>
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => handleToggleReminder('ticket')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                          ticketReminder
                            ? 'bg-film-gold/20 text-film-gold border border-film-gold/50'
                            : 'bg-film-gray/50 text-film-cream/60 border border-film-gray/30 hover:text-film-cream'
                        }`}
                      >
                        <svg className="w-4 h-4" fill={ticketReminder ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        开票提醒 {ticketReminder ? '已开启' : '未开启'}
                      </button>
                      <button
                        onClick={() => handleToggleReminder('schedule')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                          scheduleReminder
                            ? 'bg-film-gold/20 text-film-gold border border-film-gold/50'
                            : 'bg-film-gray/50 text-film-cream/60 border border-film-gray/30 hover:text-film-cream'
                        }`}
                      >
                        <svg className="w-4 h-4" fill={scheduleReminder ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        放映变更通知 {scheduleReminder ? '已开启' : '未开启'}
                      </button>
                    </div>
                  </div>
                )}
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
        {screeningsWithWatchInfo.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-serif font-bold mb-6">放映排期</h2>
            <div className="space-y-3">
              {screeningsWithWatchInfo.map(s => (
                <div key={s.id} className={`p-5 rounded-xl border flex flex-wrap items-center gap-6 transition-colors ${
                  s.pending_tasks.length
                    ? s.urgency === 'high'
                      ? 'bg-red-500/5 border-red-400/40'
                      : s.urgency === 'medium'
                      ? 'bg-amber-500/5 border-amber-400/40'
                      : 'bg-purple-500/5 border-purple-400/40'
                    : 'bg-film-dark/60 border-film-gray/50'
                }`}>
                  <div className="flex-shrink-0 text-center min-w-[70px]">
                    <div className="text-xs text-film-cream/50">
                      {new Date(s.screening_date).toLocaleDateString('zh-CN', { month: 'long' })}
                    </div>
                    <div className={`text-3xl font-serif font-bold ${
                      s.pending_tasks.length
                        ? s.urgency === 'high' ? 'text-red-300' : s.urgency === 'medium' ? 'text-amber-300' : 'text-purple-300'
                        : 'text-film-gold'
                    }`}>
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
                      {s.is_ended && s.end_time && (
                        <span className="text-xs text-film-cream/40 bg-film-black/40 px-2 py-0.5 rounded">
                          约 {s.end_time} 散场
                        </span>
                      )}
                    </div>
                    {s.location && <p className="text-sm text-film-cream/50 mt-1">{s.location}</p>}
                    {s.pending_tasks.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {s.pending_tasks.includes('review') && (
                          <span className="text-red-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            待补短评
                          </span>
                        )}
                        {s.pending_tasks.includes('mood') && (
                          <span className="text-purple-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                            待补心情
                          </span>
                        )}
                        {s.days_since_ended > 0 && (
                          <span className="text-film-cream/40">
                            已结束 {s.days_since_ended} 天
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {s.pending_tasks.length > 0 && (
                      <>
                        {s.pending_tasks.includes('review') && (
                          <button
                            onClick={() => handleQuickWriteReview()}
                            className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs hover:bg-red-500/30 border border-red-500/30 transition-all flex items-center gap-1"
                          >
                            📝 补写短评
                          </button>
                        )}
                        {s.pending_tasks.includes('mood') && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-film-cream/40">心情:</span>
                            <div className="flex gap-1">
                              {moodOptions.slice(0, 3).map(m => (
                                <button
                                  key={m}
                                  onClick={() => handleQuickSetMood(m)}
                                  className="px-2 py-0.5 text-[11px] bg-purple-500/15 text-purple-300 rounded hover:bg-purple-500/30 border border-purple-500/30 transition-all"
                                  title={`标记心情：${m}`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {s.ticket_status === 'on_sale' && (
                      <span className="bg-green-500/15 text-green-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> 正在售票
                      </span>
                    )}
                    {s.ticket_status === 'not_open' && (
                      <span className="bg-film-gray/50 text-film-cream/60 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        {s.ticket_open_date ? `预计 ${s.ticket_open_date} 开票` : '尚未开票'}
                      </span>
                    )}
                    {s.ticket_status === 'sold_out' && (
                      <span className="bg-red-500/15 text-red-400 px-3 py-1 rounded-full text-sm">
                        已售罄
                      </span>
                    )}
                    {s.is_changed && (
                      <span className="bg-orange-500/15 text-orange-400 px-3 py-1 rounded-full text-sm flex items-center gap-1" title={s.change_description}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        场次变更
                      </span>
                    )}
                    {s.notes && (
                      <span className="bg-film-gold/10 text-film-gold px-3 py-1 rounded-full text-sm">
                        {s.notes}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div ref={reviewSectionRef} id="write-review">
        {showReviewForm && (
          <section className="mb-12">
            <div className="p-6 bg-film-dark rounded-xl border border-film-gray/50">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold">发表观后短评</h3>
                <div className="flex items-center gap-3">
                  {draftSaved && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      已自动保存
                    </span>
                  )}
                  {hasDraft && (
                    <button
                      type="button"
                      onClick={handleClearDraft}
                      className="text-xs text-film-cream/40 hover:text-film-red transition-colors"
                    >
                      清除草稿
                    </button>
                  )}
                </div>
              </div>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-film-cream/60 mb-1.5 block">昵称</label>
                    <input
                      type="text"
                      value={reviewForm.author}
                      onChange={(e) => handleReviewFormChange({ author: e.target.value })}
                      placeholder="匿名观众"
                      className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-film-cream/60 mb-1.5 block">观看日期</label>
                    <input
                      type="date"
                      value={reviewForm.watched_date}
                      onChange={(e) => handleReviewFormChange({ watched_date: e.target.value })}
                      className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-film-cream/60 mb-1.5 block">观影心情</label>
                    <select
                      value={reviewForm.mood}
                      onChange={(e) => handleReviewFormChange({ mood: e.target.value })}
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
                        onClick={() => handleReviewFormChange({ rating: r })}
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
                    id="review-content-textarea"
                    value={reviewForm.content}
                    onChange={(e) => handleReviewFormChange({ content: e.target.value })}
                    rows={4}
                    placeholder="写下你对这部电影的感受..."
                    className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewForm.is_spoiler}
                      onChange={(e) => handleReviewFormChange({ is_spoiler: e.target.checked })}
                      className="w-4 h-4 rounded border-film-gray bg-film-black text-film-gold focus:ring-film-gold"
                    />
                    <span className="text-sm text-film-cream/80">标记为剧透</span>
                  </label>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseReviewForm}
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
        </div>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-serif font-bold">
              观后短评 <span className="text-film-cream/40 text-base font-sans">({film.reviews?.length || 0})</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-film-cream/50">排序：</span>
              <select
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value)}
                className="px-3 py-1.5 text-sm bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
              >
                {sortOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.author || '匿名观众'}</span>
                        {r.is_spoiler && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                            剧透
                          </span>
                        )}
                      </div>
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
                  {r.is_spoiler && !showSpoilers[r.id] ? (
                    <div className="py-6 text-center">
                      <p className="text-film-cream/40 mb-3">此评论包含剧透内容</p>
                      <button
                        onClick={() => toggleSpoiler(r.id)}
                        className="text-sm text-film-gold hover:underline"
                      >
                        点击展开查看
                      </button>
                    </div>
                  ) : (
                    <p className="text-film-cream/85 leading-relaxed font-serif">{r.content}</p>
                  )}
                  <div className="mt-4 pt-3 border-t border-film-gray/30 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLike(r.id)}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${
                          likedReviews[r.id]
                            ? 'text-film-gold'
                            : 'text-film-cream/50 hover:text-film-gold'
                        }`}
                      >
                        <svg className="w-4 h-4" fill={likedReviews[r.id] ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span>{r.likes || 0}</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowReportModal(r.id);
                        setReportForm({ reason: '', reporter: '' });
                      }}
                      className="text-xs text-film-cream/40 hover:text-film-red transition-colors"
                    >
                      举报
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {similarFilms.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold">相似推荐</h2>
                <p className="text-film-cream/60 mt-1 text-sm">基于导演、国家、类型和评分智能匹配</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
              {similarFilms.map(sf => (
                <div key={sf.id} className="relative">
                  <FilmCard film={sf} showFavorite={false} />
                  {sf.match_reasons && sf.match_reasons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sf.match_reasons.slice(0, 2).map((reason, idx) => (
                        <span key={idx} className="text-[10px] bg-film-gold/10 text-film-gold px-1.5 py-0.5 rounded">
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowReportModal(null)}>
          <div className="bg-film-dark w-full max-w-md rounded-2xl border border-film-gray" onClick={e => e.stopPropagation()}>
            <div className="border-b border-film-gray/50 p-5 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">举报评论</h2>
              <button
                onClick={() => setShowReportModal(null)}
                className="p-2 rounded-lg hover:bg-film-gray transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleReport} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-film-cream/60 mb-2 block">举报原因 *</label>
                <div className="space-y-2">
                  {reportReasons.map(reason => (
                    <label key={reason} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-film-black/50 transition-colors">
                      <input
                        type="radio"
                        name="reportReason"
                        value={reason}
                        checked={reportForm.reason === reason}
                        onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                        className="w-4 h-4 text-film-gold bg-film-black border-film-gray focus:ring-film-gold"
                      />
                      <span className="text-sm text-film-cream/80">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-film-cream/60 mb-1.5 block">您的昵称（选填）</label>
                <input
                  type="text"
                  value={reportForm.reporter}
                  onChange={(e) => setReportForm({ ...reportForm, reporter: e.target.value })}
                  placeholder="匿名用户"
                  className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(null)}
                  className="px-5 py-2.5 rounded-lg text-film-cream/60 hover:text-film-cream transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-film-red text-white font-medium hover:bg-film-red/90 transition-colors"
                >
                  提交举报
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

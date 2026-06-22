import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { films as filmsApi, screenings as screeningsApi, reviews as reviewsApi, stats as statsApi, notifications as notifApi, favorites as favApi, reports as reportsApi, collections as collectionsApi, venues as venuesApi, draftStore, recommendations as recApi } from '../api.js';

const emptyFilm = {
  title: '', original_title: '', director: '', year: '', country: '',
  genre: '', duration: '', language: '', synopsis: '', poster: '', rating: '',
  awards: '', restoration_version: '', premiere_info: '', aliases: ''
};

const emptyScreening = {
  film_id: '', venue_id: '', screening_date: '', screening_time: '', venue: '', location: '', notes: '',
  ticket_status: 'not_open', ticket_open_date: '', is_changed: 0, change_description: ''
};

const emptyVenue = {
  name: '', location: '', capacity: '', notes: '', is_active: 1
};

const emptyCollection = {
  title: '', subtitle: '', description: '', cover_image: '',
  type: 'custom', filter_director: '', filter_country: '', filter_theme: '',
  sort_order: 0, is_featured: 0, is_active: 1
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [filmList, setFilmList] = useState([]);
  const [screeningList, setScreeningList] = useState([]);
  const [venueList, setVenueList] = useState([]);
  const [reviewList, setReviewList] = useState([]);
  const [notificationList, setNotificationList] = useState([]);
  const [favoriteList, setFavoriteList] = useState([]);
  const [reportList, setReportList] = useState([]);
  const [collectionList, setCollectionList] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [reportFilter, setReportFilter] = useState('all');
  const [screeningVenueFilter, setScreeningVenueFilter] = useState('');
  const [favoriteStatusFilter, setFavoriteStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState([]);
  const [showFilmForm, setShowFilmForm] = useState(false);
  const [showScreeningForm, setShowScreeningForm] = useState(false);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [showAddFilmToCollection, setShowAddFilmToCollection] = useState(null);
  const [showRecForm, setShowRecForm] = useState(false);
  const [editingFilm, setEditingFilm] = useState(null);
  const [editingScreening, setEditingScreening] = useState(null);
  const [editingVenue, setEditingVenue] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);
  const [editingRec, setEditingRec] = useState(null);
  const [manualRecList, setManualRecList] = useState([]);
  const [liveRecPreview, setLiveRecPreview] = useState({ recommendations: [], meta: null });
  const [filmForm, setFilmForm] = useState(emptyFilm);
  const [screeningForm, setScreeningForm] = useState(emptyScreening);
  const [venueForm, setVenueForm] = useState(emptyVenue);
  const [collectionForm, setCollectionForm] = useState(emptyCollection);
  const [addFilmForm, setAddFilmForm] = useState({ film_id: '', sort_order: 0, note: '' });
  const [recForm, setRecForm] = useState({ film_id: '', sort_order: 0, reason: '', note: '' });
  const [screeningConflictError, setScreeningConflictError] = useState(null);
  const [filmImportResult, setFilmImportResult] = useState(null);
  const [screeningImportResult, setScreeningImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [s, f, sc, v, r, n, fav, rp, cols, mr, lr] = await Promise.all([
      statsApi.get(), filmsApi.list(), screeningsApi.list(), venuesApi.list(), reviewsApi.list({ include_hidden: 1 }),
      notifApi.list(), favApi.list(), reportsApi.list(), collectionsApi.list(),
      recApi.listManual(), recApi.list({ limit: 12 })
    ]);
    setStats(s);
    setFilmList(f);
    setScreeningList(sc);
    setVenueList(v);
    setReviewList(r);
    setNotificationList(n);
    setFavoriteList(fav);
    setReportList(rp);
    setCollectionList(cols);
    setManualRecList(mr);
    setLiveRecPreview(lr);
    loadDrafts();
    setLoading(false);
  };

  const loadDrafts = () => {
    draftStore.cleanupExpired();
    const allDrafts = draftStore.getAllArray().filter(d => d.content?.trim());
    setDrafts(allDrafts);
  };

  const handleDeleteDraft = (filmId) => {
    if (!confirm('确定要删除这个草稿吗？')) return;
    draftStore.remove(filmId);
    loadDrafts();
  };

  const handleClearExpiredDrafts = () => {
    const removed = draftStore.cleanupExpired();
    if (removed > 0) {
      alert(`已清理 ${removed} 个过期草稿`);
    } else {
      alert('没有需要清理的过期草稿');
    }
    loadDrafts();
  };

  const handleClearAllDrafts = () => {
    if (!confirm('确定要清空所有草稿吗？此操作不可撤销。')) return;
    draftStore.clearAll();
    loadDrafts();
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    window.addEventListener('draftUpdated', loadDrafts);
    window.addEventListener('storage', loadDrafts);
    return () => {
      window.removeEventListener('draftUpdated', loadDrafts);
      window.removeEventListener('storage', loadDrafts);
    };
  }, []);

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
      rating: film.rating || '',
      awards: film.awards || '',
      restoration_version: film.restoration_version || '',
      premiere_info: film.premiere_info || '',
      aliases: film.aliases || ''
    });
    setShowFilmForm(true);
  };

  const openNewScreening = () => {
    setEditingScreening(null);
    setScreeningForm(emptyScreening);
    setScreeningConflictError(null);
    setShowScreeningForm(true);
  };

  const openEditScreening = (s) => {
    setEditingScreening(s);
    setScreeningForm({
      film_id: s.film_id,
      venue_id: s.venue_id || '',
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
    setScreeningConflictError(null);
    setShowScreeningForm(true);
  };

  const openNewVenue = () => {
    setEditingVenue(null);
    setVenueForm(emptyVenue);
    setShowVenueForm(true);
  };

  const openEditVenue = (v) => {
    setEditingVenue(v);
    setVenueForm({
      name: v.name || '',
      location: v.location || '',
      capacity: v.capacity || '',
      notes: v.notes || '',
      is_active: v.is_active !== undefined ? v.is_active : 1
    });
    setShowVenueForm(true);
  };

  const handleVenueSubmit = async (e) => {
    e.preventDefault();
    if (!venueForm.name.trim()) {
      alert('请填写场馆名称');
      return;
    }
    try {
      const data = {
        ...venueForm,
        capacity: venueForm.capacity ? parseInt(venueForm.capacity) : null,
        is_active: venueForm.is_active ? 1 : 0
      };
      if (editingVenue) {
        await venuesApi.update(editingVenue.id, data);
      } else {
        await venuesApi.create(data);
      }
      setShowVenueForm(false);
      setEditingVenue(null);
      setVenueForm(emptyVenue);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteVenue = async (id) => {
    if (!confirm('确定删除此场馆？')) return;
    try {
      await venuesApi.delete(id);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleVenueActive = async (v) => {
    const action = v.is_active ? '停用' : '启用';
    if (!confirm(`确定${action}此场馆？`)) return;
    try {
      await venuesApi.update(v.id, { is_active: v.is_active ? 0 : 1 });
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
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
    setScreeningConflictError(null);
    if (!screeningForm.film_id || !screeningForm.screening_date || !screeningForm.screening_time) {
      alert('请选择影片、日期和时间');
      return;
    }
    try {
      const data = {
        ...screeningForm,
        venue_id: screeningForm.venue_id || null,
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
      if (err.status === 409 && err.data && err.data.conflicts) {
        setScreeningConflictError({ message: err.message, conflicts: err.data.conflicts });
      } else {
        alert(err.message);
      }
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

  const handleUpdateFavoriteStatus = async (filmId, newStatus) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const statusData = { watch_status: newStatus };
      if (newStatus === 'ticketed') {
        statusData.ticket_date = today;
      } else if (newStatus === 'watched') {
        statusData.watched_date = today;
      }
      await favApi.updateStatus(filmId, statusData);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const WATCH_STATUS_OPTIONS = [
    { key: 'want_to_watch', label: '想看', icon: '👁️', color: 'text-blue-400 bg-blue-500/15' },
    { key: 'ticketed', label: '已购票', icon: '🎟️', color: 'text-film-gold bg-film-gold/15' },
    { key: 'watched', label: '已观看', icon: '✅', color: 'text-green-400 bg-green-500/15' },
  ];

  const handleReport = async (reportId, status, handleNote = '') => {
    const confirmMsg = status === 'approved' ? '确定通过此举报？相关评论将被隐藏。' : '确定驳回此举报？';
    if (!confirm(confirmMsg)) return;
    try {
      await reportsApi.handle(reportId, { status, handle_note: handleNote });
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const openNewCollection = () => {
    setEditingCollection(null);
    setCollectionForm(emptyCollection);
    setShowCollectionForm(true);
  };

  const openEditCollection = (col) => {
    setEditingCollection(col);
    setCollectionForm({
      title: col.title || '',
      subtitle: col.subtitle || '',
      description: col.description || '',
      cover_image: col.cover_image || '',
      type: col.type || 'custom',
      filter_director: col.filter_director || '',
      filter_country: col.filter_country || '',
      filter_theme: col.filter_theme || '',
      sort_order: col.sort_order || 0,
      is_featured: col.is_featured || 0,
      is_active: col.is_active !== undefined ? col.is_active : 1,
    });
    setShowCollectionForm(true);
  };

  const handleCollectionSubmit = async (e) => {
    e.preventDefault();
    if (!collectionForm.title.trim()) {
      alert('请填写专题标题');
      return;
    }
    try {
      const data = {
        ...collectionForm,
        sort_order: parseInt(collectionForm.sort_order) || 0,
        is_featured: collectionForm.is_featured ? 1 : 0,
        is_active: collectionForm.is_active ? 1 : 0,
      };
      if (editingCollection) {
        await collectionsApi.update(editingCollection.id, data);
      } else {
        await collectionsApi.create(data);
      }
      setShowCollectionForm(false);
      setEditingCollection(null);
      setCollectionForm(emptyCollection);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCollection = async (id) => {
    if (!confirm('确定删除此专题？专题内的影片关联也会被删除。')) return;
    try {
      await collectionsApi.delete(id);
      if (activeCollection?.id === id) setActiveCollection(null);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleCollectionActive = async (col) => {
    const action = col.is_active ? '下架' : '启用';
    if (!confirm(`确定${action}此专题？${action === '下架' ? '下架后将不会在前台展示。' : '启用后将在前台展示。'}`)) return;
    try {
      await collectionsApi.update(col.id, { is_active: col.is_active ? 0 : 1 });
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenCollection = async (col) => {
    try {
      const detail = await collectionsApi.get(col.id);
      setActiveCollection(detail);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddFilmToCollection = async (e) => {
    e.preventDefault();
    if (!addFilmForm.film_id) {
      alert('请选择影片');
      return;
    }
    try {
      await collectionsApi.addFilm(activeCollection.id, {
        film_id: addFilmForm.film_id,
        sort_order: parseInt(addFilmForm.sort_order) || 0,
        note: addFilmForm.note || null,
      });
      setShowAddFilmToCollection(null);
      setAddFilmForm({ film_id: '', sort_order: 0, note: '' });
      handleOpenCollection(activeCollection);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveFilmFromCollection = async (filmId) => {
    if (!confirm('确定从专题中移除此影片？')) return;
    try {
      await collectionsApi.removeFilm(activeCollection.id, filmId);
      handleOpenCollection(activeCollection);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const openNewRec = () => {
    setEditingRec(null);
    setRecForm({ film_id: '', sort_order: manualRecList.length + 1, reason: '', note: '' });
    setShowRecForm(true);
  };

  const openEditRec = (rec) => {
    setEditingRec(rec);
    setRecForm({
      film_id: String(rec.film_id),
      sort_order: rec.sort_order || 0,
      reason: rec.reason || '',
      note: rec.note || '',
    });
    setShowRecForm(true);
  };

  const handleRecSubmit = async (e) => {
    e.preventDefault();
    if (!recForm.film_id) {
      alert('请选择影片');
      return;
    }
    try {
      const data = {
        film_id: parseInt(recForm.film_id),
        sort_order: parseInt(recForm.sort_order) || 0,
        reason: recForm.reason || null,
        note: recForm.note || null,
      };
      if (editingRec) {
        await recApi.updateManual(editingRec.id, data);
      } else {
        await recApi.createManual(data);
      }
      setShowRecForm(false);
      setEditingRec(null);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteRec = async (id) => {
    if (!confirm('确定移除此人工推荐？')) return;
    try {
      await recApi.deleteManual(id);
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleRecActive = async (rec) => {
    try {
      await recApi.updateManual(rec.id, { is_active: rec.is_active ? 0 : 1 });
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRefreshRec = async () => {
    if (!confirm('确定重新生成算法推荐？人工推荐不受影响。')) return;
    try {
      await recApi.refresh();
      fetchAll();
      alert('推荐已刷新');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFilmImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      alert('请选择CSV文件');
      e.target.value = '';
      return;
    }
    setImporting(true);
    setFilmImportResult(null);
    try {
      const result = await filmsApi.importCsv(file);
      setFilmImportResult(result);
      fetchAll();
    } catch (err) {
      setFilmImportResult({
        total: 0, success_count: 0, skipped_count: 0, error_count: 1,
        success: [], skipped: [],
        errors: [{ row: 0, message: err.message || '导入失败' }]
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleScreeningImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      alert('请选择CSV文件');
      e.target.value = '';
      return;
    }
    setImporting(true);
    setScreeningImportResult(null);
    try {
      const result = await screeningsApi.importCsv(file);
      setScreeningImportResult(result);
      fetchAll();
    } catch (err) {
      setScreeningImportResult({
        total: 0, success_count: 0, skipped_count: 0, error_count: 1,
        success: [], skipped: [],
        errors: [{ row: 0, message: err.message || '导入失败' }]
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const tabs = [
    { key: 'overview', label: '总览', icon: '📊' },
    { key: 'recommendations', label: '推荐管理', icon: '✨' },
    { key: 'collections', label: '专题策展', icon: '📚' },
    { key: 'films', label: '影片管理', icon: '🎬' },
    { key: 'venues', label: '场馆管理', icon: '🏛' },
    { key: 'screenings', label: '放映场次', icon: '📅' },
    { key: 'reviews', label: '短评管理', icon: '✍️' },
    { key: 'drafts', label: '草稿管理', icon: '📝' },
    { key: 'reports', label: '举报审核', icon: '🚨' },
    { key: 'favorites', label: '观影计划', icon: '🎯' },
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
            {[
              { label: '影片总数', value: stats.filmCount, icon: '🎬', color: 'from-film-gold/20 to-film-gold/5' },
              { label: '短评数量', value: stats.reviewCount, icon: '✍️', color: 'from-pink-500/20 to-pink-500/5' },
              { label: '草稿数量', value: drafts.length, icon: '📝', color: 'from-yellow-500/20 to-yellow-500/5' },
              { label: '待审举报', value: stats.pendingReportCount, icon: '🚨', color: 'from-red-500/20 to-red-500/5' },
              { label: '未读通知', value: stats.unreadNotificationCount, icon: '📬', color: 'from-orange-500/20 to-orange-500/5' },
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

      {activeTab === 'recommendations' && (
        <div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-film-dark/50 rounded-xl border border-film-gray/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">✨ 人工推荐（编辑精选）</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefreshRec}
                    className="px-3 py-1.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-lg hover:bg-purple-500/25 transition-colors text-sm"
                  >
                    🔄 刷新算法
                  </button>
                  <button
                    onClick={openNewRec}
                    className="px-4 py-1.5 bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors text-sm"
                  >
                    + 添加推荐
                  </button>
                </div>
              </div>
              <p className="text-sm text-film-cream/50 mb-4">
                人工添加的推荐会优先展示在首页「为你推荐」区域，按排序值升序排列
              </p>
              {manualRecList.length === 0 ? (
                <div className="py-10 text-center text-film-cream/50 border border-dashed border-film-gray rounded-xl">
                  <div className="text-3xl mb-2">⭐</div>
                  暂无人工推荐，点击右上角添加
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {manualRecList.map(rec => (
                    <div
                      key={rec.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        rec.is_active
                          ? 'bg-film-black/40 border-film-gray/50 hover:border-film-gold/40'
                          : 'bg-film-black/20 border-film-gray/20 opacity-60'
                      }`}
                    >
                      <div className="w-10 h-14 bg-film-gray rounded overflow-hidden flex-shrink-0">
                        {rec.poster && <img src={rec.poster} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/films/${rec.film_id}`} className="font-medium text-film-cream hover:text-film-gold truncate">
                            {rec.title}
                          </Link>
                          <span className="text-xs bg-film-gold/15 text-film-gold px-2 py-0.5 rounded-full">⭐ 编辑</span>
                          {!rec.is_active && <span className="text-xs bg-film-cream/10 text-film-cream/60 px-2 py-0.5 rounded-full">已下架</span>}
                          <span className="text-xs text-film-cream/40">排序: {rec.sort_order}</span>
                        </div>
                        {rec.reason && <p className="text-xs text-film-gold/80 mt-1">📌 {rec.reason}</p>}
                        {rec.note && <p className="text-xs text-film-cream/40 mt-1 truncate">备注: {rec.note}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleRecActive(rec)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            rec.is_active
                              ? 'text-film-orange hover:bg-film-orange/10'
                              : 'text-green-400 hover:bg-green-400/10'
                          }`}
                          title={rec.is_active ? '下架' : '上架'}
                        >
                          {rec.is_active ? '下架' : '上架'}
                        </button>
                        <button
                          onClick={() => openEditRec(rec)}
                          className="text-xs text-film-cream/60 hover:text-film-gold px-2 py-1 rounded hover:bg-film-gray/50 transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteRec(rec.id)}
                          className="text-xs text-film-cream/60 hover:text-film-red px-2 py-1 rounded hover:bg-film-red/10 transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-film-dark/50 rounded-xl border border-film-gray/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">🎯 实时推荐预览</h3>
                <div className="text-xs text-film-cream/50">
                  {liveRecPreview.meta && (
                    <>人工 {liveRecPreview.meta.manual_count} · 算法 {liveRecPreview.meta.algorithm_count}</>
                  )}
                </div>
              </div>
              <p className="text-sm text-film-cream/50 mb-4">
                首页「为你推荐」区域的实时展示效果，包含人工推荐和算法推荐的合并结果
              </p>
              {!liveRecPreview.recommendations || liveRecPreview.recommendations.length === 0 ? (
                <div className="py-10 text-center text-film-cream/50 border border-dashed border-film-gray rounded-xl">
                  <div className="text-3xl mb-2">🤖</div>
                  暂无推荐
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                  {liveRecPreview.recommendations.map((rec, idx) => (
                    <div
                      key={`preview-${rec.film_id}-${idx}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-film-black/30 hover:bg-film-black/50 transition-colors"
                    >
                      <div className="text-xs font-mono text-film-cream/40 w-6 text-center">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="w-8 h-11 bg-film-gray rounded overflow-hidden flex-shrink-0">
                        {rec.poster && <img src={rec.poster} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{rec.title}</span>
                          {rec.is_manual ? (
                            <span className="text-[10px] bg-film-gold/15 text-film-gold px-1.5 py-0.5 rounded">⭐编辑</span>
                          ) : (
                            <span className="text-[10px] bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded">🤖算法</span>
                          )}
                        </div>
                        {rec.match_reasons && rec.match_reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {rec.match_reasons.slice(0, 2).map((r, i) => (
                              <span key={i} className="text-[10px] text-film-cream/50 bg-film-cream/5 px-1 py-0.5 rounded">
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {rec.algorithm_score > 0 && (
                        <span className="text-[10px] text-film-cream/40 font-mono">
                          {rec.algorithm_score.toFixed(0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-film-dark/30 rounded-xl border border-film-gray/30 p-5">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <span>💡</span> 推荐算法说明
            </h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-film-cream/70">
              <div className="p-3 bg-film-black/30 rounded-lg">
                <div className="text-film-gold font-medium mb-1">🎯 收藏权重（30+）</div>
                <div className="text-xs text-film-cream/50">已收藏+30，已购票+15，已观看+10，开启提醒+5</div>
              </div>
              <div className="p-3 bg-film-black/30 rounded-lg">
                <div className="text-film-gold font-medium mb-1">⭐ 评分权重（×3）</div>
                <div className="text-xs text-film-cream/50">影片评分 × 3，8.5分以上标记「高分佳作」</div>
              </div>
              <div className="p-3 bg-film-black/30 rounded-lg">
                <div className="text-film-gold font-medium mb-1">✍️ 短评心情（动态）</div>
                <div className="text-xs text-film-cream/50">短评平均评分×4，心情标签计分，近期短评+8/条</div>
              </div>
              <div className="p-3 bg-film-black/30 rounded-lg">
                <div className="text-film-gold font-medium mb-1">📅 放映信息（6~27）</div>
                <div className="text-xs text-film-cream/50">即将放映+12/场，7天内+15，30天内+6/场</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'collections' && (
        <div>
          {!activeCollection ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <p className="text-film-cream/60">共 {collectionList.length} 个专题</p>
                <button
                  onClick={openNewCollection}
                  className="px-5 py-2 bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors"
                >
                  + 新建专题
                </button>
              </div>

              {collectionList.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-film-gray rounded-xl">
                  <p className="text-film-cream/50">暂无专题，点击上方按钮创建</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collectionList.map(col => (
                    <div key={col.id} className={`group rounded-xl border p-5 transition-colors ${
                      col.is_active 
                        ? 'bg-film-dark/50 border-film-gray/50 hover:border-film-gold/30' 
                        : 'bg-film-black/30 border-film-gray/20 opacity-70 hover:border-film-cream/30'
                    }`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              col.type === 'director' ? 'bg-purple-500/20 text-purple-400' :
                              col.type === 'country' ? 'bg-blue-500/20 text-blue-400' :
                              col.type === 'theme' ? 'bg-pink-500/20 text-pink-400' :
                              'bg-film-gold/20 text-film-gold'
                            }`}>
                              {col.type === 'director' ? '导演' : col.type === 'country' ? '地区' : col.type === 'theme' ? '主题' : '自定义'}
                            </span>
                            {col.is_featured && <span className="text-xs text-film-gold">⭐ 首页推荐</span>}
                            {!col.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-film-cream/10 text-film-cream/70 border border-film-cream/20">已下架</span>}
                            {col.is_active && <span className="text-xs text-green-400">● 已启用</span>}
                          </div>
                          <h3 className={`font-semibold truncate ${col.is_active ? 'text-film-cream' : 'text-film-cream/60'}`}>{col.title}</h3>
                          {col.subtitle && <p className="text-xs text-film-cream/50 italic truncate">{col.subtitle}</p>}
                        </div>
                      </div>
                      {col.description && (
                        <p className="text-sm text-film-cream/60 line-clamp-2 mb-3">{col.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-film-cream/50 mb-4">
                        <span>📽 {col.film_count || 0} 部影片</span>
                        <span>排序: {col.sort_order}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenCollection(col)}
                          className="flex-1 text-sm px-3 py-1.5 bg-film-gold/10 text-film-gold rounded-lg hover:bg-film-gold/20 transition-colors"
                        >
                          编排影片
                        </button>
                        <button
                          onClick={() => handleToggleCollectionActive(col)}
                          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                            col.is_active 
                              ? 'text-film-orange hover:bg-film-orange/10' 
                              : 'text-green-400 hover:bg-green-400/10'
                          }`}
                          title={col.is_active ? '下架' : '启用'}
                        >
                          {col.is_active ? '下架' : '启用'}
                        </button>
                        <button
                          onClick={() => openEditCollection(col)}
                          className="text-sm px-3 py-1.5 text-film-cream/60 hover:text-film-cream rounded-lg hover:bg-film-gray/50 transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteCollection(col.id)}
                          className="text-sm px-3 py-1.5 text-film-cream/60 hover:text-film-red rounded-lg hover:bg-film-red/10 transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <button
                    onClick={() => setActiveCollection(null)}
                    className="text-sm text-film-gold hover:underline mb-2 inline-block"
                  >
                    ← 返回专题列表
                  </button>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-serif font-bold">{activeCollection.title}</h2>
                    {!activeCollection.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-film-cream/10 text-film-cream/70 border border-film-cream/20">已下架</span>}
                    {activeCollection.is_active && <span className="text-xs text-green-400">● 已启用</span>}
                  </div>
                  <p className="text-film-cream/60 mt-1">已收录 {activeCollection.films?.length || 0} 部影片</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleCollectionActive(activeCollection)}
                    className={`px-5 py-2 font-medium rounded-lg transition-colors ${
                      activeCollection.is_active 
                        ? 'bg-film-orange/20 text-film-orange hover:bg-film-orange/30' 
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {activeCollection.is_active ? '下架专题' : '启用专题'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddFilmToCollection(true);
                      setAddFilmForm({ film_id: '', sort_order: (activeCollection.films?.length || 0) + 1, note: '' });
                    }}
                    className="px-5 py-2 bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors"
                  >
                    + 添加影片
                  </button>
                </div>
              </div>

              {activeCollection.films?.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-film-gray rounded-xl">
                  <p className="text-film-cream/50 mb-4">该专题暂未收录影片</p>
                  <button
                    onClick={() => {
                      setShowAddFilmToCollection(true);
                      setAddFilmForm({ film_id: '', sort_order: 1, note: '' });
                    }}
                    className="text-film-gold hover:underline"
                  >
                    立即添加
                  </button>
                </div>
              ) : (
                <div className="bg-film-dark/50 rounded-xl border border-film-gray/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-film-black/50 text-film-cream/60">
                      <tr>
                        <th className="text-left p-4 font-medium w-16">序号</th>
                        <th className="text-left p-4 font-medium">影片</th>
                        <th className="text-left p-4 font-medium hidden md:table-cell">导演</th>
                        <th className="text-left p-4 font-medium hidden lg:table-cell">备注</th>
                        <th className="text-right p-4 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCollection.films.map((f, idx) => (
                        <tr key={f.id || f.film_id} className="border-t border-film-gray/30 hover:bg-film-black/30">
                          <td className="p-4 text-film-gold font-mono">{String(idx + 1).padStart(2, '0')}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-11 bg-film-gray rounded overflow-hidden flex-shrink-0">
                                {f.poster && <img src={f.poster} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div>
                                <Link to={`/films/${f.film_id}`} className="font-medium text-film-cream hover:text-film-gold">
                                  {f.title}
                                </Link>
                                {f.year && <span className="text-xs text-film-cream/40 ml-2">({f.year})</span>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-film-cream/70 hidden md:table-cell">{f.director || '-'}</td>
                          <td className="p-4 text-film-cream/70 hidden lg:table-cell max-w-xs truncate">{f.note || '-'}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleRemoveFilmFromCollection(f.film_id)}
                              className="text-film-cream/60 hover:text-film-red px-3 py-1 rounded transition-colors text-sm"
                            >
                              移除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'films' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <p className="text-film-cream/60">共 {filmList.length} 部影片</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => filmsApi.exportCsv()}
                className="px-4 py-2 bg-film-gray/50 text-film-cream/80 border border-film-gray rounded-lg hover:bg-film-gray transition-colors text-sm"
              >
                📥 导出CSV
              </button>
              <button
                onClick={() => filmsApi.downloadTemplate()}
                className="px-4 py-2 bg-film-gray/50 text-film-cream/80 border border-film-gray rounded-lg hover:bg-film-gray transition-colors text-sm"
              >
                📄 下载模板
              </button>
              <label className={`px-4 py-2 border rounded-lg text-sm cursor-pointer transition-colors ${
                importing
                  ? 'bg-film-gray/30 text-film-cream/40 border-film-gray/30 cursor-not-allowed'
                  : 'bg-film-gold/10 text-film-gold border-film-gold/50 hover:bg-film-gold/20'
              }`}>
                📤 导入CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFilmImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
              <button
                onClick={openNewFilm}
                className="px-5 py-2 bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors"
              >
                + 新增影片
              </button>
            </div>
          </div>

          {filmImportResult && (
            <div className="mb-6 p-5 rounded-xl border border-film-gray/50 bg-film-dark/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">导入结果</h3>
                <button
                  onClick={() => setFilmImportResult(null)}
                  className="text-film-cream/50 hover:text-film-cream text-sm"
                >
                  关闭
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-film-black/40 text-center">
                  <div className="text-2xl font-bold text-film-cream">{filmImportResult.total}</div>
                  <div className="text-xs text-film-cream/50">总计</div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 text-center">
                  <div className="text-2xl font-bold text-green-400">{filmImportResult.success_count}</div>
                  <div className="text-xs text-film-cream/50">成功</div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{filmImportResult.skipped_count}</div>
                  <div className="text-xs text-film-cream/50">跳过（重复）</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 text-center">
                  <div className="text-2xl font-bold text-red-400">{filmImportResult.error_count}</div>
                  <div className="text-xs text-film-cream/50">失败</div>
                </div>
              </div>
              {filmImportResult.skipped?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-yellow-400 font-medium mb-2">⚠ 跳过记录：</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {filmImportResult.skipped.map((s, i) => (
                      <div key={i} className="text-xs text-film-cream/70 bg-yellow-500/5 rounded px-3 py-1.5">
                        第{s.row}行：{s.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {filmImportResult.errors?.length > 0 && (
                <div>
                  <p className="text-sm text-red-400 font-medium mb-2">✗ 错误记录：</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {filmImportResult.errors.map((e, i) => (
                      <div key={i} className="text-xs text-film-cream/70 bg-red-500/5 rounded px-3 py-1.5">
                        {e.row ? `第${e.row}行：` : ''}{e.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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

      {activeTab === 'venues' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <p className="text-film-cream/60">共 {venueList.length} 个场馆</p>
            <button
              onClick={openNewVenue}
              className="px-5 py-2 bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors"
            >
              + 新增场馆
            </button>
          </div>

          {venueList.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-film-gray rounded-xl">
              <p className="text-film-cream/50">暂无场馆，点击上方按钮创建</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {venueList.map(v => (
                <div key={v.id} className={`group rounded-xl border p-5 transition-colors ${
                  v.is_active
                    ? 'bg-film-dark/50 border-film-gray/50 hover:border-film-gold/30'
                    : 'bg-film-black/30 border-film-gray/20 opacity-70 hover:border-film-cream/30'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {!v.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-film-cream/10 text-film-cream/70 border border-film-cream/20">已停用</span>}
                        {v.is_active && <span className="text-xs text-green-400">● 启用中</span>}
                      </div>
                      <h3 className={`font-semibold truncate ${v.is_active ? 'text-film-cream' : 'text-film-cream/60'}`}>🏛 {v.name}</h3>
                      {v.location && <p className="text-xs text-film-cream/50 mt-1">📍 {v.location}</p>}
                    </div>
                  </div>
                  <div className="text-xs text-film-cream/50 mb-4 space-y-1">
                    {v.capacity && <div>👥 容量：{v.capacity} 座</div>}
                    {v.notes && <div className="truncate">📝 {v.notes}</div>}
                    <div>📅 关联场次：{screeningList.filter(s => s.venue_id === v.id).length} 场</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleVenueActive(v)}
                      className={`flex-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        v.is_active
                          ? 'text-film-orange hover:bg-film-orange/10'
                          : 'text-green-400 hover:bg-green-400/10'
                      }`}
                      title={v.is_active ? '停用' : '启用'}
                    >
                      {v.is_active ? '停用' : '启用'}
                    </button>
                    <button
                      onClick={() => openEditVenue(v)}
                      className="text-sm px-3 py-1.5 text-film-cream/60 hover:text-film-gold rounded-lg hover:bg-film-gray/50 transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteVenue(v.id)}
                      className="text-sm px-3 py-1.5 text-film-cream/60 hover:text-film-red rounded-lg hover:bg-film-red/10 transition-colors"
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

      {activeTab === 'screenings' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-film-cream/60">共 {screeningList.length} 场放映</p>
              <select
                value={screeningVenueFilter}
                onChange={(e) => setScreeningVenueFilter(e.target.value)}
                className="px-3 py-1.5 text-sm bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
              >
                <option value="">全部场馆</option>
                {venueList.map(v => (
                  <option key={v.id} value={v.id}>{v.name}{v.location ? ` · ${v.location}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => screeningsApi.exportCsv()}
                className="px-4 py-2 bg-film-gray/50 text-film-cream/80 border border-film-gray rounded-lg hover:bg-film-gray transition-colors text-sm"
              >
                📥 导出CSV
              </button>
              <button
                onClick={() => screeningsApi.downloadTemplate()}
                className="px-4 py-2 bg-film-gray/50 text-film-cream/80 border border-film-gray rounded-lg hover:bg-film-gray transition-colors text-sm"
              >
                📄 下载模板
              </button>
              <label className={`px-4 py-2 border rounded-lg text-sm cursor-pointer transition-colors ${
                importing
                  ? 'bg-film-gray/30 text-film-cream/40 border-film-gray/30 cursor-not-allowed'
                  : 'bg-film-gold/10 text-film-gold border-film-gold/50 hover:bg-film-gold/20'
              }`}>
                📤 导入CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleScreeningImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
              <button
                onClick={openNewScreening}
                className="px-5 py-2 bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors"
              >
                + 新增放映
              </button>
            </div>
          </div>

          {screeningImportResult && (
            <div className="mb-6 p-5 rounded-xl border border-film-gray/50 bg-film-dark/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">导入结果</h3>
                <button
                  onClick={() => setScreeningImportResult(null)}
                  className="text-film-cream/50 hover:text-film-cream text-sm"
                >
                  关闭
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-film-black/40 text-center">
                  <div className="text-2xl font-bold text-film-cream">{screeningImportResult.total}</div>
                  <div className="text-xs text-film-cream/50">总计</div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 text-center">
                  <div className="text-2xl font-bold text-green-400">{screeningImportResult.success_count}</div>
                  <div className="text-xs text-film-cream/50">成功</div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{screeningImportResult.skipped_count}</div>
                  <div className="text-xs text-film-cream/50">跳过（重复）</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 text-center">
                  <div className="text-2xl font-bold text-red-400">{screeningImportResult.error_count}</div>
                  <div className="text-xs text-film-cream/50">失败</div>
                </div>
              </div>
              {screeningImportResult.skipped?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-yellow-400 font-medium mb-2">⚠ 跳过记录：</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {screeningImportResult.skipped.map((s, i) => (
                      <div key={i} className="text-xs text-film-cream/70 bg-yellow-500/5 rounded px-3 py-1.5">
                        第{s.row}行：{s.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {screeningImportResult.errors?.length > 0 && (
                <div>
                  <p className="text-sm text-red-400 font-medium mb-2">✗ 错误记录：</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {screeningImportResult.errors.map((e, i) => (
                      <div key={i} className="text-xs text-film-cream/70 bg-red-500/5 rounded px-3 py-1.5">
                        {e.row ? `第${e.row}行：` : ''}{e.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            {(screeningVenueFilter
              ? screeningList.filter(s => String(s.venue_id) === String(screeningVenueFilter))
              : screeningList
            ).map(s => (
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
              <div key={r.id} className={`group p-5 rounded-xl border ${r.is_hidden ? 'bg-film-dark/30 border-film-gray/30 opacity-60' : 'bg-film-dark/50 border-film-gray/50'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-film-gold/40 to-film-red/40 flex items-center justify-center text-sm font-semibold">
                      {(r.author || '匿')[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.author || '匿名观众'}</span>
                        {r.is_spoiler && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                            剧透
                          </span>
                        )}
                        {r.is_hidden && (
                          <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">
                            已隐藏
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-film-cream/40">
                        {r.watched_date && `观看于 ${r.watched_date}`}
                        {r.created_at && ` · 发布于 ${new Date(r.created_at).toLocaleDateString('zh-CN')}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.rating && <span className="text-film-gold text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>}
                    <span className="text-film-cream/50 text-sm flex items-center gap-1">
                      👍 {r.likes || 0}
                    </span>
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      className="text-film-cream/30 hover:text-film-red p-1.5 rounded hover:bg-film-red/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="删除"
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

      {activeTab === 'drafts' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <p className="text-film-cream/60">共 {drafts.length} 个草稿</p>
              <p className="text-xs text-film-cream/40 mt-1">草稿存储在浏览器本地，超过7天未编辑将自动清理</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClearExpiredDrafts}
                className="px-4 py-2 bg-film-gray/50 text-film-cream/70 border border-film-gray rounded-lg hover:bg-film-gray transition-colors text-sm"
              >
                清理过期
              </button>
              <button
                onClick={handleClearAllDrafts}
                className="px-4 py-2 bg-film-red/10 text-film-red border border-film-red/50 rounded-lg hover:bg-film-red/20 transition-colors text-sm"
              >
                清空全部
              </button>
            </div>
          </div>
          {drafts.length === 0 ? (
            <div className="py-16 text-center text-film-cream/50 border border-dashed border-film-gray rounded-xl">
              <div className="text-4xl mb-3">📝</div>
              暂无草稿
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map(d => (
                <div key={d.id} className="p-5 bg-film-dark/50 rounded-xl border border-film-gray/50">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-14 bg-film-gray rounded overflow-hidden flex-shrink-0">
                        {d.film_poster && <img src={d.film_poster} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <Link to={`/films/${d.film_id}`} className="font-medium text-film-cream hover:text-film-gold">
                          {d.film_title || '未知影片'}
                        </Link>
                        <div className="text-xs text-film-cream/40 mt-0.5">
                          {d.film_director && `导演：${d.film_director}`}
                          {d.film_year && ` · ${d.film_year}年`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-film-gold text-sm">{'★'.repeat(d.rating || 0)}</span>
                      <span className="text-film-cream/50 text-xs">
                        最后编辑：{new Date(d.updated_at).toLocaleString('zh-CN')}
                      </span>
                      <button
                        onClick={() => handleDeleteDraft(d.film_id)}
                        className="text-film-cream/30 hover:text-film-red p-1.5 rounded hover:bg-film-red/10 transition-colors"
                        title="删除草稿"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-film-cream/85 leading-relaxed font-serif line-clamp-2">{d.content}</p>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {d.author && (
                      <span className="text-xs text-film-cream/50">作者：{d.author}</span>
                    )}
                    {d.mood && (
                      <span className="text-xs bg-film-gray text-film-cream/60 px-2 py-0.5 rounded-full">{d.mood}</span>
                    )}
                    {d.watched_date && (
                      <span className="text-xs text-film-cream/40">观看于 {d.watched_date}</span>
                    )}
                    {d.is_spoiler && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">剧透</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <p className="text-film-cream/60">共 {reportList.length} 条举报，待处理 {reportList.filter(r => r.status === 'pending').length} 条</p>
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setReportFilter(filter)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    reportFilter === filter
                      ? 'bg-film-gold text-film-black'
                      : 'bg-film-gray/50 text-film-cream/60 hover:text-film-cream'
                  }`}
                >
                  {filter === 'all' ? '全部' : filter === 'pending' ? '待处理' : filter === 'approved' ? '已通过' : '已驳回'}
                </button>
              ))}
            </div>
          </div>
          {reportList.length === 0 ? (
            <div className="py-16 text-center text-film-cream/50 border border-dashed border-film-gray rounded-xl">
              暂无举报记录
            </div>
          ) : (
            <div className="space-y-3">
              {reportList
                .filter(r => reportFilter === 'all' || r.status === reportFilter)
                .map(rpt => (
                  <div key={rpt.id} className="p-5 bg-film-dark/50 rounded-xl border border-film-gray/50">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🚨</span>
                        <div>
                          <div className="font-medium">
                            举报原因：<span className="text-film-gold">{rpt.reason}</span>
                          </div>
                          <div className="text-xs text-film-cream/40 mt-1">
                            举报人：{rpt.reporter || '匿名用户'} · {new Date(rpt.created_at).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${
                          rpt.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          rpt.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {rpt.status === 'pending' ? '待处理' : rpt.status === 'approved' ? '已通过' : '已驳回'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-film-black/40 rounded-lg mb-4">
                      <div className="text-xs text-film-cream/50 mb-2">被举报评论：</div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-film-gold/40 to-film-red/40 flex items-center justify-center text-xs font-semibold">
                          {(rpt.review_author || '匿')[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{rpt.review_author || '匿名观众'}</div>
                          {rpt.title && (
                            <Link to={`/films/${rpt.film_id}`} className="text-xs text-film-gold hover:underline">
                              《{rpt.title}》
                            </Link>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-film-cream/70 leading-relaxed">{rpt.review_content}</p>
                    </div>

                    {rpt.status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleReport(rpt.id, 'rejected')}
                          className="px-4 py-2 text-sm bg-film-gray text-film-cream/70 rounded-lg hover:bg-film-gray/80 transition-colors"
                        >
                          驳回举报
                        </button>
                        <button
                          onClick={() => handleReport(rpt.id, 'approved')}
                          className="px-4 py-2 text-sm bg-film-red text-white rounded-lg hover:bg-film-red/90 transition-colors"
                        >
                          通过并隐藏评论
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-film-cream/40 pt-2 border-t border-film-gray/30">
                        处理人：{rpt.handler || '管理员'} · {rpt.handled_at && new Date(rpt.handled_at).toLocaleString('zh-CN')}
                        {rpt.handle_note && <span className="ml-2">· 备注：{rpt.handle_note}</span>}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <p className="text-film-cream/60">
              共 {favoriteList.length} 部影片 · 想看 {favoriteList.filter(f => f.watch_status === 'want_to_watch').length} · 已购票 {favoriteList.filter(f => f.watch_status === 'ticketed').length} · 已观看 {favoriteList.filter(f => f.watch_status === 'watched').length}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFavoriteStatusFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  favoriteStatusFilter === 'all'
                    ? 'bg-film-gold text-film-black'
                    : 'bg-film-gray/50 text-film-cream/60 hover:text-film-cream'
                }`}
              >
                全部
              </button>
              {WATCH_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFavoriteStatusFilter(opt.key)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                    favoriteStatusFilter === opt.key
                      ? 'bg-film-gold text-film-black'
                      : 'bg-film-gray/50 text-film-cream/60 hover:text-film-cream'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          {favoriteList.length === 0 ? (
            <div className="py-16 text-center text-film-cream/50 border border-dashed border-film-gray rounded-xl">
              暂无观影计划
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteList
                .filter(fav => favoriteStatusFilter === 'all' || fav.watch_status === favoriteStatusFilter)
                .map(fav => (
                <div key={fav.id} className="flex flex-wrap items-center gap-4 p-4 bg-film-dark/50 rounded-xl border border-film-gray/50">
                  <div className="w-12 h-16 bg-film-gray rounded overflow-hidden flex-shrink-0">
                    {fav.poster && <img src={fav.poster} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/films/${fav.film_id}`} className="font-medium hover:text-film-gold">{fav.title}</Link>
                      {(() => {
                        const st = WATCH_STATUS_OPTIONS.find(s => s.key === (fav.watch_status || 'want_to_watch'));
                        return st ? (
                          <span className={`px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 ${st.color}`}>
                            <span>{st.icon}</span>
                            <span>{st.label}</span>
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="text-xs text-film-cream/50 mt-0.5 flex flex-wrap gap-3">
                      {fav.director && <span>{fav.director}</span>}
                      {fav.year && <span>{fav.year}年</span>}
                      {fav.ticket_date && <span>🎟️ {fav.ticket_date}</span>}
                      {fav.watched_date && <span>✅ {fav.watched_date}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={fav.watch_status || 'want_to_watch'}
                      onChange={(e) => handleUpdateFavoriteStatus(fav.film_id, e.target.value)}
                      className="px-3 py-1.5 text-sm bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                    >
                      {WATCH_STATUS_OPTIONS.map(opt => (
                        <option key={opt.key} value={opt.key}>{opt.icon} {opt.label}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 cursor-pointer px-2">
                      <input
                        type="checkbox"
                        checked={!!fav.ticket_reminder_enabled}
                        onChange={(e) => handleUpdateFavoriteReminders(fav.film_id, 'ticket_reminder_enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-film-gray bg-film-black text-film-gold focus:ring-film-gold"
                      />
                      <span className="text-xs text-film-cream/80">🎟️ 开票提醒</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer px-2">
                      <input
                        type="checkbox"
                        checked={!!fav.schedule_change_reminder_enabled}
                        onChange={(e) => handleUpdateFavoriteReminders(fav.film_id, 'schedule_change_reminder_enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-film-gray bg-film-black text-film-gold focus:ring-film-gold"
                      />
                      <span className="text-xs text-film-cream/80">📅 放映变更</span>
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
              {screeningConflictError && (
                <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-red-400 text-lg mt-0.5">⚠️</span>
                    <div className="flex-1">
                      <p className="text-red-400 font-medium mb-2">排期时间冲突</p>
                      <p className="text-sm text-film-cream/80 mb-3">{screeningConflictError.message}</p>
                      <div className="space-y-1.5">
                        {screeningConflictError.conflicts.map((c, idx) => (
                          <div key={idx} className="flex flex-wrap items-center gap-2 text-xs text-film-cream/70 bg-film-black/40 rounded-lg px-3 py-2">
                            <span className="font-semibold text-red-300">🎬《{c.title}》</span>
                            <span className="text-film-cream/50">|</span>
                            <span>🏛 {c.venue_name}{c.venue_location ? ` · ${c.venue_location}` : ''}</span>
                            <span className="text-film-cream/50">|</span>
                            <span>🕒 {c.start_time} - {c.end_time}</span>
                            {c.duration > 0 && <span className="text-film-cream/50">（{c.duration} 分钟）</span>}
                            <span className="text-film-cream/50">|</span>
                            <span className="text-red-300 font-medium">重叠 {c.overlap_start} - {c.overlap_end}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                  <select
                    value={screeningForm.venue_id}
                    onChange={(e) => setScreeningForm({ ...screeningForm, venue_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  >
                    <option value="">请选择场馆</option>
                    {venueList.filter(v => v.is_active).map(v => (
                      <option key={v.id} value={v.id}>{v.name}{v.location ? ` · ${v.location}` : ''}</option>
                    ))}
                  </select>
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

      {showVenueForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowVenueForm(false)}>
          <div className="bg-film-dark w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-film-gray" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-film-dark border-b border-film-gray/50 p-5 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">{editingVenue ? '编辑场馆' : '新增场馆'}</h2>
              <button
                onClick={() => setShowVenueForm(false)}
                className="p-2 rounded-lg hover:bg-film-gray transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleVenueSubmit} className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">场馆名称 *</label>
                  <input
                    type="text"
                    value={venueForm.name}
                    onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                    placeholder="如 中国电影资料馆"
                    required
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">地址</label>
                  <input
                    type="text"
                    value={venueForm.location}
                    onChange={(e) => setVenueForm({ ...venueForm, location: e.target.value })}
                    placeholder="如 北京·小西天"
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">座位容量</label>
                  <input
                    type="number"
                    value={venueForm.capacity}
                    onChange={(e) => setVenueForm({ ...venueForm, capacity: e.target.value })}
                    placeholder="如 300"
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!venueForm.is_active}
                      onChange={(e) => setVenueForm({ ...venueForm, is_active: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 rounded border-film-gray bg-film-black text-film-gold focus:ring-film-gold"
                    />
                    <span className="text-sm text-film-cream/80">启用中</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">备注</label>
                  <textarea
                    value={venueForm.notes}
                    onChange={(e) => setVenueForm({ ...venueForm, notes: e.target.value })}
                    rows={3}
                    placeholder="如 艺术影院、IMAX 厅等"
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-film-gray/50">
                <button
                  type="button"
                  onClick={() => setShowVenueForm(false)}
                  className="px-5 py-2.5 rounded-lg text-film-cream/60 hover:text-film-cream transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-film-gold text-film-black font-medium hover:bg-film-gold/90 transition-colors"
                >
                  {editingVenue ? '保存修改' : '添加场馆'}
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
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">别名</label>
                  <input
                    type="text"
                    value={filmForm.aliases}
                    onChange={(e) => setFilmForm({ ...filmForm, aliases: e.target.value })}
                    placeholder="多个别名用 / 分隔"
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">修复版本</label>
                  <input
                    type="text"
                    value={filmForm.restoration_version}
                    onChange={(e) => setFilmForm({ ...filmForm, restoration_version: e.target.value })}
                    placeholder="如 4K修复版"
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">首映信息</label>
                  <input
                    type="text"
                    value={filmForm.premiere_info}
                    onChange={(e) => setFilmForm({ ...filmForm, premiere_info: e.target.value })}
                    placeholder="如 2000-05-20 戛纳电影节首映"
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">获奖情况</label>
                  <textarea
                    value={filmForm.awards}
                    onChange={(e) => setFilmForm({ ...filmForm, awards: e.target.value })}
                    rows={3}
                    placeholder="列出主要获奖情况，用分号分隔"
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

      {showCollectionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowCollectionForm(false)}>
          <div className="bg-film-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-film-gray" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-film-dark border-b border-film-gray/50 p-5 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">{editingCollection ? '编辑专题' : '新建专题'}</h2>
              <button
                onClick={() => setShowCollectionForm(false)}
                className="p-2 rounded-lg hover:bg-film-gray transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCollectionSubmit} className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">专题标题 *</label>
                  <input
                    type="text"
                    value={collectionForm.title}
                    onChange={(e) => setCollectionForm({ ...collectionForm, title: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">副标题</label>
                  <input
                    type="text"
                    value={collectionForm.subtitle}
                    onChange={(e) => setCollectionForm({ ...collectionForm, subtitle: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">专题描述</label>
                  <textarea
                    value={collectionForm.description}
                    onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">专题类型</label>
                  <select
                    value={collectionForm.type}
                    onChange={(e) => setCollectionForm({ ...collectionForm, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  >
                    <option value="custom">自定义专题</option>
                    <option value="director">导演专题</option>
                    <option value="country">地区专题</option>
                    <option value="theme">主题专题</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">排序权重（数值越小越靠前）</label>
                  <input
                    type="number"
                    value={collectionForm.sort_order}
                    onChange={(e) => setCollectionForm({ ...collectionForm, sort_order: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-film-cream/60 mb-1.5 block">封面图片 URL</label>
                  <input
                    type="url"
                    value={collectionForm.cover_image}
                    onChange={(e) => setCollectionForm({ ...collectionForm, cover_image: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                {collectionForm.type === 'director' && (
                  <div>
                    <label className="text-xs text-film-cream/60 mb-1.5 block">筛选导演</label>
                    <input
                      type="text"
                      value={collectionForm.filter_director}
                      onChange={(e) => setCollectionForm({ ...collectionForm, filter_director: e.target.value })}
                      placeholder="如 王家卫"
                      className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                    />
                  </div>
                )}
                {collectionForm.type === 'country' && (
                  <div>
                    <label className="text-xs text-film-cream/60 mb-1.5 block">筛选国家/地区</label>
                    <input
                      type="text"
                      value={collectionForm.filter_country}
                      onChange={(e) => setCollectionForm({ ...collectionForm, filter_country: e.target.value })}
                      placeholder="如 日本"
                      className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                    />
                  </div>
                )}
                {collectionForm.type === 'theme' && (
                  <div>
                    <label className="text-xs text-film-cream/60 mb-1.5 block">筛选主题</label>
                    <input
                      type="text"
                      value={collectionForm.filter_theme}
                      onChange={(e) => setCollectionForm({ ...collectionForm, filter_theme: e.target.value })}
                      placeholder="如 诗意"
                      className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                    />
                  </div>
                )}
                <div className="flex items-end gap-6 md:col-span-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!collectionForm.is_featured}
                      onChange={(e) => setCollectionForm({ ...collectionForm, is_featured: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 rounded border-film-gray bg-film-black text-film-gold focus:ring-film-gold"
                    />
                    <span className="text-sm text-film-cream/80">⭐ 首页推荐</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!collectionForm.is_active}
                      onChange={(e) => setCollectionForm({ ...collectionForm, is_active: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 rounded border-film-gray bg-film-black text-film-gold focus:ring-film-gold"
                    />
                    <span className="text-sm text-film-cream/80">启用中</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-film-gray/50">
                <button
                  type="button"
                  onClick={() => setShowCollectionForm(false)}
                  className="px-5 py-2.5 rounded-lg text-film-cream/60 hover:text-film-cream transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-film-gold text-film-black font-medium hover:bg-film-gold/90 transition-colors"
                >
                  {editingCollection ? '保存修改' : '创建专题'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddFilmToCollection && activeCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddFilmToCollection(null)}>
          <div className="bg-film-dark w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-film-gray" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-film-dark border-b border-film-gray/50 p-5 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">添加影片到「{activeCollection.title}」</h2>
              <button
                onClick={() => setShowAddFilmToCollection(null)}
                className="p-2 rounded-lg hover:bg-film-gray transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddFilmToCollection} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-film-cream/60 mb-1.5 block">选择影片 *</label>
                <select
                  value={addFilmForm.film_id}
                  onChange={(e) => setAddFilmForm({ ...addFilmForm, film_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                >
                  <option value="">请选择影片</option>
                  {filmList
                    .filter(f => !activeCollection.films?.some(cf => String(cf.film_id) === String(f.id)))
                    .map(f => (
                    <option key={f.id} value={f.id}>{f.title} ({f.year || '未知年份'}) - {f.director || '未知导演'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-film-cream/60 mb-1.5 block">排序</label>
                <input
                  type="number"
                  value={addFilmForm.sort_order}
                  onChange={(e) => setAddFilmForm({ ...addFilmForm, sort_order: e.target.value })}
                  className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-film-cream/60 mb-1.5 block">备注说明</label>
                <textarea
                  value={addFilmForm.note}
                  onChange={(e) => setAddFilmForm({ ...addFilmForm, note: e.target.value })}
                  rows={2}
                  placeholder="如 推荐理由、入册说明等"
                  className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-film-gray/50">
                <button
                  type="button"
                  onClick={() => setShowAddFilmToCollection(null)}
                  className="px-5 py-2.5 rounded-lg text-film-cream/60 hover:text-film-cream transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-film-gold text-film-black font-medium hover:bg-film-gold/90 transition-colors"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRecForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowRecForm(false)}>
          <div className="bg-film-dark w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-film-gray" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-film-dark border-b border-film-gray/50 p-5 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">{editingRec ? '编辑人工推荐' : '添加人工推荐'}</h2>
              <button
                onClick={() => setShowRecForm(false)}
                className="p-2 rounded-lg hover:bg-film-gray transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleRecSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-film-cream/60 mb-1.5 block">选择影片 *</label>
                <select
                  value={recForm.film_id}
                  onChange={(e) => setRecForm({ ...recForm, film_id: e.target.value })}
                  disabled={!!editingRec}
                  className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none disabled:opacity-50"
                >
                  <option value="">请选择影片</option>
                  {filmList
                    .filter(f => editingRec || !manualRecList.some(r => String(r.film_id) === String(f.id)))
                    .map(f => (
                    <option key={f.id} value={f.id}>{f.title} ({f.year || '未知年份'}) - {f.director || '未知导演'}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-film-cream/60 mb-1.5 block">排序权重（越小越靠前）</label>
                  <input
                    type="number"
                    value={recForm.sort_order}
                    onChange={(e) => setRecForm({ ...recForm, sort_order: e.target.value })}
                    className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-film-cream/40">
                    人工推荐将始终排在算法推荐之前
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-film-cream/60 mb-1.5 block">推荐理由（展示给用户）</label>
                <input
                  type="text"
                  value={recForm.reason}
                  onChange={(e) => setRecForm({ ...recForm, reason: e.target.value })}
                  placeholder="如 本周编辑力荐、经典修复、影迷必看等"
                  className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-film-cream/60 mb-1.5 block">内部备注（不展示）</label>
                <textarea
                  value={recForm.note}
                  onChange={(e) => setRecForm({ ...recForm, note: e.target.value })}
                  rows={2}
                  placeholder="如 活动合作、重点推片、截止日期等"
                  className="w-full px-3 py-2.5 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-film-gray/50">
                <button
                  type="button"
                  onClick={() => setShowRecForm(false)}
                  className="px-5 py-2.5 rounded-lg text-film-cream/60 hover:text-film-cream transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-film-gold text-film-black font-medium hover:bg-film-gold/90 transition-colors"
                >
                  {editingRec ? '保存修改' : '添加推荐'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

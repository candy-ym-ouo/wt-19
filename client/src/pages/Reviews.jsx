import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reviews as reviewsApi, reports as reportsApi } from '../api.js';

const moodColors = {
  '感动': 'bg-pink-500/20 text-pink-300',
  '愉悦': 'bg-yellow-500/20 text-yellow-300',
  '沉思': 'bg-blue-500/20 text-blue-300',
  '震撼': 'bg-red-500/20 text-red-300',
  '忧郁': 'bg-indigo-500/20 text-indigo-300',
  '温暖': 'bg-orange-500/20 text-orange-300',
};

const sortOptions = [
  { value: 'created_at_desc', label: '最新发布' },
  { value: 'likes_desc', label: '最多点赞' },
  { value: 'rating_desc', label: '评分最高' },
];

const reportReasons = ['剧透', '人身攻击', '垃圾广告', '违规内容', '其他'];

export default function Reviews() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('created_at_desc');
  const [showSpoilers, setShowSpoilers] = useState({});
  const [likedReviews, setLikedReviews] = useState({});
  const [showReportModal, setShowReportModal] = useState(null);
  const [reportForm, setReportForm] = useState({ reason: '', reporter: '' });

  const fetchData = () => {
    setLoading(true);
    reviewsApi.list({ sort }).then(data => {
      setList(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, [sort]);

  const toggleSpoiler = (reviewId) => {
    setShowSpoilers(prev => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  const handleLike = async (reviewId) => {
    if (likedReviews[reviewId]) return;
    try {
      const res = await reviewsApi.like(reviewId);
      setLikedReviews(prev => ({ ...prev, [reviewId]: true }));
      setList(prev => prev.map(r =>
        r.id === reviewId ? { ...r, likes: res.likes } : r
      ));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此短评？')) return;
    try {
      await reviewsApi.delete(id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

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

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold">观后短评</h1>
          <p className="text-film-cream/60 mt-2">共 {list.length} 条观影记录</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-film-cream/50">排序：</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-1.5 text-sm bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
          >
            {sortOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-film-gray rounded-xl">
          <div className="text-5xl mb-4">✍️</div>
          <p className="text-film-cream/60">还没有观影记录</p>
          <Link to="/films" className="inline-block mt-4 text-film-gold hover:underline">
            去影片库写一条短评 →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {list.map(r => (
          <div key={r.id} className="group p-6 bg-film-dark/60 rounded-xl border border-film-gray/50 hover:border-film-gold/30 transition-colors">
            <div className="flex flex-wrap gap-4">
              <Link to={`/films/${r.film_id}`} className="flex-shrink-0 w-20 h-28 md:w-24 md:h-32 bg-film-gray rounded-lg overflow-hidden">
                {r.poster && <img src={r.poster} alt={r.title} className="w-full h-full object-cover" />}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/films/${r.film_id}`} className="font-serif font-bold text-lg text-film-cream hover:text-film-gold transition-colors">
                      {r.title}
                    </Link>
                    {r.director && <p className="text-sm text-film-cream/50 mt-0.5">导演：{r.director}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 text-film-cream/20 hover:text-film-red hover:bg-film-red/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="删除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-film-gold/40 to-film-red/40 flex items-center justify-center text-xs font-semibold">
                    {(r.author || '匿')[0]}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-medium">{r.author || '匿名观众'}</div>
                    {r.is_spoiler && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                        剧透
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-film-cream/40 flex flex-wrap items-center gap-2 ml-10">
                  {r.watched_date && <span>观看于 {r.watched_date}</span>}
                  {r.created_at && <span>· 发布于 {new Date(r.created_at).toLocaleDateString('zh-CN')}</span>}
                </div>
                {r.is_spoiler && !showSpoilers[r.id] ? (
                  <div className="py-4 text-center ml-10">
                    <p className="text-film-cream/40 mb-2 text-sm">此评论包含剧透内容</p>
                    <button
                      onClick={() => toggleSpoiler(r.id)}
                      className="text-xs text-film-gold hover:underline"
                    >
                      点击展开查看
                    </button>
                  </div>
                ) : (
                  <p className="mt-4 text-film-cream/85 leading-relaxed font-serif text-base">
                    {r.content}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.rating && (
                      <span className="text-film-gold text-sm">
                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                      </span>
                    )}
                    {r.mood && (
                      <span className={`text-xs px-2.5 py-0.5 rounded-full ${moodColors[r.mood] || 'bg-film-gray text-film-cream/60'}`}>
                        {r.mood}
                      </span>
                    )}
                  </div>
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
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

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

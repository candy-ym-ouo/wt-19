import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { draftStore } from '../api.js';

const moodColors = {
  '感动': 'bg-pink-500/20 text-pink-300',
  '愉悦': 'bg-yellow-500/20 text-yellow-300',
  '沉思': 'bg-blue-500/20 text-blue-300',
  '震撼': 'bg-red-500/20 text-red-300',
  '忧郁': 'bg-indigo-500/20 text-indigo-300',
  '温暖': 'bg-orange-500/20 text-orange-300',
};

export default function Drafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDrafts = () => {
    draftStore.cleanupExpired();
    const allDrafts = draftStore.getAllArray().filter(d => d.content?.trim());
    setDrafts(allDrafts);
    setLoading(false);
  };

  useEffect(() => {
    loadDrafts();
    window.addEventListener('draftUpdated', loadDrafts);
    window.addEventListener('storage', loadDrafts);
    return () => {
      window.removeEventListener('draftUpdated', loadDrafts);
      window.removeEventListener('storage', loadDrafts);
    };
  }, []);

  const handleDeleteDraft = (filmId, e) => {
    e.stopPropagation();
    if (confirm('确定要删除这个草稿吗？')) {
      draftStore.remove(filmId);
    }
  };

  const handleContinueDraft = (filmId) => {
    navigate(`/films/${filmId}`);
  };

  const handleClearExpired = () => {
    const removed = draftStore.cleanupExpired();
    if (removed > 0) {
      alert(`已清理 ${removed} 个过期草稿（超过7天未编辑）`);
    } else {
      alert('没有需要清理的过期草稿');
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有草稿吗？此操作不可撤销。')) {
      draftStore.clearAll();
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold">草稿箱</h1>
            <p className="text-film-cream/60 mt-2">共 {drafts.length} 个未完成的短评草稿</p>
          </div>
          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <>
                <button
                  onClick={handleClearExpired}
                  className="px-4 py-2 bg-film-gray/50 text-film-cream/70 border border-film-gray rounded-lg hover:bg-film-gray transition-colors text-sm"
                >
                  清理过期
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-film-red/10 text-film-red border border-film-red/50 rounded-lg hover:bg-film-red/20 transition-colors text-sm"
                >
                  清空全部
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-4 bg-film-dark/60 rounded-xl border border-film-gray/50 mb-6">
          <p className="text-sm text-film-cream/60">
            <span className="text-film-gold">💡 提示：</span>
            草稿会在浏览器本地自动保存，有效期为 7 天。超过 7 天未编辑的草稿将被自动清理。
            点击卡片可以继续编辑并发布短评。
          </p>
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-film-gray rounded-xl">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-film-cream/60 text-lg mb-2">草稿箱是空的</p>
          <p className="text-film-cream/40 text-sm mb-6">去影片库写一条短评吧</p>
          <Link
            to="/films"
            className="inline-block px-6 py-2.5 bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors"
          >
            浏览影片库
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map(draft => (
            <div
              key={draft.id}
              onClick={() => handleContinueDraft(draft.film_id)}
              className="group p-6 bg-film-dark/60 rounded-xl border border-film-gray/50 hover:border-film-gold/30 transition-all cursor-pointer"
            >
              <div className="flex flex-wrap gap-4">
                <div className="flex-shrink-0 w-20 h-28 md:w-24 md:h-32 bg-film-gray rounded-lg overflow-hidden">
                  {draft.film_poster ? (
                    <img src={draft.film_poster} alt={draft.film_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-film-cream/30">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-serif font-bold text-lg text-film-cream group-hover:text-film-gold transition-colors">
                        {draft.film_title || '未知影片'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-film-cream/50">
                        {draft.film_director && <span>导演：{draft.film_director}</span>}
                        {draft.film_year && draft.film_director && <span>·</span>}
                        {draft.film_year && <span>{draft.film_year} 年</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteDraft(draft.film_id, e)}
                      className="p-1.5 text-film-cream/30 hover:text-film-red hover:bg-film-red/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="删除草稿"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    {draft.author && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-film-gold/40 to-film-red/40 flex items-center justify-center text-xs">
                          {(draft.author || '匿')[0]}
                        </div>
                        <span className="text-sm text-film-cream/70">{draft.author}</span>
                      </div>
                    )}
                    {draft.rating && (
                      <span className="text-film-gold text-sm">
                        {'★'.repeat(draft.rating)}{'☆'.repeat(5 - draft.rating)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <p className="text-film-cream/80 leading-relaxed font-serif line-clamp-3">
                      {draft.content}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {draft.mood && (
                        <span className={`text-xs px-2.5 py-0.5 rounded-full ${moodColors[draft.mood] || 'bg-film-gray text-film-cream/60'}`}>
                          {draft.mood}
                        </span>
                      )}
                      {draft.watched_date && (
                        <span className="text-xs text-film-cream/40">
                          📅 观看于 {draft.watched_date}
                        </span>
                      )}
                      {draft.is_spoiler && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                          剧透
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-film-cream/40">
                      <span>
                        创建于 {formatDate(draft.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        更新于 {formatDate(draft.updated_at)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-film-gray/30 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteDraft(draft.film_id, e); }}
                      className="px-4 py-2 text-sm text-film-cream/60 hover:text-film-red hover:bg-film-red/10 rounded-lg transition-colors"
                    >
                      删除草稿
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleContinueDraft(draft.film_id); }}
                      className="px-4 py-2 text-sm bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors"
                    >
                      继续编辑
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

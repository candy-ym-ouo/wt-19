import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reviews as reviewsApi } from '../api.js';

const moodColors = {
  '感动': 'bg-pink-500/20 text-pink-300',
  '愉悦': 'bg-yellow-500/20 text-yellow-300',
  '沉思': 'bg-blue-500/20 text-blue-300',
  '震撼': 'bg-red-500/20 text-red-300',
  '忧郁': 'bg-indigo-500/20 text-indigo-300',
  '温暖': 'bg-orange-500/20 text-orange-300',
};

export default function Reviews() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    reviewsApi.list().then(data => {
      setList(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('确定删除此短评？')) return;
    try {
      await reviewsApi.delete(id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold">观后短评</h1>
        <p className="text-film-cream/60 mt-2">共 {list.length} 条观影记录</p>
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
                    <div>
                      <div className="text-sm font-medium">{r.author || '匿名观众'}</div>
                      <div className="text-xs text-film-cream/40 flex flex-wrap items-center gap-2">
                        {r.watched_date && <span>观看于 {r.watched_date}</span>}
                        {r.created_at && <span>· 发布于 {new Date(r.created_at).toLocaleDateString('zh-CN')}</span>}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-film-cream/85 leading-relaxed font-serif text-base">
                    {r.content}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

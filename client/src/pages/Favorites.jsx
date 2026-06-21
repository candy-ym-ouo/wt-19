import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { favorites as favApi } from '../api.js';
import FilmCard from '../components/FilmCard.jsx';

export default function Favorites() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    favApi.list().then(data => {
      setList(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleFavorite = async (filmId) => {
    try {
      await favApi.toggle(filmId);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold flex items-center gap-3">
          <svg className="w-9 h-9 text-film-red" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          我的收藏
        </h1>
        <p className="text-film-cream/60 mt-2">共收藏 {list.length} 部影片</p>
      </div>

      {list.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-film-gray rounded-xl">
          <div className="text-6xl mb-6">💔</div>
          <p className="text-xl text-film-cream/70 font-serif mb-3">收藏夹空空如也</p>
          <p className="text-film-cream/50 mb-6">去影片库发现好片，收藏心动之作吧</p>
          <Link
            to="/films"
            className="inline-block px-8 py-3 bg-film-gold text-film-black font-semibold rounded-lg hover:bg-film-gold/90 transition-colors"
          >
            浏览影片库
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {list.map(item => (
            <div key={item.id} className="relative">
              <FilmCard
                film={item}
                isFavorite={true}
                onToggleFavorite={handleToggleFavorite}
              />
              <div className="absolute bottom-[72px] left-3 flex gap-1 z-10">
                {item.ticket_reminder_enabled && (
                  <span className="bg-film-gold/20 backdrop-blur-sm text-film-gold px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5" title="开票提醒已开启">
                    🎟️
                  </span>
                )}
                {item.schedule_change_reminder_enabled && (
                  <span className="bg-orange-500/20 backdrop-blur-sm text-orange-400 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5" title="放映变更通知已开启">
                    📅
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { films, stats, screenings, collections as collectionsApi } from '../api.js';
import FilmCard from '../components/FilmCard.jsx';

const typeLabels = {
  director: '导演专题',
  country: '地区专题',
  theme: '主题专题',
  custom: '精选专题',
};

export default function Home() {
  const [featuredFilms, setFeaturedFilms] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [featuredCollections, setFeaturedCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      films.list({ sort: 'rating_desc' }).then(r => r.slice(0, 6)),
      stats.get(),
      screenings.list(),
      collectionsApi.list({ featured: 1 }),
    ]).then(([f, s, sc, cols]) => {
      setFeaturedFilms(f);
      setStatsData(s);
      const today = new Date().toISOString().split('T')[0];
      setUpcoming(sc.filter(x => x.screening_date >= today).slice(0, 5));
      setFeaturedCollections(cols.slice(0, 3));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;
  }

  return (
    <div>
      <section className="relative grain overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-film-gold/10 via-transparent to-film-red/10" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <p className="text-film-gold text-sm tracking-[0.3em] uppercase mb-4">Art Film Notes</p>
            <h1 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">
              在光影交错间<br />
              <span className="text-film-gold">记录每一次心灵触动</span>
            </h1>
            <p className="text-lg text-film-cream/70 leading-relaxed mb-10 max-w-xl">
              一个专属于艺术电影爱好者的放映笔记平台。收藏影片、记录观感、追踪放映，让每一次观影都留下痕迹。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/films"
                className="px-8 py-3 bg-film-gold text-film-black font-semibold rounded-lg hover:bg-film-gold/90 transition-colors"
              >
                浏览影片库
              </Link>
              <Link
                to="/calendar"
                className="px-8 py-3 border border-film-gold/50 text-film-gold font-semibold rounded-lg hover:bg-film-gold/10 transition-colors"
              >
                查看放映日历
              </Link>
            </div>
          </div>
          {statsData && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-16 max-w-3xl">
              {[
                { label: '收录影片', value: statsData.filmCount },
                { label: '策展专题', value: statsData.collectionCount },
                { label: '放映场次', value: statsData.screeningCount },
                { label: '观后短评', value: statsData.reviewCount },
                { label: '心仪收藏', value: statsData.favoriteCount },
              ].map(item => (
                <div key={item.label} className="border-l-2 border-film-gold/50 pl-4">
                  <div className="text-3xl font-serif font-bold text-film-gold">{item.value}</div>
                  <div className="text-sm text-film-cream/60 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold">专题策展</h2>
            <p className="text-film-cream/60 mt-2">按导演、地区、主题精心编排的影片合集</p>
          </div>
          <Link to="/collections" className="text-film-gold hover:underline text-sm">
            全部专题 →
          </Link>
        </div>
        {featuredCollections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCollections.map(col => (
              <Link
                key={col.id}
                to={`/collections/${col.id}`}
                className="group relative rounded-2xl overflow-hidden border border-film-gray/50 hover:border-film-gold/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-film-gold/10"
              >
                {col.cover_image ? (
                  <div className="h-52 overflow-hidden">
                    <img
                      src={col.cover_image}
                      alt={col.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="h-52 bg-gradient-to-br from-film-gray to-film-dark flex items-center justify-center">
                    <span className="text-6xl opacity-30">🎬</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-film-black via-film-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-film-gold/20 text-film-gold mb-2">
                    {typeLabels[col.type] || '精选专题'}
                  </span>
                  <h3 className="text-lg md:text-xl font-serif font-bold text-film-cream group-hover:text-film-gold transition-colors">
                    {col.title}
                  </h3>
                  {col.subtitle && (
                    <p className="text-xs text-film-cream/60 mt-1 italic">{col.subtitle}</p>
                  )}
                  {col.description && (
                    <p className="text-sm text-film-cream/70 mt-2 line-clamp-2">{col.description}</p>
                  )}
                  <div className="mt-3 text-xs text-film-cream/60">
                    📽 {col.film_count || 0} 部影片
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-film-gray rounded-xl">
            <p className="text-film-cream/50">暂无推荐专题</p>
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold">精选影片</h2>
            <p className="text-film-cream/60 mt-2">来自世界各国的艺术电影佳作</p>
          </div>
          <Link to="/films" className="text-film-gold hover:underline text-sm">
            查看全部 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {featuredFilms.map(film => (
            <FilmCard key={film.id} film={film} showFavorite={false} />
          ))}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="bg-film-dark/50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold">即将放映</h2>
                <p className="text-film-cream/60 mt-2">追踪你感兴趣的艺术电影放映</p>
              </div>
              <Link to="/calendar" className="text-film-gold hover:underline text-sm">
                完整日历 →
              </Link>
            </div>
            <div className="space-y-3">
              {upcoming.map(s => (
                <Link
                  key={s.id}
                  to={`/films/${s.film_id}`}
                  className="flex items-center gap-6 p-4 bg-film-black/60 rounded-xl border border-film-gray/50 hover:border-film-gold/40 transition-colors group"
                >
                  <div className="flex-shrink-0 text-center min-w-[60px]">
                    <div className="text-xs text-film-cream/50">
                      {new Date(s.screening_date).toLocaleDateString('zh-CN', { month: 'short' })}
                    </div>
                    <div className="text-2xl font-serif font-bold text-film-gold">
                      {new Date(s.screening_date).getDate()}
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-10 h-14 bg-film-gray rounded overflow-hidden">
                    {s.poster && <img src={s.poster} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-semibold text-film-cream group-hover:text-film-gold transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-sm text-film-cream/50 mt-0.5">
                      {s.screening_time} · {s.venue || '待定'}
                      {s.location && ` · ${s.location}`}
                    </p>
                  </div>
                  {s.notes && (
                    <span className="hidden md:inline-block text-xs bg-film-gold/10 text-film-gold px-3 py-1 rounded-full">
                      {s.notes}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

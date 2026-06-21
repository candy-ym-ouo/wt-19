import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { films, stats, screenings, collections as collectionsApi, watchTasks } from '../api.js';
import FilmCard from '../components/FilmCard.jsx';

const typeLabels = {
  director: '导演专题',
  country: '地区专题',
  theme: '主题专题',
  custom: '精选专题',
};

const urgencyLabels = {
  high: { text: '紧急', color: 'text-red-400', bg: 'bg-red-500/15' },
  medium: { text: '提醒', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  low: { text: '待办', color: 'text-purple-400', bg: 'bg-purple-500/15' },
};

export default function Home() {
  const [featuredFilms, setFeaturedFilms] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [featuredCollections, setFeaturedCollections] = useState([]);
  const [similarRecommendations, setSimilarRecommendations] = useState([]);
  const [watchTasksData, setWatchTasksData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      films.list({ sort: 'rating_desc' }).then(r => r.slice(0, 6)),
      stats.get(),
      screenings.list(),
      collectionsApi.list({ featured: 1 }),
      watchTasks.list({ status: 'pending' }),
    ]).then(async ([f, s, sc, cols, wt]) => {
      setFeaturedFilms(f);
      setStatsData(s);
      setWatchTasksData(wt);
      const today = new Date().toISOString().split('T')[0];
      setUpcoming(sc.filter(x => x.screening_date >= today).slice(0, 5));
      setFeaturedCollections(cols.slice(0, 3));
      if (f.length > 0) {
        try {
          const sim = await films.similar(f[0].id, { limit: 6 });
          setSimilarRecommendations(sim);
        } catch {}
      }
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl">
              {[
                { label: '收录影片', value: statsData.filmCount, icon: '🎬' },
                { label: '放映场次', value: statsData.screeningCount, icon: '📅' },
                { label: '观后短评', value: statsData.reviewCount, icon: '✍️' },
                { label: '策展专题', value: statsData.collectionCount, icon: '📚' },
              ].map(item => (
                <div key={item.label} className="border-l-2 border-film-gold/50 pl-4">
                  <div className="text-xs text-film-cream/40 mb-1">{item.icon}</div>
                  <div className="text-3xl font-serif font-bold text-film-gold">{item.value}</div>
                  <div className="text-sm text-film-cream/60 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          )}
          {statsData && (
            <div className="mt-8 p-5 bg-film-dark/40 rounded-xl border border-film-gray/50">
              <div className="text-sm text-film-cream/60 mb-4 font-medium">🎯 我的观影计划</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-2xl mb-1">👁️</div>
                  <div className="text-2xl font-serif font-bold text-blue-400">{statsData.wantToWatchCount || 0}</div>
                  <div className="text-xs text-blue-400/80 mt-1">想看</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-film-gold/10 border border-film-gold/30">
                  <div className="text-2xl mb-1">🎟️</div>
                  <div className="text-2xl font-serif font-bold text-film-gold">{statsData.ticketedCount || 0}</div>
                  <div className="text-xs text-film-gold/80 mt-1">已购票</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-2xl mb-1">✅</div>
                  <div className="text-2xl font-serif font-bold text-green-400">{statsData.watchedCount || 0}</div>
                  <div className="text-xs text-green-400/80 mt-1">已观看</div>
                </div>
              </div>
            </div>
          )}
          {watchTasksData && watchTasksData.tasks && watchTasksData.tasks.length > 0 && (
            <div className="mt-6 p-5 rounded-xl border border-film-gray/50 bg-gradient-to-br from-red-500/5 via-film-dark/40 to-purple-500/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✍️</span>
                  <div>
                    <div className="text-sm font-medium text-film-cream/80">补观待办任务</div>
                    <div className="text-xs text-film-cream/50 mt-0.5">
                      {watchTasksData.summary?.review_pending || 0} 条短评待补 · {watchTasksData.summary?.mood_pending || 0} 个心情待标
                    </div>
                  </div>
                </div>
                <Link to="/calendar?view=list" className="text-xs text-film-gold hover:underline">
                  全部任务 →
                </Link>
              </div>
              {watchTasksData.summary && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className={`text-center p-2 rounded-lg ${urgencyLabels.high.bg} border border-red-500/20`}>
                    <div className={`text-xl font-serif font-bold ${urgencyLabels.high.color}`}>
                      {watchTasksData.summary.high_urgency || 0}
                    </div>
                    <div className={`text-[10px] ${urgencyLabels.high.color}/80 mt-0.5`}>{urgencyLabels.high.text}</div>
                  </div>
                  <div className={`text-center p-2 rounded-lg ${urgencyLabels.medium.bg} border border-amber-500/20`}>
                    <div className={`text-xl font-serif font-bold ${urgencyLabels.medium.color}`}>
                      {watchTasksData.summary.medium_urgency || 0}
                    </div>
                    <div className={`text-[10px] ${urgencyLabels.medium.color}/80 mt-0.5`}>{urgencyLabels.medium.text}</div>
                  </div>
                  <div className={`text-center p-2 rounded-lg ${urgencyLabels.low.bg} border border-purple-500/20`}>
                    <div className={`text-xl font-serif font-bold ${urgencyLabels.low.color}`}>
                      {watchTasksData.summary.low_urgency || 0}
                    </div>
                    <div className={`text-[10px] ${urgencyLabels.low.color}/80 mt-0.5`}>{urgencyLabels.low.text}</div>
                  </div>
                </div>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {watchTasksData.tasks.slice(0, 5).map(task => (
                  <Link
                    key={task.id}
                    to={`/films/${task.film_id}#write-review`}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01] ${
                      task.urgency === 'high'
                        ? 'bg-red-500/5 border-red-400/30 hover:bg-red-500/10'
                        : task.urgency === 'medium'
                        ? 'bg-amber-500/5 border-amber-400/30 hover:bg-amber-500/10'
                        : 'bg-purple-500/5 border-purple-400/30 hover:bg-purple-500/10'
                    }`}
                  >
                    <div className="w-10 h-14 flex-shrink-0 bg-film-gray/60 rounded overflow-hidden">
                      {task.poster && <img src={task.poster} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif font-semibold text-film-cream text-sm truncate">{task.title}</div>
                      <div className="text-xs text-film-cream/50 mt-0.5">
                        {new Date(task.screening_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
                        {task.screening_time && ` · ${task.screening_time}`}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {task.pending_tasks?.includes('review') && (
                          <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                            待补短评
                          </span>
                        )}
                        {task.pending_tasks?.includes('mood') && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                            待补心情
                          </span>
                        )}
                        {task.days_since_ended > 0 && (
                          <span className="text-[10px] text-film-cream/40">
                            {task.days_since_ended}天前
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-full ${urgencyLabels[task.urgency]?.bg} ${urgencyLabels[task.urgency]?.color}`}>
                      {urgencyLabels[task.urgency]?.text}
                    </div>
                  </Link>
                ))}
              </div>
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

      {similarRecommendations.length > 0 && featuredFilms.length > 0 && (
        <section className="bg-film-dark/50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold">智能相似推荐</h2>
                <p className="text-film-cream/60 mt-2">基于《{featuredFilms[0]?.title}》推荐 · 导演、国家、类型与评分综合匹配</p>
              </div>
              {featuredFilms[0] && (
                <Link to={`/films/${featuredFilms[0].id}`} className="text-film-gold hover:underline text-sm">
                  查看原片 →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
              {similarRecommendations.map(film => (
                <div key={film.id} className="relative">
                  <FilmCard film={film} showFavorite={false} />
                  {film.match_reasons && film.match_reasons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {film.match_reasons.slice(0, 2).map((reason, idx) => (
                        <span key={idx} className="text-[10px] bg-film-gold/10 text-film-gold px-1.5 py-0.5 rounded">
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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

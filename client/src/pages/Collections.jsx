import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collections as collectionsApi } from '../api.js';

const typeLabels = {
  director: '导演专题',
  country: '地区专题',
  theme: '主题专题',
  custom: '自定义专题',
};

const typeColors = {
  director: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
  country: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
  theme: 'from-pink-500/20 to-pink-500/5 border-pink-500/30',
  custom: 'from-film-gold/20 to-film-gold/5 border-film-gold/30',
};

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [directors, setDirectors] = useState([]);
  const [countries, setCountries] = useState([]);
  const [themes, setThemes] = useState([]);

  useEffect(() => {
    Promise.all([
      collectionsApi.list(),
      collectionsApi.getDirectors(),
      collectionsApi.getCountries(),
      collectionsApi.getThemes(),
    ]).then(([cols, dirs, cnts, thms]) => {
      setCollections(cols);
      setDirectors(dirs);
      setCountries(cnts);
      setThemes(thms);
      setLoading(false);
    });
  }, []);

  const filteredCollections = activeType === 'all'
    ? collections
    : collections.filter(c => c.type === activeType);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-serif font-bold">专题策展</h1>
        <p className="text-film-cream/60 mt-2">按导演、地区、主题聚合浏览艺术电影</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {['all', 'director', 'country', 'theme', 'custom'].map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeType === type
                ? 'bg-film-gold text-film-black'
                : 'bg-film-dark/50 text-film-cream/70 hover:text-film-cream hover:bg-film-dark border border-film-gray/50'
            }`}
          >
            {type === 'all' ? '全部专题' : typeLabels[type]}
          </button>
        ))}
      </div>

      {filteredCollections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filteredCollections.map(col => (
            <Link
              key={col.id}
              to={`/collections/${col.id}`}
              className={`group relative rounded-2xl overflow-hidden border bg-gradient-to-br ${typeColors[col.type] || typeColors.custom} hover:shadow-2xl hover:shadow-film-gold/10 transition-all duration-300 hover:-translate-y-1`}
            >
              {col.cover_image ? (
                <div className="h-48 overflow-hidden">
                  <img
                    src={col.cover_image}
                    alt={col.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-film-gray to-film-dark flex items-center justify-center">
                  <span className="text-5xl opacity-30">🎬</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-film-black via-film-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-film-black/60 text-film-cream/80 mb-2">
                  {typeLabels[col.type] || '专题'}
                </span>
                <h3 className="text-xl font-serif font-bold text-film-cream group-hover:text-film-gold transition-colors">
                  {col.title}
                </h3>
                {col.subtitle && (
                  <p className="text-sm text-film-cream/60 mt-1 italic">{col.subtitle}</p>
                )}
                {col.description && (
                  <p className="text-sm text-film-cream/70 mt-2 line-clamp-2">{col.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-film-cream/60">
                  <span>📽 {col.film_count || 0} 部影片</span>
                  {col.is_featured && <span className="text-film-gold">⭐ 推荐</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center mb-16 border border-dashed border-film-gray rounded-xl">
          <p className="text-film-cream/50">暂无该类型的专题</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-film-dark/50 rounded-2xl border border-film-gray/50 p-6">
          <h3 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
            <span className="text-purple-400">🎬</span> 按导演聚合
          </h3>
          {directors.length === 0 ? (
            <p className="text-sm text-film-cream/50">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {directors.slice(0, 8).map(d => (
                <div key={d.name} className="flex items-center justify-between py-1.5 border-b border-film-gray/30 last:border-0">
                  <span className="text-sm text-film-cream/80">{d.name}</span>
                  <span className="text-xs text-film-cream/50">{d.film_count} 部</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-film-dark/50 rounded-2xl border border-film-gray/50 p-6">
          <h3 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
            <span className="text-blue-400">🌍</span> 按地区聚合
          </h3>
          {countries.length === 0 ? (
            <p className="text-sm text-film-cream/50">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {countries.slice(0, 8).map(c => (
                <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-film-gray/30 last:border-0">
                  <span className="text-sm text-film-cream/80">{c.name}</span>
                  <span className="text-xs text-film-cream/50">{c.film_count} 部</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-film-dark/50 rounded-2xl border border-film-gray/50 p-6">
          <h3 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
            <span className="text-pink-400">🎭</span> 按主题聚合
          </h3>
          {themes.length === 0 ? (
            <p className="text-sm text-film-cream/50">暂无数据</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {themes.slice(0, 15).map(t => (
                <span
                  key={t.name}
                  className="text-xs bg-film-gray/50 text-film-cream/70 px-3 py-1 rounded-full"
                >
                  {t.name} ({t.film_count})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

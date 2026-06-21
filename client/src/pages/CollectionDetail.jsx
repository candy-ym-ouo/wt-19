import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collections as collectionsApi, favorites as favApi } from '../api.js';
import FilmCard from '../components/FilmCard.jsx';

const typeLabels = {
  director: '导演专题',
  country: '地区专题',
  theme: '主题专题',
  custom: '自定义专题',
};

export default function CollectionDetail() {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      collectionsApi.get(id),
      favApi.list(),
    ]).then(([col, favs]) => {
      setCollection(col);
      setFavoriteIds(new Set(favs.map(x => x.film_id)));
      setLoading(false);
    });
  }, [id]);

  const handleToggleFavorite = async (filmId) => {
    try {
      const res = await favApi.toggle(filmId);
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (res.isFavorite) next.add(filmId);
        else next.delete(filmId);
        return next;
      });
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;
  }

  if (!collection) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <p className="text-film-cream/50 mb-4">专题不存在</p>
        <Link to="/collections" className="text-film-gold hover:underline">
          返回专题列表
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className="relative overflow-hidden">
        {collection.cover_image && (
          <div className="absolute inset-0">
            <img
              src={collection.cover_image}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-film-black/60 via-film-black/80 to-film-black" />
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-film-gold/20 text-film-gold mb-4">
            {typeLabels[collection.type] || '专题'}
          </span>
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-3">
            {collection.title}
          </h1>
          {collection.subtitle && (
            <p className="text-xl text-film-cream/60 italic font-serif">{collection.subtitle}</p>
          )}
          {collection.description && (
            <p className="text-lg text-film-cream/70 mt-6 max-w-3xl leading-relaxed">
              {collection.description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-film-cream/50">收录影片</span>
              <span className="text-film-gold font-semibold">{collection.films?.length || 0} 部</span>
            </div>
            {collection.filter_director && (
              <div className="flex items-center gap-2">
                <span className="text-film-cream/50">导演</span>
                <span className="text-film-cream">{collection.filter_director}</span>
              </div>
            )}
            {collection.filter_country && (
              <div className="flex items-center gap-2">
                <span className="text-film-cream/50">地区</span>
                <span className="text-film-cream">{collection.filter_country}</span>
              </div>
            )}
            {collection.filter_theme && (
              <div className="flex items-center gap-2">
                <span className="text-film-cream/50">主题</span>
                <span className="text-film-cream">{collection.filter_theme}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold">收录影片</h2>
            <p className="text-film-cream/60 mt-2">共 {collection.films?.length || 0} 部</p>
          </div>
          <Link to="/collections" className="text-film-gold hover:underline text-sm">
            ← 返回专题列表
          </Link>
        </div>

        {collection.films && collection.films.length > 0 ? (
          <div className="space-y-6">
            {collection.films.map((film, index) => (
              <div
                key={film.id}
                className="flex flex-col md:flex-row gap-6 p-6 bg-film-dark/50 rounded-2xl border border-film-gray/50 hover:border-film-gold/30 transition-colors"
              >
                <div className="text-4xl font-serif font-bold text-film-gold/50 md:w-16 flex-shrink-0 flex items-start justify-center md:justify-start pt-2">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="flex-shrink-0">
                  <Link to={`/films/${film.id}`} className="block w-32 md:w-40 aspect-[2/3] overflow-hidden rounded-lg bg-film-gray">
                    {film.poster ? (
                      <img
                        src={film.poster}
                        alt={film.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-film-cream/30">
                        🎬
                      </div>
                    )}
                  </Link>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link to={`/films/${film.id}`} className="text-xl md:text-2xl font-serif font-bold text-film-cream hover:text-film-gold transition-colors">
                        {film.title}
                      </Link>
                      {film.original_title && (
                        <p className="text-sm text-film-cream/50 mt-1 italic">{film.original_title}</p>
                      )}
                    </div>
                    {film.rating && (
                      <span className="text-film-gold font-bold text-lg flex-shrink-0">★ {film.rating}</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {film.director && (
                      <span className="bg-film-gray/60 px-2.5 py-1 rounded text-film-cream/80">
                        {film.director}
                      </span>
                    )}
                    {film.year && (
                      <span className="bg-film-gray/60 px-2.5 py-1 rounded text-film-cream/80">
                        {film.year}
                      </span>
                    )}
                    {film.country && (
                      <span className="bg-film-gray/60 px-2.5 py-1 rounded text-film-cream/80">
                        {film.country}
                      </span>
                    )}
                    {film.genre && (
                      <span className="bg-film-gray/60 px-2.5 py-1 rounded text-film-cream/80">
                        {film.genre}
                      </span>
                    )}
                  </div>
                  {film.note && (
                    <p className="mt-4 text-sm text-film-gold/90 border-l-2 border-film-gold/50 pl-4 italic">
                      {film.note}
                    </p>
                  )}
                  {film.synopsis && (
                    <p className="mt-4 text-sm text-film-cream/60 leading-relaxed line-clamp-3">
                      {film.synopsis}
                    </p>
                  )}
                  <div className="mt-4 flex gap-3">
                    <Link
                      to={`/films/${film.id}`}
                      className="text-sm px-4 py-2 bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors"
                    >
                      查看详情
                    </Link>
                    <button
                      onClick={() => handleToggleFavorite(film.id)}
                      className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                        favoriteIds.has(film.id)
                          ? 'bg-film-red/20 border-film-red/50 text-film-red'
                          : 'border-film-gray text-film-cream/70 hover:border-film-gold/50 hover:text-film-gold'
                      }`}
                    >
                      {favoriteIds.has(film.id) ? '♥ 已收藏' : '♡ 收藏'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center border border-dashed border-film-gray rounded-xl">
            <p className="text-film-cream/50">该专题暂未收录影片</p>
          </div>
        )}
      </section>
    </div>
  );
}

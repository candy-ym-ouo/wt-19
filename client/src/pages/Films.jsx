import { useState, useEffect } from 'react';
import { films as filmsApi, favorites as favApi } from '../api.js';
import FilmCard from '../components/FilmCard.jsx';

const sortOptions = [
  { value: '', label: '最新添加' },
  { value: 'rating_desc', label: '评分从高到低' },
  { value: 'year_desc', label: '年份从新到旧' },
  { value: 'year_asc', label: '年份从旧到新' },
  { value: 'title_asc', label: '片名 A-Z' },
];

export default function Films() {
  const [filmList, setFilmList] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [country, setCountry] = useState('');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [ratingMin, setRatingMin] = useState('');
  const [sort, setSort] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      filmsApi.list({ search, genre, country, year_min: yearMin, year_max: yearMax, rating_min: ratingMin, sort }),
      favApi.list(),
    ]).then(([f, favs]) => {
      setFilmList(f);
      setFavoriteIds(new Set(favs.map(x => x.film_id)));
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [search, genre, country, yearMin, yearMax, ratingMin, sort]);

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

  const resetFilters = () => {
    setSearch('');
    setGenre('');
    setCountry('');
    setYearMin('');
    setYearMax('');
    setRatingMin('');
    setSort('');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold">影片库</h1>
        <p className="text-film-cream/60 mt-2">共收录 {filmList.length} 部艺术电影</p>
      </div>

      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-film-cream/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索片名、导演、简介..."
              className="w-full pl-12 pr-4 py-3 bg-film-dark border border-film-gray rounded-lg focus:border-film-gold focus:outline-none transition-colors placeholder:text-film-cream/40"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-3 bg-film-dark border border-film-gray rounded-lg focus:border-film-gold focus:outline-none transition-colors"
          >
            {sortOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-5 py-3 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-film-gold/10 border-film-gold text-film-gold'
                : 'bg-film-dark border-film-gray text-film-cream/70 hover:border-film-gold/50'
            }`}
          >
            高级筛选
          </button>
        </div>

        {showFilters && (
          <div className="p-6 bg-film-dark/80 rounded-xl border border-film-gray/50 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">类型</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="如 剧情"
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">国家/地区</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="如 法国"
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">年份范围</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={yearMin}
                  onChange={(e) => setYearMin(e.target.value)}
                  placeholder="起始"
                  className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none text-sm"
                />
                <input
                  type="number"
                  value={yearMax}
                  onChange={(e) => setYearMax(e.target.value)}
                  placeholder="结束"
                  className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">最低评分</label>
              <select
                value={ratingMin}
                onChange={(e) => setRatingMin(e.target.value)}
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none text-sm"
              >
                <option value="">不限</option>
                <option value="8">★ 8.0 以上</option>
                <option value="8.5">★ 8.5 以上</option>
                <option value="9">★ 9.0 以上</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-4 flex justify-end">
              <button
                onClick={resetFilters}
                className="text-sm text-film-cream/60 hover:text-film-gold transition-colors"
              >
                重置全部筛选
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-film-cream/50">加载中...</div>
      ) : filmList.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-film-cream/40 text-5xl mb-4">🎬</div>
          <p className="text-film-cream/60">没有找到符合条件的影片</p>
          <button onClick={resetFilters} className="mt-4 text-film-gold hover:underline text-sm">
            清除筛选条件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filmList.map(film => (
            <FilmCard
              key={film.id}
              film={film}
              isFavorite={favoriteIds.has(film.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';

export default function FilmCard({ film, showFavorite = true, isFavorite = false, onToggleFavorite }) {
  return (
    <div className="group relative bg-film-dark rounded-xl overflow-hidden border border-film-gray/50 hover:border-film-gold/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-film-gold/10">
      <Link to={`/films/${film.id}`} className="block aspect-[2/3] overflow-hidden bg-film-gray">
        {film.poster ? (
          <img
            src={film.poster}
            alt={film.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-film-cream/30">
            <svg className="w-16 h-16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-film-black via-transparent to-transparent opacity-80" />
        {film.rating && (
          <div className="absolute top-3 right-3 bg-film-gold text-film-black px-2 py-1 rounded-md text-xs font-bold">
            ★ {film.rating}
          </div>
        )}
      </Link>
      {showFavorite && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite && onToggleFavorite(film.id);
          }}
          className={`absolute top-3 left-3 p-2 rounded-full transition-all ${
            isFavorite
              ? 'bg-film-red text-white'
              : 'bg-film-black/60 text-film-cream/70 hover:bg-film-red hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      )}
      <div className="p-4">
        <Link to={`/films/${film.id}`}>
          <h3 className="font-serif font-bold text-film-cream group-hover:text-film-gold transition-colors line-clamp-1">
            {film.title}
          </h3>
          {film.original_title && (
            <p className="text-xs text-film-cream/50 mt-0.5 line-clamp-1 italic">
              {film.original_title}
            </p>
          )}
        </Link>
        <div className="mt-3 flex items-center gap-2 text-xs text-film-cream/60 flex-wrap">
          {film.director && (
            <span className="bg-film-gray/60 px-2 py-0.5 rounded">
              {film.director}
            </span>
          )}
          {film.year && (
            <span className="bg-film-gray/60 px-2 py-0.5 rounded">
              {film.year}
            </span>
          )}
        </div>
        {film.country && (
          <p className="mt-2 text-xs text-film-cream/40">
            {film.country} · {film.genre}
          </p>
        )}
      </div>
    </div>
  );
}

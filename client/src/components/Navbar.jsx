import { NavLink, Link } from 'react-router-dom';

const navItems = [
  { to: '/', label: '首页', end: true },
  { to: '/collections', label: '专题策展' },
  { to: '/films', label: '影片库' },
  { to: '/calendar', label: '放映日历' },
  { to: '/reviews', label: '观后短评' },
  { to: '/favorites', label: '收藏夹' },
  { to: '/admin', label: '后台维护' },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-film-black/90 backdrop-blur-md border-b border-film-gray/50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <svg className="w-8 h-8 text-film-gold group-hover:text-film-gold/80 transition-colors" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
          </svg>
          <div>
            <h1 className="text-xl font-serif font-bold text-film-gold tracking-wider">光影札记</h1>
            <p className="text-[10px] text-film-cream/50 tracking-[0.2em] uppercase">Art Film Notes</p>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-film-gold/10 text-film-gold'
                    : 'text-film-cream/70 hover:text-film-cream hover:bg-film-gray/50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="md:hidden border-t border-film-gray/30">
        <nav className="max-w-7xl mx-auto px-4 py-2 flex overflow-x-auto gap-1 scrollbar-hide">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-film-gold/10 text-film-gold'
                    : 'text-film-cream/70 hover:text-film-cream'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

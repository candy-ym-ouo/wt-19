import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { favorites as favApi } from '../api.js';
import FilmCard from '../components/FilmCard.jsx';

const WATCH_STATUS_CONFIG = {
  want_to_watch: { label: '想看', icon: '👁️', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  ticketed: { label: '已购票', icon: '🎟️', color: 'bg-film-gold/15 text-film-gold border-film-gold/30' },
  watched: { label: '已观看', icon: '✅', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
};

const STATUS_FILTERS = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'want_to_watch', label: '想看', icon: '👁️' },
  { key: 'ticketed', label: '已购票', icon: '🎟️' },
  { key: 'watched', label: '已观看', icon: '✅' },
];

export default function Favorites() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

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

  const handleChangeStatus = async (filmId, newStatus) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const statusData = { watch_status: newStatus };
      if (newStatus === 'ticketed') {
        statusData.ticket_date = today;
      } else if (newStatus === 'watched') {
        statusData.watched_date = today;
      }
      await favApi.updateStatus(filmId, statusData);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const counts = {
    all: list.length,
    want_to_watch: list.filter(x => x.watch_status === 'want_to_watch').length,
    ticketed: list.filter(x => x.watch_status === 'ticketed').length,
    watched: list.filter(x => x.watch_status === 'watched').length,
  };

  const filteredList = activeFilter === 'all'
    ? list
    : list.filter(x => x.watch_status === activeFilter);

  const groupedByStatus = activeFilter === 'all' && list.length > 0 ? {
    want_to_watch: list.filter(x => x.watch_status === 'want_to_watch' || !x.watch_status),
    ticketed: list.filter(x => x.watch_status === 'ticketed'),
    watched: list.filter(x => x.watch_status === 'watched'),
  } : null;

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold flex items-center gap-3">
          <svg className="w-9 h-9 text-film-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          我的观影计划
        </h1>
        <p className="text-film-cream/60 mt-2">共 {list.length} 部影片 · 想看 {counts.want_to_watch} · 已购票 {counts.ticketed} · 已观看 {counts.watched}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {STATUS_FILTERS.map(filter => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2 ${
              activeFilter === filter.key
                ? 'bg-film-gold text-film-black'
                : 'bg-film-dark border border-film-gray/50 text-film-cream/70 hover:border-film-gold/50 hover:text-film-cream'
            }`}
          >
            <span>{filter.icon}</span>
            <span>{filter.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${activeFilter === filter.key ? 'bg-film-black/20' : 'bg-film-gray/50'}`}>
              {counts[filter.key]}
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-film-gray rounded-xl">
          <div className="text-6xl mb-6">🎬</div>
          <p className="text-xl text-film-cream/70 font-serif mb-3">观影计划空空如也</p>
          <p className="text-film-cream/50 mb-6">去影片库发现好片，规划你的观影旅程吧</p>
          <Link
            to="/films"
            className="inline-block px-8 py-3 bg-film-gold text-film-black font-semibold rounded-lg hover:bg-film-gold/90 transition-colors"
          >
            浏览影片库
          </Link>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-film-gray rounded-xl">
          <p className="text-film-cream/50">「{STATUS_FILTERS.find(f => f.key === activeFilter)?.label}」状态下暂无影片</p>
        </div>
      ) : groupedByStatus ? (
        <div className="space-y-10">
          {Object.entries(groupedByStatus).map(([status, items]) => items.length > 0 && (
            <section key={status}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{WATCH_STATUS_CONFIG[status]?.icon}</span>
                <h2 className="text-xl font-serif font-bold">
                  {WATCH_STATUS_CONFIG[status]?.label}
                </h2>
                <span className="text-sm text-film-cream/40">{items.length} 部</span>
                <div className="flex-1 h-px bg-film-gray/50" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {items.map(item => (
                  <WatchPlanItem
                    key={item.id}
                    item={item}
                    onToggleFavorite={handleToggleFavorite}
                    onChangeStatus={handleChangeStatus}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredList.map(item => (
            <WatchPlanItem
              key={item.id}
              item={item}
              onToggleFavorite={handleToggleFavorite}
              onChangeStatus={handleChangeStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchPlanItem({ item, onToggleFavorite, onChangeStatus }) {
  const [showMenu, setShowMenu] = useState(false);
  const status = item.watch_status || 'want_to_watch';
  const statusCfg = WATCH_STATUS_CONFIG[status] || WATCH_STATUS_CONFIG.want_to_watch;

  const nextStatus = {
    want_to_watch: 'ticketed',
    ticketed: 'watched',
    watched: null,
  };

  return (
    <div className="relative group">
      <div className="relative">
        <FilmCard
          film={item}
          isFavorite={true}
          onToggleFavorite={onToggleFavorite}
        />
        <div className="absolute bottom-[72px] left-3 right-3 flex justify-between items-center gap-1 z-10">
          <div className="flex gap-1">
            <span className={`${statusCfg.color} backdrop-blur-sm px-2 py-0.5 rounded text-[10px] flex items-center gap-0.5 border`}>
              <span>{statusCfg.icon}</span>
              <span>{statusCfg.label}</span>
            </span>
          </div>
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 bg-film-black/60 backdrop-blur-sm rounded text-film-cream/70 hover:text-film-cream hover:bg-film-black/80 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-40 bg-film-dark border border-film-gray rounded-xl shadow-2xl overflow-hidden z-30">
                {Object.entries(WATCH_STATUS_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChangeStatus(item.film_id, key);
                      setShowMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-film-gray/50 flex items-center gap-2 transition-colors border-b border-film-gray/30 last:border-b-0 ${status === key ? 'text-film-gold bg-film-gold/10' : ''}`}
                  >
                    <span>{cfg.icon}</span>
                    <span className="flex-1">标记为{cfg.label}</span>
                    {status === key && <span>✓</span>}
                  </button>
                ))}
                {nextStatus[status] && (
                  <div className="border-t border-film-gray/30">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChangeStatus(item.film_id, nextStatus[status]);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-film-gold/10 text-film-gold flex items-center gap-2 transition-colors"
                    >
                      <span>⏩</span>
                      <span className="flex-1">推进到{WATCH_STATUS_CONFIG[nextStatus[status]]?.label}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="px-1 -mt-1">
        {(item.ticket_date || item.watched_date || item.plan_date) && (
          <div className="flex flex-wrap gap-2 text-[10px] text-film-cream/40 mt-1">
            {item.ticket_date && <span>🎟️ {item.ticket_date}</span>}
            {item.watched_date && <span>✅ {item.watched_date}</span>}
            {item.plan_date && <span>📅 {item.plan_date}</span>}
          </div>
        )}
        {(item.ticket_reminder_enabled || item.schedule_change_reminder_enabled) && (
          <div className="flex gap-1 mt-1">
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
        )}
      </div>
    </div>
  );
}

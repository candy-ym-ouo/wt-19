import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { screenings as screeningsApi, films as filmsApi, venues as venuesApi } from '../api.js';

export default function Calendar() {
  const [data, setData] = useState([]);
  const [allFilms, setAllFilms] = useState([]);
  const [venueList, setVenueList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [addConflictError, setAddConflictError] = useState(null);
  const [addForm, setAddForm] = useState({
    film_id: '', venue_id: '', screening_date: '', screening_time: '', venue: '', location: '', notes: '',
    ticket_status: 'not_open', ticket_open_date: '', is_changed: 0, change_description: ''
  });

  const fetchData = () => {
    setLoading(true);
    Promise.all([screeningsApi.list(), filmsApi.list(), venuesApi.list({ active_only: 1 })]).then(([s, f, v]) => {
      setData(s);
      setAllFilms(f);
      setVenueList(v);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, items: data.filter(x => x.screening_date === dateStr) });
    }
    return cells;
  }, [currentDate, data]);

  const groupedByDate = useMemo(() => {
    const groups = {};
    data.forEach(s => {
      if (!groups[s.screening_date]) groups[s.screening_date] = [];
      groups[s.screening_date].push(s);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddConflictError(null);
    if (!addForm.film_id || !addForm.screening_date || !addForm.screening_time) {
      alert('请选择影片、日期和时间');
      return;
    }
    try {
      await screeningsApi.create({
        ...addForm,
        venue_id: addForm.venue_id || null,
        is_changed: addForm.is_changed ? 1 : 0
      });
      setShowAdd(false);
      setAddConflictError(null);
      setAddForm({
        film_id: '', venue_id: '', screening_date: '', screening_time: '', venue: '', location: '', notes: '',
        ticket_status: 'not_open', ticket_open_date: '', is_changed: 0, change_description: ''
      });
      fetchData();
    } catch (err) {
      if (err.status === 409 && err.data && err.data.conflicts) {
        setAddConflictError({ message: err.message, conflicts: err.data.conflicts });
      } else {
        alert(err.message);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此放映场次？')) return;
    try {
      await screeningsApi.delete(id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-film-cream/50">加载中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold">放映日历</h1>
          <p className="text-film-cream/60 mt-2">共 {data.length} 场放映安排</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-film-dark rounded-lg p-1 border border-film-gray">
            {[
              { v: 'month', label: '月视图' },
              { v: 'list', label: '列表' },
            ].map(t => (
              <button
                key={t.v}
                onClick={() => setView(t.v)}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  view === t.v ? 'bg-film-gold text-film-black font-medium' : 'text-film-cream/60 hover:text-film-cream'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-5 py-2 bg-film-gold text-film-black font-medium rounded-lg hover:bg-film-gold/90 transition-colors"
          >
            + 添加放映
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="mb-8 p-6 bg-film-dark rounded-xl border border-film-gray/50">
          <h3 className="text-lg font-semibold mb-5">添加放映场次</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            {addConflictError && (
              <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-lg mt-0.5">⚠️</span>
                  <div className="flex-1">
                    <p className="text-red-400 font-medium mb-2">排期时间冲突</p>
                    <p className="text-sm text-film-cream/80 mb-3">{addConflictError.message}</p>
                    <div className="space-y-1.5">
                      {addConflictError.conflicts.map((c, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2 text-xs text-film-cream/70 bg-film-black/40 rounded-lg px-3 py-2">
                          <span className="font-semibold text-red-300">🎬《{c.title}》</span>
                          <span className="text-film-cream/50">|</span>
                          <span>🏛 {c.venue_name}{c.venue_location ? ` · ${c.venue_location}` : ''}</span>
                          <span className="text-film-cream/50">|</span>
                          <span>🕒 {c.start_time} - {c.end_time}</span>
                          {c.duration > 0 && <span className="text-film-cream/50">（{c.duration} 分钟）</span>}
                          <span className="text-film-cream/50">|</span>
                          <span className="text-red-300 font-medium">重叠 {c.overlap_start} - {c.overlap_end}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs text-film-cream/60 mb-1.5 block">选择影片 *</label>
              <select
                value={addForm.film_id}
                onChange={(e) => setAddForm({ ...addForm, film_id: e.target.value })}
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
              >
                <option value="">请选择影片</option>
                {allFilms.map(f => (
                  <option key={f.id} value={f.id}>{f.title} ({f.year})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">放映日期 *</label>
              <input
                type="date"
                value={addForm.screening_date}
                onChange={(e) => setAddForm({ ...addForm, screening_date: e.target.value })}
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">放映时间 *</label>
              <input
                type="time"
                value={addForm.screening_time}
                onChange={(e) => setAddForm({ ...addForm, screening_time: e.target.value })}
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">影院/场馆</label>
              <select
                value={addForm.venue_id}
                onChange={(e) => setAddForm({ ...addForm, venue_id: e.target.value })}
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
              >
                <option value="">请选择场馆</option>
                {venueList.map(v => (
                  <option key={v.id} value={v.id}>{v.name}{v.location ? ` · ${v.location}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">地点</label>
              <input
                type="text"
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                placeholder="如 北京·小西天"
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">备注</label>
              <input
                type="text"
                value={addForm.notes}
                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                placeholder="如 4K修复版、导演映后谈等"
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">开票状态</label>
              <select
                value={addForm.ticket_status}
                onChange={(e) => setAddForm({ ...addForm, ticket_status: e.target.value })}
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
              >
                <option value="not_open">尚未开票</option>
                <option value="on_sale">正在售票</option>
                <option value="sold_out">已售罄</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-film-cream/60 mb-1.5 block">预计开票日期</label>
              <input
                type="date"
                value={addForm.ticket_open_date}
                onChange={(e) => setAddForm({ ...addForm, ticket_open_date: e.target.value })}
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!addForm.is_changed}
                  onChange={(e) => setAddForm({ ...addForm, is_changed: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 rounded border-film-gray bg-film-black text-film-gold focus:ring-film-gold"
                />
                <span className="text-sm text-film-cream/80">标记为场次变更</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-film-cream/60 mb-1.5 block">变更说明</label>
              <input
                type="text"
                value={addForm.change_description}
                onChange={(e) => setAddForm({ ...addForm, change_description: e.target.value })}
                placeholder="如 时间由15:00调整为14:00"
                disabled={!addForm.is_changed}
                className="w-full px-3 py-2 bg-film-black border border-film-gray rounded-lg focus:border-film-gold focus:outline-none disabled:opacity-50"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-5 py-2 rounded-lg text-film-cream/60 hover:text-film-cream transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-film-gold text-film-black font-medium hover:bg-film-gold/90 transition-colors"
              >
                添加
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'month' ? (
        <div className="bg-film-dark/50 rounded-xl border border-film-gray/50 p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-film-gray rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl md:text-2xl font-serif font-bold">
              {currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-film-gray rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs text-film-cream/40 py-2 font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarData.map((cell, i) => (
              <div
                key={i}
                className={`min-h-[90px] md:min-h-[120px] rounded-lg p-1.5 md:p-2 ${
                  cell ? 'bg-film-black/40 hover:bg-film-black/60 transition-colors border border-film-gray/30' : ''
                }`}
              >
                {cell && (
                  <>
                    <div className={`text-xs font-medium mb-1 ${
                      new Date(cell.dateStr).toDateString() === new Date().toDateString()
                        ? 'text-film-gold'
                        : 'text-film-cream/60'
                    }`}>
                      {cell.day}
                    </div>
                    <div className="space-y-1">
                      {cell.items.slice(0, 2).map(s => {
                        let bgClass = 'bg-film-gold/15 text-film-gold';
                        if (s.ticket_status === 'on_sale') bgClass = 'bg-green-500/15 text-green-400';
                        if (s.ticket_status === 'sold_out') bgClass = 'bg-red-500/15 text-red-400';
                        return (
                          <Link
                            key={s.id}
                            to={`/films/${s.film_id}`}
                            className={`block text-[10px] md:text-xs px-1.5 py-0.5 rounded truncate hover:opacity-80 transition-opacity ${bgClass} ${s.is_changed ? 'ring-1 ring-orange-400/50' : ''}`}
                            title={`${s.screening_time} ${s.title}${s.is_changed ? ' · 场次变更' : ''}`}
                          >
                            <span className="font-mono">{s.screening_time}</span> {s.title}
                            {s.is_changed && <span className="ml-0.5">⚠</span>}
                          </Link>
                        );
                      })}
                      {cell.items.length > 2 && (
                        <div className="text-[10px] text-film-cream/40">+{cell.items.length - 2} 场</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDate.length === 0 ? (
            <div className="py-16 text-center text-film-cream/50 border border-dashed border-film-gray rounded-xl">
              暂无放映安排
            </div>
          ) : groupedByDate.map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-serif font-bold text-film-gold">
                    {new Date(date).getDate()}
                  </span>
                  <span className="text-sm text-film-cream/60">
                    {new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', weekday: 'long' })}
                  </span>
                </div>
                <div className="flex-1 h-px bg-film-gray/50" />
              </div>
              <div className="space-y-2 ml-2">
                {items.map(s => (
                  <div key={s.id} className="group p-4 bg-film-dark/60 rounded-xl border border-film-gray/50 hover:border-film-gold/40 transition-colors">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-xl font-mono text-film-gold font-bold min-w-[60px]">{s.screening_time}</div>
                      <div className="w-10 h-14 bg-film-gray rounded overflow-hidden flex-shrink-0">
                        {s.poster && <img src={s.poster} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/films/${s.film_id}`} className="font-serif font-semibold text-film-cream group-hover:text-film-gold transition-colors">
                          {s.title}
                        </Link>
                        <div className="text-sm text-film-cream/50 mt-0.5 flex flex-wrap gap-2">
                          {s.venue && <span>🏛 {s.venue}</span>}
                          {s.location && <span>📍 {s.location}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {s.ticket_status === 'on_sale' && (
                          <span className="bg-green-500/15 text-green-400 px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> 正在售票
                          </span>
                        )}
                        {s.ticket_status === 'not_open' && (
                          <span className="bg-film-gray/50 text-film-cream/60 px-2.5 py-0.5 rounded-full text-xs">
                            {s.ticket_open_date ? `${s.ticket_open_date} 开票` : '尚未开票'}
                          </span>
                        )}
                        {s.ticket_status === 'sold_out' && (
                          <span className="bg-red-500/15 text-red-400 px-2.5 py-0.5 rounded-full text-xs">已售罄</span>
                        )}
                        {s.is_changed && (
                          <span className="bg-orange-500/15 text-orange-400 px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1" title={s.change_description}>
                            ⚠ 场次变更
                          </span>
                        )}
                        {s.notes && (
                          <span className="text-xs bg-film-gold/10 text-film-gold px-3 py-1 rounded-full">{s.notes}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-2 text-film-cream/30 hover:text-film-red hover:bg-film-red/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="删除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    {s.is_changed && s.change_description && (
                      <div className="mt-2 ml-[84px] text-xs text-orange-400/80 bg-orange-500/5 rounded px-2 py-1">
                        ℹ {s.change_description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

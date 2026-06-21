const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = Number(process.env.PORT || 5001);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

const FILM_CSV_HEADERS = ['title', 'original_title', 'director', 'year', 'country', 'genre', 'duration', 'language', 'synopsis', 'poster', 'rating'];
const SCREENING_CSV_HEADERS = ['film_title', 'screening_date', 'screening_time', 'venue_name', 'location', 'notes', 'ticket_status', 'ticket_open_date', 'is_changed', 'change_description'];

const VALID_TICKET_STATUSES = ['not_open', 'on_sale', 'sold_out'];

// ============ 影片相关 API ============

app.get('/api/films', (req, res) => {
  const { search, genre, country, year_min, year_max, rating_min, sort, venue_id, has_screening } = req.query;
  let sql = 'SELECT DISTINCT f.* FROM films f WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (f.title LIKE ? OR f.original_title LIKE ? OR f.director LIKE ? OR f.synopsis LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  if (genre) {
    sql += ' AND f.genre LIKE ?';
    params.push(`%${genre}%`);
  }
  if (country) {
    sql += ' AND f.country LIKE ?';
    params.push(`%${country}%`);
  }
  if (year_min) {
    sql += ' AND f.year >= ?';
    params.push(year_min);
  }
  if (year_max) {
    sql += ' AND f.year <= ?';
    params.push(year_max);
  }
  if (rating_min) {
    sql += ' AND f.rating >= ?';
    params.push(rating_min);
  }
  if (venue_id || has_screening) {
    sql += ' AND EXISTS (SELECT 1 FROM screenings s WHERE s.film_id = f.id';
    if (venue_id) {
      sql += ' AND s.venue_id = ?';
      params.push(venue_id);
    }
    sql += ')';
  }

  if (sort === 'year_desc') sql += ' ORDER BY f.year DESC';
  else if (sort === 'year_asc') sql += ' ORDER BY f.year ASC';
  else if (sort === 'rating_desc') sql += ' ORDER BY f.rating DESC';
  else if (sort === 'title_asc') sql += ' ORDER BY f.title ASC';
  else sql += ' ORDER BY f.created_at DESC';

  const films = db.prepare(sql).all(...params);
  res.json(films);
});

app.get('/api/films/template', (req, res) => {
  const headerLine = FILM_CSV_HEADERS.join(',');
  const exampleLine = ['花样年华', 'In the Mood for Love', '王家卫', '2000', '中国香港', '剧情/爱情', '98', '粤语', '1962年的香港故事', '', '8.7'].map(csvEscape).join(',');
  const csv = '\uFEFF' + headerLine + '\n' + exampleLine + '\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=films_template.csv');
  res.send(csv);
});

app.get('/api/films/export', (req, res) => {
  const films = db.prepare('SELECT * FROM films ORDER BY created_at DESC').all();
  const headerLine = FILM_CSV_HEADERS.join(',');
  const rows = films.map(f =>
    FILM_CSV_HEADERS.map(h => csvEscape(f[h])).join(',')
  );
  const csv = '\uFEFF' + headerLine + '\n' + rows.join('\n') + '\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=films_export.csv');
  res.send(csv);
});

app.post('/api/films/import', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传CSV文件' });
  }

  let text;
  try {
    text = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
  } catch (e) {
    return res.status(400).json({ error: '文件编码错误，请使用UTF-8编码' });
  }

  const { headers, rows } = parseCsv(text);
  if (headers.length === 0 || rows.length === 0) {
    return res.status(400).json({ error: 'CSV文件为空或格式不正确' });
  }

  const missingHeaders = ['title'].filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return res.status(400).json({
      error: `模板校验失败：缺少必填列 [${missingHeaders.join(', ')}]`,
      required_headers: FILM_CSV_HEADERS,
      actual_headers: headers
    });
  }

  const errors = [];
  const success = [];
  const skipped = [];
  const validRecords = [];
  const insertFilm = db.prepare(`
    INSERT INTO films (title, original_title, director, year, country, genre, duration, language, synopsis, poster, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const findDuplicate = db.prepare(`
    SELECT id FROM films WHERE title = ? AND (director = ? OR (? IS NULL AND director IS NULL)) AND (year = ? OR (? IS NULL AND year IS NULL))
  `);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.title || !row.title.trim()) {
      errors.push({ row: rowNum, data: row, message: '影片标题不能为空' });
      continue;
    }

    const title = row.title.trim();
    const director = row.director ? row.director.trim() : null;
    const year = row.year ? parseInt(row.year) : null;
    const originalTitle = row.original_title ? row.original_title.trim() : null;
    const country = row.country ? row.country.trim() : null;
    const genre = row.genre ? row.genre.trim() : null;
    const duration = row.duration ? parseInt(row.duration) : null;
    const language = row.language ? row.language.trim() : null;
    const synopsis = row.synopsis ? row.synopsis.trim() : null;
    const poster = row.poster ? row.poster.trim() : null;
    const rating = row.rating ? parseFloat(row.rating) : null;

    if (row.year && isNaN(parseInt(row.year))) {
      errors.push({ row: rowNum, data: row, message: '年份格式不正确' });
      continue;
    }
    if (row.duration && isNaN(parseInt(row.duration))) {
      errors.push({ row: rowNum, data: row, message: '时长格式不正确，应为整数分钟' });
      continue;
    }
    if (row.rating && (isNaN(parseFloat(row.rating)) || parseFloat(row.rating) < 0 || parseFloat(row.rating) > 10)) {
      errors.push({ row: rowNum, data: row, message: '评分格式不正确，应为0-10的数字' });
      continue;
    }

    const existing = findDuplicate.get(title, director, director, year, year);
    if (existing) {
      skipped.push({ row: rowNum, data: row, message: `影片「${title}」已存在（导演：${director || '未知'}，年份：${year || '未知'}）`, existing_id: existing.id });
      continue;
    }

    validRecords.push({ rowNum, title, originalTitle, director, year, country, genre, duration, language, synopsis, poster, rating });
  }

  if (errors.length > 0) {
    return res.status(422).json({
      error: `批量校验未通过，共 ${errors.length} 条错误。所有数据均未写入，请修正后重新导入`,
      total: rows.length,
      success_count: 0,
      skipped_count: skipped.length,
      error_count: errors.length,
      success: [],
      skipped,
      errors
    });
  }

  const transaction = db.transaction((records) => {
    for (const r of records) {
      try {
        const info = insertFilm.run(r.title, r.originalTitle, r.director, r.year, r.country, r.genre, r.duration, r.language, r.synopsis, r.poster, r.rating);
        success.push({ row: r.rowNum, id: info.lastInsertRowid, title: r.title });
      } catch (err) {
        throw new Error(`第${r.rowNum}行写入失败：${err.message}`);
      }
    }
  });

  try {
    transaction(validRecords);
  } catch (err) {
    return res.status(500).json({ error: '事务写入失败，所有数据已回滚', detail: err.message });
  }

  res.json({
    total: rows.length,
    success_count: success.length,
    skipped_count: skipped.length,
    error_count: errors.length,
    success,
    skipped,
    errors
  });
});

app.get('/api/films/:id', (req, res) => {
  const film = db.prepare('SELECT * FROM films WHERE id = ?').get(req.params.id);
  if (!film) {
    return res.status(404).json({ error: '影片不存在' });
  }

  const { sort = 'created_at_desc' } = req.query;
  let orderSql = 'ORDER BY created_at DESC';
  if (sort === 'likes_desc') orderSql = 'ORDER BY likes DESC, created_at DESC';
  else if (sort === 'likes_asc') orderSql = 'ORDER BY likes ASC, created_at DESC';
  else if (sort === 'rating_desc') orderSql = 'ORDER BY rating DESC, created_at DESC';
  else if (sort === 'created_at_asc') orderSql = 'ORDER BY created_at ASC';

  const reviews = db.prepare(`SELECT * FROM reviews WHERE film_id = ? AND is_hidden = 0 ${orderSql}`).all(req.params.id);
  const screenings = db.prepare('SELECT * FROM screenings WHERE film_id = ? ORDER BY screening_date, screening_time').all(req.params.id);
  const favorite = db.prepare('SELECT * FROM favorites WHERE film_id = ?').get(req.params.id);

  res.json({
    ...film,
    reviews,
    screenings,
    isFavorite: !!favorite,
    ticketReminderEnabled: favorite ? !!favorite.ticket_reminder_enabled : false,
    scheduleChangeReminderEnabled: favorite ? !!favorite.schedule_change_reminder_enabled : false,
    watchStatus: favorite ? favorite.watch_status : null,
    ticketDate: favorite ? favorite.ticket_date : null,
    watchedDate: favorite ? favorite.watched_date : null,
    planDate: favorite ? favorite.plan_date : null
  });
});

app.post('/api/films', (req, res) => {
  const { title, original_title, director, year, country, genre, duration, language, synopsis, poster, rating } = req.body;
  if (!title) {
    return res.status(400).json({ error: '影片标题不能为空' });
  }

  const info = db.prepare(`
    INSERT INTO films (title, original_title, director, year, country, genre, duration, language, synopsis, poster, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, original_title || null, director || null, year || null, country || null, genre || null, duration || null, language || null, synopsis || null, poster || null, rating || null);

  const film = db.prepare('SELECT * FROM films WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(film);
});

app.put('/api/films/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM films WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '影片不存在' });
  }

  const { title, original_title, director, year, country, genre, duration, language, synopsis, poster, rating } = req.body;

  db.prepare(`
    UPDATE films SET title = ?, original_title = ?, director = ?, year = ?, country = ?, genre = ?, duration = ?, language = ?, synopsis = ?, poster = ?, rating = ?
    WHERE id = ?
  `).run(
    title || existing.title,
    original_title !== undefined ? original_title : existing.original_title,
    director !== undefined ? director : existing.director,
    year !== undefined ? year : existing.year,
    country !== undefined ? country : existing.country,
    genre !== undefined ? genre : existing.genre,
    duration !== undefined ? duration : existing.duration,
    language !== undefined ? language : existing.language,
    synopsis !== undefined ? synopsis : existing.synopsis,
    poster !== undefined ? poster : existing.poster,
    rating !== undefined ? rating : existing.rating,
    req.params.id
  );

  const film = db.prepare('SELECT * FROM films WHERE id = ?').get(req.params.id);
  res.json(film);
});

app.delete('/api/films/:id', (req, res) => {
  const info = db.prepare('DELETE FROM films WHERE id = ?').run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '影片不存在' });
  }
  res.json({ message: '删除成功' });
});

app.get('/api/films/:id/similar', (req, res) => {
  const film = db.prepare('SELECT * FROM films WHERE id = ?').get(req.params.id);
  if (!film) {
    return res.status(404).json({ error: '影片不存在' });
  }

  const { limit = 6 } = req.query;
  const limitNum = Math.min(Math.max(Number(limit) || 6, 1), 20);

  const allFilms = db.prepare('SELECT * FROM films WHERE id != ?').all(req.params.id);

  const filmGenres = (film.genre || '').split(/[\/、,，]/).map(g => g.trim()).filter(Boolean);
  const filmCountries = (film.country || '').split(/[\/、,，]/).map(c => c.trim()).filter(Boolean);

  const scored = allFilms.map(other => {
    let score = 0;
    const reasons = [];

    if (film.director && other.director && film.director === other.director) {
      score += 40;
      reasons.push('同导演');
    }

    if (filmCountries.length > 0 && other.country) {
      const otherCountries = other.country.split(/[\/、,，]/).map(c => c.trim()).filter(Boolean);
      const shared = filmCountries.filter(c => otherCountries.includes(c));
      if (shared.length > 0) {
        score += 20 * shared.length;
        reasons.push(`同国家/地区（${shared.join('、')}）`);
      }
    }

    if (filmGenres.length > 0 && other.genre) {
      const otherGenres = other.genre.split(/[\/、,，]/).map(g => g.trim()).filter(Boolean);
      const shared = filmGenres.filter(g => otherGenres.includes(g));
      if (shared.length > 0) {
        score += 25 * shared.length;
        reasons.push(`同类型（${shared.join('、')}）`);
      }
    }

    if (film.rating && other.rating) {
      const ratingDiff = Math.abs(film.rating - other.rating);
      if (ratingDiff <= 0.5) {
        score += 15;
        reasons.push('评分相近');
      } else if (ratingDiff <= 1.0) {
        score += 8;
      }
    }

    if (film.year && other.year) {
      const yearDiff = Math.abs(film.year - other.year);
      if (yearDiff <= 5) {
        score += 5;
      }
    }

    return { ...other, similarity_score: score, match_reasons: reasons };
  });

  scored.sort((a, b) => b.similarity_score - a.similarity_score);

  const result = scored
    .filter(f => f.similarity_score > 0)
    .slice(0, limitNum);

  res.json(result);
});

// ============ 放映日历 API ============

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(mins) {
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function findOverlapConflicts(db, venueId, date, startTime, durationMinutes, excludeScreeningId = null) {
  if (!venueId || !date || !startTime) return [];
  const duration = Number(durationMinutes) || 0;
  const startMin = timeToMinutes(startTime);
  const endMin = startMin + duration;

  let sql = `
    SELECT s.*, f.title, f.duration as film_duration, v.name as venue_name, v.location as venue_location
    FROM screenings s
    LEFT JOIN films f ON s.film_id = f.id
    LEFT JOIN venues v ON s.venue_id = v.id
    WHERE s.venue_id = ? AND s.screening_date = ?
  `;
  const params = [venueId, date];
  if (excludeScreeningId) {
    sql += ' AND s.id != ?';
    params.push(excludeScreeningId);
  }
  const rows = db.prepare(sql).all(...params);

  const conflicts = [];
  rows.forEach(r => {
    const rDuration = Number(r.film_duration) || 0;
    const rStartMin = timeToMinutes(r.screening_time);
    const rEndMin = rStartMin + rDuration;
    if (startMin < rEndMin && endMin > rStartMin) {
      conflicts.push({
        id: r.id,
        film_id: r.film_id,
        title: r.title,
        venue_id: r.venue_id,
        venue_name: r.venue_name,
        venue_location: r.venue_location,
        screening_date: r.screening_date,
        start_time: r.screening_time,
        end_time: minutesToTime(rEndMin),
        duration: rDuration,
        overlap_start: minutesToTime(Math.max(startMin, rStartMin)),
        overlap_end: minutesToTime(Math.min(endMin, rEndMin))
      });
    }
  });
  return conflicts;
}

// ============ 场馆 API ============

app.get('/api/venues', (req, res) => {
  const { active_only, search } = req.query;
  let sql = 'SELECT * FROM venues WHERE 1=1';
  const params = [];
  if (active_only) {
    sql += ' AND is_active = 1';
  }
  if (search) {
    sql += ' AND (name LIKE ? OR location LIKE ? OR notes LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  sql += ' ORDER BY name ASC';
  const venues = db.prepare(sql).all(...params);
  res.json(venues);
});

app.get('/api/venues/:id', (req, res) => {
  const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id);
  if (!venue) {
    return res.status(404).json({ error: '场馆不存在' });
  }
  const screenings = db.prepare(`
    SELECT s.*, f.title, f.poster
    FROM screenings s LEFT JOIN films f ON s.film_id = f.id
    WHERE s.venue_id = ?
    ORDER BY s.screening_date, s.screening_time
  `).all(req.params.id);
  res.json({ ...venue, screenings });
});

app.post('/api/venues', (req, res) => {
  const { name, location, capacity, notes, is_active = 1 } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '场馆名称不能为空' });
  }
  try {
    const info = db.prepare(`
      INSERT INTO venues (name, location, capacity, notes, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      location || null,
      capacity ? parseInt(capacity) : null,
      notes || null,
      is_active ? 1 : 0
    );
    const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(venue);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '该场馆（同名同地址）已存在' });
    }
    throw err;
  }
});

app.put('/api/venues/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '场馆不存在' });
  }
  const { name, location, capacity, notes, is_active } = req.body;
  try {
    db.prepare(`
      UPDATE venues SET
        name = ?, location = ?, capacity = ?, notes = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : existing.name,
      location !== undefined ? location : existing.location,
      capacity !== undefined ? (capacity ? parseInt(capacity) : null) : existing.capacity,
      notes !== undefined ? notes : existing.notes,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      req.params.id
    );
    const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id);
    res.json(venue);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '该场馆（同名同地址）已存在' });
    }
    throw err;
  }
});

app.delete('/api/venues/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '场馆不存在' });
  }
  const screeningCount = db.prepare('SELECT COUNT(*) as count FROM screenings WHERE venue_id = ?').get(req.params.id).count;
  if (screeningCount > 0) {
    return res.status(400).json({ error: `该场馆下还有 ${screeningCount} 场放映，请先处理放映场次` });
  }
  db.prepare('DELETE FROM venues WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

app.get('/api/screenings', (req, res) => {
  const { date_from, date_to, venue_id, search, ticket_status, film_id } = req.query;
  let sql = `
    SELECT s.*, f.title, f.director, f.year, f.poster, f.genre, v.name as venue_name, v.location as venue_location, v.capacity as venue_capacity
    FROM screenings s
    LEFT JOIN films f ON s.film_id = f.id
    LEFT JOIN venues v ON s.venue_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (date_from) {
    sql += ' AND s.screening_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    sql += ' AND s.screening_date <= ?';
    params.push(date_to);
  }
  if (venue_id) {
    sql += ' AND s.venue_id = ?';
    params.push(venue_id);
  }
  if (film_id) {
    sql += ' AND s.film_id = ?';
    params.push(film_id);
  }
  if (ticket_status) {
    sql += ' AND s.ticket_status = ?';
    params.push(ticket_status);
  }
  if (search) {
    sql += ' AND (f.title LIKE ? OR f.original_title LIKE ? OR f.director LIKE ? OR v.name LIKE ? OR v.location LIKE ? OR s.venue LIKE ? OR s.location LIKE ? OR s.notes LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  sql += ' ORDER BY s.screening_date, s.screening_time';

  const screenings = db.prepare(sql).all(...params);
  res.json(screenings);
});

app.post('/api/screenings', (req, res) => {
  const { film_id, venue_id, screening_date, screening_time, venue, location, notes, ticket_status, ticket_open_date, is_changed, change_description } = req.body;
  if (!film_id || !screening_date || !screening_time) {
    return res.status(400).json({ error: '影片、日期和时间不能为空' });
  }

  let filmDuration = 0;
  const film = db.prepare('SELECT duration, title FROM films WHERE id = ?').get(film_id);
  if (!film) {
    return res.status(400).json({ error: '所选影片不存在' });
  }
  filmDuration = Number(film.duration) || 0;

  let venueInfo = null;
  if (venue_id) {
    venueInfo = db.prepare('SELECT id, name, location FROM venues WHERE id = ?').get(venue_id);
    if (!venueInfo) {
      return res.status(400).json({ error: '所选场馆不存在' });
    }
    const conflicts = findOverlapConflicts(db, venue_id, screening_date, screening_time, filmDuration);
    if (conflicts.length > 0) {
      const first = conflicts[0];
      const details = conflicts.map(c =>
        `《${c.title}》(${c.start_time}-${c.end_time}`).join('、');
      return res.status(409).json({
        error: `排期冲突：场馆「${venueInfo.name}${venueInfo.location ? ' · ' + venueInfo.location : ''}」在 ${screening_date} 存在时间重叠场次：${details}。重叠时段 ${first.overlap_start}-${first.overlap_end}`,
        conflicts
      });
    }
  }

  let finalVenue = venue;
  let finalLocation = location;
  if (venue_id) {
    const v = db.prepare('SELECT name, location FROM venues WHERE id = ?').get(venue_id);
    if (v) {
      finalVenue = v.name;
      finalLocation = v.location || location;
    }
  }

  const info = db.prepare(`
    INSERT INTO screenings (film_id, venue_id, screening_date, screening_time, venue, location, notes, ticket_status, ticket_open_date, is_changed, change_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(film_id, venue_id || null, screening_date, screening_time, finalVenue || null, finalLocation || null, notes || null, ticket_status || 'not_open', ticket_open_date || null, is_changed || 0, change_description || null);

  const screening = db.prepare(`
    SELECT s.*, f.title, f.director, f.year, f.poster, v.name as venue_name, v.location as venue_location
    FROM screenings s LEFT JOIN films f ON s.film_id = f.id
    LEFT JOIN venues v ON s.venue_id = v.id
    WHERE s.id = ?
  `).get(info.lastInsertRowid);

  if (is_changed) {
    const favsWithReminder = db.prepare('SELECT film_id FROM favorites WHERE film_id = ? AND schedule_change_reminder_enabled = 1').all(film_id);
    const insertNotif = db.prepare('INSERT INTO notifications (film_id, screening_id, type, title, content) VALUES (?, ?, ?, ?, ?)');
    favsWithReminder.forEach(f => {
      insertNotif.run(film_id, info.lastInsertRowid, 'schedule_change', `《${screening.title}》放映变更`, change_description || '放映信息有变更，请留意');
    });
  }
  if (ticket_status === 'on_sale') {
    const favsWithReminder = db.prepare('SELECT film_id FROM favorites WHERE film_id = ? AND ticket_reminder_enabled = 1').all(film_id);
    const insertNotif = db.prepare('INSERT INTO notifications (film_id, screening_id, type, title, content) VALUES (?, ?, ?, ?, ?)');
    favsWithReminder.forEach(f => {
      insertNotif.run(film_id, info.lastInsertRowid, 'ticket_on_sale', `《${screening.title}》已开票`, `${screening_date} ${screening_time} 场次现已开放购票`);
    });
  }

  res.status(201).json(screening);
});

app.get('/api/screenings/template', (req, res) => {
  const headerLine = SCREENING_CSV_HEADERS.join(',');
  const exampleLine = ['花样年华', '2026-07-01', '19:30', '中国电影资料馆', '北京·小西天', '4K修复版', 'not_open', '2026-06-25', '0', ''].map(csvEscape).join(',');
  const csv = '\uFEFF' + headerLine + '\n' + exampleLine + '\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=screenings_template.csv');
  res.send(csv);
});

app.get('/api/screenings/export', (req, res) => {
  const screenings = db.prepare(`
    SELECT s.*, f.title as film_title, v.name as venue_name
    FROM screenings s
    LEFT JOIN films f ON s.film_id = f.id
    LEFT JOIN venues v ON s.venue_id = v.id
    ORDER BY s.screening_date, s.screening_time
  `).all();
  const headerLine = SCREENING_CSV_HEADERS.join(',');
  const rows = screenings.map(s => [
    csvEscape(s.film_title || ''),
    csvEscape(s.screening_date),
    csvEscape(s.screening_time),
    csvEscape(s.venue_name || s.venue || ''),
    csvEscape(s.location),
    csvEscape(s.notes),
    csvEscape(s.ticket_status),
    csvEscape(s.ticket_open_date),
    csvEscape(s.is_changed ? '1' : '0'),
    csvEscape(s.change_description)
  ].join(','));
  const csv = '\uFEFF' + headerLine + '\n' + rows.join('\n') + '\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=screenings_export.csv');
  res.send(csv);
});

app.post('/api/screenings/import', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传CSV文件' });
  }

  let text;
  try {
    text = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
  } catch (e) {
    return res.status(400).json({ error: '文件编码错误，请使用UTF-8编码' });
  }

  const { headers, rows } = parseCsv(text);
  if (headers.length === 0 || rows.length === 0) {
    return res.status(400).json({ error: 'CSV文件为空或格式不正确' });
  }

  const missingHeaders = ['film_title', 'screening_date', 'screening_time'].filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return res.status(400).json({
      error: `模板校验失败：缺少必填列 [${missingHeaders.join(', ')}]`,
      required_headers: SCREENING_CSV_HEADERS,
      actual_headers: headers
    });
  }

  const errors = [];
  const success = [];
  const skipped = [];
  const validRecords = [];
  const findFilmByTitle = db.prepare('SELECT id, duration, title FROM films WHERE title = ? COLLATE NOCASE');
  const findVenueByName = db.prepare('SELECT id, name, location FROM venues WHERE name = ? COLLATE NOCASE AND is_active = 1');
  const findDuplicateScreening = db.prepare(`
    SELECT s.id FROM screenings s
    LEFT JOIN films f ON s.film_id = f.id
    LEFT JOIN venues v ON s.venue_id = v.id
    WHERE f.title = ? COLLATE NOCASE AND s.screening_date = ? AND s.screening_time = ?
    AND (v.name = ? COLLATE NOCASE OR (s.venue = ? AND s.venue != ''))
  `);
  const insertScreening = db.prepare(`
    INSERT INTO screenings (film_id, venue_id, screening_date, screening_time, venue, location, notes, ticket_status, ticket_open_date, is_changed, change_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.film_title || !row.film_title.trim()) {
      errors.push({ row: rowNum, data: row, message: '影片标题(film_title)不能为空' });
      continue;
    }
    if (!row.screening_date || !row.screening_date.trim()) {
      errors.push({ row: rowNum, data: row, message: '放映日期(screening_date)不能为空' });
      continue;
    }
    if (!row.screening_time || !row.screening_time.trim()) {
      errors.push({ row: rowNum, data: row, message: '放映时间(screening_time)不能为空' });
      continue;
    }

    const filmTitle = row.film_title.trim();
    const screeningDate = row.screening_date.trim();
    const screeningTime = row.screening_time.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(screeningDate)) {
      errors.push({ row: rowNum, data: row, message: `日期格式不正确「${screeningDate}」，应为 YYYY-MM-DD` });
      continue;
    }
    if (!/^\d{1,2}:\d{2}$/.test(screeningTime)) {
      errors.push({ row: rowNum, data: row, message: `时间格式不正确「${screeningTime}」，应为 HH:MM` });
      continue;
    }

    const film = findFilmByTitle.get(filmTitle);
    if (!film) {
      errors.push({ row: rowNum, data: row, message: `影片「${filmTitle}」在数据库中不存在，请先导入影片` });
      continue;
    }

    const venueName = row.venue_name ? row.venue_name.trim() : '';
    let venueId = null;
    let finalVenue = venueName;
    let finalLocation = row.location ? row.location.trim() : null;

    if (venueName) {
      const venue = findVenueByName.get(venueName);
      if (venue) {
        venueId = venue.id;
        finalVenue = venue.name;
        finalLocation = venue.location || finalLocation;
      }
    }

    const ticketStatus = row.ticket_status ? row.ticket_status.trim() : 'not_open';
    if (ticketStatus && !VALID_TICKET_STATUSES.includes(ticketStatus)) {
      errors.push({ row: rowNum, data: row, message: `票务状态「${ticketStatus}」不合法，应为：${VALID_TICKET_STATUSES.join('/')}` });
      continue;
    }

    const isChanged = row.is_changed === '1' ? 1 : 0;

    const existing = findDuplicateScreening.get(filmTitle, screeningDate, screeningTime, venueName, venueName);
    if (existing) {
      skipped.push({ row: rowNum, data: row, message: `放映已存在：${filmTitle} ${screeningDate} ${screeningTime}${venueName ? ' @ ' + venueName : ''}`, existing_id: existing.id });
      continue;
    }

    validRecords.push({
      rowNum, filmId: film.id, venueId, screeningDate, screeningTime,
      finalVenue, finalLocation,
      notes: row.notes ? row.notes.trim() : null,
      ticketStatus,
      ticketOpenDate: row.ticket_open_date ? row.ticket_open_date.trim() : null,
      isChanged,
      changeDescription: row.change_description ? row.change_description.trim() : null,
      filmTitle
    });
  }

  if (errors.length > 0) {
    return res.status(422).json({
      error: `批量校验未通过，共 ${errors.length} 条错误。所有数据均未写入，请修正后重新导入`,
      total: rows.length,
      success_count: 0,
      skipped_count: skipped.length,
      error_count: errors.length,
      success: [],
      skipped,
      errors
    });
  }

  const transaction = db.transaction((records) => {
    for (const r of records) {
      try {
        const info = insertScreening.run(
          r.filmId, r.venueId, r.screeningDate, r.screeningTime,
          r.finalVenue || null, r.finalLocation || null,
          r.notes, r.ticketStatus, r.ticketOpenDate,
          r.isChanged, r.changeDescription
        );
        success.push({ row: r.rowNum, id: info.lastInsertRowid, film_title: r.filmTitle, screening_date: r.screeningDate, screening_time: r.screeningTime });
      } catch (err) {
        throw new Error(`第${r.rowNum}行写入失败：${err.message}`);
      }
    }
  });

  try {
    transaction(validRecords);
  } catch (err) {
    return res.status(500).json({ error: '事务写入失败，所有数据已回滚', detail: err.message });
  }

  res.json({
    total: rows.length,
    success_count: success.length,
    skipped_count: skipped.length,
    error_count: errors.length,
    success,
    skipped,
    errors
  });
});

app.put('/api/screenings/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM screenings WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '放映信息不存在' });
  }

  const { film_id, venue_id, screening_date, screening_time, venue, location, notes, ticket_status, ticket_open_date, is_changed, change_description } = req.body;
  const oldStatus = existing.ticket_status;
  const newStatus = ticket_status || existing.ticket_status;

  const finalFilmId = film_id || existing.film_id;
  const finalVenueId = venue_id !== undefined ? (venue_id || null) : existing.venue_id;
  const finalDate = screening_date || existing.screening_date;
  const finalTime = screening_time || existing.screening_time;

  let filmDuration = 0;
  const film = db.prepare('SELECT duration, title FROM films WHERE id = ?').get(finalFilmId);
  if (!film) {
    return res.status(400).json({ error: '所选影片不存在' });
  }
  filmDuration = Number(film.duration) || 0;

  let venueInfo = null;
  if (finalVenueId) {
    venueInfo = db.prepare('SELECT id, name, location FROM venues WHERE id = ?').get(finalVenueId);
    if (!venueInfo) {
      return res.status(400).json({ error: '所选场馆不存在' });
    }
    const conflicts = findOverlapConflicts(db, finalVenueId, finalDate, finalTime, filmDuration, req.params.id);
    if (conflicts.length > 0) {
      const first = conflicts[0];
      const details = conflicts.map(c =>
        `《${c.title}》(${c.start_time}-${c.end_time}`).join('、');
      return res.status(409).json({
        error: `排期冲突：场馆「${venueInfo.name}${venueInfo.location ? ' · ' + venueInfo.location : ''}」在 ${finalDate} 存在时间重叠场次：${details}。重叠时段 ${first.overlap_start}-${first.overlap_end}`,
        conflicts
      });
    }
  }

  let finalVenue = venue;
  let finalLocation = location;
  if (finalVenueId) {
    const v = db.prepare('SELECT name, location FROM venues WHERE id = ?').get(finalVenueId);
    if (v) {
      finalVenue = v.name;
      finalLocation = v.location || location;
    }
  }

  db.prepare(`
    UPDATE screenings SET 
      film_id = ?, venue_id = ?, screening_date = ?, screening_time = ?, venue = ?, location = ?, notes = ?,
      ticket_status = ?, ticket_open_date = ?, is_changed = ?, change_description = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    finalFilmId,
    finalVenueId,
    finalDate,
    finalTime,
    finalVenue !== undefined ? finalVenue : existing.venue,
    finalLocation !== undefined ? finalLocation : existing.location,
    notes !== undefined ? notes : existing.notes,
    ticket_status || existing.ticket_status,
    ticket_open_date !== undefined ? ticket_open_date : existing.ticket_open_date,
    is_changed !== undefined ? is_changed : existing.is_changed,
    change_description !== undefined ? change_description : existing.change_description,
    req.params.id
  );

  if (oldStatus !== 'on_sale' && newStatus === 'on_sale') {
    const favsWithReminder = db.prepare('SELECT film_id FROM favorites WHERE film_id = ? AND ticket_reminder_enabled = 1').all(finalFilmId);
    const insertNotif = db.prepare('INSERT INTO notifications (film_id, screening_id, type, title, content) VALUES (?, ?, ?, ?, ?)');
    favsWithReminder.forEach(f => {
      insertNotif.run(finalFilmId, req.params.id, 'ticket_on_sale', `《${film?.title || '影片'}》已开票`, `${finalDate} ${finalTime} 场次现已开放购票`);
    });
  }
  if (is_changed) {
    const favsWithReminder = db.prepare('SELECT film_id FROM favorites WHERE film_id = ? AND schedule_change_reminder_enabled = 1').all(finalFilmId);
    const insertNotif = db.prepare('INSERT INTO notifications (film_id, screening_id, type, title, content) VALUES (?, ?, ?, ?, ?)');
    favsWithReminder.forEach(f => {
      insertNotif.run(finalFilmId, req.params.id, 'schedule_change', `《${film?.title || '影片'}》放映变更`, change_description || '放映信息有变更，请留意');
    });
  }

  const screening = db.prepare(`
    SELECT s.*, f.title, f.director, f.year, f.poster, v.name as venue_name, v.location as venue_location
    FROM screenings s LEFT JOIN films f ON s.film_id = f.id
    LEFT JOIN venues v ON s.venue_id = v.id
    WHERE s.id = ?
  `).get(req.params.id);
  res.json(screening);
});

app.delete('/api/screenings/:id', (req, res) => {
  const info = db.prepare('DELETE FROM screenings WHERE id = ?').run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '放映信息不存在' });
  }
  res.json({ message: '删除成功' });
});

// ============ 短评 API ============

app.get('/api/reviews', (req, res) => {
  const { sort = 'created_at_desc', include_hidden, search, film_id, rating_min, mood } = req.query;
  let orderSql = 'ORDER BY r.created_at DESC';
  if (sort === 'likes_desc') orderSql = 'ORDER BY r.likes DESC, r.created_at DESC';
  else if (sort === 'likes_asc') orderSql = 'ORDER BY r.likes ASC, r.created_at DESC';
  else if (sort === 'rating_desc') orderSql = 'ORDER BY r.rating DESC, r.created_at DESC';
  else if (sort === 'created_at_asc') orderSql = 'ORDER BY r.created_at ASC';

  let whereSql = '';
  const params = [];
  if (!include_hidden) {
    whereSql = 'WHERE r.is_hidden = 0';
  } else {
    whereSql = 'WHERE 1=1';
  }
  if (search) {
    whereSql += ' AND (r.content LIKE ? OR r.author LIKE ? OR f.title LIKE ? OR f.original_title LIKE ? OR f.director LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  if (film_id) {
    whereSql += ' AND r.film_id = ?';
    params.push(film_id);
  }
  if (rating_min) {
    whereSql += ' AND r.rating >= ?';
    params.push(rating_min);
  }
  if (mood) {
    whereSql += ' AND r.mood = ?';
    params.push(mood);
  }

  const reviews = db.prepare(`
    SELECT r.*, f.title, f.director, f.poster
    FROM reviews r
    LEFT JOIN films f ON r.film_id = f.id
    ${whereSql}
    ${orderSql}
  `).all(...params);
  res.json(reviews);
});

app.post('/api/reviews', (req, res) => {
  const { film_id, author, content, rating, mood, watched_date, is_spoiler } = req.body;
  if (!film_id || !content) {
    return res.status(400).json({ error: '影片和评论内容不能为空' });
  }

  const info = db.prepare(`
    INSERT INTO reviews (film_id, author, content, rating, mood, watched_date, is_spoiler)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(film_id, author || '匿名观众', content, rating || null, mood || null, watched_date || null, is_spoiler ? 1 : 0);

  const review = db.prepare(`
    SELECT r.*, f.title, f.director, f.poster
    FROM reviews r LEFT JOIN films f ON r.film_id = f.id
    WHERE r.id = ?
  `).get(info.lastInsertRowid);

  res.status(201).json(review);
});

app.put('/api/reviews/:id/like', (req, res) => {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) {
    return res.status(404).json({ error: '评论不存在' });
  }

  db.prepare('UPDATE reviews SET likes = likes + 1 WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  res.json({ likes: updated.likes });
});

app.delete('/api/reviews/:id', (req, res) => {
  const info = db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '评论不存在' });
  }
  res.json({ message: '删除成功' });
});

// ============ 举报 API ============

app.get('/api/reports', (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT rpt.*, r.content as review_content, r.author as review_author, r.film_id, f.title, f.poster
    FROM reports rpt
    LEFT JOIN reviews r ON rpt.review_id = r.id
    LEFT JOIN films f ON r.film_id = f.id
  `;
  const params = [];
  if (status) {
    sql += ' WHERE rpt.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY rpt.created_at DESC';
  const reports = db.prepare(sql).all(...params);
  res.json(reports);
});

app.post('/api/reports', (req, res) => {
  const { review_id, reason, reporter } = req.body;
  if (!review_id || !reason) {
    return res.status(400).json({ error: '评论ID和举报原因不能为空' });
  }

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(review_id);
  if (!review) {
    return res.status(404).json({ error: '评论不存在' });
  }

  const info = db.prepare(`
    INSERT INTO reports (review_id, reason, reporter)
    VALUES (?, ?, ?)
  `).run(review_id, reason, reporter || '匿名用户');

  const report = db.prepare(`
    SELECT rpt.*, r.content as review_content, r.author as review_author, r.film_id, f.title, f.poster
    FROM reports rpt
    LEFT JOIN reviews r ON rpt.review_id = r.id
    LEFT JOIN films f ON r.film_id = f.id
    WHERE rpt.id = ?
  `).get(info.lastInsertRowid);

  res.status(201).json(report);
});

app.put('/api/reports/:id/handle', (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) {
    return res.status(404).json({ error: '举报不存在' });
  }

  const { status, handle_note, handler } = req.body;
  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: '无效的处理状态' });
  }

  db.prepare(`
    UPDATE reports 
    SET status = ?, handle_note = ?, handler = ?, handled_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, handle_note || null, handler || '管理员', req.params.id);

  if (status === 'approved') {
    db.prepare('UPDATE reviews SET is_hidden = 1 WHERE id = ?').run(report.review_id);
  }

  const updated = db.prepare(`
    SELECT rpt.*, r.content as review_content, r.author as review_author, r.film_id, f.title, f.poster
    FROM reports rpt
    LEFT JOIN reviews r ON rpt.review_id = r.id
    LEFT JOIN films f ON r.film_id = f.id
    WHERE rpt.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// ============ 收藏夹/观影计划 API ============

const VALID_WATCH_STATUS = ['want_to_watch', 'ticketed', 'watched'];

app.get('/api/favorites', (req, res) => {
  const { watch_status } = req.query;
  let sql = `
    SELECT fav.*, f.title, f.original_title, f.director, f.year, f.country, f.genre, f.poster, f.rating
    FROM favorites fav
    LEFT JOIN films f ON fav.film_id = f.id
    WHERE 1=1
  `;
  const params = [];
  if (watch_status && VALID_WATCH_STATUS.includes(watch_status)) {
    sql += ' AND fav.watch_status = ?';
    params.push(watch_status);
  }
  sql += ' ORDER BY fav.updated_at DESC';
  const favorites = db.prepare(sql).all(...params);
  res.json(favorites);
});

app.post('/api/favorites/:filmId', (req, res) => {
  const film = db.prepare('SELECT * FROM films WHERE id = ?').get(req.params.filmId);
  if (!film) {
    return res.status(404).json({ error: '影片不存在' });
  }

  const existing = db.prepare('SELECT * FROM favorites WHERE film_id = ?').get(req.params.filmId);
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE film_id = ?').run(req.params.filmId);
    res.json({ message: '已从观影计划移除', isFavorite: false });
  } else {
    const {
      ticket_reminder_enabled = 1,
      schedule_change_reminder_enabled = 1,
      watch_status = 'want_to_watch',
      ticket_date,
      watched_date,
      plan_date
    } = req.body;
    const finalStatus = VALID_WATCH_STATUS.includes(watch_status) ? watch_status : 'want_to_watch';
    db.prepare(`
      INSERT INTO favorites (film_id, ticket_reminder_enabled, schedule_change_reminder_enabled, watch_status, ticket_date, watched_date, plan_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.filmId,
      ticket_reminder_enabled ? 1 : 0,
      schedule_change_reminder_enabled ? 1 : 0,
      finalStatus,
      ticket_date || null,
      watched_date || null,
      plan_date || null
    );
    res.status(201).json({
      message: '已添加到观影计划',
      isFavorite: true,
      ticket_reminder_enabled: !!ticket_reminder_enabled,
      schedule_change_reminder_enabled: !!schedule_change_reminder_enabled,
      watch_status: finalStatus,
      ticket_date: ticket_date || null,
      watched_date: watched_date || null,
      plan_date: plan_date || null
    });
  }
});

app.put('/api/favorites/:filmId/status', (req, res) => {
  const existing = db.prepare('SELECT * FROM favorites WHERE film_id = ?').get(req.params.filmId);
  if (!existing) {
    return res.status(404).json({ error: '影片未在观影计划中' });
  }

  const { watch_status, ticket_date, watched_date, plan_date } = req.body;
  if (!watch_status || !VALID_WATCH_STATUS.includes(watch_status)) {
    return res.status(400).json({ error: '无效的观影状态' });
  }

  db.prepare(`
    UPDATE favorites SET
      watch_status = ?,
      ticket_date = ?,
      watched_date = ?,
      plan_date = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE film_id = ?
  `).run(
    watch_status,
    ticket_date !== undefined ? (ticket_date || null) : existing.ticket_date,
    watched_date !== undefined ? (watched_date || null) : existing.watched_date,
    plan_date !== undefined ? (plan_date || null) : existing.plan_date,
    req.params.filmId
  );

  const updated = db.prepare('SELECT * FROM favorites WHERE film_id = ?').get(req.params.filmId);
  res.json({
    watch_status: updated.watch_status,
    ticket_date: updated.ticket_date,
    watched_date: updated.watched_date,
    plan_date: updated.plan_date
  });
});

app.put('/api/favorites/:filmId/reminders', (req, res) => {
  const existing = db.prepare('SELECT * FROM favorites WHERE film_id = ?').get(req.params.filmId);
  if (!existing) {
    return res.status(404).json({ error: '未收藏此影片' });
  }

  const { ticket_reminder_enabled, schedule_change_reminder_enabled } = req.body;
  db.prepare(`
    UPDATE favorites SET
      ticket_reminder_enabled = ?,
      schedule_change_reminder_enabled = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE film_id = ?
  `).run(
    ticket_reminder_enabled !== undefined ? (ticket_reminder_enabled ? 1 : 0) : existing.ticket_reminder_enabled,
    schedule_change_reminder_enabled !== undefined ? (schedule_change_reminder_enabled ? 1 : 0) : existing.schedule_change_reminder_enabled,
    req.params.filmId
  );

  const updated = db.prepare('SELECT * FROM favorites WHERE film_id = ?').get(req.params.filmId);
  res.json({
    ticket_reminder_enabled: !!updated.ticket_reminder_enabled,
    schedule_change_reminder_enabled: !!updated.schedule_change_reminder_enabled
  });
});

app.delete('/api/favorites/:filmId', (req, res) => {
  const info = db.prepare('DELETE FROM favorites WHERE film_id = ?').run(req.params.filmId);
  if (info.changes === 0) {
    return res.status(404).json({ error: '收藏不存在' });
  }
  res.json({ message: '已从观影计划移除' });
});

// ============ 通知 API ============

app.get('/api/notifications', (req, res) => {
  const { unread_only } = req.query;
  let sql = `
    SELECT n.*, f.title, f.poster
    FROM notifications n
    LEFT JOIN films f ON n.film_id = f.id
  `;
  const params = [];
  if (unread_only) {
    sql += ' WHERE n.is_read = 0';
  }
  sql += ' ORDER BY n.created_at DESC';
  const notifications = db.prepare(sql).all(...params);
  res.json(notifications);
});

app.put('/api/notifications/:id/read', (req, res) => {
  const info = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '通知不存在' });
  }
  res.json({ message: '已标记为已读' });
});

app.put('/api/notifications/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
  res.json({ message: '已全部标记为已读' });
});

app.delete('/api/notifications/:id', (req, res) => {
  const info = db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '通知不存在' });
  }
  res.json({ message: '已删除通知' });
});

// ============ 专题策展 API ============

app.get('/api/collections', (req, res) => {
  const { type, featured, active } = req.query;
  let sql = `
    SELECT c.*, COUNT(cf.id) as film_count
    FROM collections c
    LEFT JOIN collection_films cf ON c.id = cf.collection_id
    WHERE 1=1
  `;
  const params = [];

  if (type) {
    sql += ' AND c.type = ?';
    params.push(type);
  }
  if (featured) {
    sql += ' AND c.is_featured = 1';
  }
  if (active !== undefined && active !== null && active !== '') {
    const activeVal = Number(active);
    if (activeVal === 1) {
      sql += ' AND c.is_active = 1';
    } else if (activeVal === 0) {
      sql += ' AND c.is_active = 0';
    }
  }

  sql += ' GROUP BY c.id ORDER BY c.sort_order ASC, c.created_at DESC';

  const collections = db.prepare(sql).all(...params);
  res.json(collections);
});

app.get('/api/collections/:id', (req, res) => {
  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  if (!collection) {
    return res.status(404).json({ error: '专题不存在' });
  }

  const films = db.prepare(`
    SELECT cf.*, f.title, f.original_title, f.director, f.year, f.country, f.genre, f.poster, f.rating, f.synopsis
    FROM collection_films cf
    LEFT JOIN films f ON cf.film_id = f.id
    WHERE cf.collection_id = ?
    ORDER BY cf.sort_order ASC, cf.created_at ASC
  `).all(req.params.id);

  res.json({ ...collection, films });
});

app.post('/api/collections', (req, res) => {
  const {
    title, subtitle, description, cover_image, type = 'custom',
    filter_director, filter_country, filter_theme,
    sort_order = 0, is_featured = 0, is_active = 1
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: '专题标题不能为空' });
  }
  if (!['custom', 'director', 'country', 'theme'].includes(type)) {
    return res.status(400).json({ error: '无效的专题类型' });
  }

  const info = db.prepare(`
    INSERT INTO collections (title, subtitle, description, cover_image, type, filter_director, filter_country, filter_theme, sort_order, is_featured, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, subtitle || null, description || null, cover_image || null, type,
    filter_director || null, filter_country || null, filter_theme || null,
    sort_order, is_featured ? 1 : 0, is_active ? 1 : 0
  );

  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(collection);
});

app.put('/api/collections/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '专题不存在' });
  }

  const {
    title, subtitle, description, cover_image, type,
    filter_director, filter_country, filter_theme,
    sort_order, is_featured, is_active
  } = req.body;

  if (type && !['custom', 'director', 'country', 'theme'].includes(type)) {
    return res.status(400).json({ error: '无效的专题类型' });
  }

  db.prepare(`
    UPDATE collections SET
      title = ?, subtitle = ?, description = ?, cover_image = ?, type = ?,
      filter_director = ?, filter_country = ?, filter_theme = ?,
      sort_order = ?, is_featured = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title !== undefined ? title : existing.title,
    subtitle !== undefined ? subtitle : existing.subtitle,
    description !== undefined ? description : existing.description,
    cover_image !== undefined ? cover_image : existing.cover_image,
    type !== undefined ? type : existing.type,
    filter_director !== undefined ? filter_director : existing.filter_director,
    filter_country !== undefined ? filter_country : existing.filter_country,
    filter_theme !== undefined ? filter_theme : existing.filter_theme,
    sort_order !== undefined ? sort_order : existing.sort_order,
    is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    req.params.id
  );

  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  res.json(collection);
});

app.delete('/api/collections/:id', (req, res) => {
  const info = db.prepare('DELETE FROM collections WHERE id = ?').run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '专题不存在' });
  }
  res.json({ message: '删除成功' });
});

app.post('/api/collections/:id/films', (req, res) => {
  const { film_id, sort_order = 0, note } = req.body;
  if (!film_id) {
    return res.status(400).json({ error: '影片ID不能为空' });
  }

  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  if (!collection) {
    return res.status(404).json({ error: '专题不存在' });
  }

  const film = db.prepare('SELECT * FROM films WHERE id = ?').get(film_id);
  if (!film) {
    return res.status(404).json({ error: '影片不存在' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO collection_films (collection_id, film_id, sort_order, note)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, film_id, sort_order, note || null);

    const item = db.prepare(`
      SELECT cf.*, f.title, f.poster, f.director, f.year
      FROM collection_films cf LEFT JOIN films f ON cf.film_id = f.id
      WHERE cf.id = ?
    `).get(info.lastInsertRowid);
    res.status(201).json(item);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '影片已在该专题中' });
    }
    throw err;
  }
});

app.put('/api/collections/:id/films/:filmId', (req, res) => {
  const { sort_order, note } = req.body;

  const existing = db.prepare('SELECT * FROM collection_films WHERE collection_id = ? AND film_id = ?').get(req.params.id, req.params.filmId);
  if (!existing) {
    return res.status(404).json({ error: '影片不在该专题中' });
  }

  db.prepare(`
    UPDATE collection_films SET sort_order = ?, note = ?
    WHERE collection_id = ? AND film_id = ?
  `).run(
    sort_order !== undefined ? sort_order : existing.sort_order,
    note !== undefined ? note : existing.note,
    req.params.id, req.params.filmId
  );

  const item = db.prepare(`
    SELECT cf.*, f.title, f.poster, f.director, f.year
    FROM collection_films cf LEFT JOIN films f ON cf.film_id = f.id
    WHERE cf.collection_id = ? AND cf.film_id = ?
  `).get(req.params.id, req.params.filmId);
  res.json(item);
});

app.delete('/api/collections/:id/films/:filmId', (req, res) => {
  const info = db.prepare('DELETE FROM collection_films WHERE collection_id = ? AND film_id = ?').run(req.params.id, req.params.filmId);
  if (info.changes === 0) {
    return res.status(404).json({ error: '影片不在该专题中' });
  }
  res.json({ message: '已从专题中移除' });
});

app.get('/api/collections/aggregate/directors', (req, res) => {
  const directors = db.prepare(`
    SELECT 
      director as name,
      COUNT(*) as film_count,
      AVG(rating) as avg_rating,
      GROUP_CONCAT(DISTINCT country) as countries
    FROM films 
    WHERE director IS NOT NULL AND director != ''
    GROUP BY director
    ORDER BY film_count DESC, avg_rating DESC
  `).all();
  res.json(directors);
});

app.get('/api/collections/aggregate/countries', (req, res) => {
  const countries = db.prepare(`
    SELECT 
      country as name,
      COUNT(*) as film_count,
      AVG(rating) as avg_rating
    FROM films 
    WHERE country IS NOT NULL AND country != ''
    GROUP BY country
    ORDER BY film_count DESC, avg_rating DESC
  `).all();
  res.json(countries);
});

app.get('/api/collections/aggregate/themes', (req, res) => {
  const films = db.prepare('SELECT id, genre, synopsis FROM films WHERE genre IS NOT NULL OR synopsis IS NOT NULL').all();
  const themeMap = new Map();

  films.forEach(film => {
    if (film.genre) {
      film.genre.split(/[\/、,，]/).map(t => t.trim()).filter(t => t).forEach(theme => {
        if (!themeMap.has(theme)) {
          themeMap.set(theme, { name: theme, film_ids: new Set(), film_count: 0 });
        }
        themeMap.get(theme).film_ids.add(film.id);
      });
    }
  });

  const themes = Array.from(themeMap.values())
    .map(t => ({ name: t.name, film_count: t.film_ids.size }))
    .sort((a, b) => b.film_count - a.film_count);

  res.json(themes);
});

// ============ 统一搜索 API ============

app.get('/api/search', (req, res) => {
  const { q, type, limit = 20 } = req.query;
  const result = { query: q, types: {} };

  if (!q) {
    return res.json(result);
  }

  const searchTerm = `%${q}%`;
  const limitNum = Math.min(Number(limit) || 20, 100);
  const types = type ? type.split(',').map(t => t.trim()) : ['films', 'screenings', 'reviews', 'venues'];

  if (types.includes('films')) {
    const films = db.prepare(`
      SELECT * FROM films
      WHERE title LIKE ? OR original_title LIKE ? OR director LIKE ? OR synopsis LIKE ? OR genre LIKE ?
      ORDER BY rating DESC, created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limitNum);
    result.types.films = films;
  }

  if (types.includes('screenings')) {
    const screenings = db.prepare(`
      SELECT s.*, f.title, f.director, f.poster, f.genre, v.name as venue_name, v.location as venue_location
      FROM screenings s
      LEFT JOIN films f ON s.film_id = f.id
      LEFT JOIN venues v ON s.venue_id = v.id
      WHERE f.title LIKE ? OR f.original_title LIKE ? OR f.director LIKE ?
         OR v.name LIKE ? OR v.location LIKE ? OR s.venue LIKE ? OR s.location LIKE ? OR s.notes LIKE ?
      ORDER BY s.screening_date DESC, s.screening_time DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limitNum);
    result.types.screenings = screenings;
  }

  if (types.includes('reviews')) {
    const reviews = db.prepare(`
      SELECT r.*, f.title, f.director, f.poster
      FROM reviews r
      LEFT JOIN films f ON r.film_id = f.id
      WHERE r.is_hidden = 0 AND (
        r.content LIKE ? OR r.author LIKE ? OR f.title LIKE ? OR f.original_title LIKE ? OR f.director LIKE ?
      )
      ORDER BY r.created_at DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limitNum);
    result.types.reviews = reviews;
  }

  if (types.includes('venues')) {
    const venues = db.prepare(`
      SELECT * FROM venues
      WHERE name LIKE ? OR location LIKE ? OR notes LIKE ?
      ORDER BY name ASC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, limitNum);
    result.types.venues = venues;
  }

  res.json(result);
});

// ============ 统计数据 API ============

app.get('/api/stats', (req, res) => {
  const filmCount = db.prepare('SELECT COUNT(*) as count FROM films').get().count;
  const screeningCount = db.prepare('SELECT COUNT(*) as count FROM screenings').get().count;
  const venueCount = db.prepare('SELECT COUNT(*) as count FROM venues').get().count;
  const reviewCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
  const favoriteCount = db.prepare('SELECT COUNT(*) as count FROM favorites').get().count;
  const wantToWatchCount = db.prepare("SELECT COUNT(*) as count FROM favorites WHERE watch_status = 'want_to_watch'").get().count;
  const ticketedCount = db.prepare("SELECT COUNT(*) as count FROM favorites WHERE watch_status = 'ticketed'").get().count;
  const watchedCount = db.prepare("SELECT COUNT(*) as count FROM favorites WHERE watch_status = 'watched'").get().count;
  const unreadNotificationCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get().count;
  const pendingReportCount = db.prepare('SELECT COUNT(*) as count FROM reports WHERE status = ?').get('pending').count;
  const collectionCount = db.prepare('SELECT COUNT(*) as count FROM collections WHERE is_active = 1').get().count;
  const featuredCollectionCount = db.prepare('SELECT COUNT(*) as count FROM collections WHERE is_featured = 1 AND is_active = 1').get().count;

  const upcomingScreenings = db.prepare(`
    SELECT s.*, f.title, f.poster
    FROM screenings s LEFT JOIN films f ON s.film_id = f.id
    WHERE s.screening_date >= date('now')
    ORDER BY s.screening_date, s.screening_time
    LIMIT 5
  `).all();

  const recentReviews = db.prepare(`
    SELECT r.*, f.title, f.poster
    FROM reviews r LEFT JOIN films f ON r.film_id = f.id
    ORDER BY r.created_at DESC
    LIMIT 5
  `).all();

  const recentNotifications = db.prepare(`
    SELECT n.*, f.title, f.poster
    FROM notifications n LEFT JOIN films f ON n.film_id = f.id
    ORDER BY n.created_at DESC
    LIMIT 5
  `).all();

  const featuredCollections = db.prepare(`
    SELECT c.*, COUNT(cf.id) as film_count
    FROM collections c
    LEFT JOIN collection_films cf ON c.id = cf.collection_id
    WHERE c.is_featured = 1 AND c.is_active = 1
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.created_at DESC
    LIMIT 5
  `).all();

  res.json({
    filmCount,
    screeningCount,
    venueCount,
    reviewCount,
    favoriteCount,
    wantToWatchCount,
    ticketedCount,
    watchedCount,
    unreadNotificationCount,
    pendingReportCount,
    collectionCount,
    featuredCollectionCount,
    upcomingScreenings,
    recentReviews,
    recentNotifications,
    featuredCollections
  });
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
});

const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ 影片相关 API ============

app.get('/api/films', (req, res) => {
  const { search, genre, country, year_min, year_max, rating_min, sort } = req.query;
  let sql = 'SELECT * FROM films WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (title LIKE ? OR original_title LIKE ? OR director LIKE ? OR synopsis LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  if (genre) {
    sql += ' AND genre LIKE ?';
    params.push(`%${genre}%`);
  }
  if (country) {
    sql += ' AND country LIKE ?';
    params.push(`%${country}%`);
  }
  if (year_min) {
    sql += ' AND year >= ?';
    params.push(year_min);
  }
  if (year_max) {
    sql += ' AND year <= ?';
    params.push(year_max);
  }
  if (rating_min) {
    sql += ' AND rating >= ?';
    params.push(rating_min);
  }

  if (sort === 'year_desc') sql += ' ORDER BY year DESC';
  else if (sort === 'year_asc') sql += ' ORDER BY year ASC';
  else if (sort === 'rating_desc') sql += ' ORDER BY rating DESC';
  else if (sort === 'title_asc') sql += ' ORDER BY title ASC';
  else sql += ' ORDER BY created_at DESC';

  const films = db.prepare(sql).all(...params);
  res.json(films);
});

app.get('/api/films/:id', (req, res) => {
  const film = db.prepare('SELECT * FROM films WHERE id = ?').get(req.params.id);
  if (!film) {
    return res.status(404).json({ error: '影片不存在' });
  }

  const reviews = db.prepare('SELECT * FROM reviews WHERE film_id = ? ORDER BY created_at DESC').all(req.params.id);
  const screenings = db.prepare('SELECT * FROM screenings WHERE film_id = ? ORDER BY screening_date, screening_time').all(req.params.id);
  const favorite = db.prepare('SELECT * FROM favorites WHERE film_id = ?').get(req.params.id);

  res.json({ ...film, reviews, screenings, isFavorite: !!favorite });
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

// ============ 放映日历 API ============

app.get('/api/screenings', (req, res) => {
  const { date_from, date_to } = req.query;
  let sql = `
    SELECT s.*, f.title, f.director, f.year, f.poster, f.genre
    FROM screenings s
    LEFT JOIN films f ON s.film_id = f.id
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

  sql += ' ORDER BY s.screening_date, s.screening_time';

  const screenings = db.prepare(sql).all(...params);
  res.json(screenings);
});

app.post('/api/screenings', (req, res) => {
  const { film_id, screening_date, screening_time, venue, location, notes } = req.body;
  if (!film_id || !screening_date || !screening_time) {
    return res.status(400).json({ error: '影片、日期和时间不能为空' });
  }

  const info = db.prepare(`
    INSERT INTO screenings (film_id, screening_date, screening_time, venue, location, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(film_id, screening_date, screening_time, venue || null, location || null, notes || null);

  const screening = db.prepare(`
    SELECT s.*, f.title, f.director, f.year, f.poster
    FROM screenings s LEFT JOIN films f ON s.film_id = f.id
    WHERE s.id = ?
  `).get(info.lastInsertRowid);

  res.status(201).json(screening);
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
  const reviews = db.prepare(`
    SELECT r.*, f.title, f.director, f.poster
    FROM reviews r
    LEFT JOIN films f ON r.film_id = f.id
    ORDER BY r.created_at DESC
  `).all();
  res.json(reviews);
});

app.post('/api/reviews', (req, res) => {
  const { film_id, author, content, rating, mood, watched_date } = req.body;
  if (!film_id || !content) {
    return res.status(400).json({ error: '影片和评论内容不能为空' });
  }

  const info = db.prepare(`
    INSERT INTO reviews (film_id, author, content, rating, mood, watched_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(film_id, author || '匿名观众', content, rating || null, mood || null, watched_date || null);

  const review = db.prepare(`
    SELECT r.*, f.title, f.director, f.poster
    FROM reviews r LEFT JOIN films f ON r.film_id = f.id
    WHERE r.id = ?
  `).get(info.lastInsertRowid);

  res.status(201).json(review);
});

app.delete('/api/reviews/:id', (req, res) => {
  const info = db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '评论不存在' });
  }
  res.json({ message: '删除成功' });
});

// ============ 收藏夹 API ============

app.get('/api/favorites', (req, res) => {
  const favorites = db.prepare(`
    SELECT fav.*, f.title, f.original_title, f.director, f.year, f.country, f.genre, f.poster, f.rating
    FROM favorites fav
    LEFT JOIN films f ON fav.film_id = f.id
    ORDER BY fav.created_at DESC
  `).all();
  res.json(favorites);
});

app.post('/api/favorites/:filmId', (req, res) => {
  const film = db.prepare('SELECT * FROM films WHERE id = ?').get(req.params.filmId);
  if (!film) {
    return res.status(404).json({ error: '影片不存在' });
  }

  try {
    db.prepare('INSERT INTO favorites (film_id) VALUES (?)').run(req.params.filmId);
    res.status(201).json({ message: '已添加到收藏夹', isFavorite: true });
  } catch (err) {
    db.prepare('DELETE FROM favorites WHERE film_id = ?').run(req.params.filmId);
    res.json({ message: '已从收藏夹移除', isFavorite: false });
  }
});

app.delete('/api/favorites/:filmId', (req, res) => {
  const info = db.prepare('DELETE FROM favorites WHERE film_id = ?').run(req.params.filmId);
  if (info.changes === 0) {
    return res.status(404).json({ error: '收藏不存在' });
  }
  res.json({ message: '已从收藏夹移除' });
});

// ============ 统计数据 API ============

app.get('/api/stats', (req, res) => {
  const filmCount = db.prepare('SELECT COUNT(*) as count FROM films').get().count;
  const screeningCount = db.prepare('SELECT COUNT(*) as count FROM screenings').get().count;
  const reviewCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
  const favoriteCount = db.prepare('SELECT COUNT(*) as count FROM favorites').get().count;

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

  res.json({
    filmCount,
    screeningCount,
    reviewCount,
    favoriteCount,
    upcomingScreenings,
    recentReviews
  });
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
});

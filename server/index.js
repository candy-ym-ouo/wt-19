const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = Number(process.env.PORT || 5001);

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

  res.json({
    ...film,
    reviews,
    screenings,
    isFavorite: !!favorite,
    ticketReminderEnabled: favorite ? !!favorite.ticket_reminder_enabled : false,
    scheduleChangeReminderEnabled: favorite ? !!favorite.schedule_change_reminder_enabled : false
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
  const { film_id, screening_date, screening_time, venue, location, notes, ticket_status, ticket_open_date, is_changed, change_description } = req.body;
  if (!film_id || !screening_date || !screening_time) {
    return res.status(400).json({ error: '影片、日期和时间不能为空' });
  }

  const info = db.prepare(`
    INSERT INTO screenings (film_id, screening_date, screening_time, venue, location, notes, ticket_status, ticket_open_date, is_changed, change_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(film_id, screening_date, screening_time, venue || null, location || null, notes || null, ticket_status || 'not_open', ticket_open_date || null, is_changed || 0, change_description || null);

  const screening = db.prepare(`
    SELECT s.*, f.title, f.director, f.year, f.poster
    FROM screenings s LEFT JOIN films f ON s.film_id = f.id
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

app.put('/api/screenings/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM screenings WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '放映信息不存在' });
  }

  const { film_id, screening_date, screening_time, venue, location, notes, ticket_status, ticket_open_date, is_changed, change_description } = req.body;
  const oldStatus = existing.ticket_status;
  const newStatus = ticket_status || existing.ticket_status;

  db.prepare(`
    UPDATE screenings SET 
      film_id = ?, screening_date = ?, screening_time = ?, venue = ?, location = ?, notes = ?,
      ticket_status = ?, ticket_open_date = ?, is_changed = ?, change_description = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    film_id || existing.film_id,
    screening_date || existing.screening_date,
    screening_time || existing.screening_time,
    venue !== undefined ? venue : existing.venue,
    location !== undefined ? location : existing.location,
    notes !== undefined ? notes : existing.notes,
    ticket_status || existing.ticket_status,
    ticket_open_date !== undefined ? ticket_open_date : existing.ticket_open_date,
    is_changed !== undefined ? is_changed : existing.is_changed,
    change_description !== undefined ? change_description : existing.change_description,
    req.params.id
  );

  const film = db.prepare('SELECT title FROM films WHERE id = ?').get(film_id || existing.film_id);

  if (oldStatus !== 'on_sale' && newStatus === 'on_sale') {
    const favsWithReminder = db.prepare('SELECT film_id FROM favorites WHERE film_id = ? AND ticket_reminder_enabled = 1').all(film_id || existing.film_id);
    const insertNotif = db.prepare('INSERT INTO notifications (film_id, screening_id, type, title, content) VALUES (?, ?, ?, ?, ?)');
    favsWithReminder.forEach(f => {
      insertNotif.run(film_id || existing.film_id, req.params.id, 'ticket_on_sale', `《${film?.title || '影片'}》已开票`, `${screening_date || existing.screening_date} ${screening_time || existing.screening_time} 场次现已开放购票`);
    });
  }
  if (is_changed) {
    const favsWithReminder = db.prepare('SELECT film_id FROM favorites WHERE film_id = ? AND schedule_change_reminder_enabled = 1').all(film_id || existing.film_id);
    const insertNotif = db.prepare('INSERT INTO notifications (film_id, screening_id, type, title, content) VALUES (?, ?, ?, ?, ?)');
    favsWithReminder.forEach(f => {
      insertNotif.run(film_id || existing.film_id, req.params.id, 'schedule_change', `《${film?.title || '影片'}》放映变更`, change_description || '放映信息有变更，请留意');
    });
  }

  const screening = db.prepare(`
    SELECT s.*, f.title, f.director, f.year, f.poster
    FROM screenings s LEFT JOIN films f ON s.film_id = f.id
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

  const existing = db.prepare('SELECT * FROM favorites WHERE film_id = ?').get(req.params.filmId);
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE film_id = ?').run(req.params.filmId);
    res.json({ message: '已从收藏夹移除', isFavorite: false });
  } else {
    const { ticket_reminder_enabled = 1, schedule_change_reminder_enabled = 1 } = req.body;
    db.prepare('INSERT INTO favorites (film_id, ticket_reminder_enabled, schedule_change_reminder_enabled) VALUES (?, ?, ?)').run(req.params.filmId, ticket_reminder_enabled ? 1 : 0, schedule_change_reminder_enabled ? 1 : 0);
    res.status(201).json({ message: '已添加到收藏夹', isFavorite: true, ticket_reminder_enabled: !!ticket_reminder_enabled, schedule_change_reminder_enabled: !!schedule_change_reminder_enabled });
  }
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
  res.json({ message: '已从收藏夹移除' });
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

// ============ 统计数据 API ============

app.get('/api/stats', (req, res) => {
  const filmCount = db.prepare('SELECT COUNT(*) as count FROM films').get().count;
  const screeningCount = db.prepare('SELECT COUNT(*) as count FROM screenings').get().count;
  const reviewCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
  const favoriteCount = db.prepare('SELECT COUNT(*) as count FROM favorites').get().count;
  const unreadNotificationCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get().count;

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

  res.json({
    filmCount,
    screeningCount,
    reviewCount,
    favoriteCount,
    unreadNotificationCount,
    upcomingScreenings,
    recentReviews,
    recentNotifications
  });
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
});

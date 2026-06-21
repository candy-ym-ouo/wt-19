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
  const { sort = 'created_at_desc', include_hidden } = req.query;
  let orderSql = 'ORDER BY r.created_at DESC';
  if (sort === 'likes_desc') orderSql = 'ORDER BY r.likes DESC, r.created_at DESC';
  else if (sort === 'likes_asc') orderSql = 'ORDER BY r.likes ASC, r.created_at DESC';
  else if (sort === 'rating_desc') orderSql = 'ORDER BY r.rating DESC, r.created_at DESC';
  else if (sort === 'created_at_asc') orderSql = 'ORDER BY r.created_at ASC';

  let whereSql = '';
  if (!include_hidden) {
    whereSql = 'WHERE r.is_hidden = 0';
  }

  const reviews = db.prepare(`
    SELECT r.*, f.title, f.director, f.poster
    FROM reviews r
    LEFT JOIN films f ON r.film_id = f.id
    ${whereSql}
    ${orderSql}
  `).all();
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

// ============ 专题策展 API ============

app.get('/api/collections', (req, res) => {
  const { type, featured, active = 1 } = req.query;
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
  if (active) {
    sql += ' AND c.is_active = 1';
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

// ============ 统计数据 API ============

app.get('/api/stats', (req, res) => {
  const filmCount = db.prepare('SELECT COUNT(*) as count FROM films').get().count;
  const screeningCount = db.prepare('SELECT COUNT(*) as count FROM screenings').get().count;
  const reviewCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
  const favoriteCount = db.prepare('SELECT COUNT(*) as count FROM favorites').get().count;
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
    reviewCount,
    favoriteCount,
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

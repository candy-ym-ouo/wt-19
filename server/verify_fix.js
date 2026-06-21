const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'film-notes.db');
const db = new Database(dbPath);

console.log('=== 验证测试：旧 review 不应影响新场次补观提醒 ===\n');

// 1. 查询某部有 review 的影片和该影片已结束场次
const testFilmId = 1; // 花样年华 - 有 review
const film = db.prepare('SELECT * FROM films WHERE id = ?').get(testFilmId);
console.log(`测试影片: ${film.title} (id=${film.id})`);

const reviews = db.prepare('SELECT * FROM reviews WHERE film_id = ? AND is_hidden = 0').all(testFilmId);
console.log(`该影片现有 reviews: ${reviews.length} 条`);
reviews.forEach(r => console.log(`  - id=${r.id}, watched_date=${r.watched_date}, mood=${r.mood}, content_len=${r.content?.length || 0}`));

// 2. 为花样年华新增一条 1 天前已结束的放映场次（新放映，旧 review 在这之前）
const today = new Date();
const fmt = (d) => d.toISOString().split('T')[0];
const newScreeningDate = fmt(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000));

const insertScreening = db.prepare(`
  INSERT INTO screenings (film_id, venue_id, screening_date, screening_time, venue, location, notes, ticket_status, ticket_open_date, is_changed, change_description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const venue1 = db.prepare('SELECT * FROM venues LIMIT 1').get();
const info = insertScreening.run(
  testFilmId, venue1.id, newScreeningDate, '19:30', venue1.name, venue1.location,
  '补观逻辑验证', 'sold_out', newScreeningDate, 0, ''
);
const newScreeningId = info.lastInsertRowid;
console.log(`\n新增已结束放映场次 id=${newScreeningId}, date=${newScreeningDate} 19:30`);

// 3. 查看新放映的补观状态 - 应该有待办（因为 review.watched_date (2026-06-15) < screening_date (2026-06-20)）
console.log('\n=== API 验证 ===');

// 模拟 computeScreeningWatchStatus 核心逻辑
const allReviews = db.prepare('SELECT * FROM reviews WHERE film_id = ? AND is_hidden = 0').all(testFilmId);
const screening = db.prepare('SELECT s.*, f.duration as film_duration FROM screenings s LEFT JOIN films f ON s.film_id = f.id WHERE s.id = ?').get(newScreeningId);

function getScreeningEndTimeMs(screeningDate, screeningTime, filmDuration) {
  const [h, m] = String(screeningTime || '00:00').split(':').map(Number);
  const duration = Number(filmDuration) || 120;
  const endDate = new Date(`${screeningDate}T00:00:00`);
  endDate.setHours(h || 0, (m || 0) + duration, 0, 0);
  return endDate.getTime();
}

const endMs = getScreeningEndTimeMs(screening.screening_date, screening.screening_time, screening.film_duration);
const endDate = new Date(endMs);
console.log(`放映散场时间: ${endDate.toLocaleString('zh-CN')}`);

const matchedReview = allReviews.find(r => {
  if (r.watched_date) {
    if (r.watched_date >= screening.screening_date) {
      console.log(`  ✓ review id=${r.id}: watched_date=${r.watched_date} >= ${screening.screening_date}, 匹配该场次`);
      return true;
    }
    if (r.watched_date < screening.screening_date) {
      console.log(`  ✗ review id=${r.id}: watched_date=${r.watched_date} < ${screening.screening_date}, 早于放映日期, 不匹配`);
      return false;
    }
  }
  if (r.created_at) {
    const reviewCreateMs = new Date(String(r.created_at).replace(' ', 'T')).getTime();
    if (reviewCreateMs >= endMs) {
      console.log(`  ✓ review id=${r.id}: created_at=${r.created_at} >= 散场时间, 匹配该场次`);
      return true;
    }
  }
  console.log(`  ? review id=${r.id}: 无明确匹配条件, 不匹配`);
  return false;
});

console.log(`\n结果: 新放映 ${matchedReview ? '已找到匹配 review (不应有补观)' : '未找到匹配 review (应该生成补观提醒)'}`);

// 4. 现在再为花样年华创建一条 watched_date >= 新放映日期的 review，看是否匹配
const insertReview = db.prepare(`
  INSERT INTO reviews (film_id, author, content, rating, mood, watched_date, is_spoiler, likes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const newReviewInfo = insertReview.run(
  testFilmId, '测试用户', '这是针对新放映场次的短评内容，足够长超过10个字', 5, '感动',
  newScreeningDate, 0, 0
);
console.log(`\n创建新 review id=${newReviewInfo.lastInsertRowid}, watched_date=${newScreeningDate} (等于放映日期)`);

const allReviews2 = db.prepare('SELECT * FROM reviews WHERE film_id = ? AND is_hidden = 0 ORDER BY id DESC').all(testFilmId);
const matchedReview2 = allReviews2.find(r => {
  if (r.watched_date) {
    if (r.watched_date >= screening.screening_date) return true;
    if (r.watched_date < screening.screening_date) return false;
  }
  if (r.created_at) {
    const reviewCreateMs = new Date(String(r.created_at).replace(' ', 'T')).getTime();
    if (reviewCreateMs >= endMs) return true;
  }
  return false;
});
console.log(`再次检查: ${matchedReview2 ? '✓ 新 review 正确匹配到新放映 (应该不再生成补观)' : '✗ 错误：未匹配'}`);
if (matchedReview2) {
  console.log(`  匹配到的 review: id=${matchedReview2.id}, watched_date=${matchedReview2.watched_date}, mood=${matchedReview2.mood}`);
}

console.log('\n=== 清理测试数据 ===');
db.prepare('DELETE FROM screenings WHERE id = ?').run(newScreeningId);
db.prepare('DELETE FROM reviews WHERE id = ?').run(newReviewInfo.lastInsertRowid);
console.log('已删除测试放映场次和测试 review');

console.log('\n✅ 验证完成');

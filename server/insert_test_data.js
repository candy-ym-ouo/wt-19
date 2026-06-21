const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'film-notes.db');
const db = new Database(dbPath);

const films = db.prepare('SELECT * FROM films').all();
console.log('现有影片:', films.map(f => `${f.id}:${f.title}`));

const venues = db.prepare('SELECT * FROM venues').all();
console.log('现有影院:', venues.map(v => `${v.id}:${v.name}`));

const insertScreening = db.prepare(`
  INSERT INTO screenings (film_id, venue_id, screening_date, screening_time, venue, location, notes, ticket_status, ticket_open_date, is_changed, change_description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const today = new Date();
const fmt = (d) => d.toISOString().split('T')[0];

// 1天前结束 - 低紧急度
const d1 = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
// 4天前结束 - 中紧急度
const d4 = new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000);
// 10天前结束 - 高紧急度
const d10 = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);

console.log('插入日期:', { d1: fmt(d1), d4: fmt(d4), d10: fmt(d10) });

// film_id 5:八部半 (没有review，需要补短评和心情) - 10天前，高紧急
insertScreening.run(
  films[4].id, venues[0].id, fmt(d10), '19:00', venues[0].name, venues[0].location,
  '费里尼回顾展', 'on_sale', fmt(new Date(d10.getTime() - 3*24*60*60*1000)), 0, ''
);
console.log('插入1: 八部半-10天前(高紧急)');

// film_id 6:乡愁 (没有review) - 4天前，中紧急
insertScreening.run(
  films[5].id, venues[1].id, fmt(d4), '15:30', venues[1].name, venues[1].location,
  '塔可夫斯基专题', 'sold_out', fmt(new Date(d4.getTime() - 5*24*60*60*1000)), 0, ''
);
console.log('插入2: 乡愁-4天前(中紧急)');

// film_id 5:八部半 - 1天前，低紧急
insertScreening.run(
  films[4].id, venues[2].id, fmt(d1), '18:00', venues[2].name, venues[2].location,
  '意大利电影大师展', 'on_sale', fmt(new Date(d1.getTime() - 2*24*60*60*1000)), 1, '地点变更'
);
console.log('插入3: 八部半-1天前(低紧急)');

console.log('✅ 测试数据插入完成');
console.log('当前所有放映:', db.prepare('SELECT id,film_id,screening_date,screening_time FROM screenings ORDER BY screening_date DESC').all());

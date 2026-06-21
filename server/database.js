const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'film-notes.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS films (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    original_title TEXT,
    director TEXT,
    year INTEGER,
    country TEXT,
    genre TEXT,
    duration INTEGER,
    language TEXT,
    synopsis TEXT,
    poster TEXT,
    rating REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS screenings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL,
    screening_date TEXT NOT NULL,
    screening_time TEXT NOT NULL,
    venue TEXT,
    location TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL,
    author TEXT,
    content TEXT NOT NULL,
    rating INTEGER,
    mood TEXT,
    watched_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
  );
`);

const filmCount = db.prepare('SELECT COUNT(*) as count FROM films').get().count;
if (filmCount === 0) {
  const insertFilm = db.prepare(`
    INSERT INTO films (title, original_title, director, year, country, genre, duration, language, synopsis, poster, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertScreening = db.prepare(`
    INSERT INTO screenings (film_id, screening_date, screening_time, venue, location, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (film_id, author, content, rating, mood, watched_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const films = [
    {
      title: '花样年华',
      original_title: 'In the Mood for Love',
      director: '王家卫',
      year: 2000,
      country: '中国香港',
      genre: '剧情/爱情',
      duration: 98,
      language: '粤语',
      synopsis: '1962年的香港，报社编辑周慕云与妻子搬进一幢上海人聚居的公寓，认识了隔壁的陈太太苏丽珍。两人发现各自的配偶有染后，开始互相接触并逐渐产生情感。',
      poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
      rating: 8.7
    },
    {
      title: '重庆森林',
      original_title: 'Chungking Express',
      director: '王家卫',
      year: 1994,
      country: '中国香港',
      genre: '剧情/爱情',
      duration: 102,
      language: '粤语/普通话',
      synopsis: '故事分为两段。第一段讲述失恋的警察223与神秘金发女郎在重庆大厦的邂逅。第二段讲述另一位警察663与快餐店女店员的故事。',
      poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop',
      rating: 8.8
    },
    {
      title: '四百击',
      original_title: 'Les Quatre Cents Coups',
      director: '弗朗索瓦·特吕弗',
      year: 1959,
      country: '法国',
      genre: '剧情',
      duration: 99,
      language: '法语',
      synopsis: '12岁的安托万在学校和家庭中都得不到理解，他逃学、撒谎，最终被送进管教所。在一次逃跑中，他奔向大海，获得了短暂的自由。',
      poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop',
      rating: 8.9
    },
    {
      title: '东京物语',
      original_title: 'Tōkyō Monogatari',
      director: '小津安二郎',
      year: 1953,
      country: '日本',
      genre: '剧情/家庭',
      duration: 136,
      language: '日语',
      synopsis: '一对住在乡下的老夫妇到东京探望已成家的子女，却发现子女们都忙于自己的生活，对他们态度冷淡。只有守寡的二儿媳纪子真心对待他们。',
      poster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop',
      rating: 9.3
    },
    {
      title: '八部半',
      original_title: '8½',
      director: '费德里科·费里尼',
      year: 1963,
      country: '意大利',
      genre: '剧情/奇幻',
      duration: 138,
      language: '意大利语',
      synopsis: '电影导演圭多在筹备新片时陷入创作危机，同时还要处理与妻子、情人、制片人等复杂的人际关系，现实与幻想交织在一起。',
      poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&h=600&fit=crop',
      rating: 8.6
    },
    {
      title: '乡愁',
      original_title: 'Nostalghia',
      director: '安德烈·塔可夫斯基',
      year: 1983,
      country: '苏联/意大利',
      genre: '剧情',
      duration: 125,
      language: '俄语/意大利语',
      synopsis: '俄国诗人戈尔恰科夫到意大利寻访一位作曲家的生平，遇见了被认为是疯子的多米尼克。两人在精神上产生了深深的共鸣。',
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
      rating: 9.1
    }
  ];

  const filmIds = films.map(film => {
    const info = insertFilm.run(
      film.title, film.original_title, film.director, film.year,
      film.country, film.genre, film.duration, film.language,
      film.synopsis, film.poster, film.rating
    );
    return info.lastInsertRowid;
  });

  const screenings = [
    { filmIndex: 0, date: '2026-06-25', time: '19:30', venue: '中国电影资料馆', location: '北京·小西天', notes: '4K修复版' },
    { filmIndex: 1, date: '2026-06-26', time: '20:00', venue: '百老汇电影中心', location: '北京·东直门', notes: '' },
    { filmIndex: 2, date: '2026-06-28', time: '14:00', venue: '上海电影博物馆', location: '上海·徐汇', notes: '特吕弗回顾展' },
    { filmIndex: 3, date: '2026-06-30', time: '18:30', venue: '中国电影资料馆', location: '北京·小西天', notes: '小津安二郎专题' },
    { filmIndex: 4, date: '2026-07-02', time: '19:00', venue: 'UCCA尤伦斯当代艺术中心', location: '北京·798', notes: '' },
    { filmIndex: 0, date: '2026-07-05', time: '15:30', venue: '苏州艺术影院', location: '苏州·工业园区', notes: '' },
    { filmIndex: 5, date: '2026-07-08', time: '19:30', venue: '中国电影资料馆', location: '北京·小西天', notes: '塔可夫斯基纪念展' }
  ];

  screenings.forEach(s => {
    insertScreening.run(filmIds[s.filmIndex], s.date, s.time, s.venue, s.location, s.notes);
  });

  const reviews = [
    { filmIndex: 0, author: '影迷阿明', content: '旗袍、留声机、昏黄的灯光，王家卫把60年代的香港拍成了一场永不褪色的梦。张曼玉和梁朝伟的表演细腻到骨子里，那种欲言又止的情感张力令人窒息。', rating: 5, mood: '感动', watchedDate: '2026-06-15' },
    { filmIndex: 1, author: '电影爱好者', content: 'California Dreamin\' 响起的时候，整个世界都在摇晃。金城武的跑步、梁朝伟的独白、王菲的梦游，这是最自由的电影。', rating: 5, mood: '愉悦', watchedDate: '2026-06-10' },
    { filmIndex: 2, author: '新浪潮信徒', content: '安托万奔向大海的那个长镜头，是电影史上最动人的自由宣言。特吕弗用最朴素的镜头语言，拍出了最深刻的童年孤独。', rating: 5, mood: '沉思', watchedDate: '2026-06-05' },
    { filmIndex: 3, author: '小津粉', content: '低角度、固定镜头、克制的表演，小津安二郎把日本家庭的悲欢离合拍得如水墨画般淡雅。原节子的笑容温暖人心，最后的空镜头令人泪目。', rating: 5, mood: '感动', watchedDate: '2026-05-28' }
  ];

  reviews.forEach(r => {
    insertReview.run(filmIds[r.filmIndex], r.author, r.content, r.rating, r.mood, r.watchedDate);
  });

  db.prepare('INSERT INTO favorites (film_id) VALUES (?)').run(filmIds[0]);
  db.prepare('INSERT INTO favorites (film_id) VALUES (?)').run(filmIds[3]);

  console.log('✅ 示例数据已初始化');
}

module.exports = db;

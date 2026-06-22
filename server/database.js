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
    awards TEXT,
    restoration_version TEXT,
    premiere_info TEXT,
    aliases TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS venues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    capacity INTEGER,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, location)
  );

  CREATE TABLE IF NOT EXISTS screenings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL,
    venue_id INTEGER,
    screening_date TEXT NOT NULL,
    screening_time TEXT NOT NULL,
    venue TEXT,
    location TEXT,
    notes TEXT,
    ticket_status TEXT DEFAULT 'not_open',
    ticket_open_date TEXT,
    is_changed INTEGER DEFAULT 0,
    change_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL,
    author TEXT,
    content TEXT NOT NULL,
    rating INTEGER,
    mood TEXT,
    watched_date TEXT,
    is_spoiler INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    is_hidden INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reporter TEXT,
    status TEXT DEFAULT 'pending',
    handle_note TEXT,
    handler TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    handled_at DATETIME,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL UNIQUE,
    ticket_reminder_enabled INTEGER DEFAULT 0,
    schedule_change_reminder_enabled INTEGER DEFAULT 0,
    watch_status TEXT DEFAULT 'want_to_watch',
    ticket_date TEXT,
    watched_date TEXT,
    plan_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL,
    screening_id INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
    FOREIGN KEY (screening_id) REFERENCES screenings(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    cover_image TEXT,
    type TEXT NOT NULL DEFAULT 'custom',
    filter_director TEXT,
    filter_country TEXT,
    filter_theme TEXT,
    sort_order INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS collection_films (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    film_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
    UNIQUE(collection_id, film_id)
  );

  CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    film_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_manual INTEGER DEFAULT 0,
    reason TEXT,
    algorithm_score REAL DEFAULT 0,
    note TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
    UNIQUE(film_id, is_manual)
  );
`);

const columns = db.prepare("PRAGMA table_info(screenings)").all();
const colNames = columns.map(c => c.name);
if (!colNames.includes('ticket_status')) {
  db.exec(`
    ALTER TABLE screenings ADD COLUMN ticket_status TEXT DEFAULT 'not_open';
    ALTER TABLE screenings ADD COLUMN ticket_open_date TEXT;
    ALTER TABLE screenings ADD COLUMN is_changed INTEGER DEFAULT 0;
    ALTER TABLE screenings ADD COLUMN change_description TEXT;
    ALTER TABLE screenings ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
  `);
}
if (!colNames.includes('venue_id')) {
  db.exec(`
    ALTER TABLE screenings ADD COLUMN venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL;
  `);
}

const venueColumns = db.prepare("PRAGMA table_info(venues)").all();
if (venueColumns.length === 0) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      capacity INTEGER,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, location)
    );
  `);
  const existingVenues = db.prepare("SELECT DISTINCT venue, location FROM screenings WHERE venue IS NOT NULL AND venue != ''").all();
  const insertVenue = db.prepare("INSERT OR IGNORE INTO venues (name, location) VALUES (?, ?)");
  existingVenues.forEach(v => {
    if (v.venue) insertVenue.run(v.venue, v.location || null);
  });
  const updateScreeningVenue = db.prepare(`
    UPDATE screenings SET venue_id = (
      SELECT id FROM venues WHERE name = screenings.venue AND (location = screenings.location OR (location IS NULL AND screenings.location IS NULL))
      LIMIT 1
    ) WHERE venue IS NOT NULL AND venue != ''
  `);
  updateScreeningVenue.run();
}
const favColumns = db.prepare("PRAGMA table_info(favorites)").all();
const favColNames = favColumns.map(c => c.name);
if (!favColNames.includes('ticket_reminder_enabled')) {
  db.exec(`
    ALTER TABLE favorites ADD COLUMN ticket_reminder_enabled INTEGER DEFAULT 0;
    ALTER TABLE favorites ADD COLUMN schedule_change_reminder_enabled INTEGER DEFAULT 0;
    ALTER TABLE favorites ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
  `);
}
if (!favColNames.includes('watch_status')) {
  db.exec(`
    ALTER TABLE favorites ADD COLUMN watch_status TEXT DEFAULT 'want_to_watch';
    ALTER TABLE favorites ADD COLUMN ticket_date TEXT;
    ALTER TABLE favorites ADD COLUMN watched_date TEXT;
    ALTER TABLE favorites ADD COLUMN plan_date TEXT;
  `);
}

const reviewColumns = db.prepare("PRAGMA table_info(reviews)").all();
const reviewColNames = reviewColumns.map(c => c.name);
if (!reviewColNames.includes('is_spoiler')) {
  db.exec(`
    ALTER TABLE reviews ADD COLUMN is_spoiler INTEGER DEFAULT 0;
    ALTER TABLE reviews ADD COLUMN likes INTEGER DEFAULT 0;
    ALTER TABLE reviews ADD COLUMN is_hidden INTEGER DEFAULT 0;
  `);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reporter TEXT,
    status TEXT DEFAULT 'pending',
    handle_note TEXT,
    handler TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    handled_at DATETIME,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
  );
`);

const filmCount = db.prepare('SELECT COUNT(*) as count FROM films').get().count;
if (filmCount === 0) {
  const insertFilm = db.prepare(`
    INSERT INTO films (title, original_title, director, year, country, genre, duration, language, synopsis, poster, rating, awards, restoration_version, premiere_info, aliases)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertScreening = db.prepare(`
    INSERT INTO screenings (film_id, venue_id, screening_date, screening_time, venue, location, notes, ticket_status, ticket_open_date, is_changed, change_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertVenue = db.prepare(`
    INSERT INTO venues (name, location, capacity, notes)
    VALUES (?, ?, ?, ?)
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (film_id, author, content, rating, mood, watched_date, is_spoiler, likes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
      rating: 8.7,
      awards: '第53届戛纳电影节最佳男演员（梁朝伟）、最佳艺术贡献；第37届金马奖最佳女主角、最佳摄影、最佳造型设计、最佳原创音乐',
      restoration_version: '4K修复版',
      premiere_info: '2000-05-20 戛纳电影节首映；2000-09-29 中国香港上映',
      aliases: 'In the Mood for Love / 花樣年華'
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
      rating: 8.8,
      awards: '第31届金马奖最佳剧情片、最佳导演、最佳男主角、最佳剪辑；第14届香港电影金像奖最佳影片、最佳导演、最佳男主角',
      restoration_version: '2K修复版',
      premiere_info: '1994-07-14 中国香港上映',
      aliases: 'Chungking Express / 重慶森林'
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
      rating: 8.9,
      awards: '第12届戛纳电影节最佳导演奖；法国电影凯撒奖最佳影片提名',
      restoration_version: '4K修复版',
      premiere_info: '1959-05-04 戛纳电影节首映；1959-06-03 法国上映',
      aliases: 'The 400 Blows / 胡作非为 / 四百下'
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
      rating: 9.3,
      awards: '第1届柏林国际电影节金熊奖提名；被《视与听》杂志评选为影史十大电影第一名',
      restoration_version: '4K修复版（2020年）',
      premiere_info: '1953-11-03 日本上映',
      aliases: 'Tokyo Story / 東京物語'
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
      rating: 8.6,
      awards: '第36届奥斯卡金像奖最佳外语片、最佳服装设计；第24届威尼斯电影节金狮奖',
      restoration_version: '4K修复版',
      premiere_info: '1963-02-14 意大利上映',
      aliases: 'Eight and a Half / 八又二分之一 / 8½'
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
      rating: 9.1,
      awards: '第36届戛纳电影节最佳导演奖、费比西奖、普普通通评审团奖',
      restoration_version: '2K修复版',
      premiere_info: '1983-05-17 戛纳电影节首映；1984-01-08 意大利上映',
      aliases: 'Nostalgia / Ностальгия / 怀乡'
    }
  ];

  const filmIds = films.map(film => {
    const info = insertFilm.run(
      film.title, film.original_title, film.director, film.year,
      film.country, film.genre, film.duration, film.language,
      film.synopsis, film.poster, film.rating,
      film.awards, film.restoration_version, film.premiere_info, film.aliases
    );
    return info.lastInsertRowid;
  });

  const venues = [
    { name: '中国电影资料馆', location: '北京·小西天', capacity: 500, notes: '艺术影院' },
    { name: '百老汇电影中心', location: '北京·东直门', capacity: 300, notes: '' },
    { name: '上海电影博物馆', location: '上海·徐汇', capacity: 400, notes: '' },
    { name: 'UCCA尤伦斯当代艺术中心', location: '北京·798', capacity: 200, notes: '艺术空间放映' },
    { name: '苏州艺术影院', location: '苏州·工业园区', capacity: 250, notes: '' }
  ];

  const venueMap = {};
  venues.forEach(v => {
    const info = insertVenue.run(v.name, v.location, v.capacity, v.notes);
    venueMap[v.name] = info.lastInsertRowid;
  });

  const screenings = [
    { filmIndex: 0, venueName: '中国电影资料馆', date: '2026-06-25', time: '19:30', venue: '中国电影资料馆', location: '北京·小西天', notes: '4K修复版', ticket_status: 'on_sale', ticket_open_date: '2026-06-20', is_changed: 0, change_description: '' },
    { filmIndex: 1, venueName: '百老汇电影中心', date: '2026-06-26', time: '20:00', venue: '百老汇电影中心', location: '北京·东直门', notes: '', ticket_status: 'not_open', ticket_open_date: '2026-06-23', is_changed: 0, change_description: '' },
    { filmIndex: 2, venueName: '上海电影博物馆', date: '2026-06-28', time: '14:00', venue: '上海电影博物馆', location: '上海·徐汇', notes: '特吕弗回顾展', ticket_status: 'on_sale', ticket_open_date: '2026-06-18', is_changed: 1, change_description: '时间由15:00调整为14:00' },
    { filmIndex: 3, venueName: '中国电影资料馆', date: '2026-06-30', time: '18:30', venue: '中国电影资料馆', location: '北京·小西天', notes: '小津安二郎专题', ticket_status: 'sold_out', ticket_open_date: '2026-06-15', is_changed: 0, change_description: '' },
    { filmIndex: 4, venueName: 'UCCA尤伦斯当代艺术中心', date: '2026-07-02', time: '19:00', venue: 'UCCA尤伦斯当代艺术中心', location: '北京·798', notes: '', ticket_status: 'not_open', ticket_open_date: '2026-06-28', is_changed: 0, change_description: '' },
    { filmIndex: 0, venueName: '苏州艺术影院', date: '2026-07-05', time: '15:30', venue: '苏州艺术影院', location: '苏州·工业园区', notes: '', ticket_status: 'not_open', ticket_open_date: '2026-07-01', is_changed: 0, change_description: '' },
    { filmIndex: 5, venueName: '中国电影资料馆', date: '2026-07-08', time: '19:30', venue: '中国电影资料馆', location: '北京·小西天', notes: '塔可夫斯基纪念展', ticket_status: 'on_sale', ticket_open_date: '2026-06-22', is_changed: 0, change_description: '' }
  ];

  screenings.forEach(s => {
    insertScreening.run(filmIds[s.filmIndex], venueMap[s.venueName] || null, s.date, s.time, s.venue, s.location, s.notes, s.ticket_status, s.ticket_open_date, s.is_changed, s.change_description);
  });

  const reviews = [
    { filmIndex: 0, author: '影迷阿明', content: '旗袍、留声机、昏黄的灯光，王家卫把60年代的香港拍成了一场永不褪色的梦。张曼玉和梁朝伟的表演细腻到骨子里，那种欲言又止的情感张力令人窒息。', rating: 5, mood: '感动', watchedDate: '2026-06-15', isSpoiler: 0, likes: 42 },
    { filmIndex: 1, author: '电影爱好者', content: 'California Dreamin\' 响起的时候，整个世界都在摇晃。金城武的跑步、梁朝伟的独白、王菲的梦游，这是最自由的电影。', rating: 5, mood: '愉悦', watchedDate: '2026-06-10', isSpoiler: 0, likes: 28 },
    { filmIndex: 2, author: '新浪潮信徒', content: '安托万奔向大海的那个长镜头，是电影史上最动人的自由宣言。特吕弗用最朴素的镜头语言，拍出了最深刻的童年孤独。', rating: 5, mood: '沉思', watchedDate: '2026-06-05', isSpoiler: 0, likes: 35 },
    { filmIndex: 3, author: '小津粉', content: '【剧透预警】老夫妇最终先后离世，纪子选择继续守寡，那种淡淡的悲伤贯穿始终。低角度、固定镜头、克制的表演，小津安二郎把日本家庭的悲欢离合拍得如水墨画般淡雅。原节子的笑容温暖人心，最后的空镜头令人泪目。', rating: 5, mood: '感动', watchedDate: '2026-05-28', isSpoiler: 1, likes: 15 }
  ];

  reviews.forEach(r => {
    insertReview.run(filmIds[r.filmIndex], r.author, r.content, r.rating, r.mood, r.watchedDate, r.isSpoiler, r.likes);
  });

  db.prepare('INSERT INTO favorites (film_id, ticket_reminder_enabled, schedule_change_reminder_enabled, watch_status, ticket_date, watched_date, plan_date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(filmIds[0], 1, 1, 'ticketed', '2026-06-21', null, '2026-06-25');
  db.prepare('INSERT INTO favorites (film_id, ticket_reminder_enabled, schedule_change_reminder_enabled, watch_status, ticket_date, watched_date, plan_date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(filmIds[3], 1, 0, 'watched', '2026-06-10', '2026-06-20', '2026-06-20');
  db.prepare('INSERT INTO favorites (film_id, ticket_reminder_enabled, schedule_change_reminder_enabled, watch_status, ticket_date, watched_date, plan_date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(filmIds[2], 1, 1, 'want_to_watch', null, null, null);

  const insertNotification = db.prepare(`
    INSERT INTO notifications (film_id, screening_id, type, title, content)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertNotification.run(filmIds[0], null, 'ticket_on_sale', '《花样年华》已开票', '4K修复版放映场次现已开放购票');
  insertNotification.run(filmIds[2], null, 'schedule_change', '《四百击》放映时间变更', '时间由15:00调整为14:00，请留意');

  const insertCollection = db.prepare(`
    INSERT INTO collections (title, subtitle, description, cover_image, type, filter_director, filter_country, filter_theme, sort_order, is_featured, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCollectionFilm = db.prepare(`
    INSERT INTO collection_films (collection_id, film_id, sort_order, note)
    VALUES (?, ?, ?, ?)
  `);

  const col1 = insertCollection.run(
    '王家卫：都市迷情', 'Wong Kar-wai Retrospective',
    '从重庆大厦到2046号房间，王家卫用光影描绘都市人的孤独与渴望。',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=400&fit=crop',
    'director', '王家卫', null, null, 1, 1, 1
  ).lastInsertRowid;
  insertCollectionFilm.run(col1, filmIds[0], 1, '旗袍摇曳的60年代香港');
  insertCollectionFilm.run(col1, filmIds[1], 2, 'California Dreamin\'');

  const col2 = insertCollection.run(
    '日本电影：物哀之美', 'Japanese Cinema',
    '从小津安二郎的低角度镜头到是枝裕和的家庭叙事，感受日本电影的独特美学。',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&h=400&fit=crop',
    'country', null, '日本', null, 2, 1, 1
  ).lastInsertRowid;
  insertCollectionFilm.run(col2, filmIds[3], 1, '小津安二郎的巅峰之作');

  const col3 = insertCollection.run(
    '诗意光影：电影诗人', 'Poetic Cinema',
    '塔可夫斯基、费里尼、特吕弗——那些用胶片书写诗歌的大师们。',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&h=400&fit=crop',
    'theme', null, null, '诗意', 3, 1, 1
  ).lastInsertRowid;
  insertCollectionFilm.run(col3, filmIds[2], 1, '法国新浪潮的起点');
  insertCollectionFilm.run(col3, filmIds[4], 2, '费里尼的自传式幻想');
  insertCollectionFilm.run(col3, filmIds[5], 3, '塔可夫斯基的精神漫游');

  console.log('✅ 示例数据已初始化');
}

const filmColumns = db.prepare("PRAGMA table_info(films)").all();
const filmColNames = filmColumns.map(c => c.name);
if (!filmColNames.includes('awards')) {
  db.exec(`
    ALTER TABLE films ADD COLUMN awards TEXT;
    ALTER TABLE films ADD COLUMN restoration_version TEXT;
    ALTER TABLE films ADD COLUMN premiere_info TEXT;
    ALTER TABLE films ADD COLUMN aliases TEXT;
  `);
}

const recColumns = db.prepare("PRAGMA table_info(recommendations)").all();
if (recColumns.length === 0) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      film_id INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_manual INTEGER DEFAULT 0,
      reason TEXT,
      algorithm_score REAL DEFAULT 0,
      note TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
      UNIQUE(film_id, is_manual)
    );
  `);
}

module.exports = db;

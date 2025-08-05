const sqlite3 = require('sqlite3').verbose();
const dbPath = './database.sqlite';

// 데이터베이스 연결 생성
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('데이터베이스 연결 실패:', err.message);
  } else {
    console.log('데이터베이스에 성공적으로 연결되었습니다.');
    initializeDatabase();
  }
});

// 데이터베이스 초기화 함수
function initializeDatabase() {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      elo_rating INTEGER DEFAULT 1200,
      games_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const gameHistoryTable = `
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      white_player_id INTEGER NOT NULL,
      black_player_id INTEGER NOT NULL,
      white_player_name TEXT NOT NULL,
      black_player_name TEXT NOT NULL,
      winner TEXT, -- 'white', 'black', 'draw', null for ongoing
      result_type TEXT, -- 'checkmate', 'resignation', 'timeout', 'draw'
      white_elo_before INTEGER,
      black_elo_before INTEGER,
      white_elo_after INTEGER,
      black_elo_after INTEGER,
      elo_change INTEGER,
      move_count INTEGER DEFAULT 0,
      game_duration INTEGER, -- seconds
      moves_pgn TEXT, -- PGN format moves
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (white_player_id) REFERENCES users (id),
      FOREIGN KEY (black_player_id) REFERENCES users (id)
    )
  `;

  const playerStatsTable = `
    CREATE TABLE IF NOT EXISTS player_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      highest_elo INTEGER DEFAULT 1200,
      lowest_elo INTEGER DEFAULT 1200,
      current_streak INTEGER DEFAULT 0,
      longest_win_streak INTEGER DEFAULT 0,
      longest_lose_streak INTEGER DEFAULT 0,
      total_playtime INTEGER DEFAULT 0, -- seconds
      favorite_opening TEXT,
      last_game_date DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `;

  const achievementsTable = `
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_type TEXT NOT NULL,
      achievement_name TEXT NOT NULL,
      description TEXT,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `;

  // 테이블들을 순차적으로 생성
  db.run(usersTable, (err) => {
    if (err) {
      console.error('users 테이블 생성 실패:', err);
    } else {
      console.log('users 테이블이 성공적으로 생성되었거나 이미 존재합니다.');

      // 기존 users 테이블에 새 컬럼들 추가 (ALTER TABLE)
      addColumnsIfNotExists();
    }
  });

  db.run(gameHistoryTable, (err) => {
    if (err) {
      console.error('game_history 테이블 생성 실패:', err);
    } else {
      console.log('game_history 테이블이 성공적으로 생성되었거나 이미 존재합니다.');
    }
  });

  db.run(playerStatsTable, (err) => {
    if (err) {
      console.error('player_stats 테이블 생성 실패:', err);
    } else {
      console.log('player_stats 테이블이 성공적으로 생성되었거나 이미 존재합니다.');
    }
  });

  db.run(achievementsTable, (err) => {
    if (err) {
      console.error('achievements 테이블 생성 실패:', err);
    } else {
      console.log('achievements 테이블이 성공적으로 생성되었거나 이미 존재합니다.');
    }
  });
}

// 기존 users 테이블에 새 컬럼 추가
function addColumnsIfNotExists() {
  const newColumns = [
    'elo_rating INTEGER DEFAULT 1200',
    'games_played INTEGER DEFAULT 0',
    'wins INTEGER DEFAULT 0',
    'losses INTEGER DEFAULT 0',
    'draws INTEGER DEFAULT 0',
    'created_at DATETIME',
    'updated_at DATETIME'
  ];

  newColumns.forEach(column => {
    const columnName = column.split(' ')[0];
    db.run(`ALTER TABLE users ADD COLUMN ${column}`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error(`${columnName} 컬럼 추가 실패:`, err.message);
      }
    });
  });

  // 기존 레코드의 날짜 필드 업데이트
  db.run(`UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`, (err) => {
    if (err && !err.message.includes('no such column')) {
      console.error('created_at 업데이트 실패:', err.message);
    }
  });

  db.run(`UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`, (err) => {
    if (err && !err.message.includes('no such column')) {
      console.error('updated_at 업데이트 실패:', err.message);
    }
  });
}

module.exports = db; 
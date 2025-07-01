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
      password TEXT NOT NULL
    )
  `;

  db.run(usersTable, (err) => {
    if (err) {
      console.error('users 테이블 생성 실패:', err);
    } else {
      console.log('users 테이블이 성공적으로 생성되었거나 이미 존재합니다.');
    }
  });
}

module.exports = db; 
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const db = require('./server/database.js'); // 데이터베이스 설정 가져오기

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// 미들웨어 설정
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 본문 파싱

// 세션 설정
app.use(session({
  store: new SQLiteStore({
    db: 'database.sqlite',
    dir: './'
  }),
  secret: 'your-secret-key', // 실제 프로덕션에서는 더 복잡한 키를 사용하세요.
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24시간
  }
}));

// API 라우트

// 회원가입
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.run(sql, [username, hashedPassword], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ message: '이미 존재하는 사용자 이름입니다.' });
        }
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
      }
      res.status(201).json({ message: '회원가입이 성공적으로 완료되었습니다.', userId: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ message: '비밀번호 해싱 중 오류가 발생했습니다.' });
  }
});

// 로그인
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
  }

  const sql = 'SELECT * FROM users WHERE username = ?';
  db.get(sql, [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
    if (!user) {
      return res.status(401).json({ message: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      // 세션에 사용자 정보 저장
      req.session.userId = user.id;
      req.session.username = user.username;
      res.status(200).json({ message: '로그인 성공', user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ message: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
    }
  });
});

// 로그아웃
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: '로그아웃 실패' });
    }
    res.clearCookie('connect.sid'); // 세션 쿠키 삭제
    res.status(200).json({ message: '로그아웃 성공' });
  });
});

// 로그인 상태 확인
app.get('/api/auth/status', (req, res) => {
  if (req.session.userId) {
    res.status(200).json({
      isLoggedIn: true,
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  } else {
    res.status(200).json({ isLoggedIn: false });
  }
});

let rooms = {};

// 체스 게임 클래스
class ChessGame {
  constructor() {
    this.games = {};
    this.setupSocketEvents();
  }

  // 소켓 이벤트 설정
  setupSocketEvents() {
    io.on('connection', (socket) => {
      console.log('사용자 연결:', socket.id);

      socket.on('getRoomList', () => this.handleGetRoomList(socket));
      socket.on('createRoom', (data) => this.handleCreateRoom(socket, data));
      socket.on('joinRoom', (data) => this.handleJoinRoom(socket, data));
      socket.on('movePiece', (data) => this.handleMovePiece(socket, data));
      socket.on('restartGame', (roomId) => this.handleRestartGame(socket, roomId));
      socket.on('leaveRoom', (roomId) => this.handleLeaveRoom(socket, roomId));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  // 방 목록 요청 처리
  handleGetRoomList(socket) {
    const roomList = [];
    
    for (const roomId in this.games) {
      const room = this.games[roomId];
      if (room.status === 'waiting') {
        roomList.push({
          id: roomId,
          creator: room.creatorName || '익명',
          createdAt: room.createdAt
        });
      }
    }
    
    socket.emit('roomList', roomList);
  }

  // 방 생성 처리
  handleCreateRoom(socket, data) {
    const { roomId, playerName } = data;
    
    if (this.games[roomId]) {
      socket.emit('error', '이미 존재하는 방 아이디입니다.');
      return;
    }
    
    socket.join(roomId);
    this.games[roomId] = this.createNewRoom(socket.id, playerName);
    
    socket.emit('roomCreated', { roomId, color: 'white' });
    console.log(`방 생성: ${roomId}`);
    
    io.emit('roomListUpdated');
  }

  // 방 참가 처리
  handleJoinRoom(socket, data) {
    const { roomId, playerName } = data;
    const room = this.games[roomId];
    
    if (!room) {
      socket.emit('error', '존재하지 않는 방입니다.');
      return;
    }

    if (room.players.black) {
      socket.emit('error', '방이 가득 찼습니다.');
      return;
    }

    socket.join(roomId);
    room.players.black = socket.id;
    room.playerNames.black = playerName || '익명';
    room.status = 'playing';
    
    console.log(`${socket.id}가 ${roomId}에 참가함`);
    
    socket.emit('roomJoined', { 
      roomId, 
      color: 'black', 
      board: room.board,
      opponentName: room.playerNames.white 
    });
    
    io.to(room.players.white).emit('opponentJoined', {
      opponentName: playerName || '익명'
    });
    
    io.emit('roomListUpdated');
    
    setTimeout(() => {
      io.to(roomId).emit('gameStart', { 
        board: room.board, 
        turn: room.currentTurn,
        whitePlayer: room.playerNames.white,
        blackPlayer: room.playerNames.black
      });
    }, 1000);
  }

  // 체스말 이동 처리
  handleMovePiece(socket, data) {
    const { roomId, from, to, color } = data;
    const room = this.games[roomId];

    if (!room || room.currentTurn !== color) {
      socket.emit('error', room ? '당신의 턴이 아닙니다.' : '존재하지 않는 방입니다.');
      return;
    }

    const moveResult = ChessRules.isValidMove(room.board, from, to, color, room.moveHistory, room.castlingRights);
    
    if (moveResult.valid) {
      const gameResult = this.processMove(room, from, to, moveResult);
      
      if (gameResult.gameEnded) {
        this.endGame(roomId, gameResult);
      } else {
        this.continueTurn(roomId, room);
      }
    } else {
      socket.emit('error', '유효하지 않은 이동입니다.');
    }
  }

  // 게임 재시작 처리
  handleRestartGame(socket, roomId) {
    const room = this.games[roomId];
    if (!room) return;

    room.board = ChessRules.initializeBoard();
    room.currentTurn = 'white';
    room.status = 'playing';
    room.moveHistory = [];
    room.castlingRights = { 
      white: { kingSide: true, queenSide: true }, 
      black: { kingSide: true, queenSide: true } 
    };

    io.to(roomId).emit('gameRestarted', {
      board: room.board,
      turn: room.currentTurn
    });
  }

  // 방 나가기 처리
  handleLeaveRoom(socket, roomId) {
    if (!roomId || !this.games[roomId]) return;

    const room = this.games[roomId];
    const isWhitePlayer = room.players.white === socket.id;
    const isBlackPlayer = room.players.black === socket.id;

    if (isWhitePlayer || isBlackPlayer) {
      socket.leave(roomId);
      
      if (isWhitePlayer && room.players.black) {
        room.players.white = room.players.black;
        room.playerNames.white = room.playerNames.black;
        room.players.black = null;
        room.playerNames.black = null;
        room.status = 'waiting';
        
        io.to(room.players.white).emit('becomeHost', {
          color: 'white',
          message: '상대방이 나가서 방장이 되었습니다.'
        });
      } else {
        delete this.games[roomId];
        io.to(roomId).emit('playerLeft');
      }
      
      io.emit('roomListUpdated');
    }
  }

  // 연결 해제 처리
  handleDisconnect(socket) {
    console.log('사용자 연결 해제:', socket.id);
    
    for (const roomId in this.games) {
      const room = this.games[roomId];
      if (room.players.white === socket.id || room.players.black === socket.id) {
        this.handleLeaveRoom(socket, roomId);
        break;
      }
    }
  }

  // 새 방 생성
  createNewRoom(socketId, playerName) {
    return {
      board: ChessRules.initializeBoard(),
      players: { white: socketId, black: null },
      playerNames: { white: playerName || '익명', black: null },
      currentTurn: 'white',
      status: 'waiting',
      creatorName: playerName || '익명',
      createdAt: new Date().toISOString(),
      moveHistory: [],
      castlingRights: { 
        white: { kingSide: true, queenSide: true }, 
        black: { kingSide: true, queenSide: true } 
      }
    };
  }

  // 이동 처리
  processMove(room, from, to, moveResult) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const targetPiece = room.board[toRow][toCol];
    const movingPiece = room.board[fromRow][fromCol];
    
    let gameEnded = false;
    let winner = null;
    let message = '';

    if (targetPiece && targetPiece.type === 'king') {
      gameEnded = true;
      winner = movingPiece.color;
      message = `${targetPiece.color === 'white' ? '백' : '흑'} 왕이 잡혔습니다!`;
    }

    const moveDetails = ChessRules.movePiece(room.board, from, to, moveResult);
    
    if (!room.moveHistory) room.moveHistory = [];
    room.moveHistory.push({
      piece: movingPiece.type,
      color: movingPiece.color,
      from: from,
      to: to,
      capture: targetPiece !== null,
      special: moveDetails.special
    });

    this.updateCastlingRights(room, from, movingPiece);

    return { gameEnded, winner, message, moveDetails };
  }

  // 게임 종료
  endGame(roomId, gameResult) {
    const room = this.games[roomId];
    room.status = 'finished';
    
    io.to(roomId).emit('boardUpdate', {
      board: room.board,
      turn: room.currentTurn,
      status: 'checkmate',
      moveDetails: gameResult.moveDetails
    });
    
    io.to(roomId).emit('gameOver', { 
      winner: gameResult.winner,
      message: gameResult.message
    });
  }

  // 턴 계속
  continueTurn(roomId, room) {
    room.currentTurn = room.currentTurn === 'white' ? 'black' : 'white';
    
    io.to(roomId).emit('boardUpdate', {
      board: room.board,
      turn: room.currentTurn,
      moveDetails: {
        from: room.moveHistory[room.moveHistory.length - 1].from,
        to: room.moveHistory[room.moveHistory.length - 1].to,
        piece: room.moveHistory[room.moveHistory.length - 1].piece,
        capture: room.moveHistory[room.moveHistory.length - 1].capture || false,
        special: room.moveHistory[room.moveHistory.length - 1].special
      }
    });
  }

  // 캐슬링 권한 업데이트
  updateCastlingRights(room, from, piece) {
    const [row, col] = from;
    
    if (piece.type === 'king') {
      if (piece.color === 'white') {
        room.castlingRights.white.kingSide = false;
        room.castlingRights.white.queenSide = false;
      } else {
        room.castlingRights.black.kingSide = false;
        room.castlingRights.black.queenSide = false;
      }
    } else if (piece.type === 'rook') {
      if (piece.color === 'white') {
        if (row === 7 && col === 0) room.castlingRights.white.queenSide = false;
        if (row === 7 && col === 7) room.castlingRights.white.kingSide = false;
      } else {
        if (row === 0 && col === 0) room.castlingRights.black.queenSide = false;
        if (row === 0 && col === 7) room.castlingRights.black.kingSide = false;
      }
    }
  }
}

// 체스 규칙 클래스
class ChessRules {
  // 초기 체스판 설정
  static initializeBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // 검정말 배치
    const blackPieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let col = 0; col < 8; col++) {
      board[0][col] = { type: blackPieces[col], color: 'black' };
      board[1][col] = { type: 'pawn', color: 'black' };
    }
    
    // 흰말 배치
    const whitePieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let col = 0; col < 8; col++) {
      board[7][col] = { type: whitePieces[col], color: 'white' };
      board[6][col] = { type: 'pawn', color: 'white' };
    }
    
    return board;
  }

  // 유효한 이동인지 검증
  static isValidMove(board, from, to, color, moveHistory = [], castlingRights = {}) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    
    if (!this.isValidPosition(fromRow, fromCol) || !this.isValidPosition(toRow, toCol)) {
      return { valid: false };
    }
    
    const piece = board[fromRow][fromCol];
    if (!piece || piece.color !== color) {
      return { valid: false };
    }
    
    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === color) {
      return { valid: false };
    }
    
    return this.validatePieceMove(board, from, to, piece, moveHistory, castlingRights);
  }

  // 말별 이동 검증
  static validatePieceMove(board, from, to, piece, moveHistory, castlingRights) {
    switch (piece.type) {
      case 'pawn':
        return this.validatePawnMove(board, from, to, piece.color, moveHistory);
      case 'rook':
        return this.validateRookMove(board, from, to);
      case 'knight':
        return this.validateKnightMove(from, to);
      case 'bishop':
        return this.validateBishopMove(board, from, to);
      case 'queen':
        return this.validateQueenMove(board, from, to);
      case 'king':
        return this.validateKingMove(board, from, to, castlingRights);
      default:
        return { valid: false };
    }
  }

  // 폰 이동 검증
  static validatePawnMove(board, from, to, color, moveHistory) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    const rowDiff = toRow - fromRow;
    const colDiff = Math.abs(toCol - fromCol);
    
    // 전진 이동
    if (colDiff === 0) {
      if (rowDiff === direction && !board[toRow][toCol]) {
        return { valid: true };
      }
      if (rowDiff === 2 * direction && fromRow === startRow && !board[toRow][toCol] && !board[fromRow + direction][fromCol]) {
        return { valid: true, special: 'double_move' };
      }
    }
    
    // 대각선 공격
    if (colDiff === 1 && rowDiff === direction) {
      if (board[toRow][toCol] && board[toRow][toCol].color !== color) {
        return { valid: true };
      }
      
      // 앙파상
      if (this.canEnPassant(board, from, to, color, moveHistory)) {
        return { valid: true, special: 'en_passant' };
      }
    }
    
    return { valid: false };
  }

  // 룩 이동 검증
  static validateRookMove(board, from, to) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    
    if (fromRow !== toRow && fromCol !== toCol) {
      return { valid: false };
    }
    
    return this.isPathClear(board, from, to) ? { valid: true } : { valid: false };
  }

  // 나이트 이동 검증
  static validateKnightMove(from, to) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2) ? 
      { valid: true } : { valid: false };
  }

  // 비숍 이동 검증
  static validateBishopMove(board, from, to) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    
    if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) {
      return { valid: false };
    }
    
    return this.isPathClear(board, from, to) ? { valid: true } : { valid: false };
  }

  // 퀸 이동 검증
  static validateQueenMove(board, from, to) {
    const rookMove = this.validateRookMove(board, from, to);
    const bishopMove = this.validateBishopMove(board, from, to);
    
    return rookMove.valid || bishopMove.valid ? { valid: true } : { valid: false };
  }

  // 킹 이동 검증
  static validateKingMove(board, from, to, castlingRights) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    
    // 기본 킹 이동 (한 칸)
    if (rowDiff <= 1 && colDiff <= 1) {
      return { valid: true };
    }
    
    // 캐슬링
    if (rowDiff === 0 && colDiff === 2) {
      return this.validateCastling(board, from, to, castlingRights);
    }
    
    return { valid: false };
  }

  // 캐슬링 검증
  static validateCastling(board, from, to, castlingRights) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const piece = board[fromRow][fromCol];
    
    if (piece.type !== 'king' || fromRow !== toRow) {
      return { valid: false };
    }
    
    const isKingSide = toCol > fromCol;
    const rights = castlingRights[piece.color];
    
    if (!rights || (isKingSide && !rights.kingSide) || (!isKingSide && !rights.queenSide)) {
      return { valid: false };
    }
    
    // 경로 확인
    const rookCol = isKingSide ? 7 : 0;
    const rook = board[fromRow][rookCol];
    
    if (!rook || rook.type !== 'rook' || rook.color !== piece.color) {
      return { valid: false };
    }
    
    const startCol = Math.min(fromCol, rookCol);
    const endCol = Math.max(fromCol, rookCol);
    
    for (let col = startCol + 1; col < endCol; col++) {
      if (board[fromRow][col]) {
        return { valid: false };
      }
    }
    
    return { 
      valid: true, 
      special: 'castling',
      rookFrom: [fromRow, rookCol],
      rookTo: [fromRow, isKingSide ? 5 : 3]
    };
  }

  // 앙파상 검증
  static canEnPassant(board, from, to, color, moveHistory) {
    if (!moveHistory.length) return false;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    
    // 마지막 이동이 폰의 두 칸 이동이어야 함
    if (lastMove.piece !== 'pawn' || !lastMove.special || lastMove.special !== 'double_move') {
      return false;
    }
    
    // 같은 행에 있고, 목표 열이 마지막 이동의 목표 열과 같아야 함
    const expectedRow = color === 'white' ? 3 : 4;
    return fromRow === expectedRow && toCol === lastMove.to[1];
  }

  // 경로가 비어있는지 확인
  static isPathClear(board, from, to) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    
    const rowStep = toRow === fromRow ? 0 : (toRow > fromRow ? 1 : -1);
    const colStep = toCol === fromCol ? 0 : (toCol > fromCol ? 1 : -1);
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
      if (board[currentRow][currentCol]) {
        return false;
      }
      currentRow += rowStep;
      currentCol += colStep;
    }
    
    return true;
  }

  // 유효한 위치인지 확인
  static isValidPosition(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  // 말 이동 실행
  static movePiece(board, from, to, moveDetails) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const piece = board[fromRow][fromCol];
    
    // 기본 이동
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    
    let result = { special: moveDetails.special };
    
    // 특수 이동 처리
    if (moveDetails.special === 'castling') {
      const [rookFromRow, rookFromCol] = moveDetails.rookFrom;
      const [rookToRow, rookToCol] = moveDetails.rookTo;
      const rook = board[rookFromRow][rookFromCol];
      
      board[rookToRow][rookToCol] = rook;
      board[rookFromRow][rookFromCol] = null;
    } else if (moveDetails.special === 'en_passant') {
      const capturedPawnRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
      board[capturedPawnRow][toCol] = null;
    }
    
    return result;
  }
}

// 게임 인스턴스 생성
const chessGame = new ChessGame();

// 서버 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 
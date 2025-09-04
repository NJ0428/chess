const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const db = require('./server/database.js'); // 데이터베이스 설정 가져오기
const { EloRatingSystem, GameStatsManager } = require('./server/gameStats.js');

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
  const { username, nickname, password } = req.body;

  if (!username || !nickname || !password) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  // 사용자 이름 유효성 검사 (영어만)
  const usernameRegex = /^[a-zA-Z]+$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ message: '사용자 이름은 영어로만 작성해주세요.' });
  }

  // 비밀번호 유효성 검사 (8자 이상, 영어, 숫자, 특수문자)
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: '비밀번호는 8자 이상이며, 영어, 숫자, 특수문자를 모두 포함해야 합니다.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, nickname, password) VALUES (?, ?, ?)';
    db.run(sql, [username, nickname, hashedPassword], function (err) {
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
      req.session.nickname = user.nickname;
      res.status(200).json({ message: '로그인 성공', user: { id: user.id, username: user.username, nickname: user.nickname } });
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
        username: req.session.username,
        nickname: req.session.nickname
      }
    });
  } else {
    res.status(200).json({ isLoggedIn: false });
  }
});

// 통계 API 엔드포인트들

// 플레이어 통계 조회
app.get('/api/stats/player/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const stats = await GameStatsManager.getPlayerStats(userId);

    if (!stats) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // ELO 등급 정보 추가
    const ratingTier = EloRatingSystem.getRatingTier(stats.elo_rating);

    res.json({
      ...stats,
      rating_tier: ratingTier,
      win_rate: stats.games_played > 0 ? Math.round((stats.wins / stats.games_played) * 100) : 0
    });
  } catch (error) {
    console.error('플레이어 통계 조회 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 내 통계 조회 (로그인된 사용자)
app.get('/api/stats/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  try {
    const stats = await GameStatsManager.getPlayerStats(req.session.userId);
    const ratingTier = EloRatingSystem.getRatingTier(stats.elo_rating);

    res.json({
      ...stats,
      rating_tier: ratingTier,
      win_rate: stats.games_played > 0 ? Math.round((stats.wins / stats.games_played) * 100) : 0
    });
  } catch (error) {
    console.error('내 통계 조회 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 게임 히스토리 조회
app.get('/api/stats/history', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const history = await GameStatsManager.getGameHistory(req.session.userId, limit, offset);

    // 각 게임에 대한 추가 정보 계산
    const enrichedHistory = history.map(game => {
      const isWhitePlayer = game.white_player_id === req.session.userId;
      const playerResult = game.winner === 'draw' ? 'draw' :
        (isWhitePlayer && game.winner === 'white') ||
          (!isWhitePlayer && game.winner === 'black') ? 'win' : 'loss';

      return {
        ...game,
        player_color: isWhitePlayer ? 'white' : 'black',
        player_result: playerResult,
        opponent_name: isWhitePlayer ? game.black_nickname : game.white_nickname,
        player_elo_before: isWhitePlayer ? game.white_elo_before : game.black_elo_before,
        player_elo_after: isWhitePlayer ? game.white_elo_after : game.black_elo_after,
        elo_change: isWhitePlayer ?
          (game.white_elo_after - game.white_elo_before) :
          (game.black_elo_after - game.black_elo_before)
      };
    });

    res.json(enrichedHistory);
  } catch (error) {
    console.error('게임 히스토리 조회 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 리더보드 조회
app.get('/api/stats/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const leaderboard = await GameStatsManager.getLeaderboard(limit);

    // 각 플레이어에 등급 정보 추가
    const enrichedLeaderboard = leaderboard.map((player, index) => ({
      ...player,
      rank: index + 1,
      rating_tier: EloRatingSystem.getRatingTier(player.elo_rating)
    }));

    res.json(enrichedLeaderboard);
  } catch (error) {
    console.error('리더보드 조회 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 업적 조회
app.get('/api/stats/achievements', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  try {
    const achievements = await GameStatsManager.getUserAchievements(req.session.userId);
    res.json(achievements);
  } catch (error) {
    console.error('업적 조회 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 체스 게임 클래스
class ChessGame {
  constructor() {
    this.games = {};
    this.spectators = {};
    this.gameStats = {};
    this.setupSocketEvents();
  }

  setupSocketEvents() {
    io.on('connection', (socket) => {
      console.log('사용자 연결:', socket.id);
      this.handleGetRoomList(socket);

      socket.on('getRoomList', () => this.handleGetRoomList(socket));
      socket.on('getSpectateList', () => this.handleGetSpectateList(socket));
      socket.on('createRoom', (data) => this.handleCreateRoom(socket, data));
      socket.on('joinRoom', (data) => this.handleJoinRoom(socket, data));
      socket.on('spectateRoom', (data) => this.handleSpectateRoom(socket, data));
      socket.on('movePiece', (data) => this.handleMovePiece(socket, data));
      socket.on('restartGame', (roomId) => this.handleRestartGame(socket, roomId));
      socket.on('leaveRoom', (roomId) => this.handleLeaveRoom(socket, roomId));
      socket.on('leaveSpectate', (roomId) => this.handleLeaveSpectate(socket, roomId));
      socket.on('sendChatMessage', (data) => this.handleChatMessage(socket, data));
      socket.on('sendSpectatorMessage', (data) => this.handleSpectatorMessage(socket, data));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  getRoomListData() {
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
    return roomList;
  }

  broadcastRoomList() {
    io.emit('roomList', this.getRoomListData());
  }

  handleGetRoomList(socket) {
    socket.emit('roomList', this.getRoomListData());
  }

  handleGetSpectateList(socket) {
    const spectateList = [];
    for (const roomId in this.games) {
      const room = this.games[roomId];
      if (room.status === 'playing') {
        const spectatorCount = this.spectators[roomId] ? Object.keys(this.spectators[roomId]).length : 0;
        spectateList.push({
          id: roomId,
          whitePlayer: room.playerNames.white || '익명',
          blackPlayer: room.playerNames.black || '익명',
          spectatorCount: spectatorCount,
          moveCount: room.moveHistory ? room.moveHistory.length : 0,
          createdAt: room.createdAt
        });
      }
    }
    spectateList.sort((a, b) => {
      if (b.spectatorCount !== a.spectatorCount) {
        return b.spectatorCount - a.spectatorCount;
      }
      return b.moveCount - a.moveCount;
    });
    socket.emit('spectateList', spectateList);
  }

  handleCreateRoom(socket, data) {
    const { roomId, playerName } = data;
    if (this.games[roomId]) {
      socket.emit('error', '이미 존재하는 방 아이디입니다.');
      return;
    }
    socket.join(roomId);
    this.games[roomId] = this.createNewRoom(socket.id, playerName);
    socket.emit('roomCreated', { roomId, color: 'white', chatHistory: [] });
    console.log(`방 생성: ${roomId}`);
    this.broadcastRoomList();
  }

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
      opponentName: room.playerNames.white,
      chatHistory: room.chatHistory || []
    });
    io.to(room.players.white).emit('opponentJoined', {
      opponentName: playerName || '익명'
    });
    this.broadcastRoomList();
    io.emit('spectateListUpdated');
    setTimeout(async () => {
      io.to(roomId).emit('gameStart', {
        board: room.board,
        turn: room.currentTurn,
        whitePlayer: room.playerNames.white,
        blackPlayer: room.playerNames.black
      });
      if (this.spectators[roomId]) {
        for (const spectatorId in this.spectators[roomId]) {
          io.to(spectatorId).emit('spectateGameStart', {
            board: room.board,
            turn: room.currentTurn,
            whitePlayer: room.playerNames.white,
            blackPlayer: room.playerNames.black
          });
        }
      }
      try {
        const getPlayerIds = `SELECT id, nickname FROM users WHERE nickname IN (?, ?)`;
        db.all(getPlayerIds, [room.playerNames.white, room.playerNames.black], async (err, players) => {
          if (!err && players.length === 2) {
            const whitePlayer = players.find(p => p.nickname === room.playerNames.white);
            const blackPlayer = players.find(p => p.nickname === room.playerNames.black);
            if (whitePlayer && blackPlayer) {
              const gameId = await GameStatsManager.recordGameStart(
                roomId, whitePlayer.id, blackPlayer.id,
                room.playerNames.white, room.playerNames.black
              );
              this.gameStats[roomId] = {
                gameId: gameId,
                whitePlayerId: whitePlayer.id,
                blackPlayerId: blackPlayer.id,
                startTime: Date.now(),
                moveCount: 0,
                moves: []
              };
            }
          }
        });
      } catch (error) {
        console.error('게임 시작 통계 기록 실패:', error);
      }
    }, 1000);
  }

  handleSpectateRoom(socket, data) {
    const { roomId, spectatorName } = data;
    const room = this.games[roomId];
    if (!room) {
      socket.emit('error', '존재하지 않는 방입니다.');
      return;
    }
    if (room.status !== 'playing') {
      socket.emit('error', '진행 중인 게임이 아닙니다.');
      return;
    }
    if (room.players.white === socket.id || room.players.black === socket.id) {
      socket.emit('error', '플레이어는 관전할 수 없습니다.');
      return;
    }
    socket.join(roomId);
    if (!this.spectators[roomId]) {
      this.spectators[roomId] = {};
    }
    this.spectators[roomId][socket.id] = {
      name: spectatorName || '익명',
      joinedAt: new Date().toISOString()
    };
    console.log(`${socket.id}가 ${roomId}를 관전 시작`);
    socket.emit('spectateJoined', {
      roomId,
      board: room.board,
      turn: room.currentTurn,
      whitePlayer: room.playerNames.white,
      blackPlayer: room.playerNames.black,
      moveHistory: room.moveHistory || [],
      spectatorChatHistory: room.spectatorChatHistory || []
    });
    const spectatorCount = Object.keys(this.spectators[roomId]).length;
    io.to(roomId).emit('spectatorJoined', {
      spectatorName: spectatorName || '익명',
      spectatorCount: spectatorCount
    });
    io.emit('spectateListUpdated');
  }

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
    io.to(room.players.white).emit('gameRestarted', {
      board: room.board,
      turn: room.currentTurn
    });
    if (room.players.black) {
      io.to(room.players.black).emit('gameRestarted', {
        board: room.board,
        turn: room.currentTurn
      });
    }
    if (this.spectators[roomId]) {
      for (const spectatorId in this.spectators[roomId]) {
        io.to(spectatorId).emit('spectatorBoardUpdate', {
          board: room.board,
          turn: room.currentTurn
        });
      }
    }
  }

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
        if (this.spectators[roomId]) {
          for (const spectatorId in this.spectators[roomId]) {
            io.to(spectatorId).emit('gameEnded', { reason: '플레이어가 나갔습니다.' });
          }
          delete this.spectators[roomId];
        }
        delete this.games[roomId];
        io.to(roomId).emit('playerLeft');
      }
      this.broadcastRoomList();
      io.emit('spectateListUpdated');
    }
  }

  handleLeaveSpectate(socket, roomId) {
    if (!roomId || !this.spectators[roomId] || !this.spectators[roomId][socket.id]) return;
    socket.leave(roomId);
    delete this.spectators[roomId][socket.id];
    if (Object.keys(this.spectators[roomId]).length === 0) {
      delete this.spectators[roomId];
    }
    console.log(`${socket.id}가 ${roomId} 관전 종료`);
    const spectatorCount = this.spectators[roomId] ? Object.keys(this.spectators[roomId]).length : 0;
    io.to(roomId).emit('spectatorLeft', { spectatorCount });
    io.emit('spectateListUpdated');
  }

  handleDisconnect(socket) {
    console.log('사용자 연결 해제:', socket.id);
    for (const roomId in this.games) {
      const room = this.games[roomId];
      if (room.players.white === socket.id || room.players.black === socket.id) {
        this.handleLeaveRoom(socket, roomId);
        break;
      }
    }
    for (const roomId in this.spectators) {
      if (this.spectators[roomId][socket.id]) {
        this.handleLeaveSpectate(socket, roomId);
        break;
      }
    }
  }

  handleChatMessage(socket, data) {
    const { roomId, message, playerName } = data;
    const room = this.games[roomId];
    if (!room) {
      socket.emit('error', '존재하지 않는 방입니다.');
      return;
    }
    if (!message || message.trim().length === 0) {
      socket.emit('error', '메시지를 입력해주세요.');
      return;
    }
    if (message.length > 200) {
      socket.emit('error', '메시지가 너무 깁니다. (최대 200자)');
      return;
    }
    const isWhitePlayer = room.players.white === socket.id;
    const isBlackPlayer = room.players.black === socket.id;
    if (!isWhitePlayer && !isBlackPlayer) {
      socket.emit('error', '이 방에 참여하지 않은 사용자입니다.');
      return;
    }
    const chatMessage = {
      id: Date.now(),
      message: message.trim(),
      playerName: playerName || '익명',
      playerColor: isWhitePlayer ? 'white' : 'black',
      timestamp: new Date().toISOString(),
      socketId: socket.id,
      type: 'player'
    };
    if (!room.chatHistory) room.chatHistory = [];
    room.chatHistory.push(chatMessage);
    if (room.chatHistory.length > 100) {
      room.chatHistory.shift();
    }
    io.to(room.players.white).emit('chatMessage', chatMessage);
    if (room.players.black) {
      io.to(room.players.black).emit('chatMessage', chatMessage);
    }
    console.log(`[플레이어 채팅] ${roomId} - ${playerName}: ${message}`);
  }

  handleSpectatorMessage(socket, data) {
    const { roomId, message, spectatorName } = data;
    const room = this.games[roomId];
    if (!room) {
      socket.emit('error', '존재하지 않는 방입니다.');
      return;
    }
    if (!this.spectators[roomId] || !this.spectators[roomId][socket.id]) {
      socket.emit('error', '관전자가 아닙니다.');
      return;
    }
    if (!message || message.trim().length === 0) {
      socket.emit('error', '메시지를 입력해주세요.');
      return;
    }
    if (message.length > 200) {
      socket.emit('error', '메시지가 너무 깁니다. (최대 200자)');
      return;
    }
    const spectatorMessage = {
      id: Date.now(),
      message: message.trim(),
      spectatorName: spectatorName || '익명',
      timestamp: new Date().toISOString(),
      socketId: socket.id,
      type: 'spectator'
    };
    if (!room.spectatorChatHistory) room.spectatorChatHistory = [];
    room.spectatorChatHistory.push(spectatorMessage);
    if (room.spectatorChatHistory.length > 100) {
      room.spectatorChatHistory.shift();
    }
    if (this.spectators[roomId]) {
      for (const spectatorId in this.spectators[roomId]) {
        io.to(spectatorId).emit('spectatorChatMessage', spectatorMessage);
      }
    }
    console.log(`[관전자 채팅] ${roomId} - ${spectatorName}: ${message}`);
  }

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
      chatHistory: [],
      spectatorChatHistory: [],
      castlingRights: {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
      }
    };
  }

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
    if (this.gameStats[room.roomId || Object.keys(this.games).find(id => this.games[id] === room)]) {
      const roomId = room.roomId || Object.keys(this.games).find(id => this.games[id] === room);
      this.gameStats[roomId].moveCount++;
      const moveNotation = this.generateMoveNotation(movingPiece, from, to, targetPiece, moveDetails);
      this.gameStats[roomId].moves.push(moveNotation);
    }
    return { gameEnded, winner, message, moveDetails };
  }

  async endGame(roomId, gameResult) {
    const room = this.games[roomId];
    room.status = 'finished';
    io.to(room.players.white).emit('boardUpdate', {
      board: room.board,
      turn: room.currentTurn,
      status: 'checkmate',
      moveDetails: gameResult.moveDetails
    });
    if (room.players.black) {
      io.to(room.players.black).emit('boardUpdate', {
        board: room.board,
        turn: room.currentTurn,
        status: 'checkmate',
        moveDetails: gameResult.moveDetails
      });
    }
    if (this.spectators[roomId]) {
      for (const spectatorId in this.spectators[roomId]) {
        io.to(spectatorId).emit('spectatorBoardUpdate', {
          board: room.board,
          turn: room.currentTurn,
          status: 'checkmate',
          moveDetails: gameResult.moveDetails
        });
      }
    }
    await this.recordGameEnd(roomId, gameResult.winner, 'checkmate');
    io.to(room.players.white).emit('gameOver', {
      winner: gameResult.winner,
      message: gameResult.message
    });
    if (room.players.black) {
      io.to(room.players.black).emit('gameOver', {
        winner: gameResult.winner,
        message: gameResult.message
      });
    }
    if (this.spectators[roomId]) {
      for (const spectatorId in this.spectators[roomId]) {
        io.to(spectatorId).emit('gameEnded', {
          reason: `${gameResult.winner === 'white' ? '백' : '흑'}이 승리했습니다! ${gameResult.message}`
        });
      }
    }
  }

  continueTurn(roomId, room) {
    room.currentTurn = room.currentTurn === 'white' ? 'black' : 'white';
    const moveDetails = {
      from: room.moveHistory[room.moveHistory.length - 1].from,
      to: room.moveHistory[room.moveHistory.length - 1].to,
      piece: room.moveHistory[room.moveHistory.length - 1].piece,
      capture: room.moveHistory[room.moveHistory.length - 1].capture || false,
      special: room.moveHistory[room.moveHistory.length - 1].special
    };
    io.to(room.players.white).emit('boardUpdate', {
      board: room.board,
      turn: room.currentTurn,
      moveDetails: moveDetails
    });
    if (room.players.black) {
      io.to(room.players.black).emit('boardUpdate', {
        board: room.board,
        turn: room.currentTurn,
        moveDetails: moveDetails
      });
    }
    if (this.spectators[roomId]) {
      for (const spectatorId in this.spectators[roomId]) {
        io.to(spectatorId).emit('spectatorBoardUpdate', {
          board: room.board,
          turn: room.currentTurn,
          moveDetails: moveDetails
        });
      }
    }
  }

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

  async recordGameEnd(roomId, winner, resultType) {
    try {
      const gameStats = this.gameStats[roomId];
      if (!gameStats) return;
      const gameDuration = Math.floor((Date.now() - gameStats.startTime) / 1000);
      const movesPgn = this.generatePGN(gameStats.moves);
      await GameStatsManager.recordGameEnd(
        roomId, winner, resultType,
        gameStats.moveCount, gameDuration, movesPgn
      );
      if (gameStats.whitePlayerId) {
        const achievements = await GameStatsManager.checkAndAwardAchievements(gameStats.whitePlayerId);
        if (achievements.length > 0) {
          const room = this.games[roomId];
          if (room && room.players.white) {
            io.to(room.players.white).emit('achievementsEarned', achievements);
          }
        }
      }
      if (gameStats.blackPlayerId) {
        const achievements = await GameStatsManager.checkAndAwardAchievements(gameStats.blackPlayerId);
        if (achievements.length > 0) {
          const room = this.games[roomId];
          if (room && room.players.black) {
            io.to(room.players.black).emit('achievementsEarned', achievements);
          }
        }
      }
      delete this.gameStats[roomId];
    } catch (error) {
      console.error('게임 종료 통계 기록 실패:', error);
    }
  }

  generatePGN(moves) {
    if (!moves || moves.length === 0) return '';
    let pgn = '';
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      pgn += `${moveNumber}. ${moves[i]}`;
      if (moves[i + 1]) {
        pgn += ` ${moves[i + 1]}`;
      }
      pgn += ' ';
    }
    return pgn.trim();
  }

  generateMoveNotation(piece, from, to, capturedPiece, moveDetails) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const fromSquare = files[fromCol] + ranks[fromRow];
    const toSquare = files[toCol] + ranks[toRow];
    let notation = '';
    if (piece.type !== 'pawn') {
      notation += piece.type.charAt(0).toUpperCase();
    }
    if (moveDetails.special === 'castling') {
      return toCol > fromCol ? 'O-O' : 'O-O-O';
    }
    if (capturedPiece) {
      if (piece.type === 'pawn') {
        notation += files[fromCol];
      }
      notation += 'x';
    }
    notation += toSquare;
    if (moveDetails.special === 'en_passant') {
      notation += ' e.p.';
    }
    return notation;
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
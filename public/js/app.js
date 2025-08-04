// Socket.IO 연결 설정
const socket = io();

// 상수 및 설정
const CONSTANTS = {
  AUDIO: {
    CHECK: 'sounds/check.mp3',
    CHECKMATE: 'sounds/checkmate.mp3',
    MOVE: 'sounds/move.mp3',
    CAPTURE: 'sounds/capture.mp3',
    KING_CASTLING: 'sounds/KingCastling.mp3',
    QUEEN_CASTLING: 'sounds/QueenCastling.mp3'
  },
  PIECE_IMAGES: {
    'white': {
      'pawn': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
      'rook': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
      'knight': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
      'bishop': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
      'queen': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
      'king': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg'
    },
    'black': {
      'pawn': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
      'rook': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
      'knight': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
      'bishop': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
      'queen': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
      'king': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
    }
  },
  MOVE_TYPES: {
    VALID_MOVE: 'valid-move',
    VALID_CAPTURE: 'valid-capture',
    VALID_CASTLING: 'valid-castling',
    VALID_EN_PASSANT: 'valid-en-passant'
  }
};

// 게임 상태 관리
const gameState = {
  playerColor: null,
  currentRoom: null,
  gameBoard: null,
  selectedSquare: null,
  myTurn: false,
  currentTurn: 'white',
  playerName: '',
  isSpectating: false,
  spectatorName: '',
  audioLoaded: {
    check: false,
    checkmate: false,
    move: false,
    capture: false,
    'king-castling': false,
    'queen-castling': false
  }
};

// DOM 요소 캐시
const elements = {
  // 로비
  lobby: document.getElementById('lobby'),
  playerNameInput: document.getElementById('playerNameInput'),
  roomIdInput: document.getElementById('roomIdInput'),
  createRoomBtn: document.getElementById('createRoomBtn'),
  refreshRoomListBtn: document.getElementById('refreshRoomListBtn'),
  roomList: document.getElementById('roomList'),
  roomItemTemplate: document.getElementById('roomItemTemplate'),

  // 관전
  spectate: document.getElementById('spectate'),
  spectatorNameInput: document.getElementById('spectatorNameInput'),
  refreshSpectateListBtn: document.getElementById('refreshSpectateListBtn'),
  spectateList: document.getElementById('spectateList'),
  spectateItemTemplate: document.getElementById('spectateItemTemplate'),

  // 관전 게임
  spectateGame: document.getElementById('spectateGame'),
  spectateBoard: document.getElementById('spectateBoard'),
  spectateGameInfo: document.getElementById('spectateGameInfo'),
  spectateCurrentTurn: document.getElementById('spectateCurrentTurn'),
  spectatorCount: document.getElementById('spectatorCount'),
  spectateWhitePlayerInfo: document.getElementById('spectateWhitePlayerInfo'),
  spectateBlackPlayerInfo: document.getElementById('spectateBlackPlayerInfo'),
  leaveSpectateBtn: document.getElementById('leaveSpectateBtn'),
  backToSpectateListBtn: document.getElementById('backToSpectateListBtn'),

  // 관전자 채팅
  spectatorChatMessages: document.getElementById('spectatorChatMessages'),
  spectatorChatInput: document.getElementById('spectatorChatInput'),
  sendSpectatorChatBtn: document.getElementById('sendSpectatorChatBtn'),

  // 대기실
  gameSetup: document.getElementById('gameSetup'),
  waitingMsg: document.getElementById('waitingMsg'),
  roomInfo: document.getElementById('roomInfo'),
  backToLobbyBtn: document.getElementById('backToLobbyBtn'),

  // 게임판
  gameBoard: document.getElementById('gameBoard'),
  board: document.getElementById('board'),
  playerColorEl: document.getElementById('playerColor'),
  currentTurnEl: document.getElementById('currentTurn'),
  gameStatusEl: document.getElementById('gameStatus'),
  whitePlayerInfo: document.getElementById('whitePlayerInfo'),
  blackPlayerInfo: document.getElementById('blackPlayerInfo'),
  restartBtn: document.getElementById('restartBtn'),
  leaveGameBtn: document.getElementById('leaveGameBtn'),
  notificationEl: document.getElementById('notification'),

  // 채팅
  chatMessages: document.getElementById('chatMessages'),
  chatInput: document.getElementById('chatInput'),
  sendChatBtn: document.getElementById('sendChatBtn'),

  // 체스 규칙
  showRulesBtn: document.getElementById('showRulesBtn'),
  chessRulesPanel: document.getElementById('chessRulesPanel'),
  closeRulesBtn: document.getElementById('closeRulesBtn'),

  // 오디오
  audio: {
    check: document.getElementById('check-audio'),
    checkmate: document.getElementById('checkmate-audio'),
    move: document.getElementById('move-audio'),
    capture: document.getElementById('capture-audio'),
    'king-castling': document.getElementById('king-castling-audio'),
    'queen-castling': document.getElementById('queen-castling-audio')
  }
};

// 오디오 관리 클래스
class AudioManager {
  constructor() {
    this.setupAudioElements();
  }

  setupAudioElements() {
    Object.keys(elements.audio).forEach(key => {
      const audio = elements.audio[key];
      if (audio) {
        audio.addEventListener('canplaythrough', () => {
          gameState.audioLoaded[key] = true;
          console.log(`${key} 오디오 로드 완료`);
        });
        audio.addEventListener('error', () => {
          console.log(`${key} 오디오 로드 실패`);
          gameState.audioLoaded[key] = false;
        });
        
        // 로드 상태 초기화
        if (audio.readyState >= 4) {
          gameState.audioLoaded[key] = true;
          console.log(`${key} 오디오 이미 로드됨`);
        }
      } else {
        console.log(`${key} 오디오 요소를 찾을 수 없음`);
      }
    });
  }

  play(type) {
    console.log(`오디오 재생 시도: ${type}`);
    const audio = elements.audio[type];
    
    if (!audio) {
      console.log(`오디오 요소 없음: ${type}`);
      return;
    }
    
    if (!gameState.audioLoaded[type]) {
      console.log(`오디오 로드되지 않음: ${type}`);
      return;
    }
    
    console.log(`오디오 재생: ${type}`);
    audio.currentTime = 0;
    audio.play().catch(error => {
      console.error(`오디오 재생 실패: ${type}`, error);
    });
  }

  // 이동 정보를 분석해서 캐슬링 타입을 감지하는 함수
  static detectCastling(fromRow, fromCol, toRow, toCol, piece) {
    if (piece && piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
      // 킹이 2칸 이동했다면 캐슬링
      if (toCol > fromCol) {
        return 'kingside';  // 오른쪽으로 이동 = 킹사이드 캐슬링
      } else {
        return 'queenside'; // 왼쪽으로 이동 = 퀸사이드 캐슬링
      }
    }
    return null;
  }
}

// UI 관리 클래스
class UIManager {
  static showScreen(screenName) {
    const screens = ['lobby', 'spectate', 'gameSetup', 'gameBoard', 'spectateGame'];
    screens.forEach(screen => {
      if (elements[screen]) {
        elements[screen].style.display = screen === screenName ? 'block' : 'none';
      }
    });
  }

  static showNotification(message) {
    elements.notificationEl.textContent = message;
    elements.notificationEl.style.display = 'block';
    elements.notificationEl.style.opacity = '1';
    
    setTimeout(() => {
      elements.notificationEl.style.opacity = '0';
      setTimeout(() => {
        elements.notificationEl.style.display = 'none';
      }, 300);
    }, 3000);
  }

  static updateGameInfo() {
    if (elements.playerColorEl) {
      const playerColorText = gameState.playerColor 
        ? (gameState.playerColor === 'white' ? '백' : '흑')
        : '대기 중';
      elements.playerColorEl.textContent = `내 색상: ${playerColorText}`;
    }
    if (elements.currentTurnEl) {
      const currentTurnText = gameState.currentTurn 
        ? (gameState.currentTurn === 'white' ? '백' : '흑')
        : '대기 중';
      elements.currentTurnEl.textContent = `현재 턴: ${currentTurnText}`;
    }
  }

  static updateBackgroundColor() {
    const newClass = gameState.currentTurn === 'black' ? 'black-turn' : 'white-turn';
    console.log('배경색 변경:', gameState.currentTurn, '->', newClass);
    document.body.className = newClass;
  }

  static displayRoomList(rooms) {
    elements.roomList.innerHTML = '';
    
    if (rooms.length === 0) {
      const noRoomsMsg = document.createElement('div');
      noRoomsMsg.className = 'no-rooms-message';
      noRoomsMsg.innerHTML = '<i class="fas fa-inbox"></i><p>현재 참가할 수 있는 방이 없습니다.</p>';
      elements.roomList.appendChild(noRoomsMsg);
      return;
    }
    
    rooms.forEach(room => {
      const roomItem = elements.roomItemTemplate.content.cloneNode(true);
      roomItem.querySelector('.room-id').textContent = room.id;
      
      const joinBtn = roomItem.querySelector('.join-btn');
      joinBtn.addEventListener('click', () => RoomManager.joinRoom(room.id));
      
      elements.roomList.appendChild(roomItem);
    });
  }

  static displaySpectateList(games) {
    elements.spectateList.innerHTML = '';
    
    if (games.length === 0) {
      const noGamesMsg = document.createElement('div');
      noGamesMsg.className = 'no-games-message';
      noGamesMsg.innerHTML = '<i class="fas fa-chess-board"></i><p>현재 진행 중인 게임이 없습니다.</p>';
      elements.spectateList.appendChild(noGamesMsg);
      return;
    }
    
    games.forEach(game => {
      const spectateItem = elements.spectateItemTemplate.content.cloneNode(true);
      spectateItem.querySelector('.game-players').textContent = `${game.whitePlayer} vs ${game.blackPlayer}`;
      spectateItem.querySelector('.spectator-count').innerHTML = `<i class="fas fa-eye"></i> ${game.spectatorCount}명 관전`;
      spectateItem.querySelector('.move-count').innerHTML = `<i class="fas fa-chess-pawn"></i> ${game.moveCount}수`;
      
      const spectateBtn = spectateItem.querySelector('.spectate-btn');
      spectateBtn.addEventListener('click', () => SpectateManager.spectateRoom(game.id));
      
      elements.spectateList.appendChild(spectateItem);
    });
  }
}

// 방 관리 클래스
class RoomManager {
  static createRoom() {
    // gameState.playerName은 initializeUser에서 설정됨
    const roomId = elements.roomIdInput.value.trim();
    
    if (!roomId) {
      UIManager.showNotification('방 아이디를 입력해주세요.');
      return;
    }
    
    socket.emit('createRoom', { roomId, playerName: gameState.playerName });
  }

  static joinRoom(roomId) {
    // gameState.playerName은 initializeUser에서 설정됨
    if (!roomId) {
      UIManager.showNotification('방 아이디가 없습니다.');
      return;
    }
    
    socket.emit('joinRoom', { roomId, playerName: gameState.playerName });
  }

  static leaveRoom() {
    if (gameState.currentRoom) {
      socket.emit('leaveRoom', gameState.currentRoom);
      this.backToLobby();
    }
  }

  static backToLobby() {
    Object.assign(gameState, {
      currentRoom: null,
      playerColor: null,
      gameBoard: null,
      selectedSquare: null,
      myTurn: false
    });
    
    UIManager.showScreen('lobby');
    ChatManager.clearChat();
    this.getRoomList();
  }

  static getRoomList() {
    socket.emit('getRoomList');
  }
}

// 관전 관리 클래스
class SpectateManager {
  static spectateRoom(roomId) {
    const spectatorName = elements.spectatorNameInput.value.trim() || gameState.playerName;
    
    if (!spectatorName) {
      UIManager.showNotification('관전자 이름을 입력해주세요.');
      return;
    }
    
    gameState.spectatorName = spectatorName;
    socket.emit('spectateRoom', { roomId, spectatorName });
  }

  static leaveSpectate() {
    if (gameState.currentRoom && gameState.isSpectating) {
      socket.emit('leaveSpectate', gameState.currentRoom);
      this.backToSpectateList();
    }
  }

  static backToSpectateList() {
    Object.assign(gameState, {
      currentRoom: null,
      isSpectating: false,
      gameBoard: null,
      selectedSquare: null
    });
    
    UIManager.showScreen('spectate');
    SpectatorChatManager.clearChat();
    this.getSpectateList();
  }

  static getSpectateList() {
    socket.emit('getSpectateList');
  }
}

// 관전자 채팅 관리 클래스
class SpectatorChatManager {
  static init() {
    if (elements.sendSpectatorChatBtn) {
      elements.sendSpectatorChatBtn.addEventListener('click', this.sendMessage);
    }
    if (elements.spectatorChatInput) {
      elements.spectatorChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
  }

  static sendMessage() {
    const message = elements.spectatorChatInput.value.trim();
    if (!message || !gameState.currentRoom || !gameState.isSpectating) return;

    socket.emit('sendSpectatorMessage', {
      roomId: gameState.currentRoom,
      message: message,
      spectatorName: gameState.spectatorName
    });

    elements.spectatorChatInput.value = '';
  }

  static addMessage(messageData) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message spectator-message';
    
    // 자신의 메시지인지 확인
    const isOwnMessage = messageData.socketId === socket.id;
    messageElement.classList.add(isOwnMessage ? 'own' : 'other');

    // 시간 포맷팅
    const timestamp = new Date(messageData.timestamp);
    const timeString = timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    messageElement.innerHTML = `
      <div class="message-header">${this.escapeHtml(messageData.spectatorName)} <span class="spectator-badge">관전자</span></div>
      <div class="message-text">${this.escapeHtml(messageData.message)}</div>
      <div class="message-time">${timeString}</div>
    `;

    elements.spectatorChatMessages.appendChild(messageElement);
    this.scrollToBottom();
  }

  static loadChatHistory(chatHistory) {
    elements.spectatorChatMessages.innerHTML = '';
    if (!chatHistory || chatHistory.length === 0) {
      elements.spectatorChatMessages.innerHTML = '<div class="no-messages">아직 관전자 채팅이 없습니다.</div>';
      return;
    }

    chatHistory.forEach(message => {
      this.addMessage(message);
    });
  }

  static clearChat() {
    if (elements.spectatorChatMessages) {
      elements.spectatorChatMessages.innerHTML = '<div class="no-messages">아직 관전자 채팅이 없습니다.</div>';
    }
  }

  static scrollToBottom() {
    if (elements.spectatorChatMessages) {
      elements.spectatorChatMessages.scrollTop = elements.spectatorChatMessages.scrollHeight;
    }
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 체스판 렌더링 클래스
class BoardRenderer {
  static render(boardData, boardElement = elements.board) {
    if (!boardData) return;
    
    gameState.gameBoard = boardData;
    boardElement.innerHTML = '';
    
    // 관전 모드일 때는 항상 백 플레이어 시점으로 렌더링
    const isWhite = gameState.isSpectating ? true : (gameState.playerColor === 'white');
    
    // 흑 플레이어일 때는 보드를 뒤집어서 렌더링
    const rowOrder = isWhite ? Array.from({length: 8}, (_, i) => i) : Array.from({length: 8}, (_, i) => 7 - i);
    const colOrder = isWhite ? Array.from({length: 8}, (_, i) => i) : Array.from({length: 8}, (_, i) => 7 - i);
    
    for (let displayRow = 0; displayRow < 8; displayRow++) {
      for (let displayCol = 0; displayCol < 8; displayCol++) {
        const actualRow = rowOrder[displayRow];
        const actualCol = colOrder[displayCol];
        
        const square = this.createSquare(actualRow, actualCol, displayRow, displayCol, gameState.isSpectating);
        const piece = boardData[actualRow][actualCol];
        
        if (piece) {
          square.appendChild(this.createPieceElement(piece));
        }
        
        boardElement.appendChild(square);
      }
    }
    
    if (!gameState.isSpectating) {
      UIManager.updateGameInfo();
      UIManager.updateBackgroundColor();
    }
  }

  static renderSpectateBoard(boardData) {
    this.render(boardData, elements.spectateBoard);
  }

  static createSquare(actualRow, actualCol, displayRow, displayCol, isSpectating = false) {
    const square = document.createElement('div');
    square.className = 'square';
    
    // 체스판 색상은 display 좌표 기준으로 결정
    square.classList.add((displayRow + displayCol) % 2 === 0 ? 'white' : 'black');
    
    // 실제 데이터 좌표 저장
    square.dataset.row = actualRow;
    square.dataset.col = actualCol;
    
    // 관전 모드가 아닐 때만 클릭 이벤트 추가
    if (!isSpectating) {
      square.addEventListener('click', GameLogic.handleSquareClick);
    }
    
    return square;
  }

  static createPieceElement(piece) {
    const pieceEl = document.createElement('img');
    pieceEl.className = 'chess-piece';
    pieceEl.src = CONSTANTS.PIECE_IMAGES[piece.color][piece.type];
    pieceEl.alt = `${piece.color} ${piece.type}`;
    pieceEl.draggable = false;
    
    return pieceEl;
  }

  static clearSelection() {
    document.querySelectorAll('.square').forEach(square => {
      square.classList.remove('selected', ...Object.values(CONSTANTS.MOVE_TYPES));
    });
    gameState.selectedSquare = null;
  }
}

// 게임 로직 클래스
class GameLogic {
  static handleSquareClick(event) {
    console.log('클릭 이벤트 발생! myTurn:', gameState.myTurn, 'playerColor:', gameState.playerColor, 'currentTurn:', gameState.currentTurn);
    
    if (!gameState.myTurn) {
      console.log('내 턴이 아니므로 클릭 무시됨');
      return;
    }
    
    const square = event.currentTarget;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    
    console.log('클릭한 위치:', { row, col });
    
    if (gameState.selectedSquare) {
      GameLogic.handleMoveAttempt(row, col);
    } else {
      GameLogic.handlePieceSelection(row, col, square);
    }
  }

  static handleMoveAttempt(row, col) {
    const [fromRow, fromCol] = gameState.selectedSquare;
    
    socket.emit('movePiece', {
      roomId: gameState.currentRoom,
      from: [fromRow, fromCol],
      to: [row, col],
      color: gameState.playerColor
    });
    
    BoardRenderer.clearSelection();
  }

  static handlePieceSelection(row, col, square) {
    const piece = GameLogic.getPieceAt(row, col);
    
    if (piece && piece.color === gameState.playerColor) {
      BoardRenderer.clearSelection();
      square.classList.add('selected');
      gameState.selectedSquare = [row, col];
      GameLogic.showPossibleMoves(row, col, piece);
    }
  }

  static getPieceAt(row, col) {
    return gameState.gameBoard && gameState.gameBoard[row] ? gameState.gameBoard[row][col] : null;
  }

  static showPossibleMoves(row, col, piece) {
    // 실제로는 서버에서 검증하므로 간단한 시각적 표시만 제공
    const possibleMoves = [];
    
    // 폰의 경우
    if (piece.type === 'pawn') {
      const direction = piece.color === 'white' ? -1 : 1;
      const startRow = piece.color === 'white' ? 6 : 1;
      
      // 앞으로 한 칸
      if (GameLogic.isValidPosition(row + direction, col) && !GameLogic.getPieceAt(row + direction, col)) {
        possibleMoves.push({ row: row + direction, col: col, type: CONSTANTS.MOVE_TYPES.VALID_MOVE });
        
        // 첫 이동시 두 칸
        if (row === startRow && !GameLogic.getPieceAt(row + 2 * direction, col)) {
          possibleMoves.push({ row: row + 2 * direction, col: col, type: CONSTANTS.MOVE_TYPES.VALID_MOVE });
        }
      }
      
      // 대각선 공격
      [-1, 1].forEach(colOffset => {
        const newRow = row + direction;
        const newCol = col + colOffset;
        if (GameLogic.isValidPosition(newRow, newCol)) {
          const targetPiece = GameLogic.getPieceAt(newRow, newCol);
          if (targetPiece && targetPiece.color !== piece.color) {
            possibleMoves.push({ row: newRow, col: newCol, type: CONSTANTS.MOVE_TYPES.VALID_CAPTURE });
          }
        }
      });
      
      // 앙파상 (En passant) - 간단한 검사
      [-1, 1].forEach(colOffset => {
        const newCol = col + colOffset;
        if (GameLogic.isValidPosition(row, newCol)) {
          const sidePiece = GameLogic.getPieceAt(row, newCol);
          if (sidePiece && sidePiece.type === 'pawn' && sidePiece.color !== piece.color) {
            possibleMoves.push({ row: row + direction, col: newCol, type: CONSTANTS.MOVE_TYPES.VALID_EN_PASSANT });
          }
        }
      });
    } else if (piece.type === 'king') {
      // 킹의 일반 이동
      const directions = GameLogic.getPieceDirections(piece.type);
      directions.forEach(direction => {
        const moves = GameLogic.calculateDirectionalMoves(row, col, direction, piece);
        possibleMoves.push(...moves);
      });
      
      // 캐슬링 체크
      const castlingMoves = GameLogic.checkCastlingMoves(row, col, piece);
      possibleMoves.push(...castlingMoves);
    } else {
      // 다른 말들의 경우 간단한 방향성 표시
      const directions = GameLogic.getPieceDirections(piece.type);
      directions.forEach(direction => {
        const moves = GameLogic.calculateDirectionalMoves(row, col, direction, piece);
        possibleMoves.push(...moves);
      });
    }
    
    possibleMoves.forEach(move => {
      const targetSquare = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
      if (targetSquare) {
        targetSquare.classList.add(move.type);
      }
    });
  }

  static calculatePossibleMoves(row, col, piece) {
    const moves = [];
    const directions = GameLogic.getPieceDirections(piece.type);
    
    directions.forEach(direction => {
      const pieceMoves = GameLogic.calculateDirectionalMoves(row, col, direction, piece);
      moves.push(...pieceMoves);
    });
    
    return moves;
  }

  static getPieceDirections(pieceType) {
    const directions = {
      pawn: [[1, 0], [1, 1], [1, -1], [2, 0]],
      rook: [[1, 0], [-1, 0], [0, 1], [0, -1]],
      knight: [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]],
      bishop: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
      queen: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
      king: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    };
    
    return directions[pieceType] || [];
  }

  static calculateDirectionalMoves(row, col, direction, piece) {
    const moves = [];
    const [rowStep, colStep] = direction;
    let newRow = row + rowStep;
    let newCol = col + colStep;
    
    while (GameLogic.isValidPosition(newRow, newCol)) {
      const targetPiece = GameLogic.getPieceAt(newRow, newCol);
      
      if (targetPiece) {
        if (targetPiece.color !== piece.color) {
          moves.push({ 
            row: newRow, 
            col: newCol, 
            type: CONSTANTS.MOVE_TYPES.VALID_CAPTURE 
          });
        }
        break;
      } else {
        moves.push({ 
          row: newRow, 
          col: newCol, 
          type: CONSTANTS.MOVE_TYPES.VALID_MOVE 
        });
      }
      
      if (piece.type === 'pawn' || piece.type === 'knight' || piece.type === 'king') {
        break;
      }
      
      newRow += rowStep;
      newCol += colStep;
    }
    
    return moves;
  }

  static isValidPosition(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  static checkCastlingMoves(row, col, piece) {
    const castlingMoves = [];
    
    // 킹이 초기 위치에 있는지 확인
    const kingStartRow = piece.color === 'white' ? 7 : 0;
    const kingStartCol = 4;
    
    if (row !== kingStartRow || col !== kingStartCol) {
      return castlingMoves;
    }
    
    // 킹사이드 캐슬링 (짧은 캐슬링)
    const kingsideRook = GameLogic.getPieceAt(kingStartRow, 7);
    if (kingsideRook && kingsideRook.type === 'rook' && kingsideRook.color === piece.color) {
      // 킹과 룩 사이에 말이 없는지 확인
      let canCastleKingside = true;
      for (let c = 5; c <= 6; c++) {
        if (GameLogic.getPieceAt(kingStartRow, c)) {
          canCastleKingside = false;
          break;
        }
      }
      
      if (canCastleKingside) {
        castlingMoves.push({ 
          row: kingStartRow, 
          col: 6, 
          type: CONSTANTS.MOVE_TYPES.VALID_CASTLING 
        });
      }
    }
    
    // 퀸사이드 캐슬링 (긴 캐슬링)
    const queensideRook = GameLogic.getPieceAt(kingStartRow, 0);
    if (queensideRook && queensideRook.type === 'rook' && queensideRook.color === piece.color) {
      // 킹과 룩 사이에 말이 없는지 확인
      let canCastleQueenside = true;
      for (let c = 1; c <= 3; c++) {
        if (GameLogic.getPieceAt(kingStartRow, c)) {
          canCastleQueenside = false;
          break;
        }
      }
      
      if (canCastleQueenside) {
        castlingMoves.push({ 
          row: kingStartRow, 
          col: 2, 
          type: CONSTANTS.MOVE_TYPES.VALID_CASTLING 
        });
      }
    }
    
    return castlingMoves;
  }

  static restartGame() {
    socket.emit('restartGame', gameState.currentRoom);
  }
}

// 채팅 관리 클래스
class ChatManager {
  static init() {
    elements.sendChatBtn.addEventListener('click', this.sendMessage);
    elements.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  static sendMessage() {
    const message = elements.chatInput.value.trim();
    if (!message || !gameState.currentRoom) return;

    socket.emit('sendChatMessage', {
      roomId: gameState.currentRoom,
      message: message,
      playerName: gameState.playerName
    });

    elements.chatInput.value = '';
  }

  static addMessage(messageData) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    // 자신의 메시지인지 확인
    const isOwnMessage = messageData.playerColor === gameState.playerColor;
    messageElement.classList.add(isOwnMessage ? 'own' : 'opponent');

    // 시간 포맷팅
    const timestamp = new Date(messageData.timestamp);
    const timeString = timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    messageElement.innerHTML = `
      <div class="message-header">${messageData.playerName}</div>
      <div class="message-text">${this.escapeHtml(messageData.message)}</div>
      <div class="message-time">${timeString}</div>
    `;

    elements.chatMessages.appendChild(messageElement);
    this.scrollToBottom();
  }

  static loadChatHistory(chatHistory) {
    elements.chatMessages.innerHTML = '';
    if (!chatHistory || chatHistory.length === 0) {
      elements.chatMessages.innerHTML = '<div class="no-messages">아직 채팅 메시지가 없습니다.</div>';
      return;
    }

    chatHistory.forEach(message => {
      this.addMessage(message);
    });
  }

  static clearChat() {
    elements.chatMessages.innerHTML = '<div class="no-messages">아직 채팅 메시지가 없습니다.</div>';
  }

  static scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 이벤트 핸들러 설정
class EventManager {
  static init() {
    // 버튼 이벤트
    elements.createRoomBtn.addEventListener('click', RoomManager.createRoom);
    elements.refreshRoomListBtn.addEventListener('click', RoomManager.getRoomList);
    elements.backToLobbyBtn.addEventListener('click', RoomManager.backToLobby);
    elements.restartBtn.addEventListener('click', GameLogic.restartGame);
    elements.leaveGameBtn.addEventListener('click', RoomManager.leaveRoom);
    
    // 관전 버튼 이벤트
    if (elements.refreshSpectateListBtn) {
      elements.refreshSpectateListBtn.addEventListener('click', SpectateManager.getSpectateList);
    }
    if (elements.leaveSpectateBtn) {
      elements.leaveSpectateBtn.addEventListener('click', SpectateManager.leaveSpectate);
    }
    if (elements.backToSpectateListBtn) {
      elements.backToSpectateListBtn.addEventListener('click', SpectateManager.backToSpectateList);
    }
    
    // 체스 규칙 패널
    if (elements.showRulesBtn) {
      elements.showRulesBtn.addEventListener('click', EventManager.toggleRulesPanel);
    }
    if (elements.closeRulesBtn) {
      elements.closeRulesBtn.addEventListener('click', EventManager.closeRulesPanel);
    }

    // 채팅 이벤트 초기화
    ChatManager.init();
    SpectatorChatManager.init();
    
    // 소켓 이벤트
    EventManager.setupSocketEvents();
  }

  static setupSocketEvents() {
    socket.on('roomList', UIManager.displayRoomList);
    socket.on('spectateList', UIManager.displaySpectateList);
    
    socket.on('roomListUpdated', () => {
      RoomManager.getRoomList();
    });
    
    socket.on('spectateListUpdated', () => {
      SpectateManager.getSpectateList();
    });
    
    socket.on('roomCreated', (data) => {
      gameState.currentRoom = data.roomId;
      gameState.playerColor = data.color;
      UIManager.showScreen('gameSetup');
      elements.roomInfo.textContent = `방 아이디: ${data.roomId}`;
      
      // 채팅 히스토리 로드
      if (data.chatHistory) {
        ChatManager.loadChatHistory(data.chatHistory);
      } else {
        ChatManager.clearChat();
      }
    });
    
    socket.on('roomJoined', (data) => {
      gameState.currentRoom = data.roomId;
      gameState.playerColor = data.color;
      UIManager.showScreen('gameSetup');
      elements.roomInfo.textContent = `방 아이디: ${data.roomId}`;
      
      // 채팅 히스토리 로드
      if (data.chatHistory) {
        ChatManager.loadChatHistory(data.chatHistory);
      } else {
        ChatManager.clearChat();
      }
    });
    
    socket.on('opponentJoined', (data) => {
      UIManager.showNotification(`${data.opponentName}님이 게임에 참가했습니다.`);
    });
    
    socket.on('gameStart', (data) => {
      console.log('게임 시작:', data);
      UIManager.showScreen('gameBoard');
      gameState.gameBoard = data.board;
      gameState.currentTurn = data.turn;
      gameState.myTurn = gameState.playerColor === data.turn;
      BoardRenderer.render(data.board);
      UIManager.updateGameInfo();
      UIManager.updateBackgroundColor();
      
      elements.whitePlayerInfo.querySelector('span').textContent = `백: ${data.whitePlayer}`;
      elements.blackPlayerInfo.querySelector('span').textContent = `흑: ${data.blackPlayer}`;
      
      if (gameState.myTurn) {
        UIManager.showNotification('게임이 시작되었습니다. 당신의 턴입니다.');
      } else {
        UIManager.showNotification('게임이 시작되었습니다. 상대방의 턴을 기다리세요.');
      }
    });
    
    socket.on('boardUpdate', (data) => {
      // 턴 정보를 먼저 업데이트
      gameState.currentTurn = data.turn;
      gameState.myTurn = gameState.playerColor === data.turn;
      
      // 보드 렌더링 (이때 올바른 턴 정보로 UI 업데이트됨)
      BoardRenderer.render(data.board);
      
      if (data.moveDetails) {
        // 서버에서 캐슬링 정보를 보낸 경우
        if (data.moveDetails.castling) {
          if (data.moveDetails.castling === 'kingside') {
            audioManager.play('king-castling');
          } else if (data.moveDetails.castling === 'queenside') {
            audioManager.play('queen-castling');
          }
        } 
        // 서버에서 캐슬링 정보를 안 보낸 경우 클라이언트에서 감지
        else if (data.moveDetails.from && data.moveDetails.to) {
          const [fromRow, fromCol] = data.moveDetails.from;
          const [toRow, toCol] = data.moveDetails.to;
          const piece = data.moveDetails.piece;
          
          const castlingType = AudioManager.detectCastling(fromRow, fromCol, toRow, toCol, piece);
          if (castlingType) {
            if (castlingType === 'kingside') {
              audioManager.play('king-castling');
            } else if (castlingType === 'queenside') {
              audioManager.play('queen-castling');
            }
          } else {
            // 일반 이동 또는 캡처 소리 재생
            audioManager.play(data.moveDetails.capture ? 'capture' : 'move');
          }
        } else {
          // 이동 정보가 없으면 기본 소리 재생
          audioManager.play(data.moveDetails.capture ? 'capture' : 'move');
        }
      }
      
      if (data.status === 'checkmate') {
        elements.gameStatusEl.textContent = '체크메이트!';
        elements.restartBtn.style.display = 'block';
      } else if (gameState.myTurn) {
        UIManager.showNotification('당신의 턴입니다.');
      }
    });
    
    socket.on('check', (data) => {
      audioManager.play('check');
      elements.gameStatusEl.textContent = '체크!';
      elements.gameStatusEl.className = 'check-status';
      UIManager.showNotification('체크!');
    });
    
    socket.on('gameOver', (data) => {
      UIManager.showNotification(`게임 종료: ${data.message}`);
      audioManager.play('checkmate');
      gameState.myTurn = false;
      
      elements.gameStatusEl.textContent = `게임 종료: ${data.message}`;
      elements.gameStatusEl.className = data.winner === gameState.playerColor ? 'win-status' : 'lose-status';
      elements.restartBtn.style.display = 'block';
    });
    
    socket.on('gameRestarted', (data) => {
      // 턴 정보를 먼저 업데이트
      gameState.currentTurn = data.turn;
      gameState.myTurn = gameState.playerColor === data.turn;
      
      // 보드 렌더링 (이때 올바른 턴 정보로 UI 업데이트됨)
      BoardRenderer.render(data.board);
      
      elements.gameStatusEl.textContent = '';
      elements.gameStatusEl.className = '';
      elements.restartBtn.style.display = 'none';
      
      UIManager.showNotification('게임이 재시작되었습니다.');
    });
    
    socket.on('playerDisconnected', () => {
      UIManager.showNotification('상대방이 게임에서 나갔습니다.');
      gameState.myTurn = false;
      elements.restartBtn.style.display = 'none';
      
      setTimeout(() => RoomManager.backToLobby(), 3000);
    });
    
    socket.on('playerLeft', () => {
      UIManager.showNotification('상대방이 게임에서 나갔습니다.');
      gameState.myTurn = false;
      elements.restartBtn.style.display = 'none';
      
      setTimeout(() => RoomManager.backToLobby(), 3000);
    });
    
    socket.on('becomeHost', (data) => {
      gameState.playerColor = data.color;
      RoomManager.backToLobby();
      UIManager.showNotification(data.message);
    });
    
    socket.on('waitingForPlayer', (data) => {
      UIManager.showScreen('gameSetup');
      elements.roomInfo.textContent = `방 아이디: ${gameState.currentRoom}`;
      elements.waitingMsg.textContent = data.message;
      UIManager.showNotification(data.message);
    });
    
    socket.on('error', (message) => {
      UIManager.showNotification(message);
    });
    
    // 채팅 메시지 수신
    socket.on('chatMessage', (messageData) => {
      ChatManager.addMessage(messageData);
    });

    // 관전 관련 이벤트
    socket.on('spectateJoined', (data) => {
      gameState.currentRoom = data.roomId;
      gameState.isSpectating = true;
      gameState.currentTurn = data.turn;
      
      UIManager.showScreen('spectateGame');
      BoardRenderer.renderSpectateBoard(data.board);
      
      // 게임 정보 업데이트
      elements.spectateGameInfo.textContent = `방 ID: ${data.roomId}`;
      elements.spectateCurrentTurn.textContent = `현재 턴: ${data.turn === 'white' ? '백' : '흑'}`;
      elements.spectateWhitePlayerInfo.querySelector('span').textContent = `백: ${data.whitePlayer}`;
      elements.spectateBlackPlayerInfo.querySelector('span').textContent = `흑: ${data.blackPlayer}`;
      
      // 관전자 채팅 히스토리 로드
      if (data.spectatorChatHistory) {
        SpectatorChatManager.loadChatHistory(data.spectatorChatHistory);
      } else {
        SpectatorChatManager.clearChat();
      }
      
      UIManager.showNotification(`${data.whitePlayer} vs ${data.blackPlayer} 게임을 관전합니다.`);
    });

    socket.on('spectatorJoined', (data) => {
      if (gameState.isSpectating) {
        elements.spectatorCount.textContent = `관전자: ${data.spectatorCount}명`;
        UIManager.showNotification(`${data.spectatorName}님이 관전을 시작했습니다.`);
      }
    });

    socket.on('spectatorLeft', (data) => {
      if (gameState.isSpectating) {
        elements.spectatorCount.textContent = `관전자: ${data.spectatorCount}명`;
      }
    });

    socket.on('spectateGameStart', (data) => {
      if (gameState.isSpectating) {
        gameState.currentTurn = data.turn;
        BoardRenderer.renderSpectateBoard(data.board);
        elements.spectateCurrentTurn.textContent = `현재 턴: ${data.turn === 'white' ? '백' : '흑'}`;
        UIManager.showNotification('게임이 시작되었습니다!');
      }
    });

    socket.on('spectatorBoardUpdate', (data) => {
      if (gameState.isSpectating) {
        gameState.currentTurn = data.turn;
        BoardRenderer.renderSpectateBoard(data.board);
        elements.spectateCurrentTurn.textContent = `현재 턴: ${data.turn === 'white' ? '백' : '흑'}`;
        
        // 관전자도 이동 소리 재생
        if (data.moveDetails) {
          if (data.moveDetails.castling) {
            if (data.moveDetails.castling === 'kingside') {
              audioManager.play('king-castling');
            } else if (data.moveDetails.castling === 'queenside') {
              audioManager.play('queen-castling');
            }
          } else if (data.moveDetails.from && data.moveDetails.to) {
            const [fromRow, fromCol] = data.moveDetails.from;
            const [toRow, toCol] = data.moveDetails.to;
            const piece = data.moveDetails.piece;
            
            const castlingType = AudioManager.detectCastling(fromRow, fromCol, toRow, toCol, piece);
            if (castlingType) {
              if (castlingType === 'kingside') {
                audioManager.play('king-castling');
              } else if (castlingType === 'queenside') {
                audioManager.play('queen-castling');
              }
            } else {
              audioManager.play(data.moveDetails.capture ? 'capture' : 'move');
            }
          } else {
            audioManager.play(data.moveDetails.capture ? 'capture' : 'move');
          }
        }
      }
    });

    socket.on('gameEnded', (data) => {
      if (gameState.isSpectating) {
        UIManager.showNotification(`게임이 종료되었습니다: ${data.reason}`);
        setTimeout(() => {
          SpectateManager.backToSpectateList();
        }, 3000);
      }
    });

    socket.on('spectatorChatMessage', (messageData) => {
      if (gameState.isSpectating) {
        SpectatorChatManager.addMessage(messageData);
      }
    });
  }

  static toggleRulesPanel() {
    const panel = elements.chessRulesPanel;
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  }

  static closeRulesPanel() {
    elements.chessRulesPanel.style.display = 'none';
  }
}

// 전역 인스턴스
const audioManager = new AudioManager();

// 오디오 테스트 함수
function testAllAudio() {
  console.log('=== 오디오 테스트 시작 ===');
  Object.keys(elements.audio).forEach(key => {
    console.log(`${key}: 요소=${!!elements.audio[key]}, 로드됨=${gameState.audioLoaded[key]}`);
  });
  console.log('=== 오디오 테스트 종료 ===');
}

// 게임 상태 디버깅 함수
function debugGameState() {
  console.log('=== 게임 상태 디버깅 ===');
  console.log('플레이어 색상:', gameState.playerColor);
  console.log('현재 턴:', gameState.currentTurn);
  console.log('내 턴인가?:', gameState.myTurn);
  console.log('현재 방:', gameState.currentRoom);
  console.log('선택된 말:', gameState.selectedSquare);
  console.log('게임 보드 존재?:', !!gameState.gameBoard);
  console.log('Socket 연결됨?:', socket.connected);
  console.log('=====================');
}

// 초기화
function init() {
  console.log('게임 초기화 시작');
  
  initializeUser();

  const audioManager = new AudioManager();
  
  EventManager.init();
  setupNavigation();

  // 초기 UI 업데이트
  UIManager.updateGameInfo();

  // 모든 오디오 테스트
  // testAllAudio();
}

// 네비게이션 설정
function setupNavigation() {
  // 네비게이션 링크 이벤트 설정
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      
      if (href === '#lobby') {
        e.preventDefault();
        UIManager.showScreen('lobby');
        RoomManager.getRoomList();
      } else if (href === '#spectate') {
        e.preventDefault();
        UIManager.showScreen('spectate');
        SpectateManager.getSpectateList();
      } else if (href === '#gameBoard') {
        e.preventDefault();
        if (gameState.currentRoom && !gameState.isSpectating) {
          UIManager.showScreen('gameBoard');
        } else {
          UIManager.showNotification('현재 진행 중인 게임이 없습니다.');
        }
      }
    });
  });
}

// 사용자 정보 초기화
async function initializeUser() {
  try {
    const response = await fetch('/api/auth/status');
    const authData = await response.json();

    if (authData.isLoggedIn) {
      gameState.playerName = authData.user.nickname;
      elements.playerNameInput.value = authData.user.nickname;
      elements.playerNameInput.readOnly = true;
      
      // 관전자 이름도 기본값으로 설정
      if (elements.spectatorNameInput) {
        elements.spectatorNameInput.value = authData.user.nickname;
      }
    } else {
      alert('로그인이 필요합니다.');
      window.location.href = '/login.html';
    }
  } catch (error) {
    console.error('사용자 정보 로드 실패:', error);
    alert('사용자 정보를 가져오는 데 실패했습니다. 다시 로그인해주세요.');
    window.location.href = '/login.html';
  }
}

// DOM 로드가 완료되면 초기화 함수 실행
document.addEventListener('DOMContentLoaded', init); 
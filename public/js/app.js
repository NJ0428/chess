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
  isAIGame: false,
  spectatorName: '',
  timeControl: null,
  timers: null,
  lastMove: null, // {from:[r,c], to:[r,c]}
  hint: {
    hintsUsed: 0,
    maxHints: 3,
    active: false,
    usedAtMoves: new Set() // 힌트를 사용한 수 번호 추적
  },
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

  // AI 대전
  createAIGameBtn: document.getElementById('createAIGameBtn'),
  aiDifficultySelect: document.getElementById('aiDifficultySelect'),

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

  // 테마 설정
  openThemeBtn: document.getElementById('openThemeBtn'),
  themeModal: document.getElementById('themeModal'),
  closeThemeBtn: document.getElementById('closeThemeBtn'),
  cancelThemeBtn: document.getElementById('cancelThemeBtn'),
  saveThemeBtn: document.getElementById('saveThemeBtn'),
  boardThemeSwatches: document.getElementById('boardThemeSwatches'),
  pieceThemeSwatches: document.getElementById('pieceThemeSwatches'),
  showCoordsToggle: document.getElementById('showCoordsToggle'),
  coordsToggleTrack: document.getElementById('coordsToggleTrack'),
  coordsToggleThumb: document.getElementById('coordsToggleThumb'),
  showLastMoveToggle: document.getElementById('showLastMoveToggle'),
  showMoveHintsToggle: document.getElementById('showMoveHintsToggle'),
  showCheckHighlightToggle: document.getElementById('showCheckHighlightToggle'),
  boardThemeName: document.getElementById('boardThemeName'),
  themePreviewBoard: document.getElementById('themePreviewBoard'),
  themeSaveMsg: document.getElementById('themeSaveMsg'),

  // 기보 재생
  replayBtn: document.getElementById('replayBtn'),
  replayModal: document.getElementById('replayModal'),
  closeReplayBtn: document.getElementById('closeReplayBtn'),
  replayBoard: document.getElementById('replayBoard'),
  replayPositionLabel: document.getElementById('replayPositionLabel'),
  replayFirstBtn: document.getElementById('replayFirstBtn'),
  replayPrevBtn: document.getElementById('replayPrevBtn'),
  replayNextBtn: document.getElementById('replayNextBtn'),
  replayLastBtn: document.getElementById('replayLastBtn'),
  replayAutoPlayBtn: document.getElementById('replayAutoPlayBtn'),
  replaySpeedSelect: document.getElementById('replaySpeedSelect'),
  replayMoveList: document.getElementById('replayMoveList'),

  // 분석
  analyzeBtn: document.getElementById('analyzeBtn'),
  analysisProgressBar: document.getElementById('analysisProgressBar'),
  analysisProgressFill: document.getElementById('analysisProgressFill'),
  analysisProgressText: document.getElementById('analysisProgressText'),
  evalBarOuter: document.getElementById('evalBarOuter'),
  evalBarWhite: document.getElementById('evalBarWhite'),
  evalBarBlack: document.getElementById('evalBarBlack'),
  evalLabelTop: document.getElementById('evalLabelTop'),
  evalLabelBottom: document.getElementById('evalLabelBottom'),
  evalScoreDisplay: document.getElementById('evalScoreDisplay'),
  evalGraphContainer: document.getElementById('evalGraphContainer'),
  evalGraph: document.getElementById('evalGraph'),
  analysisSummary: document.getElementById('analysisSummary'),
  moveAnalysisPanel: document.getElementById('moveAnalysisPanel'),
  moveQualityBadge: document.getElementById('moveQualityBadge'),
  moveCpLoss: document.getElementById('moveCpLoss'),
  bestMoveInfo: document.getElementById('bestMoveInfo'),
  bestMoveText: document.getElementById('bestMoveText'),

  // 힌트
  hintBtn: document.getElementById('hintBtn'),
  hintCountBadge: document.getElementById('hintCountBadge'),

  // 무르기
  takebackBtn: document.getElementById('takebackBtn'),
  takebackCountBadge: document.getElementById('takebackCountBadge'),
  takebackDialog: document.getElementById('takebackDialog'),
  takebackDialogMsg: document.getElementById('takebackDialogMsg'),
  takebackAcceptBtn: document.getElementById('takebackAcceptBtn'),
  takebackRejectBtn: document.getElementById('takebackRejectBtn'),

  // 무승부 제안
  drawOfferBtn: document.getElementById('drawOfferBtn'),
  drawDialog: document.getElementById('drawDialog'),
  drawDialogMsg: document.getElementById('drawDialogMsg'),
  drawAcceptBtn: document.getElementById('drawAcceptBtn'),
  drawRejectBtn: document.getElementById('drawRejectBtn'),

  // 타이머
  timeModeSelect: document.getElementById('timeModeSelect'),
  incrementGroup: document.getElementById('incrementGroup'),
  incrementSelect: document.getElementById('incrementSelect'),
  whiteTimer: document.getElementById('whiteTimer'),
  blackTimer: document.getElementById('blackTimer'),

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

// 타이머 관리 클래스
class TimerManager {
  static formatTime(ms) {
    if (ms <= 0) return '0:00';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  static update(data) {
    const { white, black, activeColor } = data;
    if (elements.whiteTimer) {
      elements.whiteTimer.textContent = this.formatTime(white);
      elements.whiteTimer.className = 'player-timer' + (activeColor === 'white' ? ' active' : '');
      if (white > 0 && white < 30000) elements.whiteTimer.classList.add('low-time');
    }
    if (elements.blackTimer) {
      elements.blackTimer.textContent = this.formatTime(black);
      elements.blackTimer.className = 'player-timer' + (activeColor === 'black' ? ' active' : '');
      if (black > 0 && black < 30000) elements.blackTimer.classList.add('low-time');
    }
  }

  static show() {
    if (elements.whiteTimer) elements.whiteTimer.style.display = 'inline-block';
    if (elements.blackTimer) elements.blackTimer.style.display = 'inline-block';
  }

  static hide() {
    if (elements.whiteTimer) elements.whiteTimer.style.display = 'none';
    if (elements.blackTimer) elements.blackTimer.style.display = 'none';
  }

  static init(timeControl, timers) {
    gameState.timeControl = timeControl;
    gameState.timers = timers;
    if (timeControl && timeControl.enabled && timers) {
      this.show();
      this.update({ white: timers.white, black: timers.black, activeColor: 'white' });
    } else {
      this.hide();
    }
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
    const playerName = elements.playerNameInput.value.trim();
    const roomId = elements.roomIdInput.value.trim();

    if (!playerName) {
      UIManager.showNotification('플레이어 이름이 필요합니다. 로그인 상태를 확인해주세요.');
      return;
    }

    if (!roomId) {
      UIManager.showNotification('방 아이디를 입력해주세요.');
      return;
    }

    const timeModes = { blitz: 3 * 60 * 1000, rapid: 10 * 60 * 1000, classic: 30 * 60 * 1000 };
    const modeValue = elements.timeModeSelect ? elements.timeModeSelect.value : 'none';
    const timeControl = modeValue !== 'none'
      ? { enabled: true, initial: timeModes[modeValue], increment: elements.incrementSelect ? parseInt(elements.incrementSelect.value) : 0 }
      : { enabled: false };

    gameState.playerName = playerName;
    socket.emit('createRoom', { roomId, playerName: playerName, timeControl });
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
      myTurn: false,
      isAIGame: false,
      timeControl: null,
      timers: null
    });

    UIManager.showScreen('lobby');
    TimerManager.hide();
    ChatManager.clearChat();
    HintManager.hide();
    HintManager.reset();
    // 채팅 카드 복원
    const chatCard = document.getElementById('chatCard');
    if (chatCard) chatCard.style.display = '';
    this.getRoomList();
  }

  static getRoomList() {
    socket.emit('getRoomList');
  }

  static createAIGame() {
    const playerName = elements.playerNameInput.value.trim();
    const difficulty = elements.aiDifficultySelect ? elements.aiDifficultySelect.value : 'medium';
    if (!playerName) {
      UIManager.showNotification('플레이어 이름이 필요합니다. 로그인 상태를 확인해주세요.');
      return;
    }
    gameState.playerName = playerName;
    socket.emit('createAIGame', { playerName, difficulty });
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
    const rowOrder = isWhite ? Array.from({ length: 8 }, (_, i) => i) : Array.from({ length: 8 }, (_, i) => 7 - i);
    const colOrder = isWhite ? Array.from({ length: 8 }, (_, i) => i) : Array.from({ length: 8 }, (_, i) => 7 - i);

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

    // 테마 적용
    ThemeManager.applyAll([boardElement]);

    // 마지막 이동 / 체크 하이라이트 (메인 보드만)
    if (boardElement === elements.board) {
      if (gameState.lastMove) {
        this.applyLastMoveHighlight(gameState.lastMove.from, gameState.lastMove.to);
      }
      this.applyCheckHighlight(boardData, gameState.currentTurn);
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

    // 좌표 레이블 추가
    const FILES = ['a','b','c','d','e','f','g','h'];
    if (displayRow === 7) {
      // 파일 레이블 (a-h)
      const fileLabel = document.createElement('span');
      fileLabel.className = 'coord-label coord-file';
      fileLabel.textContent = FILES[actualCol];
      square.appendChild(fileLabel);
    }
    if (displayCol === 0) {
      // 랭크 레이블 (1-8)
      const rankLabel = document.createElement('span');
      rankLabel.className = 'coord-label coord-rank';
      rankLabel.textContent = 8 - actualRow;
      square.appendChild(rankLabel);
    }

    // 관전 모드가 아닐 때만 클릭 이벤트 추가
    if (!isSpectating) {
      square.addEventListener('click', GameLogic.handleSquareClick);
    }

    return square;
  }

  static createPieceElement(piece) {
    if (ThemeManager.current.pieceTheme === 'unicode') {
      const span = document.createElement('span');
      span.className = 'piece-unicode';
      span.textContent = ThemeManager.PIECE_UNICODE[piece.color][piece.type];
      span.style.color = piece.color === 'white' ? '#ffffff' : '#1a1a2e';
      return span;
    }
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

  static applyLastMoveHighlight(from, to) {
    if (!ThemeManager.current.showLastMove || !from || !to) return;
    const fromSq = document.querySelector(`#board .square[data-row="${from[0]}"][data-col="${from[1]}"]`);
    const toSq   = document.querySelector(`#board .square[data-row="${to[0]}"][data-col="${to[1]}"]`);
    if (fromSq) fromSq.classList.add('last-move-from');
    if (toSq)   toSq.classList.add('last-move-to');
  }

  static applyCheckHighlight(board, color) {
    if (!ThemeManager.current.showCheckHighlight || !board) return;
    if (!GameLogic.isKingInCheck(board, color)) return;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'king' && p.color === color) {
          const sq = document.querySelector(`#board .square[data-row="${r}"][data-col="${c}"]`);
          if (sq) sq.classList.add('king-in-check');
          return;
        }
      }
    }
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
      if (ThemeManager.current.showMoveHints) {
        GameLogic.showPossibleMoves(row, col, piece);
      }
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

  // ── 체크 감지 (클라이언트 사이드) ──
  static isKingInCheck(board, color) {
    let kr = -1, kc = -1;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'king' && p.color === color) { kr = r; kc = c; }
      }
    }
    if (kr === -1) return false;
    const opp = color === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] && board[r][c].color === opp) {
          if (this._canAttack(board, r, c, kr, kc)) return true;
        }
      }
    }
    return false;
  }

  static _canAttack(board, fr, fc, tr, tc) {
    const piece = board[fr][fc];
    if (!piece) return false;
    const dr = tr - fr, dc = tc - fc;
    switch (piece.type) {
      case 'pawn': {
        const dir = piece.color === 'white' ? -1 : 1;
        return dr === dir && Math.abs(dc) === 1;
      }
      case 'knight':
        return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
      case 'rook':
        return this._straightClear(board, fr, fc, tr, tc);
      case 'bishop':
        return this._diagonalClear(board, fr, fc, tr, tc);
      case 'queen':
        return this._straightClear(board, fr, fc, tr, tc) || this._diagonalClear(board, fr, fc, tr, tc);
      case 'king':
        return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
      default: return false;
    }
  }

  static _straightClear(board, fr, fc, tr, tc) {
    if (fr !== tr && fc !== tc) return false;
    const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc);
    let r = fr + dr, c = fc + dc;
    while (r !== tr || c !== tc) { if (board[r][c]) return false; r += dr; c += dc; }
    return true;
  }

  static _diagonalClear(board, fr, fc, tr, tc) {
    if (Math.abs(tr - fr) !== Math.abs(tc - fc)) return false;
    const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc);
    let r = fr + dr, c = fc + dc;
    while (r !== tr || c !== tc) { if (board[r][c]) return false; r += dr; c += dc; }
    return true;
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
    if (elements.createAIGameBtn) {
      elements.createAIGameBtn.addEventListener('click', RoomManager.createAIGame);
    }
    elements.refreshRoomListBtn.addEventListener('click', RoomManager.getRoomList);
    elements.backToLobbyBtn.addEventListener('click', RoomManager.leaveRoom); // 대기실에서 나갈 때 방을 떠나도록 수정
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

    // 시간 모드 변경 이벤트
    if (elements.timeModeSelect) {
      elements.timeModeSelect.addEventListener('change', () => {
        if (elements.incrementGroup) {
          elements.incrementGroup.style.display = elements.timeModeSelect.value !== 'none' ? 'block' : 'none';
        }
      });
    }

    // 채팅 이벤트 초기화
    ChatManager.init();
    SpectatorChatManager.init();

    // 힌트 이벤트 초기화
    HintManager.initEvents();

    // 무르기 / 무승부 이벤트 초기화
    TakebackManager.initEvents();
    DrawManager.initEvents();

    // 소켓 이벤트
    EventManager.setupSocketEvents();
  }

  static setupSocketEvents() {
    socket.on('roomList', UIManager.displayRoomList);
    socket.on('spectateList', UIManager.displaySpectateList);

    

    socket.on('spectateListUpdated', () => {
      SpectateManager.getSpectateList();
    });

    socket.on('aiGameCreated', (data) => {
      gameState.currentRoom = data.roomId;
      gameState.playerColor = data.color;
      gameState.isAIGame = true;
      gameState.currentTurn = data.turn;
      gameState.myTurn = true;
      gameState.gameBoard = data.board;

      UIManager.showScreen('gameBoard');
      BoardRenderer.render(data.board);
      UIManager.updateGameInfo();
      UIManager.updateBackgroundColor();

      if (elements.whitePlayerInfo) {
        elements.whitePlayerInfo.querySelector('span').textContent = `백: ${data.playerName}`;
      }
      if (elements.blackPlayerInfo) {
        const diffLabel = data.aiDifficulty === 'easy' ? '쉬움' : data.aiDifficulty === 'hard' ? '어려움' : '보통';
        elements.blackPlayerInfo.querySelector('span').textContent = `흑: AI (${diffLabel})`;
      }
      // AI 게임에서는 채팅 숨기기
      const chatCard = document.getElementById('chatCard');
      if (chatCard) chatCard.style.display = 'none';

      // 힌트 초기화 및 표시
      HintManager.reset();
      HintManager.show();

      // AI 대전: 무르기/무승부 숨기기
      TakebackManager.hide();
      DrawManager.hide();

      UIManager.showNotification('AI 대전 시작! 당신은 백 (선공)입니다.');
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

    socket.on('timerUpdate', (data) => {
      TimerManager.update(data);
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

      TimerManager.init(data.timeControl, data.timers);

      gameState.lastMove = null;

      // 힌트 초기화 및 표시
      HintManager.reset();
      HintManager.show();

      // 무르기/무승부 초기화 및 표시
      TakebackManager.reset();
      TakebackManager.show();
      DrawManager.reset();
      DrawManager.show();

      if (gameState.myTurn) {
        UIManager.showNotification('게임이 시작되었습니다. 당신의 턴입니다.');
      } else {
        UIManager.showNotification('게임이 시작되었습니다. 상대방의 턴을 기다리세요.');
      }
    });

    socket.on('boardUpdate', (data) => {
      // 힌트 사용 기록 처리 (이동 완료)
      const moveIdx = ReplayManager.boardHistory ? ReplayManager.boardHistory.length : 0;
      HintManager.onMoveMade(moveIdx);

      // 턴 정보를 먼저 업데이트
      gameState.currentTurn = data.turn;
      gameState.myTurn = gameState.playerColor === data.turn;

      // 마지막 이동 저장
      if (data.moveDetails && data.moveDetails.from && data.moveDetails.to) {
        gameState.lastMove = { from: data.moveDetails.from, to: data.moveDetails.to };
      }

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
        HintManager.hide();
        TakebackManager.hide();
        DrawManager.hide();
      } else {
        // 체크 여부 클라이언트 감지
        const inCheck = GameLogic.isKingInCheck(data.board, data.turn);
        if (inCheck) {
          audioManager.play('check');
          elements.gameStatusEl.textContent = '체크!';
          elements.gameStatusEl.className = 'check-status';
          UIManager.showNotification('체크!');
        } else if (gameState.myTurn) {
          UIManager.showNotification('당신의 턴입니다.');
        }
        HintManager.updateButton();
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
      if (data.winner === 'draw' || data.winner === null) {
        elements.gameStatusEl.className = 'draw-status';
      } else {
        elements.gameStatusEl.className = data.winner === gameState.playerColor ? 'win-status' : 'lose-status';
      }
      elements.restartBtn.style.display = 'block';
      HintManager.hide();
      TakebackManager.hide();
      DrawManager.hide();

      if (data.moveHistory && data.boardHistory && data.moveHistory.length > 0) {
        ReplayManager.setData(data.moveHistory, data.boardHistory);
        AnalysisManager.reset();
        if (elements.replayBtn) elements.replayBtn.style.display = 'block';
      }
    });

    socket.on('analysisProgress', (data) => {
      AnalysisManager.onProgress(data);
    });

    socket.on('analysisComplete', (data) => {
      AnalysisManager.onComplete(data);
    });

    socket.on('analysisError', (msg) => {
      AnalysisManager.onError(msg);
    });

    socket.on('hintResult', (data) => {
      HintManager.onHintResult(data);
    });

    socket.on('hintError', (msg) => {
      HintManager.onHintError(msg);
    });

    // 무르기 이벤트
    socket.on('takebackPending', (data) => {
      TakebackManager.onPending(data);
    });

    socket.on('takebackRequested', (data) => {
      TakebackManager.showDialog(data);
    });

    socket.on('takebackAccepted', (data) => {
      TakebackManager.hideDialog();
      TakebackManager.onAccepted(data);
    });

    socket.on('takebackRejected', (data) => {
      TakebackManager.onRejected(data);
    });

    socket.on('takebackCancelled', (data) => {
      TakebackManager.onCancelled(data);
    });

    socket.on('takebackError', (msg) => {
      TakebackManager.pendingRequest = false;
      TakebackManager.updateButton();
      UIManager.showNotification(`무르기 오류: ${msg}`);
    });

    // 무승부 이벤트
    socket.on('drawOfferPending', (data) => {
      DrawManager.onOfferPending(data);
    });

    socket.on('drawOffered', (data) => {
      DrawManager.showDialog(data);
    });

    socket.on('drawRejected', (data) => {
      DrawManager.onRejected(data);
    });

    socket.on('drawCancelled', (data) => {
      DrawManager.onCancelled(data);
    });

    socket.on('drawError', (msg) => {
      UIManager.showNotification(`무승부 오류: ${msg}`);
    });

    socket.on('gameRestarted', (data) => {
      gameState.currentTurn = data.turn;
      gameState.myTurn = gameState.playerColor === data.turn;

      BoardRenderer.render(data.board);

      elements.gameStatusEl.textContent = '';
      elements.gameStatusEl.className = '';
      elements.restartBtn.style.display = 'none';
      if (elements.replayBtn) elements.replayBtn.style.display = 'none';
      HintManager.reset();
      HintManager.show();

      if (!gameState.isAIGame) {
        TakebackManager.reset();
        TakebackManager.show();
        DrawManager.reset();
        DrawManager.show();
      }

      TimerManager.init(data.timeControl, data.timers);

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

    // 업적 획득 알림
    socket.on('achievementsEarned', (achievements) => {
      achievements.forEach(achievement => {
        UIManager.showNotification(`🏆 새로운 업적: ${achievement.name}`);
      });
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

// 테마 관리 클래스
class ThemeManager {
  static BOARD_THEMES = {
    classic: { name: '클래식', light: '#e4e4e4', dark: '#6c6c6c' },
    wood:    { name: '나무',    light: '#f0d9b5', dark: '#b58863' },
    blue:    { name: '블루',   light: '#dee3e6', dark: '#8ca2ad' },
    green:   { name: '그린',   light: '#ffffdd', dark: '#86a666' },
    dark:    { name: '다크',   light: '#b0b0b0', dark: '#2d2d2d' },
    purple:  { name: '퍼플',   light: '#e8e0f0', dark: '#7c5c9e' },
  };

  static PIECE_UNICODE = {
    white: { king:'♔', queen:'♕', rook:'♖', bishop:'♗', knight:'♘', pawn:'♙' },
    black: { king:'♚', queen:'♛', rook:'♜', bishop:'♝', knight:'♞', pawn:'♟' },
  };

  // 현재 적용된 설정 (로컬 상태)
  static current = { boardTheme: 'classic', pieceTheme: 'neo', showCoordinates: true, showLastMove: true, showMoveHints: true, showCheckHighlight: true };
  // 모달에서 임시 선택 중인 설정
  static pending = { boardTheme: 'classic', pieceTheme: 'neo', showCoordinates: true, showLastMove: true, showMoveHints: true, showCheckHighlight: true };

  /* ── 로드 / 저장 ── */
  static async load() {
    // 로컬스토리지에서 먼저 적용 (즉시 반영)
    const saved = this._fromStorage();
    this.current = { ...saved };
    this.pending = { ...saved };
    this.applyAll();

    // 로그인 상태라면 서버 설정으로 덮어씀
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const local = this._fromStorage();
        this.current = {
          boardTheme: data.board_theme || 'classic',
          pieceTheme: data.piece_theme || 'neo',
          showCoordinates: data.show_coordinates !== 0,
          showLastMove: local.showLastMove !== undefined ? local.showLastMove : true,
          showMoveHints: local.showMoveHints !== undefined ? local.showMoveHints : true,
          showCheckHighlight: local.showCheckHighlight !== undefined ? local.showCheckHighlight : true,
        };
        this.pending = { ...this.current };
        this._toStorage(this.current);
        this.applyAll();
      }
    } catch (_) {}
  }

  static async save() {
    this.current = { ...this.pending };
    this._toStorage(this.current);
    this.applyAll();

    // 로그인 시 서버에 저장
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board_theme: this.current.boardTheme,
          piece_theme: this.current.pieceTheme,
          show_coordinates: this.current.showCoordinates ? 1 : 0,
        }),
      });
    } catch (_) {}
  }

  static _fromStorage() {
    try {
      const raw = localStorage.getItem('chessThemeSettings');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { boardTheme: 'classic', pieceTheme: 'neo', showCoordinates: true, showLastMove: true, showMoveHints: true, showCheckHighlight: true };
  }

  static _toStorage(settings) {
    try { localStorage.setItem('chessThemeSettings', JSON.stringify(settings)); } catch (_) {}
  }

  /* ── 적용 ── */
  static applyAll(boards = null) {
    const targets = boards || [elements.board, elements.spectateBoard, elements.replayBoard];
    targets.forEach(b => { if (b) this._applyToBoard(b); });
  }

  static _applyToBoard(boardEl) {
    // 보드 테마 CSS 클래스
    Object.keys(this.BOARD_THEMES).forEach(t => boardEl.classList.remove(`board-theme-${t}`));
    if (this.current.boardTheme !== 'classic') {
      boardEl.classList.add(`board-theme-${this.current.boardTheme}`);
    }
    // 좌표 표시 클래스
    boardEl.classList.toggle('show-coords', this.current.showCoordinates);
    // 기물 테마 속성
    boardEl.dataset.pieceTheme = this.current.pieceTheme;
  }

  /* ── 미리보기 ── */
  static renderPreview() {
    const board = elements.themePreviewBoard;
    if (!board) return;
    board.innerHTML = '';

    // board 테마 적용
    const prev = { ...this.current };
    this.current = { ...this.pending };
    this._applyToBoard(board);
    this.current = prev;

    const previewPieces = [
      [null, { color:'black', type:'rook' }, null, { color:'black', type:'king' }],
      [{ color:'black', type:'pawn' }, null, { color:'black', type:'pawn' }, null],
      [null, { color:'white', type:'pawn' }, null, { color:'white', type:'pawn' }],
      [{ color:'white', type:'rook' }, null, { color:'white', type:'king' }, null],
    ];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const sq = document.createElement('div');
        sq.className = 'square ' + ((r + c) % 2 === 0 ? 'white' : 'black');
        const piece = previewPieces[r][c];
        if (piece) {
          if (this.pending.pieceTheme === 'unicode') {
            const span = document.createElement('span');
            span.className = 'piece-unicode';
            span.textContent = this.PIECE_UNICODE[piece.color][piece.type];
            span.style.color = piece.color === 'white' ? '#fff' : '#1a1a2e';
            sq.appendChild(span);
          } else {
            const img = document.createElement('img');
            img.className = 'chess-piece';
            img.src = CONSTANTS.PIECE_IMAGES[piece.color][piece.type];
            img.draggable = false;
            sq.appendChild(img);
          }
        }
        board.appendChild(sq);
      }
    }
    board.style.gridTemplateColumns = 'repeat(4, 1fr)';
    board.style.gridTemplateRows    = 'repeat(4, 1fr)';
  }

  /* ── 모달 UI ── */
  static open() {
    this.pending = { ...this.current };
    this._updateModalUI();
    this.renderPreview();
    if (elements.themeModal) elements.themeModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  static close() {
    if (elements.themeModal) elements.themeModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  static _updateModalUI() {
    // 보드 테마 스와치 활성화
    if (elements.boardThemeSwatches) {
      elements.boardThemeSwatches.querySelectorAll('.theme-swatch').forEach(sw => {
        sw.classList.toggle('active', sw.dataset.boardTheme === this.pending.boardTheme);
      });
      const theme = this.BOARD_THEMES[this.pending.boardTheme];
      if (elements.boardThemeName && theme) {
        elements.boardThemeName.textContent = theme.name;
      }
    }
    // 기물 테마
    if (elements.pieceThemeSwatches) {
      elements.pieceThemeSwatches.querySelectorAll('[data-piece-theme]').forEach(sw => {
        sw.style.borderColor = sw.dataset.pieceTheme === this.pending.pieceTheme
          ? 'var(--primary-color)' : 'transparent';
      });
    }
    // 좌표 토글
    this._updateToggleUI('coords', this.pending.showCoordinates);
    this._updateToggleUI('lastMove', this.pending.showLastMove);
    this._updateToggleUI('moveHints', this.pending.showMoveHints);
    this._updateToggleUI('checkHighlight', this.pending.showCheckHighlight);
  }

  static _updateToggleUI(key, on) {
    // key: 'coords' | 'lastMove' | 'moveHints' | 'checkHighlight'
    const ids = {
      coords:         { track: 'coordsToggleTrack',         thumb: 'coordsToggleThumb',         chk: 'showCoordsToggle' },
      lastMove:       { track: 'lastMoveToggleTrack',       thumb: 'lastMoveToggleThumb',       chk: 'showLastMoveToggle' },
      moveHints:      { track: 'moveHintsToggleTrack',      thumb: 'moveHintsToggleThumb',      chk: 'showMoveHintsToggle' },
      checkHighlight: { track: 'checkHighlightToggleTrack', thumb: 'checkHighlightToggleThumb', chk: 'showCheckHighlightToggle' },
    };
    const m = ids[key];
    if (!m) return;
    const track = document.getElementById(m.track);
    const thumb = document.getElementById(m.thumb);
    const chk   = document.getElementById(m.chk);
    if (track) track.style.background = on ? 'var(--primary-color)' : 'var(--border-color)';
    if (thumb) thumb.style.left = on ? '24px' : '2px';
    if (chk)   chk.checked = on;
  }

  static initEvents() {
    if (elements.openThemeBtn) {
      elements.openThemeBtn.addEventListener('click', () => ThemeManager.open());
    }
    if (elements.closeThemeBtn) {
      elements.closeThemeBtn.addEventListener('click', () => ThemeManager.close());
    }
    if (elements.cancelThemeBtn) {
      elements.cancelThemeBtn.addEventListener('click', () => ThemeManager.close());
    }
    if (elements.themeModal) {
      elements.themeModal.addEventListener('click', e => {
        if (e.target === elements.themeModal) ThemeManager.close();
      });
    }

    // 보드 테마 스와치 클릭
    if (elements.boardThemeSwatches) {
      elements.boardThemeSwatches.addEventListener('click', e => {
        const sw = e.target.closest('.theme-swatch');
        if (!sw) return;
        ThemeManager.pending.boardTheme = sw.dataset.boardTheme;
        ThemeManager._updateModalUI();
        ThemeManager.renderPreview();
      });
    }

    // 기물 테마 클릭
    if (elements.pieceThemeSwatches) {
      elements.pieceThemeSwatches.addEventListener('click', e => {
        const sw = e.target.closest('[data-piece-theme]');
        if (!sw) return;
        ThemeManager.pending.pieceTheme = sw.dataset.pieceTheme;
        ThemeManager._updateModalUI();
        ThemeManager.renderPreview();
      });
    }

    // 좌표 토글
    // 토글 공통 헬퍼: checkboxId, pendingKey, toggleKey
    const bindToggle = (checkboxId, trackId, pendingKey, toggleKey) => {
      const chk = document.getElementById(checkboxId);
      const track = document.getElementById(trackId);
      const update = (val) => {
        ThemeManager.pending[pendingKey] = val;
        ThemeManager._updateToggleUI(toggleKey, val);
        ThemeManager.renderPreview();
      };
      if (chk) chk.addEventListener('change', e => update(e.target.checked));
      if (track) {
        track.parentElement && track.parentElement.addEventListener('click', () => update(!ThemeManager.pending[pendingKey]));
      }
    };

    bindToggle('showCoordsToggle',         'coordsToggleTrack',         'showCoordinates',  'coords');
    bindToggle('showLastMoveToggle',        'lastMoveToggleTrack',       'showLastMove',     'lastMove');
    bindToggle('showMoveHintsToggle',       'moveHintsToggleTrack',      'showMoveHints',    'moveHints');
    bindToggle('showCheckHighlightToggle',  'checkHighlightToggleTrack', 'showCheckHighlight','checkHighlight');

    // 저장
    if (elements.saveThemeBtn) {
      elements.saveThemeBtn.addEventListener('click', async () => {
        await ThemeManager.save();
        // 현재 게임판 다시 렌더링
        if (gameState.gameBoard) BoardRenderer.render(gameState.gameBoard);
        if (elements.themeSaveMsg) {
          elements.themeSaveMsg.textContent = '✓ 저장되었습니다.';
          elements.themeSaveMsg.style.display = 'block';
          setTimeout(() => {
            elements.themeSaveMsg.style.display = 'none';
            ThemeManager.close();
          }, 1000);
        } else {
          ThemeManager.close();
        }
      });
    }
  }
}

// 기보 재생 관리 클래스
// ─── 게임 분석 매니저 ──────────────────────────────────────────
class AnalysisManager {
  static positionEvals = [];   // evalCp (백 기준) per board position
  static moveAnalysis  = [];   // {quality, cpLoss, bestMoveUCI} per move
  static isAnalyzing   = false;

  // 품질 → 표시 정보 매핑
  static QUALITY_INFO = {
    best:       { label: '★ 최선',      color: '#27ae60', bg: 'rgba(39,174,96,0.15)',  badge: '★' },
    excellent:  { label: '! 훌륭한',    color: '#2ecc71', bg: 'rgba(46,204,113,0.12)', badge: '!' },
    good:       { label: '⊕ 좋은',      color: '#3498db', bg: 'rgba(52,152,219,0.12)', badge: '⊕' },
    inaccuracy: { label: '?! 부정확',   color: '#f39c12', bg: 'rgba(243,156,18,0.15)', badge: '?!' },
    mistake:    { label: '? 실수',      color: '#e67e22', bg: 'rgba(230,126,34,0.15)', badge: '?' },
    blunder:    { label: '?? 블런더',   color: '#e74c3c', bg: 'rgba(231,76,60,0.18)',  badge: '??' }
  };

  static reset() {
    this.positionEvals = [];
    this.moveAnalysis  = [];
    this.isAnalyzing   = false;
    this.hideProgress();
    if (elements.evalGraphContainer) elements.evalGraphContainer.style.display = 'none';
    if (elements.evalScoreDisplay)   elements.evalScoreDisplay.textContent = '';
    if (elements.moveAnalysisPanel)  elements.moveAnalysisPanel.style.display = 'none';
    if (elements.analysisSummary)    elements.analysisSummary.innerHTML = '';
    this.updateEvalBar(0);
  }

  static request() {
    if (this.isAnalyzing) return;
    if (!ReplayManager.moveHistory.length) {
      UIManager.showNotification('분석할 게임 데이터가 없습니다.');
      return;
    }
    this.isAnalyzing = true;
    this.showProgress(0);
    socket.emit('requestAnalysis', {
      moveHistory:  ReplayManager.moveHistory,
      boardHistory: ReplayManager.boardHistory
    });
  }

  static onProgress({ percent }) {
    if (elements.analysisProgressFill) elements.analysisProgressFill.style.width = percent + '%';
    if (elements.analysisProgressText) elements.analysisProgressText.textContent = percent + '%';
  }

  static onComplete({ positionEvals, moveAnalysis }) {
    this.isAnalyzing   = false;
    this.positionEvals = positionEvals || [];
    this.moveAnalysis  = moveAnalysis  || [];
    this.hideProgress();
    if (elements.evalGraphContainer) elements.evalGraphContainer.style.display = 'block';
    // 현재 국면 eval 바 업데이트
    const idx = ReplayManager.currentIndex;
    if (this.positionEvals[idx] !== undefined) this.updateEvalBar(this.positionEvals[idx]);
    // 수 목록 새로 그리기 (배지 포함)
    ReplayManager.renderMoveList();
    // 그래프 그리기
    this.renderGraph();
    // 분석 요약
    this.renderSummary();
    // 현재 수 분석 패널 업데이트
    this.updateMovePanel(idx);
    UIManager.showNotification('게임 분석 완료!');
  }

  static onError(msg) {
    this.isAnalyzing = false;
    this.hideProgress();
    UIManager.showNotification('분석 오류: ' + msg);
  }

  static showProgress(percent) {
    if (elements.analysisProgressBar) elements.analysisProgressBar.style.display = 'block';
    if (elements.analysisProgressFill) elements.analysisProgressFill.style.width = percent + '%';
    if (elements.analysisProgressText) elements.analysisProgressText.textContent = percent + '%';
  }

  static hideProgress() {
    if (elements.analysisProgressBar) elements.analysisProgressBar.style.display = 'none';
  }

  // evalCp: 백 기준 센티폰 (양수=백 유리, 음수=흑 유리)
  static updateEvalBar(evalCp) {
    if (!elements.evalBarWhite) return;
    const capped = Math.max(-600, Math.min(600, evalCp));
    const whiteH  = 50 + (capped / 600) * 50;   // 0~100 %
    const blackH  = 100 - whiteH;
    elements.evalBarWhite.style.height = whiteH + '%';
    elements.evalBarBlack.style.height = blackH + '%';

    // 평가 레이블 (점수 표기)
    const abs = Math.abs(evalCp);
    let label;
    if (abs >= 9000)      label = evalCp > 0 ? 'M' : '-M';
    else                  label = (evalCp >= 0 ? '+' : '') + (evalCp / 100).toFixed(1);

    if (elements.evalLabelTop)    elements.evalLabelTop.textContent    = evalCp <= 0 ? label.replace('+','').replace('M','M') : '';
    if (elements.evalLabelBottom) elements.evalLabelBottom.textContent  = evalCp >= 0 ? label : '';
    if (elements.evalScoreDisplay) {
      elements.evalScoreDisplay.textContent = label;
      elements.evalScoreDisplay.style.color = evalCp >= 0 ? '#e0e0e0' : '#9b59b6';
    }
  }

  // 현재 수에 대한 분석 패널 업데이트
  static updateMovePanel(boardIndex) {
    if (!elements.moveAnalysisPanel || !this.moveAnalysis.length) {
      if (elements.moveAnalysisPanel) elements.moveAnalysisPanel.style.display = 'none';
      return;
    }
    const moveIdx = boardIndex - 1; // moveAnalysis[0] = 첫번째 수
    if (moveIdx < 0 || moveIdx >= this.moveAnalysis.length) {
      elements.moveAnalysisPanel.style.display = 'none';
      return;
    }
    const ma = this.moveAnalysis[moveIdx];
    const qi = this.QUALITY_INFO[ma.quality] || this.QUALITY_INFO.good;
    elements.moveAnalysisPanel.style.display = 'block';
    if (elements.moveQualityBadge) {
      elements.moveQualityBadge.textContent = qi.label;
      elements.moveQualityBadge.style.cssText = `color:${qi.color};background:${qi.bg};padding:2px 8px;border-radius:4px;font-size:0.85rem;font-weight:700;`;
    }
    if (elements.moveCpLoss) {
      elements.moveCpLoss.textContent = ma.cpLoss > 0 ? `-${ma.cpLoss}cp` : '최선의 수';
    }
    // 최선 수 표시
    if (ma.bestMoveUCI && ma.quality !== 'best' && elements.bestMoveInfo) {
      elements.bestMoveInfo.style.display = 'block';
      if (elements.bestMoveText) elements.bestMoveText.textContent = this.uciToSAN(ma.bestMoveUCI, boardIndex - 1);
    } else if (elements.bestMoveInfo) {
      elements.bestMoveInfo.style.display = 'none';
    }
  }

  // UCI → 간단한 대수기보 변환 (예: e2e4 → e4)
  static uciToSAN(uci) {
    if (!uci || uci.length < 4) return uci || '';
    const cols = ['a','b','c','d','e','f','g','h'];
    const toCol  = uci.charCodeAt(2) - 97;
    const toRow  = 8 - parseInt(uci[3]);
    if (toCol < 0 || toCol > 7 || toRow < 0 || toRow > 7) return uci;
    return cols[toCol] + (8 - toRow);
  }

  // 승률 그래프 렌더링
  static renderGraph() {
    const canvas = elements.evalGraph;
    if (!canvas || !this.positionEvals.length) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const evals = this.positionEvals;
    ctx.clearRect(0, 0, w, h);

    // 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // 중앙선 (50%)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (evals.length < 2) return;

    // 포인트 계산
    const pts = evals.map((e, i) => {
      const x = (i / (evals.length - 1)) * w;
      const capped = Math.max(-600, Math.min(600, e));
      const y = h / 2 - (capped / 600) * (h / 2 - 4);
      return { x, y };
    });

    // 백 영역 (상단, 양수)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h / 2);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, h / 2);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, h / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(220,220,220,0.75)';
    ctx.fill();
    ctx.restore();

    // 흑 영역 (하단, 음수)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, h / 2, w, h / 2);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, h / 2);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, h / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(30,30,55,0.9)';
    ctx.fill();
    ctx.restore();

    // 평가선
    ctx.beginPath();
    ctx.strokeStyle = '#6d5dd8';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // 블런더/실수 마크
    this.moveAnalysis.forEach((ma, i) => {
      if (ma.quality === 'blunder' || ma.quality === 'mistake') {
        const p = pts[i + 1];
        if (!p) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = ma.quality === 'blunder' ? '#e74c3c' : '#e67e22';
        ctx.fill();
      }
    });

    // 현재 위치 마커
    const curIdx = ReplayManager.currentIndex;
    if (curIdx < pts.length) {
      const cp = pts[curIdx];
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7a59';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 분석 요약 (블런더/실수/부정확 수 세기)
  static renderSummary() {
    if (!elements.analysisSummary || !this.moveAnalysis.length) return;
    const white = { blunder: 0, mistake: 0, inaccuracy: 0 };
    const black = { blunder: 0, mistake: 0, inaccuracy: 0 };
    this.moveAnalysis.forEach((ma, idx) => {
      const move = ReplayManager.moveHistory[idx];
      if (!move) return;
      const side = move.color;
      if (ma.quality === 'blunder')         (side === 'white' ? white : black).blunder++;
      else if (ma.quality === 'mistake')    (side === 'white' ? white : black).mistake++;
      else if (ma.quality === 'inaccuracy') (side === 'white' ? white : black).inaccuracy++;
    });
    elements.analysisSummary.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <span style="color:#aaa;font-size:0.72rem;font-weight:600;">백:</span>
        <span class="analysis-badge blunder">${white.blunder}??</span>
        <span class="analysis-badge mistake">${white.mistake}?</span>
        <span class="analysis-badge inaccuracy">${white.inaccuracy}?!</span>
        <span style="color:#555;margin:0 4px;">│</span>
        <span style="color:#aaa;font-size:0.72rem;font-weight:600;">흑:</span>
        <span class="analysis-badge blunder">${black.blunder}??</span>
        <span class="analysis-badge mistake">${black.mistake}?</span>
        <span class="analysis-badge inaccuracy">${black.inaccuracy}?!</span>
      </div>`;
  }

  static initEvents() {
    if (elements.analyzeBtn) {
      elements.analyzeBtn.addEventListener('click', () => AnalysisManager.request());
    }
    if (elements.evalGraph) {
      elements.evalGraph.addEventListener('click', (e) => {
        const rect = elements.evalGraph.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const total = AnalysisManager.positionEvals.length;
        if (!total) return;
        const idx = Math.round((x / elements.evalGraph.width) * (total - 1));
        ReplayManager.goToIndex(Math.max(0, Math.min(total - 1, idx)));
      });
    }
  }
}

// ── 힌트 매니저 ──────────────────────────────────────────────
class HintManager {
  static MAX_HINTS = 3;

  static reset() {
    gameState.hint.hintsUsed = 0;
    gameState.hint.maxHints = this.MAX_HINTS;
    gameState.hint.active = false;
    gameState.hint.usedAtMoves = new Set();
    this.clearHighlight();
    this.updateButton();
  }

  static show() {
    if (!elements.hintBtn) return;
    elements.hintBtn.style.display = 'block';
    this.updateButton();
  }

  static hide() {
    if (!elements.hintBtn) return;
    elements.hintBtn.style.display = 'none';
    this.clearHighlight();
  }

  static updateButton() {
    if (!elements.hintBtn) return;
    const remaining = this.MAX_HINTS - gameState.hint.hintsUsed;
    if (elements.hintCountBadge) elements.hintCountBadge.textContent = remaining;

    if (remaining <= 0 || !gameState.myTurn) {
      elements.hintBtn.disabled = true;
    } else {
      elements.hintBtn.disabled = false;
    }

    // 남은 횟수에 따른 색상 변화
    if (elements.hintCountBadge) {
      if (remaining === 0) {
        elements.hintCountBadge.style.background = '#e74c3c';
      } else if (remaining === 1) {
        elements.hintCountBadge.style.background = '#e67e22';
      } else {
        elements.hintCountBadge.style.background = '';
      }
    }
  }

  static requestHint() {
    if (!gameState.myTurn || !gameState.currentRoom) return;
    if (gameState.hint.hintsUsed >= this.MAX_HINTS) {
      UIManager.showNotification(`힌트를 모두 사용했습니다. (최대 ${this.MAX_HINTS}회)`);
      return;
    }

    // 로딩 상태 표시
    elements.hintBtn.classList.add('hint-loading');
    elements.hintBtn.disabled = true;

    socket.emit('requestHint', { roomId: gameState.currentRoom });
  }

  static onHintResult(data) {
    elements.hintBtn.classList.remove('hint-loading');

    gameState.hint.hintsUsed = data.hintsUsed;
    gameState.hint.active = true;

    // 현재 수 번호(이 힌트를 사용한 이후 첫 이동)에 표시할 인덱스
    // moveHistory는 아직 이 수가 추가되기 전이므로 boardHistory.length - 1 이후가 됨
    const nextMoveIdx = ReplayManager.boardHistory ? ReplayManager.boardHistory.length : 0;
    // 이 수(nextMoveIdx)가 힌트를 사용한 수임을 임시 저장
    gameState.hint._nextMoveIdx = nextMoveIdx;

    // 보드에 힌트 강조 표시
    this.showHighlight(data.from, data.to);
    this.updateButton();

    const diffLabels = { easy: '쉬움', medium: '보통', hard: '어려움' };
    const diffLabel = diffLabels[data.difficulty] || '보통';
    const remaining = this.MAX_HINTS - data.hintsUsed;
    UIManager.showNotification(`💡 힌트 표시됨 [${diffLabel}] — 남은 횟수: ${remaining}회`);
  }

  static onHintError(msg) {
    if (elements.hintBtn) {
      elements.hintBtn.classList.remove('hint-loading');
      elements.hintBtn.disabled = gameState.hint.hintsUsed >= this.MAX_HINTS || !gameState.myTurn;
    }
    UIManager.showNotification(`힌트 오류: ${msg}`);
  }

  static showHighlight(from, to) {
    this.clearHighlight();
    const fromSq = document.querySelector(`[data-row="${from[0]}"][data-col="${from[1]}"]`);
    const toSq   = document.querySelector(`[data-row="${to[0]}"][data-col="${to[1]}"]`);
    if (fromSq) fromSq.classList.add('hint-from');
    if (toSq)   toSq.classList.add('hint-to');
  }

  static clearHighlight() {
    document.querySelectorAll('.hint-from, .hint-to').forEach(sq => {
      sq.classList.remove('hint-from', 'hint-to');
    });
    gameState.hint.active = false;
  }

  // 이동 완료 시 호출: 힌트 사용 기록 처리
  static onMoveMade(moveIndex) {
    if (gameState.hint._nextMoveIdx !== undefined && gameState.hint._nextMoveIdx === moveIndex) {
      gameState.hint.usedAtMoves.add(moveIndex);
      gameState.hint._nextMoveIdx = undefined;
    }
    this.clearHighlight();
    this.updateButton();
  }

  static initEvents() {
    if (elements.hintBtn) {
      elements.hintBtn.addEventListener('click', () => HintManager.requestHint());
    }
  }
}

// ──────────────────────────────────────────────────────────────

class TakebackManager {
  static MAX_TAKEBACKS = 3;
  static takebacksUsed = 0;
  static pendingRequest = false; // 내가 요청 중인지

  static reset() {
    this.takebacksUsed = 0;
    this.pendingRequest = false;
    this.updateButton();
  }

  static show() {
    if (!elements.takebackBtn) return;
    elements.takebackBtn.style.display = 'block';
    this.updateButton();
  }

  static hide() {
    if (!elements.takebackBtn) return;
    elements.takebackBtn.style.display = 'none';
    this.hideDialog();
  }

  static updateButton() {
    if (!elements.takebackBtn) return;
    const remaining = this.MAX_TAKEBACKS - this.takebacksUsed;
    if (elements.takebackCountBadge) {
      elements.takebackCountBadge.textContent = remaining;
      if (remaining === 0) {
        elements.takebackCountBadge.style.background = '#e74c3c';
      } else if (remaining === 1) {
        elements.takebackCountBadge.style.background = '#e67e22';
      } else {
        elements.takebackCountBadge.style.background = '';
      }
    }
    elements.takebackBtn.disabled = remaining <= 0 || this.pendingRequest || gameState.isSpectating;
  }

  static requestTakeback() {
    if (!gameState.currentRoom || gameState.isSpectating || gameState.isAIGame) return;
    if (this.takebacksUsed >= this.MAX_TAKEBACKS) {
      UIManager.showNotification(`무르기를 모두 사용했습니다. (최대 ${this.MAX_TAKEBACKS}회)`);
      return;
    }
    if (this.pendingRequest) {
      UIManager.showNotification('이미 무르기 요청을 보냈습니다. 상대방의 응답을 기다리세요.');
      return;
    }
    this.pendingRequest = true;
    elements.takebackBtn.disabled = true;
    socket.emit('requestTakeback', { roomId: gameState.currentRoom });
  }

  static onPending(data) {
    UIManager.showNotification(data.message);
  }

  static onAccepted(data) {
    this.pendingRequest = false;
    // 내가 요청자인 경우에만 사용 횟수 반영
    if (data.requesterColor === gameState.playerColor) {
      this.takebacksUsed = data.takebacksUsed;
    }
    this.updateButton();

    gameState.gameBoard = data.board;
    gameState.currentTurn = data.turn;
    gameState.myTurn = gameState.playerColor === data.turn;
    gameState.selectedSquare = null;

    BoardRenderer.render(data.board);
    UIManager.updateGameInfo();
    if (data.requesterColor === gameState.playerColor) {
      UIManager.showNotification('무르기가 수락되었습니다. 다시 이동하세요.');
    } else {
      UIManager.showNotification('무르기 요청을 수락했습니다.');
    }
    HintManager.clearHighlight();
    HintManager.updateButton();
  }

  static onRejected(data) {
    this.pendingRequest = false;
    this.updateButton();
    UIManager.showNotification(data.message);
  }

  static onCancelled(data) {
    this.pendingRequest = false;
    this.updateButton();
    this.hideDialog();
    UIManager.showNotification(data.message);
  }

  static showDialog(data) {
    if (!elements.takebackDialog) return;
    const colorLabel = data.requesterColor === 'white' ? '백' : '흑';
    if (elements.takebackDialogMsg) {
      elements.takebackDialogMsg.textContent = `${colorLabel} 플레이어가 무르기를 요청했습니다. (상대 사용 ${data.takebacksUsed + 1}/${data.maxTakebacks}회)`;
    }
    elements.takebackDialog.style.display = 'flex';
  }

  static hideDialog() {
    if (elements.takebackDialog) elements.takebackDialog.style.display = 'none';
  }

  static respondTakeback(accept) {
    this.hideDialog();
    socket.emit('respondTakeback', { roomId: gameState.currentRoom, accept });
    if (!accept) {
      UIManager.showNotification('무르기를 거절했습니다.');
    }
  }

  static initEvents() {
    if (elements.takebackBtn) {
      elements.takebackBtn.addEventListener('click', () => TakebackManager.requestTakeback());
    }
    if (elements.takebackAcceptBtn) {
      elements.takebackAcceptBtn.addEventListener('click', () => TakebackManager.respondTakeback(true));
    }
    if (elements.takebackRejectBtn) {
      elements.takebackRejectBtn.addEventListener('click', () => TakebackManager.respondTakeback(false));
    }
  }
}

// ──────────────────────────────────────────────────────────────

class DrawManager {
  static pendingOffer = false; // 내가 제안 중인지

  static reset() {
    this.pendingOffer = false;
    this.updateButton();
  }

  static show() {
    if (!elements.drawOfferBtn) return;
    elements.drawOfferBtn.style.display = 'block';
    this.updateButton();
  }

  static hide() {
    if (!elements.drawOfferBtn) return;
    elements.drawOfferBtn.style.display = 'none';
    this.hideDialog();
  }

  static updateButton() {
    if (!elements.drawOfferBtn) return;
    elements.drawOfferBtn.disabled = this.pendingOffer || gameState.isSpectating;
  }

  static offerDraw() {
    if (!gameState.currentRoom || gameState.isSpectating || gameState.isAIGame) return;
    if (this.pendingOffer) {
      UIManager.showNotification('이미 무승부를 제안했습니다. 상대방의 응답을 기다리세요.');
      return;
    }
    this.pendingOffer = true;
    this.updateButton();
    socket.emit('offerDraw', { roomId: gameState.currentRoom });
  }

  static onOfferPending(data) {
    UIManager.showNotification(data.message);
  }

  static onRejected(data) {
    this.pendingOffer = false;
    this.updateButton();
    UIManager.showNotification(data.message);
  }

  static onCancelled(data) {
    this.pendingOffer = false;
    this.updateButton();
    this.hideDialog();
    UIManager.showNotification(data.message);
  }

  static showDialog(data) {
    if (!elements.drawDialog) return;
    const colorLabel = data.offererColor === 'white' ? '백' : '흑';
    if (elements.drawDialogMsg) {
      elements.drawDialogMsg.textContent = `${colorLabel} 플레이어가 무승부를 제안했습니다.`;
    }
    elements.drawDialog.style.display = 'flex';
  }

  static hideDialog() {
    if (elements.drawDialog) elements.drawDialog.style.display = 'none';
  }

  static respondDraw(accept) {
    this.hideDialog();
    socket.emit('respondDraw', { roomId: gameState.currentRoom, accept });
    if (!accept) {
      UIManager.showNotification('무승부를 거절했습니다.');
    }
  }

  static initEvents() {
    if (elements.drawOfferBtn) {
      elements.drawOfferBtn.addEventListener('click', () => DrawManager.offerDraw());
    }
    if (elements.drawAcceptBtn) {
      elements.drawAcceptBtn.addEventListener('click', () => DrawManager.respondDraw(true));
    }
    if (elements.drawRejectBtn) {
      elements.drawRejectBtn.addEventListener('click', () => DrawManager.respondDraw(false));
    }
  }
}

// ──────────────────────────────────────────────────────────────

class ReplayManager {
  static moveHistory = [];
  static boardHistory = [];
  static currentIndex = 0;
  static autoPlayTimer = null;
  static isPlaying = false;

  static setData(moveHistory, boardHistory) {
    this.moveHistory = moveHistory;
    this.boardHistory = boardHistory;
    this.currentIndex = 0;
    this.isPlaying = false;
  }

  static open() {
    if (!this.boardHistory.length) return;
    this.currentIndex = 0;
    this.isPlaying = false;
    this.renderMoveList();
    this.renderBoard();
    if (elements.replayModal) elements.replayModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  static close() {
    this.stopAutoPlay();
    if (elements.replayModal) elements.replayModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  static goToIndex(index) {
    if (index < 0) index = 0;
    if (index >= this.boardHistory.length) index = this.boardHistory.length - 1;
    this.currentIndex = index;
    this.renderBoard();
    this.updateMoveListHighlight();
    // 분석 데이터 연동
    if (AnalysisManager.positionEvals.length) {
      const ev = AnalysisManager.positionEvals[index];
      if (ev !== undefined) AnalysisManager.updateEvalBar(ev);
      AnalysisManager.updateMovePanel(index);
      AnalysisManager.renderGraph();
    }
  }

  static first() { this.goToIndex(0); }
  static last()  { this.goToIndex(this.boardHistory.length - 1); }
  static prev()  { this.goToIndex(this.currentIndex - 1); }
  static next()  { this.goToIndex(this.currentIndex + 1); }

  static toggleAutoPlay() {
    if (this.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  static startAutoPlay() {
    if (this.currentIndex >= this.boardHistory.length - 1) {
      this.currentIndex = 0;
      this.renderBoard();
      this.updateMoveListHighlight();
    }
    this.isPlaying = true;
    if (elements.replayAutoPlayBtn) {
      elements.replayAutoPlayBtn.innerHTML = '<i class="fas fa-pause"></i> 일시정지';
    }
    const speed = elements.replaySpeedSelect ? parseInt(elements.replaySpeedSelect.value) : 1000;
    this.scheduleNext(speed);
  }

  static scheduleNext(speed) {
    this.autoPlayTimer = setTimeout(() => {
      if (!this.isPlaying) return;
      if (this.currentIndex < this.boardHistory.length - 1) {
        this.next();
        const currentSpeed = elements.replaySpeedSelect ? parseInt(elements.replaySpeedSelect.value) : 1000;
        this.scheduleNext(currentSpeed);
      } else {
        this.stopAutoPlay();
      }
    }, speed);
  }

  static stopAutoPlay() {
    this.isPlaying = false;
    clearTimeout(this.autoPlayTimer);
    this.autoPlayTimer = null;
    if (elements.replayAutoPlayBtn) {
      elements.replayAutoPlayBtn.innerHTML = '<i class="fas fa-play"></i> 자동재생';
    }
  }

  static renderBoard() {
    const board = this.boardHistory[this.currentIndex];
    if (!board || !elements.replayBoard) return;

    elements.replayBoard.innerHTML = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.className = 'square ' + ((row + col) % 2 === 0 ? 'white' : 'black');
        square.dataset.row = row;
        square.dataset.col = col;

        // 이동 출발/도착 강조
        if (this.currentIndex > 0) {
          const move = this.moveHistory[this.currentIndex - 1];
          if (move) {
            if ((move.from[0] === row && move.from[1] === col) ||
                (move.to[0] === row && move.to[1] === col)) {
              square.style.background = 'rgba(255, 200, 0, 0.4)';
            }
          }
        }

        // 분석: 최선 수 하이라이트 (블런더/실수인 경우 최선 수 목적지 표시)
        if (AnalysisManager.moveAnalysis.length && this.currentIndex > 0) {
          const ma = AnalysisManager.moveAnalysis[this.currentIndex - 1];
          if (ma && ma.bestMoveUCI && (ma.quality === 'blunder' || ma.quality === 'mistake' || ma.quality === 'inaccuracy')) {
            const uci = ma.bestMoveUCI;
            const toC = uci.charCodeAt(2) - 97;
            const toR = 8 - parseInt(uci[3]);
            if (toR === row && toC === col) {
              square.style.boxShadow = 'inset 0 0 0 3px rgba(39,174,96,0.85)';
            }
          }
        }

        const piece = board[row][col];
        if (piece) {
          const img = document.createElement('img');
          img.className = 'chess-piece';
          img.src = CONSTANTS.PIECE_IMAGES[piece.color][piece.type];
          img.alt = `${piece.color} ${piece.type}`;
          img.draggable = false;
          square.appendChild(img);
        }
        elements.replayBoard.appendChild(square);
      }
    }

    // 위치 레이블 업데이트
    if (elements.replayPositionLabel) {
      if (this.currentIndex === 0) {
        elements.replayPositionLabel.textContent = '시작 국면';
      } else {
        const move = this.moveHistory[this.currentIndex - 1];
        const colorText = move.color === 'white' ? '백' : '흑';
        elements.replayPositionLabel.textContent = `${Math.ceil(this.currentIndex / 2)}수 - ${colorText} 이동`;
      }
    }
  }

  static renderMoveList() {
    if (!elements.replayMoveList) return;
    elements.replayMoveList.innerHTML = '';
    const hasAnalysis = AnalysisManager.moveAnalysis.length > 0;

    // 헤더 행
    const header = document.createElement('div');
    header.style.cssText = 'font-weight:600;color:var(--text-secondary);padding:2px 6px;font-size:0.75rem;';
    header.textContent = '#';
    elements.replayMoveList.appendChild(header);

    const whiteHeader = document.createElement('div');
    whiteHeader.style.cssText = 'font-weight:600;color:var(--text-secondary);padding:2px 6px;font-size:0.75rem;';
    whiteHeader.textContent = '백';
    elements.replayMoveList.appendChild(whiteHeader);

    const blackHeader = document.createElement('div');
    blackHeader.style.cssText = 'font-weight:600;color:var(--text-secondary);padding:2px 6px;font-size:0.75rem;';
    blackHeader.textContent = '흑';
    elements.replayMoveList.appendChild(blackHeader);

    const cols = ['a','b','c','d','e','f','g','h'];

    const makeMoveEl = (moveIdx) => {
      const move = this.moveHistory[moveIdx];
      if (!move) return document.createElement('div');
      const el = document.createElement('div');
      el.style.cssText = 'padding:3px 5px;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:4px;';
      el.dataset.moveIndex = moveIdx + 1;

      const notation = document.createElement('span');
      notation.textContent = this.formatMove(move, cols);
      el.appendChild(notation);

      // 힌트 사용 배지
      if (gameState.hint.usedAtMoves.has(moveIdx + 1)) {
        const hintBadge = document.createElement('span');
        hintBadge.className = 'hint-move-badge';
        hintBadge.textContent = '💡';
        hintBadge.title = '힌트를 사용한 수';
        el.appendChild(hintBadge);
      }

      // 분석 배지
      if (hasAnalysis && AnalysisManager.moveAnalysis[moveIdx]) {
        const ma = AnalysisManager.moveAnalysis[moveIdx];
        const qi = AnalysisManager.QUALITY_INFO[ma.quality];
        if (qi && ma.quality !== 'best' && ma.quality !== 'good' && ma.quality !== 'excellent') {
          const badge = document.createElement('span');
          badge.textContent = qi.badge;
          badge.style.cssText = `color:${qi.color};font-size:0.75rem;font-weight:700;`;
          badge.title = qi.label + (ma.cpLoss > 0 ? ` (-${ma.cpLoss}cp)` : '');
          el.appendChild(badge);
        } else if (qi && ma.quality === 'best') {
          const badge = document.createElement('span');
          badge.textContent = '★';
          badge.style.cssText = `color:${qi.color};font-size:0.7rem;`;
          el.appendChild(badge);
        }
      }

      el.addEventListener('click', () => this.goToIndex(moveIdx + 1));
      return el;
    };

    for (let i = 0; i < this.moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;

      const numEl = document.createElement('div');
      numEl.style.cssText = 'padding:3px 6px;color:var(--text-secondary);font-size:0.78rem;display:flex;align-items:center;';
      numEl.textContent = moveNum + '.';
      elements.replayMoveList.appendChild(numEl);

      elements.replayMoveList.appendChild(makeMoveEl(i));

      if (this.moveHistory[i + 1]) {
        elements.replayMoveList.appendChild(makeMoveEl(i + 1));
      } else {
        elements.replayMoveList.appendChild(document.createElement('div'));
      }
    }

    this.updateMoveListHighlight();
  }

  static formatMove(move, cols) {
    if (!move) return '';
    if (move.special === 'castling') {
      return move.to[1] > move.from[1] ? 'O-O' : 'O-O-O';
    }
    const pieceSymbols = { pawn: '', rook: 'R', knight: 'N', bishop: 'B', queen: 'Q', king: 'K' };
    const prefix = pieceSymbols[move.piece] || '';
    const capture = move.capture ? 'x' : '';
    const dest = cols[move.to[1]] + (8 - move.to[0]);
    const fromFile = move.piece === 'pawn' && move.capture ? cols[move.from[1]] : '';
    return `${prefix}${fromFile}${capture}${dest}`;
  }

  static updateMoveListHighlight() {
    if (!elements.replayMoveList) return;
    elements.replayMoveList.querySelectorAll('[data-move-index]').forEach(el => {
      const idx = parseInt(el.dataset.moveIndex);
      if (idx === this.currentIndex) {
        el.style.background = 'var(--primary-color)';
        el.style.color = 'white';
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        el.style.background = '';
        el.style.color = '';
      }
    });
  }

  static initEvents() {
    if (elements.replayBtn) {
      elements.replayBtn.addEventListener('click', () => ReplayManager.open());
    }
    if (elements.closeReplayBtn) {
      elements.closeReplayBtn.addEventListener('click', () => ReplayManager.close());
    }
    if (elements.replayFirstBtn) {
      elements.replayFirstBtn.addEventListener('click', () => ReplayManager.first());
    }
    if (elements.replayPrevBtn) {
      elements.replayPrevBtn.addEventListener('click', () => ReplayManager.prev());
    }
    if (elements.replayNextBtn) {
      elements.replayNextBtn.addEventListener('click', () => ReplayManager.next());
    }
    if (elements.replayLastBtn) {
      elements.replayLastBtn.addEventListener('click', () => ReplayManager.last());
    }
    if (elements.replayAutoPlayBtn) {
      elements.replayAutoPlayBtn.addEventListener('click', () => ReplayManager.toggleAutoPlay());
    }
    // 모달 바깥 클릭으로 닫기
    if (elements.replayModal) {
      elements.replayModal.addEventListener('click', (e) => {
        if (e.target === elements.replayModal) ReplayManager.close();
      });
    }
    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
      if (!elements.replayModal || elements.replayModal.style.display === 'none') return;
      if (e.key === 'ArrowLeft') ReplayManager.prev();
      else if (e.key === 'ArrowRight') ReplayManager.next();
      else if (e.key === 'Home') ReplayManager.first();
      else if (e.key === 'End') ReplayManager.last();
      else if (e.key === 'Escape') ReplayManager.close();
      else if (e.key === ' ') { e.preventDefault(); ReplayManager.toggleAutoPlay(); }
    });
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
  ThemeManager.initEvents();
  ReplayManager.initEvents();
  AnalysisManager.initEvents();
  setupNavigation();
  ThemeManager.load(); // 설정 로드 (비동기, 완료 시 자동 적용)

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
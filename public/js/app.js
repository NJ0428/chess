// Socket.IO 연결 설정
const socket = io();

// 전역 변수
let playerColor = null;
let currentRoom = null;
let gameBoard = null;
let selectedSquare = null;
let myTurn = false;
let currentTurn = 'white'; // 현재 턴 추적
let playerName = ''; // 플레이어 이름

// DOM 요소 - 로비
const lobby = document.getElementById('lobby');
const playerNameInput = document.getElementById('playerNameInput');
const roomIdInput = document.getElementById('roomIdInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const refreshRoomListBtn = document.getElementById('refreshRoomListBtn');
const roomList = document.getElementById('roomList');
const roomItemTemplate = document.getElementById('roomItemTemplate');

// DOM 요소 - 대기실
const gameSetup = document.getElementById('gameSetup');
const waitingMsg = document.getElementById('waitingMsg');
const roomInfo = document.getElementById('roomInfo');
const backToLobbyBtn = document.getElementById('backToLobbyBtn');

// DOM 요소 - 게임판
const gameBoard_el = document.getElementById('gameBoard');
const board = document.getElementById('board');
const playerColorEl = document.getElementById('playerColor');
const currentTurnEl = document.getElementById('currentTurn');
const gameStatusEl = document.getElementById('gameStatus');
const whitePlayerInfo = document.getElementById('whitePlayerInfo');
const blackPlayerInfo = document.getElementById('blackPlayerInfo');
const restartBtn = document.getElementById('restartBtn');
const leaveGameBtn = document.getElementById('leaveGameBtn');
const notificationEl = document.getElementById('notification');

// DOM 요소 - 체스 규칙
const showRulesBtn = document.getElementById('showRulesBtn');
const chessRulesPanel = document.getElementById('chessRulesPanel');
const closeRulesBtn = document.getElementById('closeRulesBtn');

// TTS를 위한 요소
const checkAudio = document.getElementById('check-audio');
const checkmateAudio = document.getElementById('checkmate-audio');
const moveAudio = document.getElementById('move-audio');
const captureAudio = document.getElementById('capture-audio');

// 오디오 로드 상태 확인
let audioLoaded = {
  check: false,
  checkmate: false,
  move: false,
  capture: false
};

// 오디오 로드 이벤트 리스너 추가
if (checkAudio) {
  checkAudio.addEventListener('canplaythrough', () => { audioLoaded.check = true; });
  checkAudio.addEventListener('error', () => { console.log('체크 오디오 로드 실패'); });
}
if (checkmateAudio) {
  checkmateAudio.addEventListener('canplaythrough', () => { audioLoaded.checkmate = true; });
  checkmateAudio.addEventListener('error', () => { console.log('체크메이트 오디오 로드 실패'); });
}
if (moveAudio) {
  moveAudio.addEventListener('canplaythrough', () => { audioLoaded.move = true; });
  moveAudio.addEventListener('error', () => { console.log('이동 오디오 로드 실패'); });
}
if (captureAudio) {
  captureAudio.addEventListener('canplaythrough', () => { audioLoaded.capture = true; });
  captureAudio.addEventListener('error', () => { console.log('캡처 오디오 로드 실패'); });
}

// 체스말 이미지 URL (공개 체스말 이미지로 대체)
const pieceImages = {
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
};

// 이벤트 리스너 초기화
function initEventListeners() {
  createRoomBtn.addEventListener('click', createRoom);
  refreshRoomListBtn.addEventListener('click', getRoomList);
  backToLobbyBtn.addEventListener('click', backToLobby);
  restartBtn.addEventListener('click', restartGame);
  leaveGameBtn.addEventListener('click', leaveGame);
  
  // 체스 규칙 패널
  if (showRulesBtn) {
    showRulesBtn.addEventListener('click', toggleRulesPanel);
  }
  
  if (closeRulesBtn) {
    closeRulesBtn.addEventListener('click', closeRulesPanel);
  }
}

// 초기화 함수
function init() {
  initEventListeners();
  // 페이지 로드 시 방 목록 가져오기
  getRoomList();
}

// 방 생성
function createRoom() {
  playerName = playerNameInput.value.trim() || '익명';
  const roomId = roomIdInput.value.trim();
  
  if (!roomId) {
    showNotification('방 아이디를 입력해주세요.');
    return;
  }
  
  socket.emit('createRoom', { roomId, playerName });
}

// 방 참가
function joinRoom(roomId) {
  playerName = playerNameInput.value.trim() || '익명';
  
  if (!roomId) {
    showNotification('방 아이디가 없습니다.');
    return;
  }
  
  socket.emit('joinRoom', { roomId, playerName });
}

// 방 나가기
function leaveGame() {
  if (currentRoom) {
    socket.emit('leaveRoom', currentRoom);
    backToLobby();
  }
}

// 로비로 돌아가기
function backToLobby() {
  currentRoom = null;
  playerColor = null;
  gameBoard = null;
  selectedSquare = null;
  myTurn = false;
  
  gameBoard_el.style.display = 'none';
  gameSetup.style.display = 'none';
  lobby.style.display = 'block';
  
  // 방 목록 새로고침
  getRoomList();
}

// 방 목록 가져오기
function getRoomList() {
  socket.emit('getRoomList');
}

// 방 목록 표시
function displayRoomList(rooms) {
  // 기존 목록 초기화
  roomList.innerHTML = '';
  
  if (rooms.length === 0) {
    const noRoomsMsg = document.createElement('div');
    noRoomsMsg.className = 'no-rooms-message';
    noRoomsMsg.textContent = '현재 참가할 수 있는 방이 없습니다.';
    roomList.appendChild(noRoomsMsg);
    return;
  }
  
  // 방 목록 표시
  rooms.forEach(room => {
    const roomItem = roomItemTemplate.content.cloneNode(true);
    roomItem.querySelector('.room-id').textContent = room.id;
    
    const joinBtn = roomItem.querySelector('.join-btn');
    joinBtn.addEventListener('click', () => joinRoom(room.id));
    
    roomList.appendChild(roomItem);
  });
}

// 게임 재시작
function restartGame() {
  if (currentRoom) {
    socket.emit('restartGame', currentRoom);
  }
}

// 체스판 렌더링
function renderBoard(boardData) {
  // 기존 체스판 클리어
  board.innerHTML = '';
  
  // 플레이어 색상에 따라 다르게 렌더링 (각 플레이어의 말이 아래쪽에 오도록)
  const isBlack = playerColor === 'black';
  
  // 8x8 체스판 생성
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      // 실제 체스판의 위치 계산 (색상에 따라 역순으로)
      // 수정: 자신의 색상이 항상 아래에 오도록 변경
      const actualRow = isBlack ? 7 - row : row;
      const actualCol = isBlack ? col : 7 - col;
      
      // 체스판 칸 생성
      const square = document.createElement('div');
      square.className = `square ${(actualRow + actualCol) % 2 === 0 ? 'white' : 'black'}`;
      // 저장은 항상 원래 좌표계로
      square.dataset.row = actualRow;
      square.dataset.col = actualCol;
      square.addEventListener('click', handleSquareClick);
      
      // 체스말이 있으면 표시
      const piece = boardData[actualRow][actualCol];
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = `chess-piece ${piece.color} ${piece.type}`;
        
        // 체스말 이미지 설정
        pieceEl.style.backgroundImage = `url(${pieceImages[piece.color][piece.type]})`;
        
        square.appendChild(pieceEl);
      }
      
      // 디버그용 좌표 표시 (선택 사항)
      if (false) { // 좌표 표시 끄기, 필요하면 true로 변경
        const coordLabel = document.createElement('div');
        coordLabel.className = 'coord-label';
        coordLabel.textContent = `${actualRow},${actualCol}`;
        square.appendChild(coordLabel);
      }
      
      board.appendChild(square);
    }
  }
  
  // 게임 정보 업데이트
  updateGameInfo();
}

// 게임 정보 업데이트
function updateGameInfo() {
  playerColorEl.textContent = `당신의 색상: ${playerColor === 'white' ? '백' : '흑'}`;
  currentTurnEl.textContent = `현재 턴: ${myTurn ? '당신의 턴' : '상대방 턴'}`;
  
  // 현재 턴에 따라 배경색 변경
  updateBackgroundColor();
}

// 배경색 업데이트
function updateBackgroundColor() {
  if (currentTurn === 'white') {
    document.body.classList.add('white-turn');
    document.body.classList.remove('black-turn');
  } else {
    document.body.classList.add('black-turn');
    document.body.classList.remove('white-turn');
  }
}

// 알림 표시
function showNotification(message) {
  notificationEl.textContent = message;
  notificationEl.style.display = 'block';
  
  setTimeout(() => {
    notificationEl.style.display = 'none';
  }, 3000);
}

// TTS 재생
function playTTS(text) {
  // Web Speech API 사용
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR'; // 한국어 설정
    utterance.volume = 1.0;   // 볼륨 최대
    utterance.rate = 1.0;     // 평균 속도
    utterance.pitch = 1.0;    // 평균 피치
    
    // 음성 선택 (한국어 음성이 있으면 선택)
    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find(voice => voice.lang === 'ko-KR');
    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }
    
    // 이전 음성이 있다면 중지
    window.speechSynthesis.cancel();
    
    // 음성 재생
    window.speechSynthesis.speak(utterance);
    console.log(`TTS 재생: ${text}`);
  } else {
    console.log('이 브라우저는 음성 합성을 지원하지 않습니다.');
  }
}

// 체스판 칸 클릭 처리
function handleSquareClick(event) {
  // 내 턴이 아니면 무시
  if (!myTurn) {
    console.log('현재 턴:', currentTurn, '내 색상:', playerColor);
    showNotification('당신의 턴이 아닙니다.');
    return;
  }
  
  const square = event.currentTarget;
  const row = parseInt(square.dataset.row);
  const col = parseInt(square.dataset.col);
  
  // 첫 번째 클릭 (말 선택)
  if (selectedSquare === null) {
    const piece = gameBoard[row][col];
    
    // 내 말이 아니거나 말이 없는 경우
    if (!piece || piece.color !== playerColor) {
      showNotification('자신의 말만 선택할 수 있습니다.');
      return;
    }
    
    // 말 선택
    selectedSquare = { row, col };
    square.classList.add('selected');
    
    // 이동 가능한 위치 표시
    showPossibleMoves(row, col, piece);
  }
  // 두 번째 클릭 (목적지 선택)
  else {
    const fromRow = selectedSquare.row;
    const fromCol = selectedSquare.col;
    
    // 선택한 말의 위치와 같은 위치면 선택 취소
    if (fromRow === row && fromCol === col) {
      clearSelection();
      return;
    }
    
    // 서버에 이동 요청
    socket.emit('movePiece', {
      roomId: currentRoom,
      from: [fromRow, fromCol],
      to: [row, col],
      color: playerColor
    });
    
    // 선택 상태 초기화
    clearSelection();
  }
}

// 말 선택 취소
function clearSelection() {
  if (selectedSquare !== null) {
    // 선택된 칸 초기화
    const selected = document.querySelector('.square.selected');
    if (selected) {
      selected.classList.remove('selected');
    }
    
    // 이동 가능 표시 초기화
    const validMoves = document.querySelectorAll('.valid-move, .valid-capture, .valid-castling, .valid-en-passant');
    validMoves.forEach(square => {
      square.classList.remove('valid-move');
      square.classList.remove('valid-capture');
      square.classList.remove('valid-castling');
      square.classList.remove('valid-en-passant');
    });
    
    selectedSquare = null;
  }
}

// 이동 가능한 위치 표시 함수
function showPossibleMoves(row, col, piece) {
  // 말의 종류에 따라 다른 이동 가능 위치 계산
  const possibleMoves = [];
  
  const isBlack = piece.color === 'black';
  
  switch(piece.type) {
    case 'pawn':
      // 폰 이동 패턴 (앞으로 한 칸 또는 두 칸, 대각선 공격)
      const direction = isBlack ? 1 : -1;
      const startRow = isBlack ? 1 : 6;
      
      // 앞으로 한 칸 이동
      if (isValidPosition(row + direction, col) && !getPieceAt(row + direction, col)) {
        possibleMoves.push({ row: row + direction, col: col, capture: false });
      }
      
      // 첫 이동시 두 칸 이동 가능
      if (row === startRow && !getPieceAt(row + direction, col) && !getPieceAt(row + 2 * direction, col)) {
        possibleMoves.push({ row: row + 2 * direction, col: col, capture: false });
      }
      
      // 대각선 공격 (왼쪽)
      if (isValidPosition(row + direction, col - 1)) {
        const targetPiece = getPieceAt(row + direction, col - 1);
        if (targetPiece && targetPiece.color !== piece.color) {
          possibleMoves.push({ row: row + direction, col: col - 1, capture: true });
        }
      }
      
      // 대각선 공격 (오른쪽)
      if (isValidPosition(row + direction, col + 1)) {
        const targetPiece = getPieceAt(row + direction, col + 1);
        if (targetPiece && targetPiece.color !== piece.color) {
          possibleMoves.push({ row: row + direction, col: col + 1, capture: true });
        }
      }
      
      // 앙파상
      if (row === (isBlack ? 4 : 3)) { // 앙파상 가능한 행 위치
        // 왼쪽 앙파상
        if (isValidPosition(row, col - 1)) {
          const leftPiece = getPieceAt(row, col - 1);
          if (leftPiece && leftPiece.type === 'pawn' && leftPiece.color !== piece.color) {
            // lastMoveWasDouble 속성 확인
            if (leftPiece.lastMoveWasDouble) {
              console.log('왼쪽 앙파상 가능:', row, col - 1);
              possibleMoves.push({ 
                row: row + direction, 
                col: col - 1, 
                capture: true,
                special: 'en_passant'
              });
            }
          }
        }
        
        // 오른쪽 앙파상
        if (isValidPosition(row, col + 1)) {
          const rightPiece = getPieceAt(row, col + 1);
          if (rightPiece && rightPiece.type === 'pawn' && rightPiece.color !== piece.color) {
            // lastMoveWasDouble 속성 확인
            if (rightPiece.lastMoveWasDouble) {
              console.log('오른쪽 앙파상 가능:', row, col + 1);
              possibleMoves.push({ 
                row: row + direction, 
                col: col + 1, 
                capture: true,
                special: 'en_passant'
              });
            }
          }
        }
      }
      break;
      
    case 'rook':
      // 룩 이동 패턴 (수직, 수평)
      // 위쪽 방향
      checkStraightLine(row, col, -1, 0, possibleMoves);
      // 오른쪽 방향
      checkStraightLine(row, col, 0, 1, possibleMoves);
      // 아래쪽 방향
      checkStraightLine(row, col, 1, 0, possibleMoves);
      // 왼쪽 방향
      checkStraightLine(row, col, 0, -1, possibleMoves);
      break;
      
    case 'knight':
      // 나이트 이동 패턴 (L자 이동)
      const knightMoves = [
        { r: -2, c: -1 }, { r: -2, c: 1 },
        { r: -1, c: -2 }, { r: -1, c: 2 },
        { r: 1, c: -2 }, { r: 1, c: 2 },
        { r: 2, c: -1 }, { r: 2, c: 1 }
      ];
      
      knightMoves.forEach(move => {
        const newRow = row + move.r;
        const newCol = col + move.c;
        
        if (isValidPosition(newRow, newCol)) {
          const targetPiece = getPieceAt(newRow, newCol);
          if (!targetPiece) {
            possibleMoves.push({ row: newRow, col: newCol, capture: false });
          } else if (targetPiece.color !== piece.color) {
            possibleMoves.push({ row: newRow, col: newCol, capture: true });
          }
        }
      });
      break;
      
    case 'bishop':
      // 비숍 이동 패턴 (대각선)
      // 왼쪽 위 대각선
      checkStraightLine(row, col, -1, -1, possibleMoves);
      // 오른쪽 위 대각선
      checkStraightLine(row, col, -1, 1, possibleMoves);
      // 왼쪽 아래 대각선
      checkStraightLine(row, col, 1, -1, possibleMoves);
      // 오른쪽 아래 대각선
      checkStraightLine(row, col, 1, 1, possibleMoves);
      break;
      
    case 'queen':
      // 퀸 이동 패턴 (수직, 수평, 대각선)
      // 수직, 수평 (룩과 동일)
      checkStraightLine(row, col, -1, 0, possibleMoves);
      checkStraightLine(row, col, 0, 1, possibleMoves);
      checkStraightLine(row, col, 1, 0, possibleMoves);
      checkStraightLine(row, col, 0, -1, possibleMoves);
      // 대각선 (비숍과 동일)
      checkStraightLine(row, col, -1, -1, possibleMoves);
      checkStraightLine(row, col, -1, 1, possibleMoves);
      checkStraightLine(row, col, 1, -1, possibleMoves);
      checkStraightLine(row, col, 1, 1, possibleMoves);
      break;
      
    case 'king':
      // 킹 이동 패턴 (주변 한 칸)
      for (let r = -1; r <= 1; r++) {
        for (let c = -1; c <= 1; c++) {
          // 현재 위치 제외
          if (r === 0 && c === 0) continue;
          
          const newRow = row + r;
          const newCol = col + c;
          
          if (isValidPosition(newRow, newCol)) {
            const targetPiece = getPieceAt(newRow, newCol);
            if (!targetPiece) {
              possibleMoves.push({ row: newRow, col: newCol, capture: false });
            } else if (targetPiece.color !== piece.color) {
              possibleMoves.push({ row: newRow, col: newCol, capture: true });
            }
          }
        }
      }
      
      // 캐슬링 확인
      if (piece.position === 'initial') {
        // 킹사이드 캐슬링
        let canCastleKingSide = true;
        // 경로에 말이 없는지 확인
        for (let c = col + 1; c < 7; c++) {
          if (getPieceAt(row, c)) {
            canCastleKingSide = false;
            break;
          }
        }
        
        // 룩이 있고 초기 위치인지 확인
        const kingSideRook = getPieceAt(row, 7);
        if (canCastleKingSide && kingSideRook && kingSideRook.type === 'rook' && 
            kingSideRook.color === piece.color && kingSideRook.position === 'initial') {
          possibleMoves.push({ 
            row: row, 
            col: col + 2, 
            capture: false,
            special: 'castling',
            rookFrom: [row, 7],
            rookTo: [row, 5]
          });
        }
        
        // 퀸사이드 캐슬링
        let canCastleQueenSide = true;
        // 경로에 말이 없는지 확인
        for (let c = col - 1; c > 0; c--) {
          if (getPieceAt(row, c)) {
            canCastleQueenSide = false;
            break;
          }
        }
        
        // 룩이 있고 초기 위치인지 확인
        const queenSideRook = getPieceAt(row, 0);
        if (canCastleQueenSide && queenSideRook && queenSideRook.type === 'rook' && 
            queenSideRook.color === piece.color && queenSideRook.position === 'initial') {
          possibleMoves.push({ 
            row: row, 
            col: col - 2, 
            capture: false,
            special: 'castling',
            rookFrom: [row, 0],
            rookTo: [row, 3]
          });
        }
      }
      break;
  }
  
  // 화면에 이동 가능 위치 표시
  possibleMoves.forEach(move => {
    const selector = `[data-row="${move.row}"][data-col="${move.col}"]`;
    const squareEl = document.querySelector(selector);
    
    if (squareEl) {
      if (move.special === 'castling') {
        squareEl.classList.add('valid-castling');
      } else if (move.special === 'en_passant') {
        squareEl.classList.add('valid-en-passant');
      } else if (move.capture) {
        squareEl.classList.add('valid-capture');
      } else {
        squareEl.classList.add('valid-move');
      }
    }
  });
}

// 직선 방향(수직/수평/대각선)으로 이동 가능한 위치 확인
function checkStraightLine(row, col, rowStep, colStep, possibleMoves) {
  let currentRow = row + rowStep;
  let currentCol = col + colStep;
  const myColor = gameBoard[row][col].color;
  
  while (isValidPosition(currentRow, currentCol)) {
    const targetPiece = getPieceAt(currentRow, currentCol);
    
    if (!targetPiece) {
      // 비어있는 칸으로 이동 가능
      possibleMoves.push({ row: currentRow, col: currentCol, capture: false });
      currentRow += rowStep;
      currentCol += colStep;
    } else {
      // 말이 있는 경우
      if (targetPiece.color !== myColor) {
        // 상대 말은 잡을 수 있음
        possibleMoves.push({ row: currentRow, col: currentCol, capture: true });
      }
      break; // 말이 있으면 더 이상 진행 불가
    }
  }
}

// 위치가 체스판 내에 있는지 확인
function isValidPosition(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// 특정 위치의 말 가져오기
function getPieceAt(row, col) {
  return gameBoard[row][col];
}

// Socket.IO 이벤트 처리
socket.on('roomList', (rooms) => {
  displayRoomList(rooms);
});

socket.on('roomListUpdated', () => {
  getRoomList(); // 방 목록 업데이트
});

socket.on('roomCreated', (data) => {
  currentRoom = data.roomId;
  playerColor = data.color;
  
  // UI 전환: 로비 -> 대기화면
  lobby.style.display = 'none';
  gameSetup.style.display = 'block';
  roomInfo.textContent = `방 ID: ${currentRoom}`;
});

socket.on('roomJoined', (data) => {
  currentRoom = data.roomId;
  playerColor = data.color;
  gameBoard = data.board;
  
  // 상대 정보 표시
  const opponentName = data.opponentName || '익명';
});

socket.on('opponentJoined', (data) => {
  // 상대방 정보 표시
  const opponentName = data.opponentName;
  showNotification(`${opponentName}님이 게임에 참가했습니다.`);
});

socket.on('gameStart', (data) => {
  gameBoard = data.board;
  currentTurn = data.turn; // 현재 턴 저장
  myTurn = currentTurn === playerColor; // 내 색상이 현재 턴과 같으면 내 턴
  
  // 플레이어 정보 업데이트
  whitePlayerInfo.textContent = `백: ${data.whitePlayer || '익명'}`;
  blackPlayerInfo.textContent = `흑: ${data.blackPlayer || '익명'}`;
  
  // UI 전환: 대기화면 -> 게임판 화면
  lobby.style.display = 'none';
  gameSetup.style.display = 'none';
  gameBoard_el.style.display = 'block';
  
  // 체스판 렌더링
  renderBoard(gameBoard);
  
  // 초기 배경색 설정
  updateBackgroundColor();
  
  // 턴 정보 표시
  updateGameInfo();
  
  // 게임 시작 알림
  if (myTurn) {
    showNotification('게임이 시작되었습니다. 당신의 턴입니다.');
  } else {
    showNotification('게임이 시작되었습니다. 상대방의 턴을 기다리세요.');
  }
});

socket.on('boardUpdate', (data) => {
  gameBoard = data.board;
  currentTurn = data.turn; // 현재 턴 업데이트
  myTurn = currentTurn === playerColor; // 내 색상이 현재 턴과 같으면 내 턴
  
  // 말 이동 소리 재생
  if (data.moveDetails && data.moveDetails.capture) {
    playMoveSound(true); // 잡기 소리 재생
  } else {
    playMoveSound(false); // 일반 이동 소리 재생
  }
  
  // 앙파상 움직임 디버그 로그
  if (data.moveDetails && data.moveDetails.special === 'en_passant') {
    console.log('앙파상 이동 감지:', data.moveDetails);
  }
  
  // 체스판 갱신
  renderBoard(gameBoard);
  
  // 배경색 업데이트
  updateBackgroundColor();
  
  // 체크메이트인 경우
  if (data.status === 'checkmate') {
    gameStatusEl.textContent = '체크메이트!';
    restartBtn.style.display = 'block';
  } else {
    // 턴 변경 알림
    if (myTurn) {
      showNotification('당신의 턴입니다.');
    }
  }
});

// 체크 이벤트 처리
socket.on('check', (data) => {
  // 체크 사운드 재생
  playCheckSound();
  
  // 체크 표시 효과 추가
  const kingColor = data.turn;
  highlightKingInCheck(kingColor);
  
  // 상태 표시
  gameStatusEl.textContent = '체크!';
  gameStatusEl.className = 'check-status';
  
  // 알림 표시
  showNotification('체크!');
});

// 체크 사운드 재생 함수
function playCheckSound() {
  if (checkAudio && audioLoaded.check) {
    checkAudio.currentTime = 0;
    checkAudio.play().catch(e => {
      console.error('체크 오디오 재생 실패:', e);
      playTTS('체크');
    });
  } else {
    // TTS 폴백
    playTTS('체크');
  }
}

// 체크메이트 사운드 재생 함수
function playCheckmateSound() {
  if (checkmateAudio && audioLoaded.checkmate) {
    checkmateAudio.currentTime = 0;
    checkmateAudio.play().catch(e => {
      console.error('체크메이트 오디오 재생 실패:', e);
      playTTS('체크메이트');
    });
  } else {
    // TTS 폴백
    playTTS('체크메이트');
  }
}

// 킹 체크 상태 하이라이트 함수
function highlightKingInCheck(color) {
  // 킹 찾기
  let kingSquare = null;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameBoard[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        // 플레이어 시점에 따른 좌표 계산
        const isBlack = playerColor === 'black';
        const uiRow = isBlack ? 7 - row : row;
        const uiCol = isBlack ? col : 7 - col;
        
        const selector = `[data-row="${row}"][data-col="${col}"]`;
        kingSquare = document.querySelector(selector);
        break;
      }
    }
    if (kingSquare) break;
  }
  
  if (kingSquare) {
    // 체크 효과 추가
    kingSquare.classList.add('king-in-check');
    
    // 2초 후에 효과 제거
    setTimeout(() => {
      kingSquare.classList.remove('king-in-check');
    }, 2000);
  }
}

// 게임 오버 이벤트 처리 개선
socket.on('gameOver', (data) => {
  // 체크메이트 TTS 재생
  playCheckmateSound();
  
  // 결과 메시지 표시
  const resultMessage = data.message || (data.winner === playerColor ? '승리!' : '패배!');
  showNotification(`게임 종료! ${resultMessage}`);
  myTurn = false;
  
  // 게임 상태 업데이트
  gameStatusEl.textContent = `게임 종료: ${resultMessage}`;
  gameStatusEl.className = data.winner === playerColor ? 'win-status' : 'lose-status';
  
  // 승자의 킹에 효과 표시
  highlightWinnerKing(data.winner);
  
  // 재시작 버튼 표시
  restartBtn.style.display = 'block';
  
  // 킹이 잡혔을 때 특별 효과
  if (data.message && data.message.includes('왕이 잡혔습니다')) {
    // 화면에 승패 효과 추가
    const resultEffect = document.createElement('div');
    resultEffect.className = 'game-result-effect';
    resultEffect.textContent = data.winner === playerColor ? '승리!' : '패배!';
    resultEffect.classList.add(data.winner === playerColor ? 'win' : 'lose');
    document.body.appendChild(resultEffect);
    
    // 3초 후 효과 제거
    setTimeout(() => {
      document.body.removeChild(resultEffect);
    }, 3000);
  }
});

// 승자의 킹에 효과 표시
function highlightWinnerKing(winnerColor) {
  // 승자 킹 찾기
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameBoard[row][col];
      if (piece && piece.type === 'king' && piece.color === winnerColor) {
        const selector = `[data-row="${row}"][data-col="${col}"]`;
        const kingSquare = document.querySelector(selector);
        
        if (kingSquare) {
          kingSquare.classList.add('king-winner');
          // 효과는 게임 재시작까지 유지
        }
        return;
      }
    }
  }
}

socket.on('gameRestarted', (data) => {
  gameBoard = data.board;
  currentTurn = data.turn;
  myTurn = data.turn === playerColor;
  
  // 게임 상태 초기화
  gameStatusEl.textContent = '';
  gameStatusEl.className = '';
  restartBtn.style.display = 'none';
  
  // 체스판 렌더링
  renderBoard(gameBoard);
  
  // 게임 재시작 알림
  showNotification('게임이 재시작되었습니다.');
});

socket.on('playerDisconnected', () => {
  showNotification('상대방이 게임에서 나갔습니다.');
  myTurn = false;
  restartBtn.style.display = 'none';
  
  // 게임 설정 화면으로 돌아가기
  setTimeout(backToLobby, 3000);
});

socket.on('playerLeft', () => {
  showNotification('상대방이 게임에서 나갔습니다.');
  myTurn = false;
  restartBtn.style.display = 'none';
  
  // 게임 설정 화면으로 돌아가기
  setTimeout(backToLobby, 3000);
});

// 방장이 되었을 때 처리
socket.on('becomeHost', (data) => {
  // 플레이어 정보 업데이트
  playerColor = data.color; // 흑에서 백으로 변경
  
  // 대기실로 돌아가기
  backToLobby();
  
  // 알림 표시
  showNotification(data.message);
});

// 상대방 대기 중 처리
socket.on('waitingForPlayer', (data) => {
  // 게임 보드에서 대기 화면으로 전환
  gameBoard_el.style.display = 'none';
  gameSetup.style.display = 'block';
  
  // 방 정보 및 대기 메시지 업데이트
  roomInfo.textContent = `방 ID: ${currentRoom}`;
  waitingMsg.textContent = data.message;
  
  // 알림 표시
  showNotification(data.message);
});

socket.on('error', (message) => {
  showNotification(message);
});

// 체스 규칙 패널 토글
function toggleRulesPanel() {
  if (chessRulesPanel) {
    chessRulesPanel.style.display = 
      chessRulesPanel.style.display === 'block' ? 'none' : 'block';
  }
}

// 체스 규칙 패널 닫기
function closeRulesPanel() {
  if (chessRulesPanel) {
    chessRulesPanel.style.display = 'none';
  }
}

// 체스말 이동 소리 재생 함수
function playMoveSound(isCapture = false) {
  const audio = isCapture ? captureAudio : moveAudio;
  const audioType = isCapture ? 'capture' : 'move';
  
  if (audio && audioLoaded[audioType]) {
    audio.currentTime = 0;
    audio.play()
      .then(() => console.log(`${isCapture ? '캡처' : '이동'} 소리 재생`))
      .catch(e => {
        console.error('오디오 재생 실패:', e);
        // TTS 폴백 사용
        playTTS(isCapture ? '캡처' : '이동');
      });
  } else {
    // 오디오 파일이 없거나 로드되지 않은 경우 대체 방법으로 TTS 사용
    playTTS(isCapture ? '캡처' : '이동');
  }
}

// 페이지 로드시 초기화
init(); 
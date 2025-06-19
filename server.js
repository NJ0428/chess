const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 게임 상태 및 방 정보
const games = {};

// 체스 게임 관련 상수
const INITIAL_POSITION = 'initial'; // 처음 위치에 있는 말 표시용

io.on('connection', (socket) => {
  console.log('사용자 연결:', socket.id);

  // 방 목록 요청
  socket.on('getRoomList', () => {
    const roomList = [];
    
    // 게임 객체에서 대기 중인 방만 필터링
    for (const roomId in games) {
      const room = games[roomId];
      if (room.status === 'waiting') {
        roomList.push({
          id: roomId,
          creator: room.creatorName || '익명',
          createdAt: room.createdAt
        });
      }
    }
    
    // 방 목록 전송
    socket.emit('roomList', roomList);
  });

  // 방 생성
  socket.on('createRoom', (data) => {
    const { roomId, playerName } = data;
    
    // 같은 ID의 방이 있는지 확인
    if (games[roomId]) {
      socket.emit('error', '이미 존재하는 방 아이디입니다.');
      return;
    }
    
    socket.join(roomId);
    games[roomId] = {
      board: initializeBoard(),
      players: { white: socket.id, black: null },
      playerNames: { white: playerName || '익명', black: null },
      currentTurn: 'white',
      status: 'waiting',
      creatorName: playerName || '익명',
      createdAt: new Date().toISOString()
    };
    
    socket.emit('roomCreated', { roomId, color: 'white' });
    console.log(`방 생성: ${roomId}`);
    
    // 방 목록 업데이트 브로드캐스트
    io.emit('roomListUpdated');
  });

  // 방 참가
  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data;
    const room = games[roomId];
    
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
    
    // 흑 플레이어에게 정보 전송
    socket.emit('roomJoined', { 
      roomId, 
      color: 'black', 
      board: room.board,
      opponentName: room.playerNames.white 
    });
    
    // 방 생성자에게 상대방 정보 전송
    io.to(room.players.white).emit('opponentJoined', {
      opponentName: playerName || '익명'
    });
    
    // 방 목록 업데이트 브로드캐스트
    io.emit('roomListUpdated');
    
    // 양쪽 모두에게 게임 시작 이벤트 전송 (1초 후 실행하여 UI가 준비되도록 함)
    setTimeout(() => {
      io.to(roomId).emit('gameStart', { 
        board: room.board, 
        turn: room.currentTurn, // 항상 'white'로 시작
        whitePlayer: room.playerNames.white,
        blackPlayer: room.playerNames.black
      });
      
      console.log(`게임 시작: ${roomId}, 현재 턴: ${room.currentTurn}`);
    }, 1000);
  });

  // 체스말 이동
  socket.on('movePiece', (data) => {
    const { roomId, from, to, color } = data;
    const room = games[roomId];

    if (!room) {
      socket.emit('error', '존재하지 않는 방입니다.');
      return;
    }
    
    if (room.currentTurn !== color) {
      console.log(`턴 에러 - 현재 턴: ${room.currentTurn}, 요청 색상: ${color}`);
      socket.emit('error', '당신의 턴이 아닙니다.');
      return;
    }

    // 유효한 이동인지 검증
    const moveResult = isValidMove(room.board, from, to, color, room.moveHistory, room.castlingRights);
    
    if (moveResult.valid) {
      // 목적지에 있는 기존 말 확인 (킹이 잡히는지 확인)
      const [fromRow, fromCol] = from;
      const [toRow, toCol] = to;
      const targetPiece = room.board[toRow][toCol];
      const movingPiece = room.board[fromRow][fromCol];
      let kingCaptured = false;
      let capturedColor = null;
      
      if (targetPiece && targetPiece.type === 'king') {
        // 킹이 잡힘 -> 게임 종료
        kingCaptured = true;
        capturedColor = targetPiece.color;
        console.log(`킹이 잡힘! 승자: ${color}, 패자: ${capturedColor}`);
      }
      
      // 이동 처리 (앙파상, 캐슬링 등 특수 규칙 적용)
      const moveDetails = movePiece(room.board, from, to, moveResult);
      
      // 이동 기록 저장
      if (!room.moveHistory) room.moveHistory = [];
      room.moveHistory.push({
        piece: movingPiece.type,
        color: color,
        from: from,
        to: to,
        special: moveDetails.special
      });
      
      // 캐슬링 권한 업데이트
      updateCastlingRights(room, from, movingPiece);
      
      // 킹이 잡혔으면 게임 종료
      if (kingCaptured) {
        // 게임 상태 업데이트
        room.status = 'finished';
        
        // 게임 종료 이벤트 발송
        io.to(roomId).emit('boardUpdate', {
          board: room.board,
          turn: room.currentTurn,
          status: 'checkmate',
          moveDetails: {
            from,
            to,
            piece: movingPiece.type,
            capture: targetPiece !== null,
            special: moveDetails.special
          }
        });
        
        // 승자는 현재 움직인 플레이어
        io.to(roomId).emit('gameOver', { 
          winner: color,
          message: `${capturedColor === 'white' ? '백' : '흑'} 왕이 잡혔습니다!`
        });
        
        return;
      }
      
      // 턴 전환
      room.currentTurn = room.currentTurn === 'white' ? 'black' : 'white';
      console.log(`턴 변경: ${room.currentTurn}`);
      
      // 이전 턴의 폰 두 칸 이동 상태 초기화
      resetPawnDoubleMove(room.board, color);
      
      // 체크 상태 확인
      const checkStatus = isInCheck(room.board, room.currentTurn);
      let gameStatus = 'playing';
      
      if (checkStatus) {
        // 체크 상태 확인
        if (isCheckmate(room.board, room.currentTurn, room.moveHistory, room.castlingRights)) {
          gameStatus = 'checkmate';
        } else {
          gameStatus = 'check';
        }
      }
      
      // 게임 상태 업데이트 및 브로드캐스트
      io.to(roomId).emit('boardUpdate', {
        board: room.board,
        turn: room.currentTurn,
        status: gameStatus,
        moveDetails: {
          from,
          to,
          piece: movingPiece.type,
          capture: targetPiece !== null,
          special: moveDetails.special
        }
      });
      
      if (gameStatus === 'checkmate') {
        const winner = room.currentTurn === 'white' ? 'black' : 'white';
        io.to(roomId).emit('gameOver', { 
          winner, 
          message: `체크메이트! ${winner === 'white' ? '백' : '흑'} 승리!` 
        });
        room.status = 'finished';
        console.log(`게임 종료(체크메이트): ${roomId}, 승자: ${winner}`);
      } else if (gameStatus === 'check') {
        // 체크 상태 전달
        io.to(roomId).emit('check', { turn: room.currentTurn });
        console.log(`체크 발생: ${roomId}`);
      }
    } else {
      socket.emit('error', moveResult.reason || '유효하지 않은 이동입니다.');
    }
  });

  // 재시작 요청
  socket.on('restartGame', (roomId) => {
    const room = games[roomId];
    if (room) {
      room.board = initializeBoard();
      room.currentTurn = 'white';
      room.status = 'playing';
      // 이동 기록 초기화
      room.moveHistory = [];
      // 캐슬링 권한 초기화
      room.castlingRights = {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
      };
      
      io.to(roomId).emit('gameRestarted', { board: room.board, turn: 'white' });
      console.log(`게임 재시작: ${roomId}`);
    }
  });

  // 방 나가기
  socket.on('leaveRoom', (roomId) => {
    leaveRoom(socket, roomId);
    // 방 목록 업데이트
    io.emit('roomListUpdated');
  });

  // 연결 해제
  socket.on('disconnect', () => {
    console.log('사용자 연결 해제:', socket.id);
    
    // 사용자가 속한 게임 찾기
    for (const roomId in games) {
      const room = games[roomId];
      if (room.players.white === socket.id || room.players.black === socket.id) {
        // 상대방에게 알림
        io.to(roomId).emit('playerDisconnected');
        
        // 방 제거
        delete games[roomId];
        
        // 방 목록 업데이트
        io.emit('roomListUpdated');
        break;
      }
    }
  });
});

// 방 나가기 함수
function leaveRoom(socket, roomId) {
  const room = games[roomId];
  if (!room) return;
  
  // 방에서 나간 플레이어가 누군지 확인
  const isWhite = room.players.white === socket.id;
  const isBlack = room.players.black === socket.id;
  
  if (isWhite || isBlack) {
    // 소켓 방에서 나가기
    socket.leave(roomId);
    
    // 게임 중이었다면 상대방에게 알림
    if (room.status === 'playing') {
      io.to(roomId).emit('playerLeft');
    }
    
    // 방장이 나갔거나 모든 플레이어가 나갔으면 방 제거 또는 상대방이 방장 승계
    if (!room.players.black && !room.players.white) {
      // 모든 플레이어가 나감 -> 방 제거
      delete games[roomId];
      console.log(`방 삭제: ${roomId} (모든 플레이어 퇴장)`);
    } else if (isWhite && room.players.black) {
      // 백(방장)이 나가고 흑이 있음 -> 흑이 새 방장
      room.players.white = room.players.black;
      room.players.black = null;
      room.playerNames.white = room.playerNames.black;
      room.playerNames.black = null;
      room.creatorName = room.playerNames.white;
      room.status = 'waiting';
      
      // 새 방장에게 알림
      io.to(room.players.white).emit('becomeHost', { 
        color: 'white',
        message: '상대방이 나갔습니다. 당신이 방장이 되었습니다.'
      });
      
      console.log(`방장 변경: ${roomId}, 흑 -> 백`);
    } else if (isBlack) {
      // 흑이 나감 -> 대기 상태로 변경
      room.players.black = null;
      room.playerNames.black = null;
      room.status = 'waiting';
      
      // 방장에게 알림
      io.to(room.players.white).emit('waitingForPlayer', {
        message: '상대방이 나갔습니다. 새 플레이어를 기다립니다.'
      });
      
      console.log(`흑 퇴장: ${roomId}, 대기 상태로 변경`);
    }
  }
}

// 초기 체스판 생성 함수
function initializeBoard() {
  const board = Array(8).fill().map(() => Array(8).fill(null));
  
  // 폰 배치
  for (let i = 0; i < 8; i++) {
    board[1][i] = { type: 'pawn', color: 'black', position: INITIAL_POSITION, lastMoveWasDouble: false };
    board[6][i] = { type: 'pawn', color: 'white', position: INITIAL_POSITION, lastMoveWasDouble: false };
  }
  
  // 블랙 피스 배치
  board[0][0] = { type: 'rook', color: 'black', position: INITIAL_POSITION };
  board[0][1] = { type: 'knight', color: 'black' };
  board[0][2] = { type: 'bishop', color: 'black' };
  board[0][3] = { type: 'queen', color: 'black' };
  board[0][4] = { type: 'king', color: 'black', position: INITIAL_POSITION };
  board[0][5] = { type: 'bishop', color: 'black' };
  board[0][6] = { type: 'knight', color: 'black' };
  board[0][7] = { type: 'rook', color: 'black', position: INITIAL_POSITION };
  
  // 화이트 피스 배치
  board[7][0] = { type: 'rook', color: 'white', position: INITIAL_POSITION };
  board[7][1] = { type: 'knight', color: 'white' };
  board[7][2] = { type: 'bishop', color: 'white' };
  board[7][3] = { type: 'queen', color: 'white' };
  board[7][4] = { type: 'king', color: 'white', position: INITIAL_POSITION };
  board[7][5] = { type: 'bishop', color: 'white' };
  board[7][6] = { type: 'knight', color: 'white' };
  board[7][7] = { type: 'rook', color: 'white', position: INITIAL_POSITION };
  
  return board;
}

// 체스 말 이동 검증 함수
function isValidMove(board, from, to, color, moveHistory = [], castlingRights = { white: { kingSide: true, queenSide: true }, black: { kingSide: true, queenSide: true } }) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  
  // 범위 확인
  if (
    fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
    toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7
  ) {
    return { valid: false, reason: '체스판 범위를 벗어났습니다.' };
  }

  const piece = board[fromRow][fromCol];
  const targetPiece = board[toRow][toCol];
  
  // 이동할 말이 없거나 자신의 말이 아닌 경우
  if (!piece) {
    return { valid: false, reason: '선택한 위치에 말이 없습니다.' };
  }
  
  if (piece.color !== color) {
    return { valid: false, reason: '자신의 말만 이동할 수 있습니다.' };
  }
  
  // 목적지에 자신의 말이 있는 경우
  if (targetPiece && targetPiece.color === color) {
    return { valid: false, reason: '자신의 말이 있는 곳으로 이동할 수 없습니다.' };
  }
  
  // 각 말 유형에 따른 이동 검증 및 특수 규칙 처리
  let validationResult = { valid: false };
  
  switch(piece.type) {
    case 'pawn':
      validationResult = validatePawnMove(board, from, to, color, moveHistory);
      break;
    case 'rook':
      validationResult = validateRookMove(board, from, to);
      break;
    case 'knight':
      validationResult = validateKnightMove(from, to);
      break;
    case 'bishop':
      validationResult = validateBishopMove(board, from, to);
      break;
    case 'queen':
      validationResult = validateQueenMove(board, from, to);
      break;
    case 'king':
      // 각 색상의 캐슬링 권한은 독립적으로 관리
      validationResult = validateKingMove(board, from, to, castlingRights[color]);
      break;
    default:
      return { valid: false, reason: '알 수 없는 말 유형입니다.' };
  }
  
  // 유효한 이동이면 체크 방지 검사
  if (validationResult.valid) {
    // 이동 후 체크 상태가 되는지 확인 (킹이 위험한 상태로 이동하는지)
    const tempBoard = JSON.parse(JSON.stringify(board)); // 깊은 복사
    
    // 임시로 이동 적용
    const tempMove = movePiece(tempBoard, from, to, validationResult, true);
    
    // 이동 후 자신의 킹이 체크 상태가 되면 이동 불가
    if (isInCheck(tempBoard, color)) {
      return { valid: false, reason: '이 이동은 자신의 킹을 체크 상태로 만듭니다.' };
    }
  }
  
  return validationResult;
}

// 폰 이동 검증 (앙파상 포함)
function validatePawnMove(board, from, to, color, moveHistory = []) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const direction = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;
  
  // 전진 이동
  if (fromCol === toCol) {
    // 한 칸 전진
    if (toRow === fromRow + direction && !board[toRow][toCol]) {
      return { valid: true };
    }
    // 두 칸 전진 (첫 이동시)
    if (
      fromRow === startRow &&
      toRow === fromRow + 2 * direction &&
      !board[fromRow + direction][fromCol] &&
      !board[toRow][toCol]
    ) {
      return { valid: true, special: 'double_move' };
    }
  }
  
  // 대각선 이동 (공격)
  if (
    toRow === fromRow + direction && 
    (toCol === fromCol + 1 || toCol === fromCol - 1)
  ) {
    // 일반 공격
    if (board[toRow][toCol] && board[toRow][toCol].color !== color) {
      return { valid: true };
    }
    
    // 앙파상
    if (!board[toRow][toCol] && (toCol === fromCol + 1 || toCol === fromCol - 1)) {
      // 조건 1: 옆으로 갈 수 있는 위치에 상대 폰이 있는지
      const adjacentPiece = board[fromRow][toCol];
      
      // 조건 2: 인접한 말이 폰인지, 상대 말인지, 그리고 직전에 두 칸 이동했는지
      if (adjacentPiece && 
          adjacentPiece.type === 'pawn' && 
          adjacentPiece.color !== color && 
          adjacentPiece.lastMoveWasDouble) {
        
        console.log(`앙파상 조건 충족! 위치 [${fromRow}, ${toCol}]의 폰 잡기 가능`);
        return { 
          valid: true, 
          special: 'en_passant',
          capturePosition: [fromRow, toCol]
        };
      }
      
      // 기존의 이동 기록 기반 검증 (하위 호환성 유지)
      if (moveHistory.length > 0) {
        const lastMove = moveHistory[moveHistory.length - 1];
        
        // 마지막 이동이 상대 폰의 두 칸 전진이었고
        if (
          lastMove.piece === 'pawn' && 
          lastMove.color !== color &&
          Math.abs(lastMove.from[0] - lastMove.to[0]) === 2 &&
          lastMove.to[0] === fromRow &&
          lastMove.to[1] === toCol
        ) {
          console.log(`이동 기록 기반 앙파상 조건 충족!`);
          return { 
            valid: true, 
            special: 'en_passant',
            capturePosition: [lastMove.to[0], lastMove.to[1]]
          };
        }
      }
    }
  }
  
  return { valid: false };
}

// 룩 이동 검증
function validateRookMove(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  
  // 수직 이동
  if (fromCol === toCol) {
    const step = fromRow < toRow ? 1 : -1;
    for (let r = fromRow + step; r !== toRow; r += step) {
      if (board[r][fromCol]) return { valid: false, reason: '경로에 다른 말이 있습니다.' };
    }
    return { valid: true };
  }
  
  // 수평 이동
  if (fromRow === toRow) {
    const step = fromCol < toCol ? 1 : -1;
    for (let c = fromCol + step; c !== toCol; c += step) {
      if (board[fromRow][c]) return { valid: false, reason: '경로에 다른 말이 있습니다.' };
    }
    return { valid: true };
  }
  
  return { valid: false };
}

// 나이트 이동 검증
function validateKnightMove(from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  
  if ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
    return { valid: true };
  }
  
  return { valid: false };
}

// 비숍 이동 검증
function validateBishopMove(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  
  // 대각선 이동
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  
  if (Math.abs(rowDiff) !== Math.abs(colDiff)) {
    return { valid: false };
  }
  
  const rowStep = rowDiff > 0 ? 1 : -1;
  const colStep = colDiff > 0 ? 1 : -1;
  
  let r = fromRow + rowStep;
  let c = fromCol + colStep;
  
  while (r !== toRow && c !== toCol) {
    if (board[r][c]) return { valid: false, reason: '경로에 다른 말이 있습니다.' };
    r += rowStep;
    c += colStep;
  }
  
  return { valid: true };
}

// 퀸 이동 검증
function validateQueenMove(board, from, to) {
  // 퀸은 룩과 비숍의 이동을 모두 할 수 있음
  const rookResult = validateRookMove(board, from, to);
  if (rookResult.valid) return rookResult;
  
  return validateBishopMove(board, from, to);
}

// 킹 이동 검증 (캐슬링 포함)
function validateKingMove(board, from, to, castlingRights) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  
  // 일반 이동 (한 칸)
  if (rowDiff <= 1 && colDiff <= 1) {
    return { valid: true };
  }
  
  // 캐슬링 체크
  if (fromRow === toRow && Math.abs(fromCol - toCol) === 2) {
    // 킹이 첫 위치에 있어야 함
    if (!board[fromRow][fromCol].position || board[fromRow][fromCol].position !== INITIAL_POSITION) {
      return { valid: false, reason: '캐슬링을 할 수 없습니다. 킹이 이미 이동했습니다.' };
    }
    
    // 킹이 체크 상태인지 확인
    if (isInCheck(board, board[fromRow][fromCol].color)) {
      return { valid: false, reason: '체크 상태에서는 캐슬링을 할 수 없습니다.' };
    }
    
    // 퀸 사이드 캐슬링
    if (toCol < fromCol) {
      if (!castlingRights.queenSide) {
        return { valid: false, reason: '퀸 사이드 캐슬링 권한이 없습니다.' };
      }
      
      // 룩이 있는지 확인
      if (!board[fromRow][0] || board[fromRow][0].type !== 'rook' || 
          board[fromRow][0].color !== board[fromRow][fromCol].color ||
          !board[fromRow][0].position || board[fromRow][0].position !== INITIAL_POSITION) {
        return { valid: false, reason: '캐슬링을 할 수 없습니다. 룩이 없거나 이동했습니다.' };
      }
      
      // 경로가 비어 있는지 확인
      for (let col = fromCol - 1; col > 0; col--) {
        if (board[fromRow][col]) {
          return { valid: false, reason: '캐슬링 경로에 다른 말이 있습니다.' };
        }
        
        // 킹이 지나가는 칸이 체크 상태인지 확인
        if (col >= fromCol - 2) {
          const tempBoard = JSON.parse(JSON.stringify(board));
          tempBoard[fromRow][fromCol] = null;
          tempBoard[fromRow][col] = board[fromRow][fromCol];
          
          if (isInCheck(tempBoard, board[fromRow][fromCol].color)) {
            return { valid: false, reason: '캐슬링 경로가 공격받고 있습니다.' };
          }
        }
      }
      
      return { valid: true, special: 'castling', rookFrom: [fromRow, 0], rookTo: [fromRow, 3] };
    }
    // 킹 사이드 캐슬링
    else {
      if (!castlingRights.kingSide) {
        return { valid: false, reason: '킹 사이드 캐슬링 권한이 없습니다.' };
      }
      
      // 룩이 있는지 확인
      if (!board[fromRow][7] || board[fromRow][7].type !== 'rook' || 
          board[fromRow][7].color !== board[fromRow][fromCol].color ||
          !board[fromRow][7].position || board[fromRow][7].position !== INITIAL_POSITION) {
        return { valid: false, reason: '캐슬링을 할 수 없습니다. 룩이 없거나 이동했습니다.' };
      }
      
      // 경로가 비어 있는지 확인
      for (let col = fromCol + 1; col < 7; col++) {
        if (board[fromRow][col]) {
          return { valid: false, reason: '캐슬링 경로에 다른 말이 있습니다.' };
        }
        
        // 킹이 지나가는 칸이 체크 상태인지 확인
        if (col <= fromCol + 2) {
          const tempBoard = JSON.parse(JSON.stringify(board));
          tempBoard[fromRow][fromCol] = null;
          tempBoard[fromRow][col] = board[fromRow][fromCol];
          
          if (isInCheck(tempBoard, board[fromRow][fromCol].color)) {
            return { valid: false, reason: '캐슬링 경로가 공격받고 있습니다.' };
          }
        }
      }
      
      return { valid: true, special: 'castling', rookFrom: [fromRow, 7], rookTo: [fromRow, 5] };
    }
  }
  
  return { valid: false };
}

// 체스말 이동 함수
function movePiece(board, from, to, moveDetails, isSimulation = false) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = board[fromRow][fromCol];
  
  // 이동하는 말의 초기 위치 상태 제거
  if (piece && piece.position === INITIAL_POSITION && !isSimulation) {
    piece.position = null;
  }
  
  // 폰이 두 칸 이동한 경우 lastMoveWasDouble 표시
  if (piece && piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
    piece.lastMoveWasDouble = true;
    console.log(`폰 두 칸 이동: ${piece.color} 폰, 위치 [${toRow}, ${toCol}]에 lastMoveWasDouble=true 설정`);
  }
  
  // 특수 이동 처리
  if (moveDetails.special) {
    // 앙파상
    if (moveDetails.special === 'en_passant') {
      const [captureRow, captureCol] = moveDetails.capturePosition;
      board[captureRow][captureCol] = null; // 상대방 폰 제거
      console.log(`앙파상 적용: 위치 [${captureRow}, ${captureCol}]의 폰 제거`);
    }
    // 캐슬링
    else if (moveDetails.special === 'castling') {
      const { rookFrom, rookTo } = moveDetails;
      const rook = board[rookFrom[0]][rookFrom[1]];
      
      // 룩 이동
      board[rookTo[0]][rookTo[1]] = rook;
      board[rookFrom[0]][rookFrom[1]] = null;
      
      if (rook && rook.position === INITIAL_POSITION && !isSimulation) {
        rook.position = null;
      }
    }
  }
  
  // 기본 이동
  board[toRow][toCol] = board[fromRow][fromCol];
  board[fromRow][fromCol] = null;
  
  return moveDetails;
}

// 캐슬링 권한 업데이트
function updateCastlingRights(room, from, piece) {
  if (!room.castlingRights) {
    room.castlingRights = {
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true }
    };
  }
  
  const [row, col] = from;
  const pieceColor = piece.color; // 이동한 말의 색상
  
  // 킹 이동 시 해당 색상의 양쪽 캐슬링 권한만 제거
  if (piece.type === 'king') {
    room.castlingRights[pieceColor].kingSide = false;
    room.castlingRights[pieceColor].queenSide = false;
    console.log(`${pieceColor} 킹 이동: 캐슬링 권한 제거`);
  }
  // 룩 이동 시 해당 색상의 해당 사이드 캐슬링 권한만 제거
  else if (piece.type === 'rook') {
    const isQueenSideRook = col === 0;
    const isKingSideRook = col === 7;
    
    if (isQueenSideRook) {
      room.castlingRights[pieceColor].queenSide = false;
      console.log(`${pieceColor} 퀸사이드 룩 이동: 퀸사이드 캐슬링 권한 제거`);
    } else if (isKingSideRook) {
      room.castlingRights[pieceColor].kingSide = false;
      console.log(`${pieceColor} 킹사이드 룩 이동: 킹사이드 캐슬링 권한 제거`);
    }
  }
}

// 체크 상태 확인 함수
function isInCheck(board, color) {
  // 킹의 위치 찾기
  let kingPosition = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        kingPosition = [row, col];
        break;
      }
    }
    if (kingPosition) break;
  }
  
  if (!kingPosition) return false; // 킹이 없으면 체크 상태 아님
  
  // 모든 상대방 말에 대해 킹을 공격할 수 있는지 확인
  const opponentColor = color === 'white' ? 'black' : 'white';
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      
      if (piece && piece.color === opponentColor) {
        // 상대방 말이 킹을 공격할 수 있는지 검증
        let result;
        
        switch(piece.type) {
          case 'pawn':
            result = validatePawnMove(board, [row, col], kingPosition, opponentColor);
            break;
          case 'rook':
            result = validateRookMove(board, [row, col], kingPosition);
            break;
          case 'knight':
            result = validateKnightMove([row, col], kingPosition);
            break;
          case 'bishop':
            result = validateBishopMove(board, [row, col], kingPosition);
            break;
          case 'queen':
            result = validateQueenMove(board, [row, col], kingPosition);
            break;
          case 'king':
            // 킹은 다른 킹을 직접 공격할 수 없으므로 무시
            continue;
        }
        
        if (result.valid) {
          return true; // 킹이 공격받을 수 있으면 체크 상태
        }
      }
    }
  }
  
  return false;
}

// 체크메이트 확인 함수
function isCheckmate(board, color, moveHistory, castlingRights) {
  // 체크 상태가 아니면 체크메이트도 아님
  if (!isInCheck(board, color)) {
    return false;
  }
  
  // 모든 가능한 이동을 시도하여 체크를 벗어날 수 있는지 확인
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      
      if (piece && piece.color === color) {
        // 현재 말의 모든 가능한 이동 위치 시도
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            // 이동이 유효한지 확인
            const moveResult = isValidMove(board, [fromRow, fromCol], [toRow, toCol], color, moveHistory, castlingRights);
            
            if (moveResult.valid) {
              // 이동 후 체크 상태가 아니면 체크메이트 아님
              const tempBoard = JSON.parse(JSON.stringify(board));
              movePiece(tempBoard, [fromRow, fromCol], [toRow, toCol], moveResult, true);
              
              if (!isInCheck(tempBoard, color)) {
                return false;
              }
            }
          }
        }
      }
    }
  }
  
  // 체크를 벗어날 방법이 없으면 체크메이트
  return true;
}

// 게임 상태 확인
function checkGameStatus(board, currentTurn) {
  // 체크 상태 확인
  if (isInCheck(board, currentTurn)) {
    return 'check';
  }
  
  return 'playing';
}

// 이전 턴의 폰 두 칸 이동 상태 초기화
function resetPawnDoubleMove(board, color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'pawn' && piece.color === color && piece.lastMoveWasDouble) {
        piece.lastMoveWasDouble = false;
        console.log(`폰 두 칸 이동 초기화: ${color} 폰, 위치 [${row}, ${col}]에 lastMoveWasDouble=false 설정`);
      }
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 
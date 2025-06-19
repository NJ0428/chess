# 소켓 기반 체스 게임

이 프로젝트는 소켓을 이용한 실시간 멀티플레이어 체스 게임입니다.
<img alt="img.png" src="https://github.com/NJ0428/chess/blob/main/public/img.png?raw=true" data-hpc="true" class="Box-sc-g0xbh4-0 fzFXnm">
## 기능 소개

- Socket.IO를 이용한 실시간 게임 통신
- 방 만들기 및 참가하기 기능
- 체스 규칙에 따른 말 이동 및 유효성 검사
- 턴 기반 게임플레이
- 게임 재시작 기능

## 기술 스택

- Node.js
- Express
- Socket.IO
- 바닐라 JavaScript
- HTML5/CSS3

## 설치 방법

1. 저장소를 클론합니다.
```
git clone https://github.com/yourusername/chess-game.git
cd chess-game
```

2. 필요한 패키지를 설치합니다.
```
npm install
```

## 실행 방법

다음 명령어로 서버를 실행합니다.
```
npm start
```

또는 개발 모드로 실행:
```
npm run dev
```

서버가 실행되면 브라우저에서 `http://localhost:3000`으로 접속할 수 있습니다.

## 게임 방법

1. 방 아이디를 입력하고 '방 만들기' 버튼을 클릭하여 방을 생성합니다.
2. 상대방이 같은 방 아이디를 입력하고 '방 참가하기' 버튼을 클릭하여 게임에 참가합니다.
3. 게임이 시작되면 자신의 턴에 체스 말을 선택하고 이동할 위치를 클릭하여 이동합니다.
4. 체크메이트가 발생하거나 게임이 종료되면 '게임 재시작' 버튼을 눌러 다시 시작할 수 있습니다.

## 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 

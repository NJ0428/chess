// ─── 토너먼트 클라이언트 ──────────────────────────────────────────

const socket = io();

let currentUser = null;
let currentTournamentId = null;
let currentTab = 'waiting';
let pendingMatchData = null; // 대기 중인 토너먼트 경기
let selectedDetailTab = 'bracket';
let selectedRound = 1;

// ─── 초기화 ──────────────────────────────────────────────────────
async function init() {
  await loadUser();
  loadTournaments(currentTab);
  setupUI();
  setupSocket();
}

async function loadUser() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    if (data.loggedIn) {
      currentUser = data.user;
      document.getElementById('btn-create').style.display = 'inline-flex';
      updateAuthLinks(data.user);
    }
  } catch (e) { /* 비로그인 */ }
}

function updateAuthLinks(user) {
  const el = document.getElementById('auth-links');
  if (!el || !user) return;
  el.innerHTML = `
    <span style="font-size:0.85rem;color:var(--text-muted,#64748b)">${user.nickname}</span>
    <a href="mypage.html" class="btn btn-sm btn-outline">마이페이지</a>
    <a href="game.html" class="btn btn-sm btn-primary">게임 시작</a>
  `;
}

// ─── 토너먼트 목록 로드 ───────────────────────────────────────────
async function loadTournaments(status) {
  const list = document.getElementById('tournament-list');
  list.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i>불러오는 중...</div>';
  try {
    const url = status ? `/api/tournaments?status=${status}` : '/api/tournaments';
    const res = await fetch(url);
    const data = await res.json();
    renderList(data);
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i>불러오기 실패</div>';
  }
}

function renderList(items) {
  const list = document.getElementById('tournament-list');
  if (!items || items.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i>토너먼트가 없습니다.</div>';
    return;
  }
  const tcLabel = { blitz: '블리츠 3분', rapid: '래피드 10분', classic: '클래식 30분' };
  const fmtLabel = { swiss: '스위스', single_elimination: '단판' };
  list.innerHTML = items.map(t => `
    <div class="tournament-card ${t.id === currentTournamentId ? 'selected' : ''}"
         onclick="selectTournament(${t.id})">
      <div class="tc-top">
        <span class="tc-name">${escHtml(t.name)}</span>
        <span class="tc-status ${t.status}">${statusLabel(t.status)}</span>
      </div>
      <div class="tc-meta">
        <span><i class="fas fa-users"></i>${t.participant_count || 0}/${t.max_players}</span>
        <span><i class="fas fa-chess-board"></i>${fmtLabel[t.format] || t.format}</span>
        <span><i class="fas fa-clock"></i>${tcLabel[t.time_control] || t.time_control}</span>
        <span><i class="fas fa-user"></i>${escHtml(t.host_nickname)}</span>
      </div>
    </div>
  `).join('');
}

function statusLabel(s) {
  return s === 'waiting' ? '대기중' : s === 'ongoing' ? '진행중' : '완료';
}

// ─── 토너먼트 상세 보기 ───────────────────────────────────────────
async function selectTournament(id) {
  currentTournamentId = id;
  document.getElementById('no-selection').style.display = 'none';
  document.getElementById('detail-view').style.display = 'block';

  // 카드 selected 갱신
  document.querySelectorAll('.tournament-card').forEach(el => {
    const onclick = el.getAttribute('onclick');
    el.classList.toggle('selected', onclick && onclick.includes(`(${id})`));
  });

  await refreshDetail();
}

async function refreshDetail() {
  if (!currentTournamentId) return;
  try {
    const res = await fetch(`/api/tournaments/${currentTournamentId}`);
    const data = await res.json();
    if (!data || !data.tournament) return;
    renderDetail(data);
  } catch (e) { /* 오류 무시 */ }
}

function renderDetail({ tournament: t, participants, matches }) {
  const tcLabel = { blitz: '블리츠 3분', rapid: '래피드 10분', classic: '클래식 30분' };
  const fmtLabel = { swiss: '스위스 방식', single_elimination: '단판 토너먼트' };
  const isHost = currentUser && currentUser.id === t.host_id;
  const isParticipant = currentUser && participants.some(p => p.user_id === currentUser.id && p.status === 'active');
  const isFull = participants.filter(p => p.status !== 'withdrew').length >= t.max_players;

  // 헤더
  let actions = '';
  if (t.status === 'waiting') {
    if (isHost) {
      actions += `<button class="btn btn-primary" onclick="startTournament(${t.id})"><i class="fas fa-play"></i> 시작하기</button>`;
      actions += `<button class="btn btn-outline" onclick="deleteTournament(${t.id})" style="background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.3)"><i class="fas fa-trash"></i> 삭제</button>`;
    } else if (!isParticipant && currentUser) {
      if (!isFull) actions += `<button class="btn btn-primary" onclick="joinTournament(${t.id})"><i class="fas fa-user-plus"></i> 참가하기</button>`;
    } else if (isParticipant && !isHost) {
      actions += `<button class="btn btn-outline" onclick="leaveTournament(${t.id})" style="background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.3)"><i class="fas fa-sign-out-alt"></i> 참가 취소</button>`;
    }
    if (!currentUser) {
      actions += `<a href="login.html" class="btn btn-outline" style="color:#fff;border-color:rgba(255,255,255,0.4)"><i class="fas fa-sign-in-alt"></i> 로그인 후 참가</a>`;
    }
  }

  document.getElementById('detail-header').innerHTML = `
    ${t.status === 'finished' && t.winner_nickname ? `
      <div style="background:rgba(251,191,36,0.2);border-radius:8px;padding:0.5rem 1rem;margin-bottom:0.75rem;font-size:0.9rem">
        🏆 우승자: <strong>${escHtml(t.winner_nickname)}</strong>
      </div>` : ''}
    <div class="detail-title">${escHtml(t.name)}</div>
    <div style="font-size:0.88rem;opacity:0.8">방장: ${escHtml(t.host_nickname)} &nbsp;·&nbsp; ${statusLabel(t.status)}</div>
    <div class="detail-badges">
      <span class="detail-badge"><i class="fas fa-chess-board"></i> ${fmtLabel[t.format] || t.format}</span>
      <span class="detail-badge"><i class="fas fa-users"></i> ${participants.filter(p => p.status !== 'withdrew').length}/${t.max_players}명</span>
      <span class="detail-badge"><i class="fas fa-clock"></i> ${tcLabel[t.time_control] || t.time_control}</span>
      ${t.status === 'ongoing' ? `<span class="detail-badge"><i class="fas fa-flag"></i> ${t.current_round}/${t.total_rounds} 라운드</span>` : ''}
    </div>
    ${actions ? `<div class="detail-actions">${actions}</div>` : ''}
  `;

  // 대진표
  renderBracket(matches, t.current_round || 0, t.status);
  // 순위
  renderStandings(participants, t.status);
  // 참가자
  renderParticipants(participants);
}

function renderBracket(matches, currentRound, status) {
  const nav = document.getElementById('rounds-nav');
  const content = document.getElementById('bracket-content');

  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  if (rounds.length === 0) {
    nav.innerHTML = '';
    content.innerHTML = '<div class="empty-state"><i class="fas fa-chess-board"></i>대진표가 아직 생성되지 않았습니다.</div>';
    return;
  }

  // 라운드 네비게이션
  if (!rounds.includes(selectedRound)) selectedRound = rounds[rounds.length - 1];
  nav.innerHTML = rounds.map(r => `
    <button class="round-btn ${r === selectedRound ? 'active' : ''}" onclick="selectRound(${r})">${r}라운드</button>
  `).join('');

  const roundMatches = matches.filter(m => m.round === selectedRound);
  content.innerHTML = roundMatches.map(m => renderMatchCard(m)).join('');
}

function renderMatchCard(m) {
  if (m.result === 'bye') {
    return `<div class="match-card">
      <div class="match-player winner">
        <span class="mp-name"><i class="fas fa-chess-pawn"></i>${escHtml(m.white_nickname || '?')}</span>
        <span class="ms-bye match-status-badge">부전승</span>
      </div>
    </div>`;
  }

  const isMyMatch = currentUser && (currentUser.id === m.white_player_id || currentUser.id === m.black_player_id);
  const whiteWon = m.result === 'white';
  const blackWon = m.result === 'black';
  const isDraw = m.result === 'draw';

  const statusBadge = m.status === 'pending' ? '<span class="ms-pending match-status-badge">대기</span>'
    : m.status === 'ongoing' ? '<span class="ms-ongoing match-status-badge">진행중</span>'
    : '<span class="ms-finished match-status-badge">완료</span>';

  let joinBtn = '';
  if (isMyMatch && m.status === 'pending' && currentUser) {
    joinBtn = `<button class="match-join-btn" onclick="joinMatch(${m.id},'${m.room_id}')"><i class="fas fa-chess-board"></i> 경기 입장</button>`;
  } else if (isMyMatch && m.status === 'ongoing') {
    joinBtn = `<button class="match-join-btn" onclick="joinMatch(${m.id},'${m.room_id}')"><i class="fas fa-sign-in-alt"></i> 경기 복귀</button>`;
  }

  return `<div class="match-card">
    <div class="match-player ${whiteWon ? 'winner' : blackWon ? 'loser' : ''}">
      <span class="mp-name">${whiteWon ? '♟' : ''}${escHtml(m.white_nickname || '?')}</span>
      ${statusBadge}
    </div>
    <div class="match-player ${blackWon ? 'winner' : whiteWon ? 'loser' : ''}">
      <span class="mp-name">${blackWon ? '♟' : ''}${escHtml(m.black_nickname || '?')}</span>
      ${isDraw ? '<span style="font-size:0.78rem;color:#64748b">무승부</span>' : ''}
    </div>
    ${joinBtn}
  </div>`;
}

function selectRound(r) {
  selectedRound = r;
  document.querySelectorAll('.round-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.textContent) === r);
  });
  // 경기 다시 렌더 (현재 데이터 캐시 없으므로 재요청)
  refreshDetail();
}

function renderStandings(participants, status) {
  const active = [...participants].filter(p => p.status !== 'withdrew')
    .sort((a, b) => b.points - a.points || b.wins - a.wins || b.elo_rating - a.elo_rating);

  const container = document.getElementById('standings-content');
  if (active.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-list-ol"></i>참가자가 없습니다.</div>';
    return;
  }

  const rankClass = i => i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
  const rankSymbol = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;

  container.innerHTML = `
    <table class="standings-table">
      <thead>
        <tr>
          <th>#</th><th>참가자</th><th>ELO</th><th>점수</th><th>승</th><th>무</th><th>패</th>
          ${status === 'waiting' ? '' : '<th>상태</th>'}
        </tr>
      </thead>
      <tbody>
        ${active.map((p, i) => `
          <tr class="${currentUser && p.user_id === currentUser.id ? 'player-row-me' : ''}">
            <td><span class="rank-badge ${rankClass(i)}">${rankSymbol(i)}</span></td>
            <td>${escHtml(p.nickname)}</td>
            <td>${p.elo_rating}</td>
            <td><strong>${p.points}</strong></td>
            <td>${p.wins}</td>
            <td>${p.draws}</td>
            <td>${p.losses}</td>
            ${status === 'waiting' ? '' : `<td style="font-size:0.78rem">${p.status === 'eliminated' ? '<span style="color:#ef4444">탈락</span>' : p.status === 'active' ? '<span style="color:#22c55e">진행</span>' : p.status}</td>`}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderParticipants(participants) {
  const active = participants.filter(p => p.status !== 'withdrew');
  const container = document.getElementById('participants-content');
  if (active.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i>참가자가 없습니다.</div>';
    return;
  }
  container.innerHTML = active.map((p, i) => `
    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--border-color,#f1f5f9)">
      <span style="font-size:0.8rem;color:#64748b;width:1.5rem;text-align:center">${i + 1}</span>
      <span style="flex:1;font-weight:500;font-size:0.9rem">${escHtml(p.nickname)}</span>
      <span style="font-size:0.8rem;color:#64748b">ELO ${p.elo_rating}</span>
      ${p.seed ? `<span style="font-size:0.75rem;color:#94a3b8">시드 ${p.seed}</span>` : ''}
    </div>
  `).join('');
}

// ─── 경기 입장 ────────────────────────────────────────────────────
function joinMatch(matchId, roomId) {
  if (!currentUser) return showToast('로그인이 필요합니다.');
  // 체스 게임 페이지로 이동하며 토너먼트 경기 파라미터 전달
  window.location.href = `game.html?tournamentMatchId=${matchId}&roomId=${encodeURIComponent(roomId)}&tournament=1`;
}

// ─── API 액션 ─────────────────────────────────────────────────────
async function joinTournament(id) {
  if (!currentUser) return showToast('로그인이 필요합니다.');
  try {
    const res = await fetch(`/api/tournaments/${id}/join`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return showToast(data.message || '오류 발생');
    showToast('참가 완료!');
    await refreshDetail();
    await loadTournaments(currentTab);
  } catch (e) { showToast('서버 오류'); }
}

async function leaveTournament(id) {
  if (!confirm('참가를 취소하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/tournaments/${id}/leave`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return showToast(data.message || '오류 발생');
    showToast('참가 취소됨');
    await refreshDetail();
    await loadTournaments(currentTab);
  } catch (e) { showToast('서버 오류'); }
}

async function deleteTournament(id) {
  if (!confirm('토너먼트를 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/tournaments/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) return showToast(data.message || '오류 발생');
    showToast('삭제됨');
    currentTournamentId = null;
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('no-selection').style.display = 'block';
    await loadTournaments(currentTab);
  } catch (e) { showToast('서버 오류'); }
}

async function startTournament(id) {
  if (!confirm('토너먼트를 시작하시겠습니까?\n시작 후에는 참가 취소가 불가합니다.')) return;
  try {
    const res = await fetch(`/api/tournaments/${id}/start`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return showToast(data.message || '오류 발생');
    showToast('토너먼트 시작!');
    await refreshDetail();
    await loadTournaments(currentTab);
  } catch (e) { showToast('서버 오류'); }
}

// ─── 토너먼트 생성 ────────────────────────────────────────────────
document.getElementById('btn-create').addEventListener('click', () => {
  document.getElementById('create-modal').classList.add('open');
});
document.getElementById('btn-cancel-create').addEventListener('click', () => {
  document.getElementById('create-modal').classList.remove('open');
});
document.getElementById('create-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('create-modal'))
    document.getElementById('create-modal').classList.remove('open');
});

document.getElementById('btn-confirm-create').addEventListener('click', async () => {
  const name = document.getElementById('t-name').value.trim();
  const format = document.getElementById('t-format').value;
  const maxPlayers = document.getElementById('t-max').value;
  const timeControl = document.getElementById('t-tc').value;

  if (!name) return showToast('토너먼트 이름을 입력하세요.');

  const btn = document.getElementById('btn-confirm-create');
  btn.disabled = true;
  try {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, format, maxPlayers: Number(maxPlayers), timeControl })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || '오류 발생'); return; }
    document.getElementById('create-modal').classList.remove('open');
    document.getElementById('t-name').value = '';
    showToast('토너먼트가 생성되었습니다!');
    await loadTournaments(currentTab);
    selectTournament(data.tournamentId);
  } catch (e) { showToast('서버 오류'); }
  finally { btn.disabled = false; }
});

// ─── 탭 전환 ─────────────────────────────────────────────────────
document.querySelectorAll('.t-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.t-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.status;
    loadTournaments(currentTab);
  });
});

document.querySelectorAll('.detail-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.detail-tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById(`tab-${tab}`).classList.add('active');
    selectedDetailTab = tab;
  });
});

// ─── 소켓 이벤트 ─────────────────────────────────────────────────
function setupSocket() {
  if (currentUser) {
    socket.emit('identify', { userId: currentUser.id, nickname: currentUser.nickname });
  }

  // 토너먼트 경기 준비 알림
  socket.on('tournamentMatchReady', (data) => {
    pendingMatchData = data;
    const colorLabel = data.color === 'white' ? '백' : '흑';
    document.getElementById('match-alert-msg').textContent =
      `${escHtml(data.opponentName)} 와의 경기 (${colorLabel}) — 지금 입장하세요!`;
    document.getElementById('match-alert').style.display = 'block';

    // 5초 후 자동 알림음 (브라우저 허용 시)
    try { new Audio('/sounds/move.mp3').play(); } catch (e) { /* 무시 */ }
  });

  document.getElementById('btn-go-match').addEventListener('click', () => {
    if (!pendingMatchData) return;
    document.getElementById('match-alert').style.display = 'none';
    joinMatch(pendingMatchData.matchId, pendingMatchData.roomId);
  });

  // 토너먼트 업데이트 알림
  socket.on('tournamentUpdated', ({ tournamentId }) => {
    loadTournaments(currentTab);
    if (tournamentId === currentTournamentId) refreshDetail();
  });

  socket.on('tournamentNewRound', ({ tournamentId, round }) => {
    if (tournamentId === currentTournamentId) {
      selectedRound = round;
      refreshDetail();
      showToast(`${round}라운드 경기가 배정되었습니다!`);
    }
  });

  socket.on('tournamentFinished', ({ tournamentId, winner }) => {
    loadTournaments(currentTab);
    if (tournamentId === currentTournamentId) {
      refreshDetail();
      if (winner) {
        showToast(`🏆 토너먼트 종료! 우승자: ${winner.nickname}`, 5000);
      }
    }
  });
}

// ─── UI 설정 ─────────────────────────────────────────────────────
function setupUI() {
  // 다크모드 토글
  const darkBtn = document.getElementById('dark-mode-toggle');
  if (darkBtn) {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') document.body.classList.add('dark-mode');
    darkBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
  }
  // 모바일 메뉴
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const navList = document.getElementById('nav-list');
  if (mobileToggle && navList) {
    mobileToggle.addEventListener('click', () => navList.classList.toggle('open'));
  }
}

// ─── 유틸 ────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer = null;
function showToast(msg, duration = 3000) {
  const el = document.getElementById('t-toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, duration);
}

// ─── 게임 페이지에서 토너먼트 경기 처리 ─────────────────────────
// (game.html에서 URL 파라미터 확인 후 joinTournamentMatch 소켓 이벤트 발행)

init();

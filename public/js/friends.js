/* friends.js — 친구 시스템 클라이언트 */

const socket = io();
let currentUser = null;
let pendingInvite = null; // { inviteId, fromUserId, fromNickname, roomId }
let friendsList = [];

// ─── 초기화 ───────────────────────────────────────────────

async function init() {
  await loadAuthStatus();
  setupDarkMode();
  setupMobileNav();
  setupTabs();
  setupSearch();
  setupRecordSelect();

  if (currentUser) {
    socket.emit('identify', { userId: currentUser.id, nickname: currentUser.nickname });
    await Promise.all([loadFriends(), loadRequests(), loadSentRequests()]);
  } else {
    showLoginPrompt();
  }
}

async function loadAuthStatus() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    if (data.isLoggedIn) {
      currentUser = data.user;
      renderAuthHeader(data.user);
    }
  } catch (e) { /* ignore */ }
}

function renderAuthHeader(user) {
  const el = document.getElementById('auth-links');
  if (!el) return;
  el.innerHTML = `
    <span style="font-size:.85rem;color:var(--text-muted,#64748b);margin-right:.5rem;">
      <i class="fas fa-user"></i> ${escapeHtml(user.nickname)}
    </span>
    <a href="mypage.html" class="btn btn-sm btn-outline">마이페이지</a>
    <a href="game.html" class="btn btn-sm btn-primary">게임 시작</a>
  `;
}

function showLoginPrompt() {
  ['friends-list','requests-list','sent-list','search-results'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i>로그인이 필요합니다.<br><a href="login.html" class="btn btn-sm btn-primary" style="margin-top:.75rem;">로그인</a></div>';
  });
}

// ─── API 호출 ─────────────────────────────────────────────

async function loadFriends() {
  try {
    const res = await fetch('/api/friends');
    friendsList = await res.json();
    renderFriendsList();
    populateRecordSelect();
  } catch (e) { friendsList = []; }
}

async function loadRequests() {
  try {
    const res = await fetch('/api/friends/requests');
    const requests = await res.json();
    renderRequestsList(requests);
    const badge = document.getElementById('request-badge');
    if (badge) {
      badge.textContent = requests.length;
      badge.style.display = requests.length > 0 ? 'inline-flex' : 'none';
    }
  } catch (e) { /* ignore */ }
}

async function loadSentRequests() {
  try {
    const res = await fetch('/api/friends/sent');
    const sent = await res.json();
    renderSentList(sent);
  } catch (e) { /* ignore */ }
}

async function sendFriendRequest(targetUserId, btn) {
  btn.disabled = true;
  btn.textContent = '전송 중...';
  try {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('친구 요청을 보냈습니다.');
      btn.textContent = '요청됨';
      btn.disabled = true;
      loadSentRequests();
    } else {
      showToast(data.message || '요청 실패', true);
      btn.disabled = false;
      btn.textContent = '친구 추가';
    }
  } catch (e) {
    showToast('오류가 발생했습니다.', true);
    btn.disabled = false;
    btn.textContent = '친구 추가';
  }
}

async function respondRequest(requesterId, action) {
  try {
    const res = await fetch('/api/friends/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId, action })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message);
      await Promise.all([loadFriends(), loadRequests()]);
    } else {
      showToast(data.message || '오류', true);
    }
  } catch (e) { showToast('오류가 발생했습니다.', true); }
}

async function removeFriend(friendId) {
  if (!confirm('친구를 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/friends/${friendId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message);
      await loadFriends();
    } else {
      showToast(data.message || '오류', true);
    }
  } catch (e) { showToast('오류가 발생했습니다.', true); }
}

async function loadRecord(friendId) {
  const el = document.getElementById('record-content');
  if (!friendId) {
    el.innerHTML = '<div class="record-no-friend">친구를 선택하면 상대 전적을 확인할 수 있습니다.</div>';
    return;
  }
  try {
    const res = await fetch(`/api/friends/record/${friendId}`);
    const data = await res.json();
    const friend = friendsList.find(f => f.id === parseInt(friendId));
    const friendName = friend ? escapeHtml(friend.nickname) : '상대';
    el.innerHTML = `
      <p style="text-align:center;font-size:.9rem;color:var(--text-muted,#64748b);margin-bottom:1rem;">
        나 vs ${friendName}
      </p>
      <div class="record-stats">
        <div class="record-stat">
          <div class="stat-value">${data.total || 0}</div>
          <div class="stat-label">총 대전</div>
        </div>
        <div class="record-stat wins">
          <div class="stat-value">${data.my_wins || 0}</div>
          <div class="stat-label">승</div>
        </div>
        <div class="record-stat losses">
          <div class="stat-value">${data.my_losses || 0}</div>
          <div class="stat-label">패</div>
        </div>
        <div class="record-stat draws">
          <div class="stat-value">${data.draws || 0}</div>
          <div class="stat-label">무</div>
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = '<div class="record-no-friend">전적을 불러오지 못했습니다.</div>';
  }
}

// ─── 렌더링 ───────────────────────────────────────────────

function renderFriendsList() {
  const el = document.getElementById('friends-list');
  if (!el) return;
  if (!friendsList.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-user-plus"></i>아직 친구가 없습니다.<br>유저를 검색해서 친구를 추가해보세요!</div>';
    return;
  }
  el.innerHTML = friendsList.map(f => `
    <div class="user-card" id="friend-card-${f.id}">
      <div class="user-avatar">
        <i class="fas fa-user"></i>
        <span class="${f.is_online ? 'online-dot' : 'offline-dot'}" id="dot-${f.id}"></span>
      </div>
      <div class="user-info">
        <div class="user-nickname">${escapeHtml(f.nickname)}</div>
        <div class="user-meta">
          <span>ELO ${f.elo_rating}</span>
          <span id="status-${f.id}" class="${f.is_online ? 'online-label' : 'offline-label'}">
            ${f.is_online ? '온라인' : '오프라인'}
          </span>
        </div>
      </div>
      <div class="card-actions">
        ${f.is_online ? `
          <button class="btn-icon invite" title="게임 초대" onclick="inviteFriendToGame(${f.id}, '${escapeHtml(f.nickname)}')">
            <i class="fas fa-chess"></i>
          </button>
        ` : ''}
        <button class="btn-icon remove" title="친구 삭제" onclick="removeFriend(${f.id})">
          <i class="fas fa-user-minus"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function renderRequestsList(requests) {
  const el = document.getElementById('requests-list');
  if (!el) return;
  if (!requests.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i>받은 친구 요청이 없습니다.</div>';
    return;
  }
  el.innerHTML = requests.map(r => `
    <div class="user-card">
      <div class="user-avatar"><i class="fas fa-user"></i></div>
      <div class="user-info">
        <div class="user-nickname">${escapeHtml(r.nickname)}</div>
        <div class="user-meta"><span>ELO ${r.elo_rating}</span></div>
      </div>
      <div class="card-actions">
        <button class="btn-icon accept" title="수락" onclick="respondRequest(${r.id}, 'accept')">
          <i class="fas fa-check"></i>
        </button>
        <button class="btn-icon reject" title="거절" onclick="respondRequest(${r.id}, 'reject')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function renderSentList(sent) {
  const el = document.getElementById('sent-list');
  if (!el) return;
  if (!sent.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-paper-plane"></i>보낸 친구 요청이 없습니다.</div>';
    return;
  }
  el.innerHTML = sent.map(r => `
    <div class="user-card">
      <div class="user-avatar"><i class="fas fa-user"></i></div>
      <div class="user-info">
        <div class="user-nickname">${escapeHtml(r.nickname)}</div>
        <div class="user-meta"><span style="color:#f59e0b;">대기 중...</span></div>
      </div>
    </div>
  `).join('');
}

function renderSearchResults(results) {
  const el = document.getElementById('search-results');
  if (!el) return;
  if (!results.length) {
    el.innerHTML = '<div class="empty-state" style="padding:1rem 0;"><i class="fas fa-search" style="font-size:1.5rem;"></i>검색 결과가 없습니다.</div>';
    return;
  }
  el.innerHTML = results.map(u => {
    let actionBtn = '';
    if (u.friendship_status === 'accepted') {
      actionBtn = `<button class="btn-add" disabled>친구</button>`;
    } else if (u.friendship_status === 'pending') {
      if (u.friendship_requester === currentUser.id) {
        actionBtn = `<button class="btn-add" disabled>요청됨</button>`;
      } else {
        actionBtn = `<button class="btn-add" onclick="respondRequest(${currentUser.id}, 'accept')">수락</button>`;
      }
    } else {
      actionBtn = `<button class="btn-add" onclick="sendFriendRequest(${u.id}, this)">친구 추가</button>`;
    }
    return `
      <div class="user-card">
        <div class="user-avatar"><i class="fas fa-user"></i></div>
        <div class="user-info">
          <div class="user-nickname">${escapeHtml(u.nickname)}</div>
          <div class="user-meta"><span>@${escapeHtml(u.username)}</span><span>ELO ${u.elo_rating}</span></div>
        </div>
        <div class="card-actions">${actionBtn}</div>
      </div>
    `;
  }).join('');
}

function populateRecordSelect() {
  const sel = document.getElementById('record-friend-select');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">친구를 선택하세요</option>' +
    friendsList.map(f => `<option value="${f.id}">${escapeHtml(f.nickname)}</option>`).join('');
  if (current) sel.value = current;
}

// ─── 게임 초대 ────────────────────────────────────────────

function inviteFriendToGame(friendId, friendNickname) {
  if (!currentUser) return;
  // 룸이 없으면 먼저 index.html로 이동하거나, 현재 방 목록 확인 필요
  // 여기서는 게임 페이지로 이동하면서 invite 파라미터 전달
  const confirmed = confirm(`${friendNickname}님을 게임에 초대하시겠습니까?\n게임 방을 만들고 초대 링크가 전달됩니다.`);
  if (!confirmed) return;

  // 임시 룸 ID 생성 후 초대 소켓 이벤트 발송
  const inviteRoomId = null; // 실제로는 방을 먼저 만들어야 함
  socket.emit('sendGameInvite', { targetUserId: friendId, roomId: inviteRoomId });
  showToast(`${friendNickname}님에게 초대를 보냈습니다.`);
}

function showInviteModal(invite) {
  pendingInvite = invite;
  const modal = document.getElementById('invite-modal');
  const text = document.getElementById('invite-modal-text');
  if (text) text.textContent = `${invite.fromNickname}님이 게임에 초대했습니다.`;
  if (modal) modal.style.display = 'flex';
}

document.getElementById('accept-invite-btn')?.addEventListener('click', () => {
  if (!pendingInvite) return;
  socket.emit('respondGameInvite', {
    inviteId: pendingInvite.inviteId,
    fromUserId: pendingInvite.fromUserId,
    action: 'accept',
    roomId: pendingInvite.roomId
  });
  document.getElementById('invite-modal').style.display = 'none';
  if (pendingInvite.roomId) {
    window.location.href = `game.html?room=${pendingInvite.roomId}`;
  } else {
    window.location.href = 'game.html';
  }
  pendingInvite = null;
});

document.getElementById('reject-invite-btn')?.addEventListener('click', () => {
  if (!pendingInvite) return;
  socket.emit('respondGameInvite', {
    inviteId: pendingInvite.inviteId,
    fromUserId: pendingInvite.fromUserId,
    action: 'reject',
    roomId: pendingInvite.roomId
  });
  document.getElementById('invite-modal').style.display = 'none';
  pendingInvite = null;
});

// ─── 소켓 이벤트 ──────────────────────────────────────────

socket.on('friendOnlineStatus', ({ userId, isOnline }) => {
  const friend = friendsList.find(f => f.id === userId);
  if (!friend) return;
  friend.is_online = isOnline;

  const dot = document.getElementById(`dot-${userId}`);
  const statusEl = document.getElementById(`status-${userId}`);
  const card = document.getElementById(`friend-card-${userId}`);

  if (dot) {
    dot.className = isOnline ? 'online-dot' : 'offline-dot';
  }
  if (statusEl) {
    statusEl.className = isOnline ? 'online-label' : 'offline-label';
    statusEl.textContent = isOnline ? '온라인' : '오프라인';
  }
  if (card) {
    // 초대 버튼 토글
    const actions = card.querySelector('.card-actions');
    if (actions) {
      const existingInvite = actions.querySelector('.invite');
      if (isOnline && !existingInvite) {
        const btn = document.createElement('button');
        btn.className = 'btn-icon invite';
        btn.title = '게임 초대';
        btn.innerHTML = '<i class="fas fa-chess"></i>';
        btn.onclick = () => inviteFriendToGame(userId, friend.nickname);
        actions.insertBefore(btn, actions.firstChild);
      } else if (!isOnline && existingInvite) {
        existingInvite.remove();
      }
    }
  }

  showToast(`${friend.nickname}님이 ${isOnline ? '접속했습니다.' : '오프라인이 되었습니다.'}`);
});

socket.on('friendRequestReceived', ({ fromNickname }) => {
  showToast(`${fromNickname}님이 친구 요청을 보냈습니다.`);
  loadRequests();
});

socket.on('friendRequestResponded', ({ addresseeNickname, action }) => {
  if (action === 'accept') {
    showToast(`${addresseeNickname}님이 친구 요청을 수락했습니다.`);
    loadFriends();
    loadSentRequests();
  } else {
    showToast(`${addresseeNickname}님이 친구 요청을 거절했습니다.`);
    loadSentRequests();
  }
});

socket.on('gameInviteReceived', (invite) => {
  showInviteModal(invite);
});

socket.on('gameInviteResponse', ({ fromNickname, action }) => {
  if (action === 'accept') {
    showToast(`${fromNickname}님이 게임 초대를 수락했습니다!`);
  } else {
    showToast(`${fromNickname}님이 게임 초대를 거절했습니다.`);
  }
});

// ─── UI 설정 ──────────────────────────────────────────────

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      ['friends', 'requests', 'sent'].forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if (el) el.style.display = t === tab ? '' : 'none';
      });
    });
  });
}

function setupSearch() {
  const input = document.getElementById('search-input');
  const btn = document.getElementById('search-btn');

  async function doSearch() {
    const q = (input?.value || '').trim();
    if (!q) return;
    if (!currentUser) {
      showToast('로그인이 필요합니다.', true);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok) {
        renderSearchResults(data);
      } else {
        showToast(data.message || '검색 실패', true);
      }
    } catch (e) {
      showToast('검색 중 오류가 발생했습니다.', true);
    }
  }

  btn?.addEventListener('click', doSearch);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
}

function setupRecordSelect() {
  const sel = document.getElementById('record-friend-select');
  sel?.addEventListener('change', () => loadRecord(sel.value));
}

function setupDarkMode() {
  const toggle = document.getElementById('dark-mode-toggle');
  if (!toggle) return;
  const saved = localStorage.getItem('darkMode');
  if (saved === 'true') document.body.classList.add('dark-mode');
  toggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
  });
}

function setupMobileNav() {
  const toggle = document.getElementById('mobile-nav-toggle');
  const nav = document.getElementById('nav-list');
  toggle?.addEventListener('click', () => nav?.classList.toggle('mobile-open'));
}

// ─── 유틸 ─────────────────────────────────────────────────

let toastTimer;
function showToast(msg, isError = false) {
  const el = document.getElementById('friend-toast');
  if (!el) return;
  el.textContent = msg;
  el.style.background = isError ? '#dc2626' : '#1e293b';
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── 실행 ─────────────────────────────────────────────────
init();

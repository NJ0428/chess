// My Page JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initMyPage();
});

// User data (mock data - in real app, this would come from backend)
const userData = {
    username: 'Player_123',
    email: 'user@example.com',
    rating: 1200,
    joinDate: '2024년 1월',
    totalGames: 156,
    wins: 89,
    losses: 45,
    draws: 22,
    currentStreak: 5,
    longestWinStreak: 12,
    longestLoseStreak: 3,
    totalPlaytime: 48, // hours
    avgGameTime: 15, // minutes
    favoritePiece: '퀸',
    pieceSuccessRate: 67,
    winRate: 57,
    winRateChange: 3,
    highestRating: 1350,
    lowestRating: 950,
    lastGameDate: '2024년 12월 20일'
};

// Recent games data (mock data)
const recentGames = [
    {
        id: 1,
        opponent: 'ChessMaster99',
        result: 'win',
        ratingChange: +15,
        date: '2024-12-20',
        time: '10:25',
        moves: 34,
        color: 'white'
    },
    {
        id: 2,
        opponent: 'GrandKnight',
        result: 'loss',
        ratingChange: -12,
        date: '2024-12-19',
        time: '08:45',
        moves: 28,
        color: 'black'
    },
    {
        id: 3,
        opponent: 'PawnStorm',
        result: 'win',
        ratingChange: +18,
        date: '2024-12-18',
        time: '12:30',
        moves: 45,
        color: 'white'
    },
    {
        id: 4,
        opponent: 'BishopKing',
        result: 'draw',
        ratingChange: +2,
        date: '2024-12-17',
        time: '25:15',
        moves: 67,
        color: 'black'
    },
    {
        id: 5,
        opponent: 'RookiePlayer',
        result: 'win',
        ratingChange: +8,
        date: '2024-12-16',
        time: '06:20',
        moves: 22,
        color: 'white'
    }
];

// Achievements data (mock data)
const achievements = [
    { id: 1, name: '첫 승리', description: '첫 게임에서 승리하기', icon: 'fas fa-trophy', unlocked: true },
    { id: 2, name: '연승 달성', description: '5연승 기록 세우기', icon: 'fas fa-fire', unlocked: true },
    { id: 3, name: '체스 마스터', description: '레이팅 2000 달성', icon: 'fas fa-crown', unlocked: false },
    { id: 4, name: '빠른 손가락', description: '1분 안에 게임 승리', icon: 'fas fa-bolt', unlocked: true },
    { id: 5, name: '인내심의 미덕', description: '50수 이상 게임 승리', icon: 'fas fa-hourglass', unlocked: false },
    { id: 6, name: '완벽한 게임', description: '실수 없이 게임 승리', icon: 'fas fa-star', unlocked: false },
    { id: 7, name: '사회적 플레이어', description: '친구 10명 추가', icon: 'fas fa-users', unlocked: true },
    { id: 8, name: '야행성', description: '자정까지 10게임 플레이', icon: 'fas fa-moon', unlocked: false }
];

function initMyPage() {
    loadUserProfile();
    loadStatsSummary();
    loadRecentGames();
    setupEventListeners();
    setupProfileDropdown();
    initializeSettings();
}

function loadUserProfile() {
    // Update profile information
    document.getElementById('profile-username').textContent = userData.username;
    document.getElementById('profile-rating').textContent = userData.rating;
    document.getElementById('join-date').textContent = userData.joinDate;
    document.getElementById('total-games').textContent = userData.totalGames;
    document.getElementById('user-email').textContent = userData.email;

    // Update profile forms
    document.getElementById('nickname-input').value = userData.username;
    document.getElementById('modal-username').value = userData.username;

    // Update rating tier
    updateRatingTier(userData.rating);
}

function updateRatingTier(rating) {
    let tier = 'Novice';
    if (rating >= 2000) tier = 'Grandmaster';
    else if (rating >= 1800) tier = 'Master';
    else if (rating >= 1600) tier = 'Expert';
    else if (rating >= 1400) tier = 'Advanced';
    else if (rating >= 1200) tier = 'Intermediate';
    else if (rating >= 1000) tier = 'Regular';

    const tierElement = document.querySelector('.badge-primary');
    if (tierElement) {
        tierElement.textContent = tier;
    }
}

function loadStatsSummary() {
    // Calculate and display stats
    document.getElementById('win-rate').textContent = userData.winRate + '%';
    document.getElementById('current-streak').textContent = userData.currentStreak;
    document.getElementById('total-time').textContent = userData.totalPlaytime + '시간';
    document.getElementById('favorite-piece').textContent = userData.favoritePiece;

    // Update change indicators
    const winRateChange = document.getElementById('win-rate-change');
    if (userData.winRateChange > 0) {
        winRateChange.innerHTML = `<i class="fas fa-arrow-up"></i> +${userData.winRateChange}%`;
        winRateChange.classList.add('positive');
        winRateChange.classList.remove('negative');
    } else if (userData.winRateChange < 0) {
        winRateChange.innerHTML = `<i class="fas fa-arrow-down"></i> ${userData.winRateChange}%`;
        winRateChange.classList.add('negative');
        winRateChange.classList.remove('positive');
    }

    document.getElementById('avg-game-time').textContent = `평균 ${userData.avgGameTime}분/게임`;
    document.getElementById('piece-success').textContent = `성공률 ${userData.pieceSuccessRate}%`;

    // Update streak type
    const streakType = document.getElementById('streak-type');
    if (userData.currentStreak === userData.longestWinStreak) {
        streakType.innerHTML = '<i class="fas fa-trophy"></i> 최고 기록';
        streakType.style.color = 'var(--warning-color)';
    } else {
        streakType.innerHTML = '<i class="fas fa-arrow-up"></i> 증가 중';
        streakType.style.color = 'var(--success-color)';
    }
}

function loadRecentGames() {
    const gamesList = document.getElementById('recent-games-list');

    if (recentGames.length === 0) {
        gamesList.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-chess-board"></i>
                <p>아직 게임 기록이 없습니다</p>
            </div>
        `;
        return;
    }

    gamesList.innerHTML = recentGames.map(game => {
        const resultText = game.result === 'win' ? '승리' : game.result === 'loss' ? '패배' : '무승부';
        const resultClass = game.result;
        const resultIcon = game.result === 'win' ? 'fa-check' : game.result === 'loss' ? 'fa-times' : 'fa-equals';
        const ratingClass = game.ratingChange > 0 ? 'positive' : game.ratingChange < 0 ? 'negative' : '';

        return `
            <div class="recent-game-item">
                <div class="game-result-badge ${resultClass}">
                    <i class="fas ${resultIcon}"></i>
                </div>
                <div class="recent-game-details">
                    <div class="recent-game-opponent">${game.opponent}</div>
                    <div class="recent-game-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(game.date)}</span>
                        <span><i class="fas fa-clock"></i> ${game.time}</span>
                        <span><i class="fas fa-chess-pawn"></i> ${game.moves}수</span>
                        <span><i class="fas fa-circle"></i> ${game.color === 'white' ? '백' : '흑'}</span>
                    </div>
                </div>
                <div class="recent-game-rating">
                    <div class="rating-change ${ratingClass}">
                        ${game.ratingChange > 0 ? '+' : ''}${game.ratingChange}
                    </div>
                    <small>${resultText}</small>
                </div>
            </div>
        `;
    }).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
}

function setupEventListeners() {
    // Profile edit button
    document.getElementById('edit-profile-btn').addEventListener('click', openProfileModal);

    // Share profile button
    document.getElementById('share-profile-btn').addEventListener('click', shareProfile);

    // Edit name button
    document.getElementById('edit-name-btn').addEventListener('click', openProfileModal);

    // Edit avatar button
    document.getElementById('edit-avatar-btn').addEventListener('click', changeAvatar);

    // Quick action buttons
    document.getElementById('achievements-btn').addEventListener('click', openAchievementsModal);
    document.getElementById('friends-btn').addEventListener('click', () => {
        showToast('친구 기능은 곧 출시됩니다!', 'info');
    });

    // Settings buttons
    document.getElementById('save-nickname-btn').addEventListener('click', saveNickname);
    document.getElementById('change-email-btn').addEventListener('click', () => {
        showToast('이메일 변경 기능은 곧 출시됩니다!', 'info');
    });
    document.getElementById('change-password-btn').addEventListener('click', () => {
        showToast('비밀번호 변경 기능은 곧 출시됩니다!', 'info');
    });
    document.getElementById('export-data-btn').addEventListener('click', exportUserData);
    document.getElementById('delete-account-btn').addEventListener('click', openDeleteAccountModal);

    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            closeModal(this.closest('.modal'));
        });
    });

    // Modal cancel buttons
    document.getElementById('cancel-profile-edit').addEventListener('click', () => {
        closeModal(document.getElementById('profile-modal'));
    });

    // Modal save buttons
    document.getElementById('save-profile-edit').addEventListener('click', saveProfileEdit);

    // Delete account modal
    document.getElementById('cancel-delete').addEventListener('click', () => {
        closeModal(document.getElementById('delete-account-modal'));
    });

    document.getElementById('confirm-delete').addEventListener('click', deleteAccount);

    document.getElementById('delete-confirmation').addEventListener('input', function() {
        const confirmBtn = document.getElementById('confirm-delete');
        confirmBtn.disabled = this.value !== '계정 삭제';
    });

    // Settings toggles
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            saveSetting(this.id, this.checked);
        });
    });

    // Settings selects
    document.querySelectorAll('.setting-item select').forEach(select => {
        select.addEventListener('change', function() {
            saveSetting(this.id, this.value);
        });
    });

    // Click outside modal to close
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                closeModal(openModal);
            }
        }
    });
}

function setupProfileDropdown() {
    const profileBtn = document.getElementById('profile-menu-btn');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (!profileBtn || !profileDropdown) return;

    profileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
    });

    document.addEventListener('click', function(e) {
        if (!profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
    });

    // Logout functionality
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('로그아웃하시겠습니까?')) {
            logout();
        }
    });
}

function initializeSettings() {
    // Load saved settings (in real app, this would come from backend)
    const savedSettings = {
        'time-control-select': 'rapid',
        'game-sounds': true,
        'auto-promotion': true,
        'online-status': true,
        'game-invites': true,
        'friend-requests': true
    };

    Object.keys(savedSettings).forEach(settingId => {
        const element = document.getElementById(settingId);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = savedSettings[settingId];
            } else {
                element.value = savedSettings[settingId];
            }
        }
    });
}

function openModal(modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    openModal(modal);
}

function openAchievementsModal() {
    const modal = document.getElementById('achievements-modal');
    const achievementsList = document.getElementById('achievements-list');

    achievementsList.innerHTML = achievements.map(achievement => {
        const unlockedClass = achievement.unlocked ? 'unlocked' : '';
        return `
            <div class="achievement-item ${unlockedClass}">
                <div class="achievement-icon">
                    <i class="${achievement.icon}"></i>
                </div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
            </div>
        `;
    }).join('');

    openModal(modal);
}

function openDeleteAccountModal() {
    const modal = document.getElementById('delete-account-modal');
    openModal(modal);
}

function saveProfileEdit() {
    const newUsername = document.getElementById('modal-username').value.trim();
    const newBio = document.getElementById('modal-bio').value.trim();
    const newCountry = document.getElementById('modal-country').value;

    if (!newUsername) {
        showToast('닉네임을 입력해주세요.', 'error');
        return;
    }

    // Update user data
    userData.username = newUsername;

    // Update UI
    document.getElementById('profile-username').textContent = newUsername;
    document.getElementById('nickname-input').value = newUsername;
    document.querySelector('.profile-name').textContent = newUsername;

    closeModal(document.getElementById('profile-modal'));
    showToast('프로필이 성공적으로 업데이트되었습니다!', 'success');
}

function saveNickname() {
    const newNickname = document.getElementById('nickname-input').value.trim();

    if (!newNickname) {
        showToast('닉네임을 입력해주세요.', 'error');
        return;
    }

    userData.username = newNickname;
    document.getElementById('profile-username').textContent = newNickname;
    document.querySelector('.profile-name').textContent = newNickname;

    showToast('닉네임이 변경되었습니다!', 'success');
}

function saveSetting(settingId, value) {
    // In real app, this would be saved to backend
    console.log(`Setting ${settingId} saved with value:`, value);
    showToast('설정이 저장되었습니다.', 'success');
}

function shareProfile() {
    const profileUrl = `${window.location.origin}/mypage?user=${userData.username}`;

    if (navigator.share) {
        navigator.share({
            title: 'NAK 체스 프로필',
            text: `${userData.username}님의 체스 프로필을 확인하세요!`,
            url: profileUrl
        }).catch(err => {
            console.log('Share cancelled');
        });
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(profileUrl).then(() => {
            showToast('프로필 링크가 클립보드에 복사되었습니다!', 'success');
        });
    }
}

function changeAvatar() {
    // In real app, this would open file picker or avatar selection
    showToast('프로필 사진 변경 기능은 곧 출시됩니다!', 'info');
}

function exportUserData() {
    const dataToExport = {
        profile: {
            username: userData.username,
            rating: userData.rating,
            joinDate: userData.joinDate,
            totalGames: userData.totalGames
        },
        stats: {
            wins: userData.wins,
            losses: userData.losses,
            draws: userData.draws,
            winRate: userData.winRate,
            highestRating: userData.highestRating,
            lowestRating: userData.lowestRating
        },
        recentGames: recentGames
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `nakchess-data-${userData.username}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showToast('데이터가 성공적으로 내보내기 되었습니다!', 'success');
}

function deleteAccount() {
    // In real app, this would make API call to delete account
    showToast('계정 삭제는 관리자 승인이 필요합니다.', 'error');
    closeModal(document.getElementById('delete-account-modal'));
}

function logout() {
    // In real app, this would clear session and redirect
    showToast('로그아웃되었습니다.', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');

    // Set message
    toastMessage.textContent = message;

    // Set icon based on type
    toast.className = 'toast show ' + type;

    switch (type) {
        case 'success':
            toastIcon.className = 'fas fa-check-circle toast-icon';
            break;
        case 'error':
            toastIcon.className = 'fas fa-exclamation-circle toast-icon';
            break;
        case 'info':
        default:
            toastIcon.className = 'fas fa-info-circle toast-icon';
            break;
    }

    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Reveal animation on scroll (already implemented in HTML, but adding for completeness)
function setupRevealAnimation() {
    const revealElements = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(element => {
        observer.observe(element);
    });
}

// Initialize animations
setupRevealAnimation();
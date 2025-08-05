// 통계 페이지 관리 클래스
class StatsManager {
    constructor() {
        this.currentUser = null;
        this.gameHistory = [];
        this.historyOffset = 0;
        this.historyLimit = 20;
        this.charts = {};

        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.setupNavigation();
        await this.loadDashboard();
    }

    // 인증 확인
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/status');
            const authData = await response.json();

            if (authData.isLoggedIn) {
                this.currentUser = authData.user;
                this.updateAuthLinks(authData.user);
            } else {
                alert('로그인이 필요합니다.');
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('인증 확인 실패:', error);
            window.location.href = '/login.html';
        }
    }

    // 인증 링크 업데이트
    updateAuthLinks(user) {
        const authLinks = document.getElementById('auth-links');
        authLinks.innerHTML = `
      <span class="user-info">안녕하세요, ${user.nickname}님!</span>
      <button id="logoutBtn" class="btn btn-outline">로그아웃</button>
    `;

        document.getElementById('logoutBtn').addEventListener('click', this.logout);
    }

    // 로그아웃
    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('로그아웃 실패:', error);
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        document.getElementById('loadMoreHistory').addEventListener('click', () => {
            this.loadMoreHistory();
        });

        // 업적 모달 닫기
        const modal = document.getElementById('achievementModal');
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // 네비게이션 설정
    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');

                if (href === '#dashboard') {
                    e.preventDefault();
                    this.showSection('dashboard');
                    this.updateActiveNav(link);
                } else if (href === '#leaderboard') {
                    e.preventDefault();
                    this.showSection('leaderboard');
                    this.updateActiveNav(link);
                    this.loadLeaderboard();
                }
            });
        });
    }

    // 섹션 표시
    showSection(sectionName) {
        const sections = ['dashboard', 'history', 'leaderboard'];
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) {
                element.style.display = section === sectionName ? 'block' : 'none';
            }
        });
    }

    // 활성 네비게이션 업데이트
    updateActiveNav(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    // 대시보드 로드
    async loadDashboard() {
        try {
            await Promise.all([
                this.loadPlayerStats(),
                this.loadGameHistory(),
                this.loadAchievements()
            ]);
        } catch (error) {
            console.error('대시보드 로드 실패:', error);
            this.showNotification('통계를 불러오는데 실패했습니다.');
        }
    }

    // 플레이어 통계 로드
    async loadPlayerStats() {
        try {
            const response = await fetch('/api/stats/me');
            const stats = await response.json();

            this.updateStatsDisplay(stats);
            this.createRatingChart(stats);
        } catch (error) {
            console.error('플레이어 통계 로드 실패:', error);
        }
    }

    // 통계 표시 업데이트
    updateStatsDisplay(stats) {
        // 기본 통계
        document.getElementById('currentRating').textContent = stats.elo_rating || 1200;
        document.getElementById('ratingTier').textContent = stats.rating_tier?.tier || 'Novice';
        document.getElementById('ratingTier').style.color = stats.rating_tier?.color || '#808080';

        document.getElementById('totalGames').textContent = stats.games_played || 0;
        document.getElementById('winRate').textContent = `${stats.win_rate || 0}%`;
        document.getElementById('currentStreak').textContent = stats.current_streak || 0;

        document.getElementById('totalWins').textContent = stats.wins || 0;
        document.getElementById('totalDraws').textContent = stats.draws || 0;
        document.getElementById('totalLosses').textContent = stats.losses || 0;

        // 상세 통계
        document.getElementById('highestRating').textContent = stats.highest_elo || 1200;
        document.getElementById('lowestRating').textContent = stats.lowest_elo || 1200;
        document.getElementById('longestWinStreak').textContent = stats.longest_win_streak || 0;
        document.getElementById('longestLoseStreak').textContent = stats.longest_lose_streak || 0;

        const totalMinutes = Math.floor((stats.total_playtime || 0) / 60);
        document.getElementById('totalPlaytime').textContent = `${totalMinutes}분`;

        if (stats.last_game_date) {
            const date = new Date(stats.last_game_date);
            document.getElementById('lastGameDate').textContent = date.toLocaleDateString('ko-KR');
        }

        // 승부 기록 차트 생성
        this.createRecordChart(stats);
    }

    // 승부 기록 차트 생성
    createRecordChart(stats) {
        const ctx = document.getElementById('recordChart').getContext('2d');

        if (this.charts.recordChart) {
            this.charts.recordChart.destroy();
        }

        this.charts.recordChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['승', '무', '패'],
                datasets: [{
                    data: [stats.wins || 0, stats.draws || 0, stats.losses || 0],
                    backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // 레이팅 차트 생성
    createRatingChart(stats) {
        // 게임 히스토리에서 레이팅 변화 데이터 추출
        const ratingData = this.gameHistory.slice(0, 20).reverse().map((game, index) => ({
            x: index,
            y: game.player_elo_after
        }));

        const ctx = document.getElementById('ratingChart').getContext('2d');

        if (this.charts.ratingChart) {
            this.charts.ratingChart.destroy();
        }

        this.charts.ratingChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: '레이팅',
                    data: ratingData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: false
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // 게임 히스토리 로드
    async loadGameHistory() {
        try {
            const response = await fetch(`/api/stats/history?limit=${this.historyLimit}&offset=${this.historyOffset}`);
            const history = await response.json();

            if (this.historyOffset === 0) {
                this.gameHistory = history;
                this.displayGameHistory(history);
            } else {
                this.gameHistory = [...this.gameHistory, ...history];
                this.appendGameHistory(history);
            }

            // 더 보기 버튼 표시/숨김
            const loadMoreBtn = document.getElementById('loadMoreHistory');
            if (history.length < this.historyLimit) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
            }
        } catch (error) {
            console.error('게임 히스토리 로드 실패:', error);
        }
    }

    // 더 많은 히스토리 로드
    async loadMoreHistory() {
        this.historyOffset += this.historyLimit;
        await this.loadGameHistory();
    }

    // 게임 히스토리 표시
    displayGameHistory(history) {
        const historyList = document.getElementById('gameHistoryList');
        historyList.innerHTML = '';

        if (history.length === 0) {
            historyList.innerHTML = `
        <div class="no-history">
          <i class="fas fa-chess-board"></i>
          <p>아직 플레이한 게임이 없습니다.</p>
        </div>
      `;
            return;
        }

        history.forEach(game => {
            const historyItem = this.createHistoryItem(game);
            historyList.appendChild(historyItem);
        });
    }

    // 게임 히스토리 추가
    appendGameHistory(history) {
        const historyList = document.getElementById('gameHistoryList');

        history.forEach(game => {
            const historyItem = this.createHistoryItem(game);
            historyList.appendChild(historyItem);
        });
    }

    // 히스토리 아이템 생성
    createHistoryItem(game) {
        const template = document.getElementById('historyItemTemplate');
        const item = template.content.cloneNode(true);

        // 결과 배지
        const resultBadge = item.querySelector('.result-badge');
        const resultClass = game.player_result === 'win' ? 'win' :
            game.player_result === 'draw' ? 'draw' : 'loss';
        resultBadge.className = `result-badge ${resultClass}`;
        resultBadge.textContent = game.player_result === 'win' ? '승' :
            game.player_result === 'draw' ? '무' : '패';

        // 게임 정보
        item.querySelector('.opponent-name').textContent = `vs ${game.opponent_name}`;

        const gameDate = new Date(game.ended_at);
        item.querySelector('.game-date').textContent = gameDate.toLocaleDateString('ko-KR');

        // 레이팅 변화
        const ratingChange = item.querySelector('.rating-change-value');
        const change = game.elo_change;
        ratingChange.textContent = change >= 0 ? `+${change}` : `${change}`;
        ratingChange.className = `rating-change-value ${change >= 0 ? 'positive' : 'negative'}`;

        // 상세 정보
        item.querySelector('.player-color').textContent = game.player_color === 'white' ? '백' : '흑';
        item.querySelector('.move-count').textContent = `${game.move_count}수`;

        const duration = Math.floor(game.game_duration / 60);
        item.querySelector('.game-duration').textContent = `${duration}분`;
        item.querySelector('.result-type').textContent = this.getResultTypeText(game.result_type);

        return item;
    }

    // 결과 타입 텍스트 변환
    getResultTypeText(resultType) {
        const types = {
            'checkmate': '체크메이트',
            'resignation': '기권',
            'timeout': '시간 초과',
            'draw': '무승부'
        };
        return types[resultType] || resultType;
    }

    // 업적 로드
    async loadAchievements() {
        try {
            const response = await fetch('/api/stats/achievements');
            const achievements = await response.json();

            this.displayAchievements(achievements);
        } catch (error) {
            console.error('업적 로드 실패:', error);
        }
    }

    // 업적 표시
    displayAchievements(achievements) {
        const achievementsList = document.getElementById('achievementsList');
        achievementsList.innerHTML = '';

        if (achievements.length === 0) {
            achievementsList.innerHTML = `
        <div class="no-achievements">
          <i class="fas fa-star"></i>
          <p>아직 획득한 업적이 없습니다.</p>
        </div>
      `;
            return;
        }

        achievements.forEach(achievement => {
            const achievementItem = document.createElement('div');
            achievementItem.className = 'achievement-item';

            const earnedDate = new Date(achievement.earned_at);
            achievementItem.innerHTML = `
        <div class="achievement-icon">
          <i class="fas fa-trophy"></i>
        </div>
        <div class="achievement-info">
          <h4>${achievement.achievement_name}</h4>
          <p>${achievement.description}</p>
          <span class="achievement-date">${earnedDate.toLocaleDateString('ko-KR')}</span>
        </div>
      `;

            achievementsList.appendChild(achievementItem);
        });
    }

    // 리더보드 로드
    async loadLeaderboard() {
        try {
            const response = await fetch('/api/stats/leaderboard');
            const leaderboard = await response.json();

            this.displayLeaderboard(leaderboard);
        } catch (error) {
            console.error('리더보드 로드 실패:', error);
        }
    }

    // 리더보드 표시
    displayLeaderboard(leaderboard) {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';

        if (leaderboard.length === 0) {
            leaderboardList.innerHTML = `
        <div class="no-leaderboard">
          <i class="fas fa-crown"></i>
          <p>아직 랭킹 데이터가 없습니다.</p>
        </div>
      `;
            return;
        }

        leaderboard.forEach(player => {
            const leaderboardItem = this.createLeaderboardItem(player);
            leaderboardList.appendChild(leaderboardItem);
        });
    }

    // 리더보드 아이템 생성
    createLeaderboardItem(player) {
        const template = document.getElementById('leaderboardItemTemplate');
        const item = template.content.cloneNode(true);

        // 순위 배지
        const rankBadge = item.querySelector('.rank-badge');
        const rankNumber = item.querySelector('.rank-number');
        rankNumber.textContent = player.rank;

        if (player.rank <= 3) {
            rankBadge.classList.add(`rank-${player.rank}`);
        }

        // 플레이어 정보
        item.querySelector('.player-name').textContent = player.nickname;

        const tierElement = item.querySelector('.player-tier');
        tierElement.textContent = player.rating_tier.tier;
        tierElement.style.color = player.rating_tier.color;

        // 통계
        item.querySelector('.rating').textContent = player.elo_rating;
        item.querySelector('.games').textContent = player.games_played;
        item.querySelector('.winrate').textContent = `${player.win_rate}%`;

        // 현재 사용자 하이라이트
        if (this.currentUser && player.nickname === this.currentUser.nickname) {
            item.querySelector('.leaderboard-item').classList.add('current-user');
        }

        return item;
    }

    // 새 업적 표시
    showNewAchievements(achievements) {
        const modal = document.getElementById('achievementModal');
        const newAchievements = document.getElementById('newAchievements');

        newAchievements.innerHTML = '';
        achievements.forEach(achievement => {
            const achievementDiv = document.createElement('div');
            achievementDiv.className = 'new-achievement';
            achievementDiv.innerHTML = `
        <h4>${achievement.name}</h4>
        <p>${achievement.description}</p>
      `;
            newAchievements.appendChild(achievementDiv);
        });

        modal.style.display = 'block';
    }

    // 알림 표시
    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.style.display = 'block';
        notification.style.opacity = '1';

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 3000);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    const statsManager = new StatsManager();

    // 전역에서 접근 가능하도록 설정
    window.statsManager = statsManager;
});
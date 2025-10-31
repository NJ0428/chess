document.addEventListener('DOMContentLoaded', () => {
    const leaderboardManager = new LeaderboardManager();
    window.leaderboardManager = leaderboardManager;
});

class LeaderboardManager {
    constructor() {
        this.leaderboardData = [];
        this.currentPeriod = 'all-time';
        this.currentGameType = 'all';
        this.currentPage = 1;
        this.playersPerPage = 50;
        this.sortBy = 'rating';
        this.sortOrder = 'desc';

        this.elements = {
            tbody: document.getElementById('leaderboard-tbody'),
            podium: {
                1: document.getElementById('podium-1'),
                2: document.getElementById('podium-2'),
                3: document.getElementById('podium-3'),
            },
            totalPlayers: document.getElementById('totalPlayers'),
            avgRating: document.getElementById('avgRating'),
            totalGames: document.getElementById('totalGames'),
            activePlayers: document.getElementById('activePlayers'),
            longestStreak: document.getElementById('longestStreak'),
            pagination: document.getElementById('pagination'),
            pageNumbers: document.getElementById('pageNumbers'),
            prevPage: document.getElementById('prevPage'),
            nextPage: document.getElementById('nextPage'),
            periodTabs: document.querySelectorAll('.period-tab'),
            gameTypeFilter: document.getElementById('gameTypeFilter'),
            refreshButton: document.getElementById('refreshLeaderboard'),
            sortableHeaders: document.querySelectorAll('.sortable'),
            ratingDistribution: document.querySelector('.rating-distribution .chart-container'),
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadLeaderboard();
    }

    setupEventListeners() {
        this.elements.periodTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.elements.periodTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentPeriod = tab.dataset.period;
                this.currentPage = 1;
                this.loadLeaderboard();
            });
        });

        this.elements.gameTypeFilter.addEventListener('change', (e) => {
            this.currentGameType = e.target.value;
            this.currentPage = 1;
            this.loadLeaderboard();
        });

        this.elements.refreshButton.addEventListener('click', () => this.loadLeaderboard());

        this.elements.prevPage.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.displayLeaderboard();
            }
        });

        this.elements.nextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(this.leaderboardData.length / this.playersPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.displayLeaderboard();
            }
        });

        this.elements.sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.dataset.sort;
                if (this.sortBy === sortKey) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortBy = sortKey;
                    this.sortOrder = 'desc';
                }
                this.sortData();
                this.displayLeaderboard();
                this.updateSortIcons();
            });
        });
    }

    async loadLeaderboard() {
        this.setLoadingState(true);
        try {
            // API 엔드포인트는 기간과 게임 유형을 쿼리 파라미터로 받을 수 있다고 가정합니다.
            const response = await fetch(`/api/stats/leaderboard?period=${this.currentPeriod}&gameType=${this.currentGameType}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.leaderboardData = await response.json();
            
            this.sortData();
            this.displayLeaderboard();
            this.updatePodium();
            this.updateStatsSummary();
            this.updateRatingDistribution();

        } catch (error) {
            console.error('리더보드 로드 실패:', error);
            this.elements.tbody.innerHTML = `<tr><td colspan="7" class="error-row">리더보드 데이터를 불러오는데 실패했습니다.</td></tr>`;
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        if (isLoading) {
            this.elements.tbody.innerHTML = `<tr><td colspan="7" class="loading-row"><div class="spinner"></div><span>리더보드를 불러오는 중...</span></td></tr>`;
        }
        // 로딩이 끝나면 displayLeaderboard에서 내용을 채우므로 별도 처리가 필요 없습니다.
    }

    sortData() {
        this.leaderboardData.sort((a, b) => {
            let valA = a[this.sortBy];
            let valB = b[this.sortBy];

            // 'winRate'는 숫자형으로 비교
            if (this.sortBy === 'winrate') {
                valA = parseFloat(a.winRate);
                valB = parseFloat(b.winRate);
            }
             if (this.sortBy === 'rating') {
                valA = a.elo_rating;
                valB = b.elo_rating;
            }
             if (this.sortBy === 'games') {
                valA = a.games_played;
                valB = b.games_played;
            }


            if (this.sortOrder === 'asc') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });
        // 순위 재설정
        this.leaderboardData.forEach((player, index) => {
            player.rank = index + 1;
        });
    }

    displayLeaderboard() {
        const start = (this.currentPage - 1) * this.playersPerPage;
        const end = start + this.playersPerPage;
        const pageData = this.leaderboardData.slice(start, end);

        if (pageData.length === 0) {
            this.elements.tbody.innerHTML = '<tr><td colspan="7" class="empty-row">표시할 데이터가 없습니다.</td></tr>';
            this.updatePagination();
            return;
        }

        this.elements.tbody.innerHTML = pageData.map(player => this.createPlayerRow(player)).join('');
        this.updatePagination();
    }

    createPlayerRow(player) {
        const winRate = parseFloat(player.win_rate).toFixed(1);
        return `
            <tr>
              <td class="rank-col">
                ${player.rank <= 3 ? `<span class="medal-icon rank-${player.rank}"><i class="fas fa-medal"></i></span>` : ''}
                <span class="rank-number">${player.rank}</span>
              </td>
              <td class="player-col">
                <div class="player-info">
                  <div class="player-avatar">
                    <i class="fas fa-user"></i>
                  </div>
                  <span class="player-name">${player.nickname}</span>
                </div>
              </td>
              <td class="rating-col">
                <span class="rating-value">${player.elo_rating}</span>
              </td>
              <td class="games-col">${player.games_played}</td>
              <td class="record-col">
                <span class="record-wins">${player.wins}</span> /
                <span class="record-draws">${player.draws}</span> /
                <span class="record-losses">${player.losses}</span>
              </td>
              <td class="winrate-col">
                <div class="winrate-bar">
                  <div class="winrate-fill" style="width: ${winRate}%"></div>
                </div>
                <span class="winrate-text">${winRate}%</span>
              </td>
              <td class="streak-col">
                ${player.current_streak > 0 ? `<span class="streak-badge"><i class="fas fa-fire"></i> ${player.current_streak}</span>` : '-'}
              </td>
            </tr>
        `;
    }

    updatePodium() {
        const topThree = this.leaderboardData.slice(0, 3);
        for (let i = 1; i <= 3; i++) {
            const podiumEl = this.elements.podium[i];
            const player = topThree[i - 1];
            if (podiumEl && player) {
                podiumEl.querySelector('.podium-name').textContent = player.nickname;
                podiumEl.querySelector('.podium-rating span').textContent = player.elo_rating;
                podiumEl.querySelector('.win-rate').textContent = `승률 ${parseFloat(player.win_rate).toFixed(1)}%`;
            } else if (podiumEl) {
                // 데이터가 없는 경우 초기화
                podiumEl.querySelector('.podium-name').textContent = 'N/A';
                podiumEl.querySelector('.podium-rating span').textContent = '0';
                podiumEl.querySelector('.win-rate').textContent = '승률 0%';
            }
        }
    }

    updateStatsSummary() {
        const data = this.leaderboardData;
        if (data.length === 0) return;

        const avgRating = Math.floor(data.reduce((sum, p) => sum + p.elo_rating, 0) / data.length);
        const totalGames = data.reduce((sum, p) => sum + p.games_played, 0);
        const activePlayers = data.filter(p => p.games_played > 10).length;
        const longestStreak = Math.max(0, ...data.map(p => p.current_streak));

        this.elements.totalPlayers.textContent = `총 플레이어: ${data.length}명`;
        this.elements.avgRating.textContent = avgRating;
        this.elements.totalGames.textContent = totalGames.toLocaleString();
        this.elements.activePlayers.textContent = activePlayers;
        this.elements.longestStreak.textContent = longestStreak;
    }
    
    updateRatingDistribution() {
        const data = this.leaderboardData;
        const ranges = {
            '0-1000': 0, '1000-1200': 0, '1200-1400': 0, '1400-1600': 0,
            '1600-1800': 0, '1800-2000': 0, '2000+': 0
        };

        data.forEach(p => {
            const rating = p.elo_rating;
            if (rating < 1000) ranges['0-1000']++;
            else if (rating < 1200) ranges['1000-1200']++;
            else if (rating < 1400) ranges['1200-1400']++;
            else if (rating < 1600) ranges['1400-1600']++;
            else if (rating < 1800) ranges['1600-1800']++;
            else if (rating < 2000) ranges['1800-2000']++;
            else ranges['2000+']++;
        });

        const maxCount = Math.max(1, ...Object.values(ranges)); // 0으로 나누는 것 방지

        Object.entries(ranges).forEach(([range, count]) => {
            const bar = this.elements.ratingDistribution.querySelector(`.rating-bar[data-range="${range}"]`);
            if(bar) {
                const percentage = (count / maxCount) * 100;
                bar.querySelector('.bar-fill').style.width = `${percentage}%`;
                bar.querySelector('.bar-value').textContent = `${count}명`;
            }
        });
    }

    updatePagination() {
        const totalPlayers = this.leaderboardData.length;
        const totalPages = Math.ceil(totalPlayers / this.playersPerPage);
        
        this.elements.prevPage.disabled = this.currentPage === 1;
        this.elements.nextPage.disabled = this.currentPage === totalPages || totalPages === 0;

        this.elements.pageNumbers.innerHTML = '';
        // 페이지가 너무 많을 경우 모두 표시하지 않고 일부만 표시 (예: 1 ... 5 6 7 ... 12)
        // 이 예제에서는 단순화를 위해 처음 5개 페이지만 표시
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            const btn = document.createElement('button');
            btn.className = 'page-number' + (i === this.currentPage ? ' active' : '');
            btn.textContent = i;
            btn.onclick = () => {
                this.currentPage = i;
                this.displayLeaderboard();
            };
            this.elements.pageNumbers.appendChild(btn);
        }
    }

    updateSortIcons() {
        this.elements.sortableHeaders.forEach(header => {
            const icon = header.querySelector('i');
            icon.className = 'fas fa-sort'; // 기본 아이콘으로 리셋
        });

        const activeHeader = document.querySelector(`.sortable[data-sort="${this.sortBy}"]`);
        if (activeHeader) {
            const icon = activeHeader.querySelector('i');
            if (this.sortOrder === 'asc') {
                icon.className = 'fas fa-sort-up';
            } else {
                icon.className = 'fas fa-sort-down';
            }
        }
    }
}

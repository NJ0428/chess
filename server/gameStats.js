const db = require('./database.js');

// ELO 레이팅 시스템 클래스
class EloRatingSystem {
    static K_FACTOR = 32; // K-factor for rating changes

    // ELO 레이팅 계산
    static calculateNewRatings(whiteElo, blackElo, result) {
        const expectedWhite = this.getExpectedScore(whiteElo, blackElo);
        const expectedBlack = 1 - expectedWhite;

        let actualWhite, actualBlack;

        switch (result) {
            case 'white':
                actualWhite = 1;
                actualBlack = 0;
                break;
            case 'black':
                actualWhite = 0;
                actualBlack = 1;
                break;
            case 'draw':
                actualWhite = 0.5;
                actualBlack = 0.5;
                break;
            default:
                return { whiteNew: whiteElo, blackNew: blackElo, change: 0 };
        }

        const whiteChange = Math.round(this.K_FACTOR * (actualWhite - expectedWhite));
        const blackChange = Math.round(this.K_FACTOR * (actualBlack - expectedBlack));

        return {
            whiteNew: whiteElo + whiteChange,
            blackNew: blackElo + blackChange,
            change: Math.abs(whiteChange)
        };
    }

    // 예상 점수 계산
    static getExpectedScore(playerElo, opponentElo) {
        return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    }

    // 레이팅 등급 계산
    static getRatingTier(elo) {
        if (elo >= 2400) return { tier: 'Grandmaster', color: '#FFD700' };
        if (elo >= 2200) return { tier: 'Master', color: '#C0C0C0' };
        if (elo >= 2000) return { tier: 'Expert', color: '#CD7F32' };
        if (elo >= 1800) return { tier: 'Advanced', color: '#9370DB' };
        if (elo >= 1600) return { tier: 'Intermediate', color: '#4169E1' };
        if (elo >= 1400) return { tier: 'Beginner', color: '#32CD32' };
        return { tier: 'Novice', color: '#808080' };
    }
}

// 게임 통계 관리 클래스
class GameStatsManager {
    // 게임 시작 기록
    static async recordGameStart(roomId, whitePlayerId, blackPlayerId, whitePlayerName, blackPlayerName) {
        return new Promise((resolve, reject) => {
            // 플레이어들의 현재 ELO 가져오기
            const getEloQuery = 'SELECT id, elo_rating FROM users WHERE id IN (?, ?)';

            db.all(getEloQuery, [whitePlayerId, blackPlayerId], (err, players) => {
                if (err) {
                    reject(err);
                    return;
                }

                const whitePlayer = players.find(p => p.id === whitePlayerId);
                const blackPlayer = players.find(p => p.id === blackPlayerId);

                const insertQuery = `
          INSERT INTO game_history (
            room_id, white_player_id, black_player_id, 
            white_player_name, black_player_name,
            white_elo_before, black_elo_before
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

                db.run(insertQuery, [
                    roomId, whitePlayerId, blackPlayerId,
                    whitePlayerName, blackPlayerName,
                    whitePlayer.elo_rating, blackPlayer.elo_rating
                ], function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                });
            });
        });
    }

    // 게임 종료 기록
    static async recordGameEnd(roomId, winner, resultType, moveCount, gameDuration, movesPgn) {
        return new Promise((resolve, reject) => {
            // 게임 정보 가져오기
            const getGameQuery = `
        SELECT * FROM game_history 
        WHERE room_id = ? AND ended_at IS NULL
        ORDER BY started_at DESC LIMIT 1
      `;

            db.get(getGameQuery, [roomId], (err, game) => {
                if (err || !game) {
                    reject(err || new Error('Game not found'));
                    return;
                }

                // ELO 레이팅 계산
                const eloResult = EloRatingSystem.calculateNewRatings(
                    game.white_elo_before,
                    game.black_elo_before,
                    winner
                );

                // 게임 히스토리 업데이트
                const updateGameQuery = `
          UPDATE game_history SET
            winner = ?, result_type = ?, move_count = ?, game_duration = ?,
            moves_pgn = ?, white_elo_after = ?, black_elo_after = ?,
            elo_change = ?, ended_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

                db.run(updateGameQuery, [
                    winner, resultType, moveCount, gameDuration, movesPgn,
                    eloResult.whiteNew, eloResult.blackNew, eloResult.change, game.id
                ], (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // 플레이어 통계 업데이트
                    this.updatePlayerStats(game.white_player_id, game.black_player_id, winner, eloResult, gameDuration)
                        .then(() => resolve(game.id))
                        .catch(reject);
                });
            });
        });
    }

    // 플레이어 통계 업데이트
    static async updatePlayerStats(whitePlayerId, blackPlayerId, winner, eloResult, gameDuration) {
        const whiteWon = winner === 'white';
        const blackWon = winner === 'black';
        const isDraw = winner === 'draw';

        // 백 플레이어 통계 업데이트
        await this.updateSinglePlayerStats(whitePlayerId, {
            eloNew: eloResult.whiteNew,
            won: whiteWon,
            lost: blackWon,
            draw: isDraw,
            gameDuration
        });

        // 흑 플레이어 통계 업데이트
        await this.updateSinglePlayerStats(blackPlayerId, {
            eloNew: eloResult.blackNew,
            won: blackWon,
            lost: whiteWon,
            draw: isDraw,
            gameDuration
        });
    }

    // 개별 플레이어 통계 업데이트
    static async updateSinglePlayerStats(playerId, gameResult) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // 사용자 기본 통계 업데이트
                const updateUserQuery = `
          UPDATE users SET
            elo_rating = ?,
            games_played = games_played + 1,
            wins = wins + ?,
            losses = losses + ?,
            draws = draws + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

                db.run(updateUserQuery, [
                    gameResult.eloNew,
                    gameResult.won ? 1 : 0,
                    gameResult.lost ? 1 : 0,
                    gameResult.draw ? 1 : 0,
                    playerId
                ]);

                // 플레이어 상세 통계 업데이트 또는 생성
                const upsertStatsQuery = `
          INSERT OR REPLACE INTO player_stats (
            user_id, highest_elo, lowest_elo, current_streak,
            longest_win_streak, longest_lose_streak, total_playtime, last_game_date
          ) VALUES (
            ?,
            MAX(COALESCE((SELECT highest_elo FROM player_stats WHERE user_id = ?), 1200), ?),
            MIN(COALESCE((SELECT lowest_elo FROM player_stats WHERE user_id = ?), 1200), ?),
            CASE 
              WHEN ? = 1 THEN COALESCE((SELECT current_streak FROM player_stats WHERE user_id = ?), 0) + 1
              WHEN ? = 1 THEN COALESCE((SELECT current_streak FROM player_stats WHERE user_id = ?), 0) - 1
              ELSE 0
            END,
            CASE 
              WHEN ? = 1 THEN MAX(
                COALESCE((SELECT longest_win_streak FROM player_stats WHERE user_id = ?), 0),
                COALESCE((SELECT current_streak FROM player_stats WHERE user_id = ?), 0) + 1
              )
              ELSE COALESCE((SELECT longest_win_streak FROM player_stats WHERE user_id = ?), 0)
            END,
            CASE 
              WHEN ? = 1 THEN MAX(
                COALESCE((SELECT longest_lose_streak FROM player_stats WHERE user_id = ?), 0),
                ABS(COALESCE((SELECT current_streak FROM player_stats WHERE user_id = ?), 0) - 1)
              )
              ELSE COALESCE((SELECT longest_lose_streak FROM player_stats WHERE user_id = ?), 0)
            END,
            COALESCE((SELECT total_playtime FROM player_stats WHERE user_id = ?), 0) + ?,
            CURRENT_TIMESTAMP
          )
        `;

                db.run(upsertStatsQuery, [
                    playerId, playerId, gameResult.eloNew, playerId, gameResult.eloNew,
                    gameResult.won ? 1 : 0, playerId,
                    gameResult.lost ? 1 : 0, playerId,
                    gameResult.won ? 1 : 0, playerId, playerId, playerId,
                    gameResult.lost ? 1 : 0, playerId, playerId, playerId,
                    playerId, gameResult.gameDuration || 0
                ], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    // 플레이어 통계 조회
    static async getPlayerStats(userId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          u.*,
          ps.*,
          (SELECT COUNT(*) FROM game_history WHERE (white_player_id = ? OR black_player_id = ?) AND ended_at IS NOT NULL) as total_games,
          (SELECT COUNT(*) FROM game_history WHERE (white_player_id = ? OR black_player_id = ?) AND winner = 'white' AND white_player_id = ?) as white_wins,
          (SELECT COUNT(*) FROM game_history WHERE (white_player_id = ? OR black_player_id = ?) AND winner = 'black' AND black_player_id = ?) as black_wins
        FROM users u
        LEFT JOIN player_stats ps ON u.id = ps.user_id
        WHERE u.id = ?
      `;

            db.get(query, [userId, userId, userId, userId, userId, userId, userId, userId, userId], (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stats);
                }
            });
        });
    }

    // 게임 히스토리 조회
    static async getGameHistory(userId, limit = 20, offset = 0) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          gh.*,
          wu.nickname as white_nickname,
          bu.nickname as black_nickname
        FROM game_history gh
        JOIN users wu ON gh.white_player_id = wu.id
        JOIN users bu ON gh.black_player_id = bu.id
        WHERE (gh.white_player_id = ? OR gh.black_player_id = ?) 
          AND gh.ended_at IS NOT NULL
        ORDER BY gh.ended_at DESC
        LIMIT ? OFFSET ?
      `;

            db.all(query, [userId, userId, limit, offset], (err, games) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(games);
                }
            });
        });
    }

    // 리더보드 조회
    static async getLeaderboard(limit = 50) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT 
          u.id, u.nickname, u.elo_rating, u.games_played, u.wins, u.losses, u.draws,
          ROUND(CAST(u.wins AS FLOAT) / NULLIF(u.games_played, 0) * 100, 1) as win_rate,
          ps.current_streak, ps.longest_win_streak
        FROM users u
        LEFT JOIN player_stats ps ON u.id = ps.user_id
        WHERE u.games_played > 0
        ORDER BY u.elo_rating DESC, u.games_played DESC
        LIMIT ?
      `;

            db.all(query, [limit], (err, leaderboard) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(leaderboard);
                }
            });
        });
    }

    // 업적 확인 및 부여
    static async checkAndAwardAchievements(userId) {
        const stats = await this.getPlayerStats(userId);
        const achievements = [];

        // 첫 게임 완료
        if (stats.games_played === 1) {
            achievements.push({
                type: 'first_game',
                name: '첫 걸음',
                description: '첫 번째 게임을 완료했습니다!'
            });
        }

        // 10승 달성
        if (stats.wins === 10) {
            achievements.push({
                type: 'ten_wins',
                name: '승리의 맛',
                description: '10승을 달성했습니다!'
            });
        }

        // 연승 기록
        if (stats.current_streak >= 5) {
            achievements.push({
                type: 'win_streak_5',
                name: '연승 행진',
                description: '5연승을 달성했습니다!'
            });
        }

        // 높은 레이팅 달성
        if (stats.elo_rating >= 1600 && stats.highest_elo < 1600) {
            achievements.push({
                type: 'rating_1600',
                name: '중급자',
                description: '1600 레이팅을 달성했습니다!'
            });
        }

        // 업적 저장
        for (const achievement of achievements) {
            await this.awardAchievement(userId, achievement);
        }

        return achievements;
    }

    // 업적 부여
    static async awardAchievement(userId, achievement) {
        return new Promise((resolve, reject) => {
            const query = `
        INSERT OR IGNORE INTO achievements (user_id, achievement_type, achievement_name, description)
        VALUES (?, ?, ?, ?)
      `;

            db.run(query, [userId, achievement.type, achievement.name, achievement.description], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // 사용자 업적 조회
    static async getUserAchievements(userId) {
        return new Promise((resolve, reject) => {
            const query = `
        SELECT * FROM achievements 
        WHERE user_id = ? 
        ORDER BY earned_at DESC
      `;

            db.all(query, [userId], (err, achievements) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(achievements);
                }
            });
        });
    }
}

module.exports = { EloRatingSystem, GameStatsManager };
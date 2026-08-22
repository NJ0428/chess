const db = require('./database.js');

class TournamentManager {

  // ─── 토너먼트 생성 ───────────────────────────────────────────────
  create(hostId, hostUsername, hostNickname, data, callback) {
    const { name, format, maxPlayers, timeControl } = data;
    const validFormats = ['swiss', 'single_elimination'];
    const validMaxPlayers = [4, 8, 16, 32];
    const validTimeControls = ['blitz', 'rapid', 'classic'];

    if (!name || name.trim().length === 0) return callback(new Error('토너먼트 이름을 입력하세요.'));
    if (!validFormats.includes(format)) return callback(new Error('유효하지 않은 포맷입니다.'));
    if (!validMaxPlayers.includes(Number(maxPlayers))) return callback(new Error('유효하지 않은 인원수입니다.'));
    if (!validTimeControls.includes(timeControl)) return callback(new Error('유효하지 않은 시간 제한입니다.'));

    const mp = Number(maxPlayers);
    const totalRounds = format === 'swiss'
      ? Math.ceil(Math.log2(mp))
      : Math.log2(mp);

    const sql = `INSERT INTO tournaments (name, host_id, host_username, host_nickname, format, max_players, time_control, total_rounds)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [name.trim(), hostId, hostUsername, hostNickname, format, mp, timeControl, totalRounds], function (err) {
      if (err) return callback(err);
      const tournamentId = this.lastID;

      db.get('SELECT elo_rating FROM users WHERE id = ?', [hostId], (err, user) => {
        if (err) return callback(err);
        const joinSql = `INSERT INTO tournament_participants (tournament_id, user_id, username, nickname, elo_rating)
                         VALUES (?, ?, ?, ?, ?)`;
        db.run(joinSql, [tournamentId, hostId, hostUsername, hostNickname, user ? user.elo_rating : 1200], (err) => {
          callback(err, tournamentId);
        });
      });
    });
  }

  // ─── 참가 ───────────────────────────────────────────────────────
  join(tournamentId, userId, username, nickname, callback) {
    db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, t) => {
      if (err) return callback(err);
      if (!t) return callback(new Error('토너먼트를 찾을 수 없습니다.'));
      if (t.status !== 'waiting') return callback(new Error('참가 모집이 마감되었습니다.'));

      db.get(`SELECT COUNT(*) as cnt FROM tournament_participants WHERE tournament_id = ? AND status != 'withdrew'`,
        [tournamentId], (err, row) => {
          if (err) return callback(err);
          if (row.cnt >= t.max_players) return callback(new Error('참가 인원이 가득 찼습니다.'));

          db.get('SELECT elo_rating FROM users WHERE id = ?', [userId], (err, user) => {
            if (err) return callback(err);
            const sql = `INSERT OR IGNORE INTO tournament_participants (tournament_id, user_id, username, nickname, elo_rating)
                         VALUES (?, ?, ?, ?, ?)`;
            db.run(sql, [tournamentId, userId, username, nickname, user ? user.elo_rating : 1200], function (err) {
              if (err) return callback(err);
              if (this.changes === 0) return callback(new Error('이미 참가 중입니다.'));
              callback(null);
            });
          });
        });
    });
  }

  // ─── 참가 취소 ──────────────────────────────────────────────────
  leave(tournamentId, userId, callback) {
    db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, t) => {
      if (err) return callback(err);
      if (!t) return callback(new Error('토너먼트를 찾을 수 없습니다.'));
      if (t.status !== 'waiting') return callback(new Error('진행 중인 토너먼트는 취소할 수 없습니다.'));
      if (t.host_id === userId) return callback(new Error('방장은 참가 취소를 할 수 없습니다.'));

      db.run(`UPDATE tournament_participants SET status = 'withdrew' WHERE tournament_id = ? AND user_id = ?`,
        [tournamentId, userId], callback);
    });
  }

  // ─── 토너먼트 삭제 (방장 전용) ────────────────────────────────
  deleteTournament(tournamentId, hostId, callback) {
    db.get('SELECT * FROM tournaments WHERE id = ? AND host_id = ?', [tournamentId, hostId], (err, t) => {
      if (err) return callback(err);
      if (!t) return callback(new Error('권한이 없습니다.'));
      if (t.status !== 'waiting') return callback(new Error('대기 중인 토너먼트만 삭제할 수 있습니다.'));

      db.run('DELETE FROM tournament_participants WHERE tournament_id = ?', [tournamentId], (err) => {
        if (err) return callback(err);
        db.run('DELETE FROM tournaments WHERE id = ?', [tournamentId], callback);
      });
    });
  }

  // ─── 토너먼트 시작 ──────────────────────────────────────────────
  start(tournamentId, hostId, callback) {
    db.get('SELECT * FROM tournaments WHERE id = ? AND host_id = ?', [tournamentId, hostId], (err, t) => {
      if (err) return callback(err);
      if (!t) return callback(new Error('권한이 없습니다.'));
      if (t.status !== 'waiting') return callback(new Error('이미 시작된 토너먼트입니다.'));

      db.all(`SELECT * FROM tournament_participants WHERE tournament_id = ? AND status = 'active' ORDER BY elo_rating DESC`,
        [tournamentId], (err, participants) => {
          if (err) return callback(err);
          if (participants.length < 2) return callback(new Error('최소 2명이 필요합니다.'));

          // 시드 배정 (ELO 순)
          let pending = participants.length;
          let hadError = false;
          participants.forEach((p, idx) => {
            db.run('UPDATE tournament_participants SET seed = ? WHERE id = ?', [idx + 1, p.id], (err) => {
              if (hadError) return;
              if (err) { hadError = true; return callback(err); }
              p.seed = idx + 1;
              if (--pending === 0) {
                db.run(`UPDATE tournaments SET status = 'ongoing', current_round = 1, started_at = CURRENT_TIMESTAMP WHERE id = ?`,
                  [tournamentId], (err) => {
                    if (err) return callback(err);
                    this._generateRound(tournamentId, t.format, participants, 1, t.time_control, callback);
                  });
              }
            });
          });
        });
    });
  }

  // ─── 라운드 생성 ────────────────────────────────────────────────
  _generateRound(tournamentId, format, participants, round, timeControl, callback) {
    if (format === 'single_elimination') {
      this._generateSEMatches(tournamentId, participants, round, timeControl, callback);
    } else {
      this._generateSwissMatches(tournamentId, participants, round, timeControl, callback);
    }
  }

  _generateSEMatches(tournamentId, participants, round, timeControl, callback) {
    if (round === 1) {
      const n = participants.length;
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
      const sorted = [...participants].sort((a, b) => a.seed - b.seed);
      const matches = [];

      for (let i = 0; i < bracketSize / 2; i++) {
        const p1 = sorted[i] || null;
        const p2 = sorted[bracketSize - 1 - i] || null;
        if (!p1) continue;
        if (!p2) {
          matches.push({ matchIndex: i, white: p1, black: null, isBye: true });
        } else {
          // 시드 순서로 색상 배정
          matches.push({ matchIndex: i, white: p1, black: p2, isBye: false });
        }
      }
      this._insertMatches(tournamentId, round, matches, timeControl, callback);
    } else {
      // 이전 라운드 승자 조회
      db.all(`SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? ORDER BY match_index`,
        [tournamentId, round - 1], (err, prevMatches) => {
          if (err) return callback(err);
          const winners = [];
          for (const m of prevMatches) {
            if (m.result === 'bye') {
              winners.push({ user_id: m.white_player_id, nickname: m.white_nickname });
            } else if (m.winner_id) {
              const isWhite = m.winner_id === m.white_player_id;
              winners.push({ user_id: m.winner_id, nickname: isWhite ? m.white_nickname : m.black_nickname });
            }
          }
          const matches = [];
          for (let i = 0; i < winners.length; i += 2) {
            const w1 = winners[i], w2 = winners[i + 1];
            if (w1 && w2) matches.push({ matchIndex: i / 2, white: w1, black: w2, isBye: false });
            else if (w1) matches.push({ matchIndex: i / 2, white: w1, black: null, isBye: true });
          }
          this._insertMatches(tournamentId, round, matches, timeControl, callback);
        });
    }
  }

  _generateSwissMatches(tournamentId, participants, round, timeControl, callback) {
    if (round === 1) {
      const sorted = [...participants].sort((a, b) => a.seed - b.seed);
      const half = Math.ceil(sorted.length / 2);
      const matches = [];
      for (let i = 0; i < half; i++) {
        const p1 = sorted[i];
        const p2 = sorted[i + half];
        if (!p2) matches.push({ matchIndex: i, white: p1, black: null, isBye: true });
        else matches.push({ matchIndex: i, white: p1, black: p2, isBye: false });
      }
      this._insertMatches(tournamentId, round, matches, timeControl, callback);
    } else {
      db.all(`SELECT * FROM tournament_participants WHERE tournament_id = ? AND status = 'active'
              ORDER BY points DESC, wins DESC, elo_rating DESC`, [tournamentId], (err, standings) => {
        if (err) return callback(err);
        db.all(`SELECT white_player_id, black_player_id FROM tournament_matches WHERE tournament_id = ?`,
          [tournamentId], (err, played) => {
            if (err) return callback(err);
            const playedSet = new Set(played.map(m =>
              `${Math.min(m.white_player_id, m.black_player_id)}-${Math.max(m.white_player_id, m.black_player_id)}`
            ));
            const matches = [];
            const paired = new Set();
            let matchIndex = 0;
            for (let i = 0; i < standings.length; i++) {
              if (paired.has(standings[i].user_id)) continue;
              let found = false;
              for (let j = i + 1; j < standings.length; j++) {
                if (paired.has(standings[j].user_id)) continue;
                const key = `${Math.min(standings[i].user_id, standings[j].user_id)}-${Math.max(standings[i].user_id, standings[j].user_id)}`;
                if (playedSet.has(key)) continue;
                paired.add(standings[i].user_id);
                paired.add(standings[j].user_id);
                // 라운드마다 색상 교대
                const whiteFirst = round % 2 === 1;
                matches.push({ matchIndex: matchIndex++, white: whiteFirst ? standings[i] : standings[j], black: whiteFirst ? standings[j] : standings[i], isBye: false });
                found = true;
                break;
              }
              if (!found && !paired.has(standings[i].user_id)) {
                paired.add(standings[i].user_id);
                matches.push({ matchIndex: matchIndex++, white: standings[i], black: null, isBye: true });
              }
            }
            this._insertMatches(tournamentId, round, matches, timeControl, callback);
          });
      });
    }
  }

  _insertMatches(tournamentId, round, matches, timeControl, callback) {
    const results = [];
    if (matches.length === 0) return callback(null, results);

    let pending = matches.length;
    let hadError = false;

    const tcMap = { blitz: 180, rapid: 600, classic: 1800 };
    const seconds = tcMap[timeControl] || 180;

    for (const match of matches) {
      const roomId = `t${tournamentId}r${round}m${match.matchIndex}`;

      if (match.isBye) {
        const sql = `INSERT INTO tournament_matches (tournament_id, round, match_index, white_player_id, white_nickname, result, status, room_id)
                     VALUES (?, ?, ?, ?, ?, 'bye', 'finished', ?)`;
        db.run(sql, [tournamentId, round, match.matchIndex, match.white.user_id, match.white.nickname, roomId], function (err) {
          if (hadError) return;
          if (err) { hadError = true; return callback(err); }
          // 부전승 포인트 부여
          db.run(`UPDATE tournament_participants SET points = points + 1, wins = wins + 1 WHERE tournament_id = ? AND user_id = ?`,
            [tournamentId, match.white.user_id]);
          results.push({ id: this.lastID, roomId, ...match });
          if (--pending === 0) callback(null, results);
        });
      } else {
        const sql = `INSERT INTO tournament_matches (tournament_id, round, match_index, white_player_id, black_player_id, white_nickname, black_nickname, status, room_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`;
        db.run(sql, [tournamentId, round, match.matchIndex, match.white.user_id, match.black.user_id,
          match.white.nickname, match.black.nickname, roomId], function (err) {
          if (hadError) return;
          if (err) { hadError = true; return callback(err); }
          results.push({ id: this.lastID, roomId, timeSeconds: seconds, ...match });
          if (--pending === 0) callback(null, results);
        });
      }
    }
  }

  // ─── 경기 결과 보고 ─────────────────────────────────────────────
  reportResult(matchId, winnerId, result, callback) {
    db.get('SELECT * FROM tournament_matches WHERE id = ?', [matchId], (err, match) => {
      if (err) return callback(err);
      if (!match) return callback(new Error('경기를 찾을 수 없습니다.'));
      if (match.status === 'finished') return callback(null, { alreadyFinished: true });

      const tournamentId = match.tournament_id;

      db.run(`UPDATE tournament_matches SET winner_id = ?, result = ?, status = 'finished', ended_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [winnerId, result, matchId], (err) => {
          if (err) return callback(err);

          const updates = [];

          if (result === 'white' || result === 'black' || result === 'draw') {
            let wPts = 0, bPts = 0, wW = 0, bW = 0, wL = 0, bL = 0, wD = 0, bD = 0;
            if (result === 'white') { wPts = 1; wW = 1; bL = 1; }
            else if (result === 'black') { bPts = 1; bW = 1; wL = 1; }
            else { wPts = 0.5; bPts = 0.5; wD = 1; bD = 1; }

            updates.push(new Promise((res, rej) => {
              db.run(`UPDATE tournament_participants SET points=points+?, wins=wins+?, losses=losses+?, draws=draws+?
                      WHERE tournament_id=? AND user_id=?`,
                [wPts, wW, wL, wD, tournamentId, match.white_player_id], err => err ? rej(err) : res());
            }));
            if (match.black_player_id) {
              updates.push(new Promise((res, rej) => {
                db.run(`UPDATE tournament_participants SET points=points+?, wins=wins+?, losses=losses+?, draws=draws+?
                        WHERE tournament_id=? AND user_id=?`,
                  [bPts, bW, bL, bD, tournamentId, match.black_player_id], err => err ? rej(err) : res());
              }));
            }
          }

          // 단판 토너먼트: 패자 탈락
          updates.push(new Promise((res, rej) => {
            db.get('SELECT format FROM tournaments WHERE id = ?', [tournamentId], (err, t) => {
              if (err) return rej(err);
              if (t.format === 'single_elimination' && result !== 'draw') {
                const loserId = result === 'white' ? match.black_player_id : match.white_player_id;
                if (!loserId) return res();
                db.run(`UPDATE tournament_participants SET status='eliminated' WHERE tournament_id=? AND user_id=?`,
                  [tournamentId, loserId], err => err ? rej(err) : res());
              } else res();
            });
          }));

          Promise.all(updates).then(() => {
            this._checkRoundComplete(tournamentId, match.round, callback);
          }).catch(callback);
        });
    });
  }

  _checkRoundComplete(tournamentId, round, callback) {
    db.all(`SELECT * FROM tournament_matches WHERE tournament_id=? AND round=? AND status!='finished'`,
      [tournamentId, round], (err, pending) => {
        if (err) return callback(err);
        if (pending.length > 0) return callback(null, { roundComplete: false });

        db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, t) => {
          if (err) return callback(err);
          const nextRound = t.current_round + 1;

          if (t.format === 'single_elimination') {
            db.all(`SELECT * FROM tournament_participants WHERE tournament_id=? AND status='active'`,
              [tournamentId], (err, active) => {
                if (err) return callback(err);
                if (active.length <= 1) {
                  this._endTournament(tournamentId, callback);
                } else {
                  db.run('UPDATE tournaments SET current_round=? WHERE id=?', [nextRound, tournamentId], (err) => {
                    if (err) return callback(err);
                    this._generateSEMatches(tournamentId, active, nextRound, t.time_control, (err, matches) => {
                      callback(err, { roundComplete: true, newRound: nextRound, matches });
                    });
                  });
                }
              });
          } else {
            if (t.current_round >= t.total_rounds) {
              this._endTournament(tournamentId, callback);
            } else {
              db.all(`SELECT * FROM tournament_participants WHERE tournament_id=? AND status='active'
                      ORDER BY points DESC, wins DESC, elo_rating DESC`, [tournamentId], (err, participants) => {
                if (err) return callback(err);
                db.run('UPDATE tournaments SET current_round=? WHERE id=?', [nextRound, tournamentId], (err) => {
                  if (err) return callback(err);
                  this._generateSwissMatches(tournamentId, participants, nextRound, t.time_control, (err, matches) => {
                    callback(err, { roundComplete: true, newRound: nextRound, matches });
                  });
                });
              });
            }
          }
        });
      });
  }

  _endTournament(tournamentId, callback) {
    db.all(`SELECT tp.* FROM tournament_participants tp
            WHERE tp.tournament_id = ?
            ORDER BY tp.points DESC, tp.wins DESC, tp.elo_rating DESC`,
      [tournamentId], (err, standings) => {
        if (err) return callback(err);
        if (standings.length === 0) return callback(null, { tournamentComplete: true, standings: [] });

        const winner = standings[0];
        db.run(`UPDATE tournaments SET status='finished', winner_id=?, winner_nickname=?, ended_at=CURRENT_TIMESTAMP WHERE id=?`,
          [winner.user_id, winner.nickname, tournamentId], (err) => {
            if (err) return callback(err);

            // ELO 보너스 및 업적 수여
            const bonuses = [
              { rank: 0, bonus: 50, achType: 'tournament_1st', achName: '🏆 토너먼트 우승' },
              { rank: 1, bonus: 20, achType: 'tournament_2nd', achName: '🥈 토너먼트 준우승' },
              { rank: 2, bonus: 10, achType: 'tournament_3rd', achName: '🥉 토너먼트 3위' },
            ];

            const promises = bonuses.map(({ rank, bonus, achType, achName }) => {
              const p = standings[rank];
              if (!p) return Promise.resolve();
              return new Promise((res, rej) => {
                db.run('UPDATE users SET elo_rating = elo_rating + ? WHERE id = ?', [bonus, p.user_id], (err) => {
                  if (err) return rej(err);
                  db.run(`INSERT OR IGNORE INTO achievements (user_id, achievement_type, achievement_name, description)
                          VALUES (?, ?, ?, ?)`,
                    [p.user_id, achType, achName,
                      `토너먼트에서 ${rank + 1}위 달성 (ELO +${bonus})`],
                    err => err ? rej(err) : res());
                });
              });
            });

            Promise.all(promises).then(() => {
              callback(null, { tournamentComplete: true, standings, winner });
            }).catch(callback);
          });
      });
  }

  // ─── 조회 ────────────────────────────────────────────────────────
  getList(status, callback) {
    let sql = `SELECT t.*, COUNT(tp.id) as participant_count
               FROM tournaments t
               LEFT JOIN tournament_participants tp ON tp.tournament_id = t.id AND tp.status != 'withdrew'
               WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    sql += ' GROUP BY t.id ORDER BY t.created_at DESC LIMIT 30';
    db.all(sql, params, callback);
  }

  getDetails(tournamentId, callback) {
    db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
      if (err) return callback(err);
      if (!tournament) return callback(null, null);

      db.all(`SELECT tp.*, u.elo_rating as current_elo
              FROM tournament_participants tp
              JOIN users u ON u.id = tp.user_id
              WHERE tp.tournament_id = ?
              ORDER BY tp.points DESC, tp.wins DESC, tp.elo_rating DESC`,
        [tournamentId], (err, participants) => {
          if (err) return callback(err);
          db.all(`SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round, match_index`,
            [tournamentId], (err, matches) => {
              if (err) return callback(err);
              callback(null, { tournament, participants, matches });
            });
        });
    });
  }

  getMatchByRoom(roomId, callback) {
    db.get('SELECT * FROM tournament_matches WHERE room_id = ?', [roomId], callback);
  }
}

module.exports = new TournamentManager();

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchTournament, fetchTeams } from '../services/tournamentService';
import { fetchGamesByTournament } from '../services/gameService';
import { fetchPlayers } from '../services/playerService';
import { computeGroupRanking } from '../services/tournamentService';
import type { Tournament, TournamentTeam, GroupRankingEntry } from '../types/tournament';
import { findTeamForPlayers } from '../types/tournament';
import type { Game } from '../types/game';
import { calculateTotals, checkWinner } from '../types/game';
import GameCard from '../components/GameCard';
import PullToRefresh from '../components/PullToRefresh';
import type { PlayerNameResolver } from '../utils/playerName';
import * as sx from '../styles/commonStyles';
import { fonts, shape } from '../styles/tokens';

export default function GroupDetailPage() {
  const { id, groupName } = useParams<{ id: string; groupName: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [rankings, setRankings] = useState<GroupRankingEntry[]>([]);
  const [playerProfiles, setPlayerProfiles] = useState<Map<string, PlayerNameResolver>>(new Map());
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);

  const updateShadows = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      setShowTopShadow(scrollTop > 0);
    }
  }, []);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!id || !groupName) return;
      if (!isRefresh) {
        setLoading(true);
      }
      try {
        const tDoc = await fetchTournament(id);
        if (!tDoc) {
          navigate('/tournaments');
          return;
        }
        setTournament(tDoc);

        const teamList = await fetchTeams(id);
        setTeams(teamList);

        const group = tDoc.groups?.find(g => g.name === groupName);
        if (group) {
          const ranks = await computeGroupRanking(id, group);
          setRankings(ranks);
        }

        const allGames = await fetchGamesByTournament(id);
        const filteredGames = allGames.filter(g => g.tournamentLabel === `Gruppe ${groupName}`);
        setGames(filteredGames);

        // Fetch player profiles
        const uids: string[] = [];
        for (const g of filteredGames) {
          g.players.forEach(p => {
            if (p.uid) uids.push(p.uid);
          });
        }
        if (uids.length > 0) {
          const players = await fetchPlayers(uids);
          const profileMap = new Map<string, PlayerNameResolver>();
          for (const p of players) {
            profileMap.set(p.uid, { displayName: p.displayName, avatar: p.avatar });
          }
          setPlayerProfiles(profileMap);
        }
      } catch (err) {
        console.error('Failed to load group details:', err);
      } finally {
        setLoading(false);
      }
    },
    [id, groupName, navigate],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!tournament) return null;

  return (
    <Box sx={sx.pageRoot}>
      {/* Header */}
      <Box sx={sx.dynamicHeader(showTopShadow)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate(`/tournament/${id}`)} edge="start" size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontFamily: fonts.display, fontWeight: 400, fontSize: '1.25rem' }}>
            {t('tournament.groupPage', { name: groupName })}
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <PullToRefresh scrollRef={scrollRef} onRefresh={() => loadData(true)}>
        <Box
          ref={scrollRef}
          onScroll={updateShadows}
          sx={{
            flex: 1,
            overflow: 'auto',
            px: 1.5,
            py: 1.5,
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          {/* Ranking Table */}
          {rankings.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, px: 0.5 }}>
                {t('tournament.ranking')}
              </Typography>
              <TableContainer component={Paper} elevation={1} sx={{ borderRadius: `${shape.borderRadius}px`, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell align="center" sx={{ fontWeight: 'bold', width: 50 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{t('tournament.rankTeam')}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', width: 60 }}>{t('tournament.rankWins')}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', width: 80 }}>{t('tournament.rankDiff')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rankings.map((rank, idx) => {
                      const team = teams.find(t => t.id === rank.teamId);
                      return (
                        <TableRow key={rank.teamId} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell align="center" sx={{ fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                            {idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                            {team ? team.name : 'Unknown Team'}
                          </TableCell>
                          <TableCell align="center">{rank.wins}</TableCell>
                          <TableCell align="center" sx={{ color: rank.pointDifferential > 0 ? 'success.main' : rank.pointDifferential < 0 ? 'error.main' : 'text.primary' }}>
                            {rank.pointDifferential > 0 ? `+${rank.pointDifferential}` : rank.pointDifferential}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Games List */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', px: 0.5 }}>
              {t('home.title')}
            </Typography>
            {games.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Noch keine Spiele eingetragen.
                </Typography>
              </Box>
            ) : (
              games.map((game) => {
                const team1 = findTeamForPlayers(teams, [game.players[0], game.players[1]]);
                const team2 = findTeamForPlayers(teams, [game.players[2], game.players[3]]);
                const totals = calculateTotals(game.rounds || []);
                const winner = checkWinner(totals);

                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    score={totals}
                    playerProfileMap={playerProfiles}
                    team1Name={team1?.name}
                    team2Name={team2?.name}
                    winnerTeam={winner === 1 || winner === 2 ? winner : null}
                    onClick={() => navigate(`/game/${game.id}`)}
                  />
                );
              })
            )}
          </Box>
        </Box>
      </PullToRefresh>
    </Box>
  );
}

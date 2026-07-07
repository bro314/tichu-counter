import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HelpIcon from '@mui/icons-material/Help';
import { fetchTournament, fetchTeams } from '../services/tournamentService';
import { fetchGamesByTournament } from '../services/gameService';
import { fetchPlayers } from '../services/playerService';
import type { Tournament, TournamentTeam, KORound } from '../types/tournament';
import type { Game } from '../types/game';
import { calculateTotals, checkWinner } from '../types/game';
import GameCard from '../components/GameCard';
import PullToRefresh from '../components/PullToRefresh';
import type { PlayerNameResolver } from '../utils/playerName';
import * as sx from '../styles/commonStyles';
import { fonts, shape } from '../styles/tokens';

export default function KORoundDetailPage() {
  const { id, roundIndex } = useParams<{ id: string; roundIndex: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [games, setGames] = useState<Game[]>([]);
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
      if (!id || roundIndex === undefined) return;
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

        const allGames = await fetchGamesByTournament(id);
        setGames(allGames);

        // Fetch player profiles
        const uids: string[] = [];
        for (const g of allGames) {
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
        console.error('Failed to load KO round details:', err);
      } finally {
        setLoading(false);
      }
    },
    [id, roundIndex, navigate],
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

  if (!tournament || !tournament.bracket) return null;

  const rIndex = parseInt(roundIndex || '0', 10);
  const round: KORound | undefined = tournament.bracket.rounds[rIndex];
  if (!round) return null;

  return (
    <Box sx={sx.pageRoot}>
      {/* Header */}
      <Box sx={sx.dynamicHeader(showTopShadow)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate(`/tournament/${id}`)} edge="start" size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontFamily: fonts.display, fontWeight: 400, fontSize: '1.25rem' }}>
            {round.name}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {round.matches.map((match, idx) => {
              const team1 = teams.find(t => t.id === match.team1Id);
              const team2 = teams.find(t => t.id === match.team2Id);

              // 1. Bye (Freilos) match
              if (match.isBye) {
                return (
                  <Card
                    key={idx}
                    elevation={2}
                    sx={{ borderRadius: `${shape.borderRadius}px` }}
                  >
                    <CardContent sx={{ py: 1.5, px: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmojiEventsIcon sx={{ color: 'success.main', fontSize: '1.25rem' }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {team1 ? team1.name : 'Unknown'}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: 'success.main' + '1A',
                            color: 'success.main',
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {t('tournament.bye')}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              }

              // 2. Scheduled/finished Match with a game doc
              if (match.gameId) {
                const game = games.find(g => g.id === match.gameId);
                if (game) {
                  const totals = calculateTotals(game.rounds || [], game);
                  const winner = checkWinner(totals);
                  return (
                    <GameCard
                      key={match.gameId}
                      game={game}
                      score={totals}
                      playerProfileMap={playerProfiles}
                      team1Name={team1?.name || 'Unknown'}
                      team2Name={team2?.name || 'Unknown'}
                      winnerTeam={winner === 1 || winner === 2 ? winner : null}
                      onClick={() => navigate(`/game/${game.id}`)}
                    />
                  );
                }
              }

              // 3. TBD or waiting match (opponents not fully determined yet, or game not started)
              return (
                <Card
                  key={idx}
                  elevation={1}
                  sx={{ borderRadius: `${shape.borderRadius}px`, opacity: 0.7 }}
                >
                  <CardContent sx={{ py: 2, px: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Match {idx + 1}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
                        <HelpIcon sx={{ fontSize: '1rem' }} />
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          TBD
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: team1 ? 'normal' : 'italic', color: team1 ? 'text.primary' : 'text.disabled' }}>
                        {team1 ? team1.name : 'TBD'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        vs
                      </Typography>
                      <Typography sx={{ fontWeight: team2 ? 'normal' : 'italic', color: team2 ? 'text.primary' : 'text.disabled', textAlign: 'right' }}>
                        {team2 ? team2.name : 'TBD'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      </PullToRefresh>
    </Box>
  );
}

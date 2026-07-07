import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import HelpIcon from '@mui/icons-material/Help';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../contexts/AuthContext';
import { fetchTournament, fetchTeams, advancePhase, updateTournament, startGroupTournament, startKOTournament } from '../services/tournamentService';
import { fetchGamesByTournament } from '../services/gameService';
import { fetchPlayers } from '../services/playerService';
import type { PlayerNameResolver } from '../utils/playerName';
import { generateGroupAssignments, generateKOBracket, generateKOBracketFromOrder } from '../types/tournament';
import type { Tournament, TournamentTeam } from '../types/tournament';
import type { Game } from '../types/game';
import TeamCard from '../components/tournament/TeamCard';
import CreateTeamDialog from '../components/tournament/CreateTeamDialog';
import EditTeamDialog from '../components/tournament/EditTeamDialog';
import EditTournamentDialog from '../components/tournament/EditTournamentDialog';
import ImportTeamsDialog from '../components/tournament/ImportTeamsDialog';
import ManualBracketDialog from '../components/tournament/ManualBracketDialog';
import GroupPreview from '../components/tournament/GroupPreview';
import BracketPreview from '../components/tournament/BracketPreview';
import PullToRefresh from '../components/PullToRefresh';
import * as sx from '../styles/commonStyles';
import { fonts, shape } from '../styles/tokens';

export default function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [playerProfileMap, setPlayerProfileMap] = useState<Map<string, PlayerNameResolver>>(new Map());
  const [loading, setLoading] = useState(true);
  const [groupCountInput, setGroupCountInput] = useState<number>(1);

  // Dialog states
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TournamentTeam | null>(null);
  const [editTournamentOpen, setEditTournamentOpen] = useState(false);
  const [importTeamsOpen, setImportTeamsOpen] = useState(false);
  const [manualBracketOpen, setManualBracketOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  const updateShadows = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const hasScrolledDown = scrollTop > 0;
      const hasMoreToScroll = scrollTop + clientHeight < scrollHeight - 1;

      setShowTopShadow(hasScrolledDown);
      setShowBottomShadow(hasMoreToScroll);
    }
  }, []);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!id) return;
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
        if (tDoc.groupCount) {
          setGroupCountInput(tDoc.groupCount);
        } else if (tDoc.groups) {
          setGroupCountInput(tDoc.groups.length);
        } else {
          // Default to a sensible default or 2 groups
          setGroupCountInput(2);
        }

        const teamList = await fetchTeams(id);
        setTeams(teamList);

        // Fetch player profiles
        const uids: string[] = [];
        for (const team of teamList) {
          if (team.player1.uid) uids.push(team.player1.uid);
          if (team.player2.uid) uids.push(team.player2.uid);
        }

        if (uids.length > 0) {
          const players = await fetchPlayers(uids);
          const profileMap = new Map<string, PlayerNameResolver>();
          for (const p of players) {
            profileMap.set(p.uid, { displayName: p.displayName, avatar: p.avatar });
          }
          setPlayerProfileMap(profileMap);
        }

        const tGames = await fetchGamesByTournament(id);
        setGames(tGames);
      } catch (err) {
        console.error('Failed to load tournament page:', err);
      } finally {
        setLoading(false);
      }
    },
    [id, navigate],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!scrollRef.current) return;
    updateShadows();
    const observer = new ResizeObserver(() => {
      updateShadows();
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [loading, updateShadows]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!tournament) return null;

  const isAdmin = tournament.adminUids.includes(user?.uid || '');
  const isMemberOfAnyTeam = teams.some(
    (t) => t.player1.uid === user?.uid || t.player2.uid === user?.uid,
  );
  const canAddTeam = isAdmin || (tournament.selfRegister && !isMemberOfAnyTeam);

  const getStatusDetails = () => {
    switch (tournament.status) {
      case 'preparation':
        return {
          color: 'warning.main',
          text: t('tournament.statusPreparation'),
          icon: <HelpIcon sx={{ ...sx.smIconFont }} />,
        };
      case 'creation':
        return {
          color: 'info.main',
          text: t('tournament.statusCreation'),
          icon: <SettingsIcon sx={{ ...sx.smIconFont }} />,
        };
      case 'execution':
        return {
          color: 'success.main',
          text: t('tournament.statusExecution'),
          icon: <PlayArrowIcon sx={{ ...sx.smIconFont }} />,
        };
      case 'finished':
        return {
          color: 'text.disabled',
          text: t('tournament.statusFinished'),
          icon: <EmojiEventsIcon sx={{ ...sx.smIconFont }} />,
        };
    }
  };

  const status = getStatusDetails();

  const handleStartCreation = async () => {
    if (!isAdmin) return;
    if (teams.length < 2) return;
    try {
      await advancePhase(tournament.id, 'creation');
      await loadData();
    } catch (err) {
      console.error('Failed to advance phase:', err);
    }
  };

  const handleGenerateGroups = async () => {
    if (!isAdmin || !id) return;
    try {
      const teamIds = teams.map((t) => t.id);
      const generatedGroups = generateGroupAssignments(teamIds, groupCountInput);
      await updateTournament(id, {
        groupCount: groupCountInput,
        groups: generatedGroups,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to generate groups:', err);
    }
  };

  const handleGenerateKO = async () => {
    if (!isAdmin || !id) return;
    try {
      const teamIds = teams.map((t) => t.id);
      const generatedBracket = generateKOBracket(teamIds);
      await updateTournament(id, {
        bracket: generatedBracket,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to generate bracket:', err);
    }
  };

  const handleSaveManualBracket = async (orderedSlots: (string | null)[]) => {
    if (!isAdmin || !id) return;
    try {
      const generatedBracket = generateKOBracketFromOrder(orderedSlots);
      await updateTournament(id, {
        bracket: generatedBracket,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to save manual bracket:', err);
    }
  };

  const handleStartTournament = async () => {
    if (!isAdmin || !user || !id) return;
    try {
      if (tournament.format === 'group') {
        if (!tournament.groups || tournament.groups.length === 0) return;
        await startGroupTournament(id, user.uid);
      } else {
        if (!tournament.bracket || !tournament.bracket.rounds || tournament.bracket.rounds.length === 0) return;
        await startKOTournament(id, user.uid);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to start tournament:', err);
    }
  };

  const handleGoBackToPreparation = async () => {
    if (!isAdmin || !id) return;
    try {
      await advancePhase(id, 'preparation');
      await loadData();
    } catch (err) {
      console.error('Failed to go back to preparation:', err);
    }
  };

  const handleFinishTournament = async () => {
    if (!isAdmin || !id) return;
    if (!window.confirm(t('tournament.finishConfirm'))) return;
    try {
      await advancePhase(id, 'finished');
      await loadData();
    } catch (err) {
      console.error('Failed to finish tournament:', err);
    }
  };

  const handleTeamClick = (team: TournamentTeam) => {
    setSelectedTeam(team);
    setEditTeamOpen(true);
  };

  return (
    <Box sx={sx.pageRoot}>
      {/* Header */}
      <Box sx={sx.dynamicHeader(showTopShadow)}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigate('/tournaments')} edge="start" size="small">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontFamily: fonts.display, fontWeight: 400, fontSize: '1.25rem' }}>
              {tournament.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'action.hover',
                color: status.color,
                mr: 1,
              }}
            >
              {status.icon}
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                {status.text}
              </Typography>
            </Box>
            {isAdmin && (
              <IconButton onClick={() => setEditTournamentOpen(true)} size="small">
                <EditIcon />
              </IconButton>
            )}
          </Box>
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
          {tournament.status === 'preparation' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {t('tournament.teamsCount', { count: teams.length })}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {isAdmin && (
                    <Button size="small" variant="outlined" onClick={() => setImportTeamsOpen(true)}>
                      {t('tournament.importTeams')}
                    </Button>
                  )}
                  {canAddTeam && (
                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateTeamOpen(true)}>
                      {t('tournament.addTeam')}
                    </Button>
                  )}
                </Box>
              </Box>

              {teams.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    Noch keine Teams registriert.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {teams.map((team) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      playerProfileMap={playerProfileMap}
                      onClick={() => handleTeamClick(team)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ) : tournament.status === 'creation' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {!isAdmin ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    {t('tournament.creationInProgress')}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {tournament.format === 'group' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ fontWeight: 'bold' }}>
                          {t('tournament.groupCount')}:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={!groupCountInput || groupCountInput <= 1}
                            onClick={() => setGroupCountInput((prev) => Math.max(1, prev - 1))}
                          >
                            -
                          </Button>
                          <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 'bold' }}>
                            {groupCountInput}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={!groupCountInput || groupCountInput >= Math.floor(teams.length / 2)}
                            onClick={() => setGroupCountInput((prev) => Math.min(Math.floor(teams.length / 2), prev + 1))}
                          >
                            +
                          </Button>
                        </Box>
                      </Box>

                      <Button variant="outlined" onClick={handleGenerateGroups}>
                        {t('tournament.generate')}
                      </Button>

                      {tournament.groups && tournament.groups.length > 0 && (
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                            {t('tournament.preview')}
                          </Typography>
                          <GroupPreview
                            groups={tournament.groups}
                            teams={teams}
                            playerProfileMap={playerProfileMap}
                          />
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button variant="outlined" onClick={handleGenerateKO} sx={{ flex: 1 }}>
                          {t('tournament.generate')}
                        </Button>
                        <Button variant="outlined" onClick={() => setManualBracketOpen(true)} sx={{ flex: 1 }}>
                          {t('tournament.manualBracket')}
                        </Button>
                      </Box>

                      {tournament.bracket && tournament.bracket.rounds && tournament.bracket.rounds.length > 0 && (
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                            {t('tournament.preview')}
                          </Typography>
                          <BracketPreview
                            bracket={tournament.bracket}
                            teams={teams}
                          />
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              {tournament.format === 'group' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {tournament.groups?.map((group) => {
                    const groupGames = games.filter(g => g.tournamentLabel === `Gruppe ${group.name}`);
                    const completedCount = groupGames.filter(g => g.status === 'finished').length;
                    const totalCount = groupGames.length;
                    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                    return (
                      <Card
                        key={group.name}
                        elevation={2}
                        sx={{ borderRadius: `${shape.borderRadius}px`, overflow: 'hidden' }}
                      >
                        <CardActionArea onClick={() => navigate(`/tournament/${tournament.id}/group/${group.name}`)}>
                          <CardContent sx={{ py: 2, px: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {t('tournament.group', { name: group.name })}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {t('tournament.teamsCount', { count: group.teamIds.length })}
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                {t('tournament.gamesCompleted', { percent })}
                              </Typography>
                              {percent === 100 && (
                                <EmojiEventsIcon sx={{ color: 'success.main', fontSize: '1.25rem' }} />
                              )}
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {tournament.bracket?.rounds.map((round, index) => {
                    let completedCount = 0;
                    let totalCount = 0;
                    for (const match of round.matches) {
                      totalCount++;
                      if (match.isBye) {
                        completedCount++;
                      } else if (match.gameId) {
                        const matchGame = games.find(g => g.id === match.gameId);
                        if (matchGame && matchGame.status === 'finished') {
                          completedCount++;
                        }
                      }
                    }
                    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                    return (
                      <Card
                        key={index}
                        elevation={2}
                        sx={{ borderRadius: `${shape.borderRadius}px`, overflow: 'hidden' }}
                      >
                        <CardActionArea onClick={() => navigate(`/tournament/${tournament.id}/round/${index}`)}>
                          <CardContent sx={{ py: 2, px: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {round.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {t('tournament.gamesCompleted', { percent })}
                              </Typography>
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </PullToRefresh>

       {/* Bottom Bar for Admins in Preparation or Creation Phase */}
      {isAdmin && (
        <>
          {tournament.status === 'preparation' && (
            <Box sx={sx.dynamicBottomBar(showBottomShadow)}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleStartCreation}
                disabled={teams.length < 2}
                startIcon={<PlayArrowIcon />}
              >
                {t('tournament.advanceToCreation')}
              </Button>
            </Box>
          )}
          {tournament.status === 'creation' && (
            <Box sx={sx.dynamicBottomBar(showBottomShadow)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={handleStartTournament}
                  disabled={
                    tournament.format === 'group'
                      ? !tournament.groups || tournament.groups.length === 0
                      : !tournament.bracket || !tournament.bracket.rounds || tournament.bracket.rounds.length === 0
                  }
                  startIcon={<PlayArrowIcon />}
                >
                  {t('tournament.advanceToExecution')}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={handleGoBackToPreparation}
                >
                  {t('tournament.goBackToPreparation')}
                </Button>
              </Box>
            </Box>
          )}
          {tournament.status === 'execution' && (
            <Box sx={sx.dynamicBottomBar(showBottomShadow)}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleFinishTournament}
                startIcon={<EmojiEventsIcon />}
              >
                {t('tournament.advanceToFinished')}
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Dialogs */}
      <CreateTeamDialog
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        tournamentId={tournament.id}
        isAdmin={isAdmin}
        onSuccess={() => {
          setCreateTeamOpen(false);
          loadData();
        }}
      />

      <EditTeamDialog
        open={editTeamOpen}
        onClose={() => {
          setEditTeamOpen(false);
          setSelectedTeam(null);
        }}
        tournamentId={tournament.id}
        team={selectedTeam}
        isAdmin={isAdmin}
        onSuccess={() => {
          setEditTeamOpen(false);
          setSelectedTeam(null);
          loadData();
        }}
      />

      <EditTournamentDialog
        open={editTournamentOpen}
        onClose={() => setEditTournamentOpen(false)}
        tournament={tournament}
        onSuccess={(deleted) => {
          setEditTournamentOpen(false);
          if (deleted) {
            navigate('/tournaments');
          } else {
            loadData();
          }
        }}
      />

      <ImportTeamsDialog
        open={importTeamsOpen}
        onClose={() => setImportTeamsOpen(false)}
        targetTournamentId={tournament.id}
        onSuccess={() => {
          setImportTeamsOpen(false);
          loadData();
        }}
      />

      <ManualBracketDialog
        open={manualBracketOpen}
        onClose={() => setManualBracketOpen(false)}
        teams={teams}
        currentBracket={tournament.bracket || null}
        onSave={handleSaveManualBracket}
      />
    </Box>
  );
}

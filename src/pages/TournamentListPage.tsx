import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import Chip from '@mui/material/Chip';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllTournaments } from '../services/tournamentService';
import type { Tournament } from '../types/tournament';
import TournamentCard from '../components/tournament/TournamentCard';
import CreateTournamentDialog from '../components/tournament/CreateTournamentDialog';
import PullToRefresh from '../components/PullToRefresh';
import * as sx from '../styles/commonStyles';
import { shape, fonts } from '../styles/tokens';
import appIconImg from '../assets/app-icon.png';

export default function TournamentListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  useEffect(() => {
    if (!scrollRef.current) return;

    updateShadows();

    const observer = new ResizeObserver(() => {
      updateShadows();
    });

    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [loading, updateShadows]);

  const loadTournaments = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const list = await fetchAllTournaments();
      setTournaments(list);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleCreateSuccess = (id: string) => {
    setDialogOpen(false);
    navigate(`/tournament/${id}`);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Title Header */}
      <Box sx={sx.dynamicHeader(showTopShadow)}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component="img"
              src={appIconImg}
              alt="Dragon's Count"
              sx={{
                width: 30,
                height: 30,
                objectFit: 'contain',
                borderRadius: `${shape.borderRadius}px`,
                boxShadow: '0px 0px 2px rgba(0, 0, 0, 0.4)',
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontFamily: fonts.display,
                fontWeight: 400,
                fontSize: '1.5rem',
                lineHeight: 1,
              }}
            >
              {t('tournament.title')}
            </Typography>
          </Box>
          {profile && (
            <Chip
              icon={
                <Typography sx={{ ...sx.avatarIconFont }}>
                  {profile.avatar || '🐉'}
                </Typography>
              }
              label={profile.displayName || 'Player'}
              size="small"
              sx={{
                ...sx.uppercaseBadgeFont,
                maxWidth: 180,
                px: 0.75,
              }}
            />
          )}
        </Box>
      </Box>

      {/* Tournaments list */}
      <PullToRefresh scrollRef={scrollRef} onRefresh={() => loadTournaments(true)}>
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
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
              <CircularProgress />
            </Box>
          ) : tournaments.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                pt: 8,
              }}
            >
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ textAlign: 'center', px: 4 }}
              >
                {t('tournament.noTournaments')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {tournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  onClick={() => navigate(`/tournament/${tournament.id}`)}
                />
              ))}
            </Box>
          )}
        </Box>
      </PullToRefresh>

      {/* Bottom bar */}
      <Box sx={sx.dynamicBottomBar(showBottomShadow)}>
        <Button
          id="create-new-tournament-btn"
          variant="contained"
          size="large"
          startIcon={<EmojiEventsIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ flex: 1 }}
        >
          {t('tournament.newTournament')}
        </Button>
      </Box>

      {/* Creation dialog */}
      <CreateTournamentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmitSuccess={handleCreateSuccess}
      />
    </Box>
  );
}

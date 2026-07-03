import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HelpIcon from '@mui/icons-material/Help';
import SettingsIcon from '@mui/icons-material/Settings';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { useTranslation } from 'react-i18next';
import type { Tournament } from '../../types/tournament';
import { fetchTeams } from '../../services/tournamentService';
import { shape } from '../../styles/tokens';
import * as sx from '../../styles/commonStyles';
import { DateFormatter } from '../../utils/date';

interface TournamentCardProps {
  tournament: Tournament;
  onClick?: () => void;
}

export default function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const { t, i18n } = useTranslation();
  const [teamCount, setTeamCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchTeams(tournament.id)
      .then((teams) => {
        if (active) {
          setTeamCount(teams.length);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch teams count for card:', err);
      });
    return () => {
      active = false;
    };
  }, [tournament.id]);

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
  const createdDate = new Date(tournament.createdAt);
  const formatDateOnly = (date: Date) => DateFormatter.formatDateOnly(date, i18n.language);

  return (
    <Card
      elevation={2}
      sx={{
        mb: 1.5,
        borderRadius: `${shape.borderRadius}px`,
        overflow: 'hidden',
      }}
    >
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" noWrap sx={{ maxWidth: '70%', fontWeight: 'bold' }}>
              {tournament.name}
            </Typography>
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
              }}
            >
              {status.icon}
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                {status.text}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {tournament.format === 'group'
                  ? t('tournament.formatGroup')
                  : t('tournament.formatKO')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {teamCount !== null
                  ? t('tournament.teamsCount', { count: teamCount })
                  : '...'}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {formatDateOnly(createdDate)}
            </Typography>
          </Box>

          {tournament.tag && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, color: 'text.secondary' }}>
              <LocalOfferIcon sx={{ fontSize: '0.8rem' }} />
              <Typography variant="caption" noWrap>
                {tournament.tag}
              </Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

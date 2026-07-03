import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { KOBracket, TournamentTeam } from '../../types/tournament';
import { shape } from '../../styles/tokens';

interface BracketPreviewProps {
  bracket: KOBracket;
  teams: TournamentTeam[];
}

export default function BracketPreview({ bracket, teams }: BracketPreviewProps) {
  const { t } = useTranslation();
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'TBD';
    return teamMap.get(teamId)?.name || t('common.deleted');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 3,
        overflowX: 'auto',
        pb: 2,
        pt: 1,
        minHeight: '300px',
        '&::-webkit-scrollbar': {
          height: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'action.selected',
          borderRadius: '3px',
        },
      }}
    >
      {bracket.rounds.map((round, rIndex) => (
        <Box
          key={rIndex}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: '220px',
            flex: '0 0 auto',
            justifyContent: 'space-around',
          }}
        >
          <Typography variant="subtitle2" align="center" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
            {round.name}
          </Typography>

          {round.matches.map((match, mIndex) => (
            <Card
              key={mIndex}
              elevation={1}
              sx={{
                borderRadius: `${shape.borderRadius}px`,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: match.winnerId && match.winnerId === match.team1Id ? 'bold' : 'normal',
                      color: match.winnerId && match.winnerId !== match.team1Id ? 'text.disabled' : 'text.primary',
                    }}
                  >
                    {getTeamName(match.team1Id)}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: match.winnerId && match.winnerId === match.team2Id ? 'bold' : 'normal',
                      color: match.winnerId && match.winnerId !== match.team2Id ? 'text.disabled' : 'text.primary',
                      display: match.isBye ? 'none' : 'block',
                    }}
                  >
                    {getTeamName(match.team2Id)}
                  </Typography>

                  {match.isBye && (
                    <Typography variant="caption" color="warning.main" sx={{ fontWeight: 'bold', fontStyle: 'italic' }}>
                      {t('tournament.bye')}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ))}
    </Box>
  );
}

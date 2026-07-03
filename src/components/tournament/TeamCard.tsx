import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import type { TournamentTeam } from '../../types/tournament';
import type { PlayerSlot } from '../../types/game';
import type { PlayerNameResolver } from '../../utils/playerName';
import { shape } from '../../styles/tokens';
import * as sx from '../../styles/commonStyles';

interface TeamCardProps {
  team: TournamentTeam;
  playerProfileMap: Map<string, PlayerNameResolver>;
  onClick?: () => void;
}

export default function TeamCard({ team, playerProfileMap, onClick }: TeamCardProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();

  const getPlayerDetails = (slot: PlayerSlot) => {
    const isCurrentUser = slot.uid === user?.uid;
    let displayName = slot.guestName || 'Player';
    let avatar = '🐰'; // Default guest avatar

    if (isCurrentUser && profile) {
      displayName = profile.displayName;
      avatar = profile.avatar || '🐉';
    } else if (slot.uid) {
      const cached = playerProfileMap.get(slot.uid);
      if (cached) {
        displayName = cached.displayName;
        avatar = cached.avatar || '🐰';
      } else {
        displayName = t('common.deleted');
        avatar = '👻';
      }
    }
    return { displayName, avatar };
  };

  const p1 = getPlayerDetails(team.player1);
  const p2 = getPlayerDetails(team.player2);

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
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            {team.name}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ ...sx.avatarListFont }}>{p1.avatar}</Typography>
              <Typography variant="body2" sx={{ ...sx.playerNameLarge }}>
                {p1.displayName}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ ...sx.avatarListFont }}>{p2.avatar}</Typography>
              <Typography variant="body2" sx={{ ...sx.playerNameLarge }}>
                {p2.displayName}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

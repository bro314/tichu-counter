import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { TournamentGroup, TournamentTeam } from '../../types/tournament';
import type { PlayerNameResolver } from '../../utils/playerName';
import TeamCard from './TeamCard';

interface GroupPreviewProps {
  groups: TournamentGroup[];
  teams: TournamentTeam[];
  playerProfileMap: Map<string, PlayerNameResolver>;
}

export default function GroupPreview({ groups, teams, playerProfileMap }: GroupPreviewProps) {
  const { t } = useTranslation();
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {groups.map((group) => {
        const groupTeams = group.teamIds
          .map((id) => teamMap.get(id))
          .filter((t): t is TournamentTeam => !!t);

        return (
          <Box key={group.name}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
              {t('tournament.group', { name: group.name })} ({groupTeams.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {groupTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  playerProfileMap={playerProfileMap}
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

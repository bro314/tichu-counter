import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { fetchAllTournaments, fetchTeams, importTeamsFromTournament } from '../../services/tournamentService';
import type { Tournament, TournamentTeam } from '../../types/tournament';

interface ImportTeamsDialogProps {
  open: boolean;
  onClose: () => void;
  targetTournamentId: string;
  onSuccess: () => void;
}

export default function ImportTeamsDialog({
  open,
  onClose,
  targetTournamentId,
  onSuccess,
}: ImportTeamsDialogProps) {
  const { t } = useTranslation();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all tournaments on open
  useEffect(() => {
    if (open) {
      setLoadingTournaments(true);
      setSelectedTournament(null);
      setTeams([]);
      setSelectedTeamIds([]);
      setError(null);

      fetchAllTournaments()
        .then((list) => {
          // Filter out target tournament
          setTournaments(list.filter((t) => t.id !== targetTournamentId));
        })
        .catch((err) => {
          console.error('Failed to load tournaments for import:', err);
          setError('Failed to load tournaments.');
        })
        .finally(() => {
          setLoadingTournaments(false);
        });
    }
  }, [open, targetTournamentId]);

  // Load teams when source tournament is selected
  useEffect(() => {
    if (selectedTournament) {
      setLoadingTeams(true);
      setTeams([]);
      setSelectedTeamIds([]);
      setError(null);

      fetchTeams(selectedTournament.id)
        .then((teamList) => {
          setTeams(teamList);
        })
        .catch((err) => {
          console.error('Failed to load teams for source tournament:', err);
          setError('Failed to load teams.');
        })
        .finally(() => {
          setLoadingTeams(false);
        });
    } else {
      setTeams([]);
      setSelectedTeamIds([]);
    }
  }, [selectedTournament]);

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  };

  const handleToggleAll = () => {
    if (selectedTeamIds.length === teams.length) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(teams.map((t) => t.id));
    }
  };

  const handleImport = async () => {
    if (!selectedTournament || selectedTeamIds.length === 0) return;
    setImporting(true);
    setError(null);

    try {
      await importTeamsFromTournament(selectedTournament.id, targetTournamentId, selectedTeamIds);
      onSuccess();
    } catch (err: any) {
      if (err.message === 'TEAM_NAME_TAKEN') {
        setError(t('tournament.errorTeamNameTaken'));
      } else if (err.message === 'PLAYER_ALREADY_IN_TOURNAMENT') {
        setError(t('tournament.errorPlayerAlreadyInTournament'));
      } else {
        setError(err.message || 'Failed to import teams.');
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('tournament.importTeams')}</DialogTitle>
      <DialogContent sx={{ px: 2, py: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Autocomplete
            options={tournaments}
            value={selectedTournament}
            onChange={(_, val) => setSelectedTournament(val)}
            getOptionLabel={(option) => option.name}
            loading={loadingTournaments}
            size="small"
            fullWidth
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('tournament.importTeamsFrom')}
                placeholder="Select tournament"
              />
            )}
          />

          {loadingTeams && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {teams.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('tournament.importTeamsSelect')}
                </Typography>
                <Button size="small" onClick={handleToggleAll}>
                  {selectedTeamIds.length === teams.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>
              <FormGroup sx={{ maxHeight: 200, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {teams.map((team) => (
                  <FormControlLabel
                    key={team.id}
                    control={
                      <Checkbox
                        checked={selectedTeamIds.includes(team.id)}
                        onChange={() => handleToggleTeam(team.id)}
                        size="small"
                      />
                    }
                    label={team.name}
                  />
                ))}
              </FormGroup>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 2 }}>
        <Button onClick={onClose} disabled={importing}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={selectedTeamIds.length === 0 || importing}
        >
          {importing ? <CircularProgress size={20} color="inherit" /> : t('tournament.importTeamsAction')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

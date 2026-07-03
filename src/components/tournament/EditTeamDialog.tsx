import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Alert from '@mui/material/Alert';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPlayers, searchPlayers } from '../../services/playerService';
import type { RegisteredPlayer } from '../../services/playerService';
import { updateTeam, deleteTeam } from '../../services/tournamentService';
import type { TournamentTeam } from '../../types/tournament';
import type { PlayerSlot } from '../../types/game';
import * as sx from '../../styles/commonStyles';

const filterOptions = createFilterOptions<RegisteredPlayer>({
  matchFrom: 'start',
  stringify: (option) => option.displayName,
});

interface EditTeamDialogProps {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  team: TournamentTeam | null;
  isAdmin: boolean;
  onSuccess: () => void;
}

type PlayerSelection = RegisteredPlayer | null;

export default function EditTeamDialog({
  open,
  onClose,
  tournamentId,
  team,
  isAdmin,
  onSuccess,
}: EditTeamDialogProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();

  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [player1, setPlayer1] = useState<PlayerSelection>(null);
  const [player1Input, setPlayer1Input] = useState('');
  const [player1Options, setPlayer1Options] = useState<RegisteredPlayer[]>([]);

  const [player2, setPlayer2] = useState<PlayerSelection>(null);
  const [player2Input, setPlayer2Input] = useState('');
  const [player2Options, setPlayer2Options] = useState<RegisteredPlayer[]>([]);

  const [recentOpponents, setRecentOpponents] = useState<RegisteredPlayer[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Initialize/resolve team players
  useEffect(() => {
    if (open && team) {
      setError(null);
      setTeamName(team.name);
      setConfirmDelete(false);

      const resolvePlayers = async () => {
        const uidsToFetch = [team.player1.uid, team.player2.uid].filter(Boolean) as string[];
        let resolvedList: RegisteredPlayer[] = [];
        if (uidsToFetch.length > 0) {
          resolvedList = await fetchPlayers(uidsToFetch);
        }

        const resolvePlayer = (slot: PlayerSlot) => {
          if (slot.uid) {
            return (
              resolvedList.find((p) => p.uid === slot.uid) || {
                uid: slot.uid,
                displayName: 'Player',
                avatar: '🐰',
              }
            );
          }
          return null;
        };

        const p1Resolved = resolvePlayer(team.player1);
        setPlayer1(p1Resolved);
        setPlayer1Input(
          p1Resolved
            ? `${p1Resolved.avatar} ${p1Resolved.displayName}`
            : team.player1.guestName || '',
        );

        const p2Resolved = resolvePlayer(team.player2);
        setPlayer2(p2Resolved);
        setPlayer2Input(
          p2Resolved
            ? `${p2Resolved.avatar} ${p2Resolved.displayName}`
            : team.player2.guestName || '',
        );
      };

      resolvePlayers().catch(console.error);

      if (user) {
        const recentUids = profile?.recentOpponentUids || [];
        if (recentUids.length > 0) {
          fetchPlayers(recentUids)
            .then(setRecentOpponents)
            .catch(console.error);
        } else {
          setRecentOpponents([]);
        }
      }
    }
  }, [open, team, profile?.recentOpponentUids, user]);

  // Debounced search for Player 1 (only if admin)
  useEffect(() => {
    if (!isAdmin) return;
    const term = player1Input.trim();
    if (!term) {
      setPlayer1Options([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchPlayers(term, profile?.isTestUser ?? false);
        setPlayer1Options(results);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [player1Input, profile?.isTestUser, isAdmin]);

  // Debounced search for Player 2
  useEffect(() => {
    const term = player2Input.trim();
    if (!term) {
      setPlayer2Options([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchPlayers(term, profile?.isTestUser ?? false);
        setPlayer2Options(results);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [player2Input, profile?.isTestUser]);

  const getSelectablePlayers = (options: RegisteredPlayer[], isPlayer1Slot: boolean) => {
    const selectedUids = new Set<string>();

    if (isPlayer1Slot) {
      if (player2) selectedUids.add(player2.uid);
    } else {
      if (player1) selectedUids.add(player1.uid);
    }

    return options.filter((p) => !selectedUids.has(p.uid));
  };

  const buildSlot = (
    selected: PlayerSelection,
    inputText: string,
    fallbackN: number,
  ): PlayerSlot => {
    if (selected) {
      const expectedText = `${selected.avatar} ${selected.displayName}`;
      if (inputText.trim() === expectedText || inputText.trim() === selected.displayName) {
        return { uid: selected.uid, guestName: null };
      }
    }
    const name = inputText.trim();
    return {
      uid: null,
      guestName: name || `Player ${fallbackN}`,
    };
  };

  const handleUpdate = async () => {
    if (!team) return;
    if (!teamName.trim()) {
      setError(t('tournament.errorTeamNameRequired'));
      return;
    }

    const p1Slot = buildSlot(player1, player1Input, 1);
    const p2Slot = buildSlot(player2, player2Input, 2);

    // Validate duplicate player inside the same team
    if (p1Slot.uid && p2Slot.uid && p1Slot.uid === p2Slot.uid) {
      setError(t('newGame.errorDuplicatePlayer'));
      return;
    }

    try {
      await updateTeam(tournamentId, team.id, {
        name: teamName.trim(),
        player1: p1Slot,
        player2: p2Slot,
      });
      onSuccess();
    } catch (err: any) {
      if (err.message === 'TEAM_NAME_TAKEN') {
        setError(t('tournament.errorTeamNameTaken'));
      } else if (err.message === 'PLAYER_ALREADY_IN_TOURNAMENT') {
        setError(t('tournament.errorPlayerAlreadyInTournament'));
      } else {
        setError(err.message || 'Failed to update team');
      }
    }
  };

  const handleDelete = async () => {
    if (!team) return;
    try {
      await deleteTeam(tournamentId, team.id);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete team');
    }
  };

  const renderPlayerPicker = (
    n: number,
    value: PlayerSelection,
    inputValue: string,
    onChange: (val: PlayerSelection) => void,
    onInputChange: (val: string) => void,
    options: RegisteredPlayer[],
    disabled = false,
  ) => {
    const filteredOptions = getSelectablePlayers(options, n === 1);
    return (
      <Autocomplete
        id={`edit-team-player${n}-input`}
        options={filteredOptions}
        value={value}
        inputValue={inputValue}
        disabled={disabled}
        filterOptions={filterOptions}
        onChange={(_, newVal) => {
          if (disabled) return;
          if (typeof newVal === 'string' || newVal === null) {
            onChange(null);
          } else {
            onChange(newVal);
          }
        }}
        onInputChange={(_, newInput, reason) => {
          if (disabled) return;
          if (reason !== 'reset') onInputChange(newInput);
        }}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return `${option.avatar} ${option.displayName}`;
        }}
        isOptionEqualToValue={(opt, val) => {
          if (typeof opt === 'string' || typeof val === 'string') return false;
          return opt.uid === val.uid;
        }}
        freeSolo
        size="small"
        fullWidth
        renderOption={(props, option) => {
          const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
          return (
            <Box
              component="li"
              key={key}
              {...rest}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Typography sx={{ ...sx.avatarListFont }}>{option.avatar}</Typography>
              <Typography variant="body2">{option.displayName}</Typography>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t(`tournament.player${n}`)}
            placeholder={t('newGame.playerPlaceholder')}
            disabled={disabled}
          />
        )}
      />
    );
  };

  const isEditable = isAdmin || team?.player1.uid === user?.uid || team?.player2.uid === user?.uid;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('tournament.editTeam')}</DialogTitle>
      <DialogContent sx={{ px: 2, py: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {confirmDelete ? (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('tournament.deleteTeamConfirm')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
              <Button variant="contained" color="error" onClick={handleDelete}>
                {t('common.delete')}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('tournament.teamName')}
              placeholder={t('tournament.teamNamePlaceholder')}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              fullWidth
              size="small"
              required
              disabled={!isEditable}
            />

            <Typography variant="subtitle2" color="text.secondary">
              {t('tournament.player1')}
            </Typography>
            {renderPlayerPicker(
              1,
              player1,
              player1Input,
              setPlayer1,
              setPlayer1Input,
              player1Input.trim() === '' ? recentOpponents : player1Options,
              !isEditable || !isAdmin, // Only admin can edit player 1
            )}

            <Typography variant="subtitle2" color="text.secondary">
              {t('tournament.player2')}
            </Typography>
            {renderPlayerPicker(
              2,
              player2,
              player2Input,
              setPlayer2,
              setPlayer2Input,
              player2Input.trim() === '' ? recentOpponents : player2Options,
              !isEditable,
            )}
          </Box>
        )}
      </DialogContent>
      {!confirmDelete && (
        <DialogActions sx={{ px: 2, py: 2, justifyContent: 'space-between' }}>
          <Box>
            {isEditable && (
              <Button color="error" onClick={() => setConfirmDelete(true)}>
                {t('common.delete')}
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            {isEditable && (
              <Button variant="contained" onClick={handleUpdate}>
                {t('common.save')}
              </Button>
            )}
          </Box>
        </DialogActions>
      )}
    </Dialog>
  );
}

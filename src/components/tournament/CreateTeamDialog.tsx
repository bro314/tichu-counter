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
import { addTeam } from '../../services/tournamentService';
import type { PlayerSlot } from '../../types/game';
import * as sx from '../../styles/commonStyles';

const filterOptions = createFilterOptions<RegisteredPlayer>({
  matchFrom: 'start',
  stringify: (option) => option.displayName,
});

interface CreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  isAdmin: boolean;
  onSuccess: () => void;
}

type PlayerSelection = RegisteredPlayer | null;

export default function CreateTeamDialog({
  open,
  onClose,
  tournamentId,
  isAdmin,
  onSuccess,
}: CreateTeamDialogProps) {
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

  // Fetch recent opponents when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setTeamName('');
      setPlayer1(null);
      setPlayer1Input('');
      setPlayer2(null);
      setPlayer2Input('');
      setPlayer1Options([]);
      setPlayer2Options([]);

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
  }, [open, profile?.recentOpponentUids, user]);

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
      if (isAdmin) {
        if (player1) selectedUids.add(player1.uid);
      } else if (user) {
        selectedUids.add(user.uid);
      }
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

  const handleSubmit = async () => {
    if (!user) return;
    if (!teamName.trim()) {
      setError(t('tournament.errorTeamNameRequired'));
      return;
    }

    let p1Slot: PlayerSlot;
    if (isAdmin) {
      p1Slot = buildSlot(player1, player1Input, 1);
    } else {
      p1Slot = { uid: user.uid, guestName: null };
    }

    const p2Slot = buildSlot(player2, player2Input, 2);

    // Validate duplicate player inside the same team
    if (p1Slot.uid && p2Slot.uid && p1Slot.uid === p2Slot.uid) {
      setError(t('newGame.errorDuplicatePlayer'));
      return;
    }

    try {
      await addTeam(tournamentId, {
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
        setError(err.message || 'Failed to create team');
      }
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
        id={`create-team-player${n}-input`}
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
        onInputChange={(_, newInput) => {
          if (disabled) return;
          onInputChange(newInput);
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

  const currentUserPlayer: RegisteredPlayer | null =
    user && profile
      ? {
          uid: user.uid,
          displayName: profile.displayName || 'You',
          avatar: profile.avatar || '🐉',
        }
      : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('tournament.addTeam')}</DialogTitle>
      <DialogContent sx={{ px: 2, py: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('tournament.teamName')}
            placeholder={t('tournament.teamNamePlaceholder')}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            fullWidth
            size="small"
            required
          />

          <Typography variant="subtitle2" color="text.secondary">
            {t('tournament.player1')}
          </Typography>
          {isAdmin
            ? renderPlayerPicker(
                1,
                player1,
                player1Input,
                setPlayer1,
                setPlayer1Input,
                player1Input.trim() === '' ? recentOpponents : player1Options,
              )
            : renderPlayerPicker(
                1,
                currentUserPlayer,
                currentUserPlayer
                  ? `${currentUserPlayer.avatar} ${currentUserPlayer.displayName}`
                  : '',
                () => {},
                () => {},
                [],
                true,
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
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 2 }}>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

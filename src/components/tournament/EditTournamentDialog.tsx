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
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPlayers, searchPlayers } from '../../services/playerService';
import type { RegisteredPlayer } from '../../services/playerService';
import { updateTournament, deleteTournament } from '../../services/tournamentService';
import type { Tournament } from '../../types/tournament';

import { QRCodeSVG } from 'qrcode.react';

const filterOptions = createFilterOptions<RegisteredPlayer>({
  matchFrom: 'start',
  stringify: (option) => option.displayName,
});

interface EditTournamentDialogProps {
  open: boolean;
  onClose: () => void;
  tournament: Tournament;
  onSuccess: (deleted?: boolean) => void;
}

export default function EditTournamentDialog({
  open,
  onClose,
  tournament,
  onSuccess,
}: EditTournamentDialogProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [format, setFormat] = useState<'group' | 'ko'>('group');
  const [selfRegister, setSelfRegister] = useState(false);
  const [adminUids, setAdminUids] = useState<string[]>([]);
  const [adminsResolved, setAdminsResolved] = useState<RegisteredPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [adminSearchInput, setAdminSearchInput] = useState('');
  const [adminOptions, setAdminOptions] = useState<RegisteredPlayer[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tournamentUrl = `https://dragons-count.de/tournament/${tournament.id}`;

  // Populate data when dialog opens
  useEffect(() => {
    if (open) {
      setName(tournament.name);
      setTag(tournament.tag || '');
      setFormat(tournament.format);
      setSelfRegister(tournament.selfRegister);
      setAdminUids(tournament.adminUids);
      setError(null);
      setConfirmDelete(false);
      setAdminSearchInput('');
      setAdminOptions([]);

      if (tournament.adminUids.length > 0) {
        fetchPlayers(tournament.adminUids)
          .then(setAdminsResolved)
          .catch(console.error);
      }
    }
  }, [open, tournament]);

  // Debounced search for admins
  useEffect(() => {
    const term = adminSearchInput.trim();
    if (!term) {
      setAdminOptions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchPlayers(term, profile?.isTestUser ?? false);
        // Exclude already added admins
        setAdminOptions(results.filter((p) => !adminUids.includes(p.uid)));
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [adminSearchInput, adminUids, profile?.isTestUser]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('tournament.errorNameRequired'));
      return;
    }
    if (adminUids.length === 0) {
      setError('At least one admin is required.');
      return;
    }

    try {
      await updateTournament(tournament.id, {
        name: name.trim(),
        tag: tag.trim() || undefined,
        format,
        selfRegister,
        adminUids,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update tournament');
    }
  };

  const handleDeleteTournament = async () => {
    try {
      await deleteTournament(tournament.id);
      onSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to delete tournament');
    }
  };

  const handleAddAdmin = (newAdmin: RegisteredPlayer | null) => {
    if (!newAdmin) return;
    if (!adminUids.includes(newAdmin.uid)) {
      const updated = [...adminUids, newAdmin.uid];
      setAdminUids(updated);
      setAdminsResolved([...adminsResolved, newAdmin]);
    }
    setAdminSearchInput('');
  };

  const handleRemoveAdmin = (uidToRemove: string) => {
    if (adminUids.length <= 1) {
      setError('Cannot remove the last admin.');
      return;
    }
    const updated = adminUids.filter((uid) => uid !== uidToRemove);
    setAdminUids(updated);
    setAdminsResolved(adminsResolved.filter((p) => p.uid !== uidToRemove));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('tournament.editTournament')}</DialogTitle>
      <DialogContent sx={{ px: 2, py: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {confirmDelete ? (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('tournament.deleteConfirm')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
              <Button variant="contained" color="error" onClick={handleDeleteTournament}>
                {t('common.delete')}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('tournament.name')}
              placeholder={t('tournament.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              size="small"
              required
            />

            <TextField
              label={t('tournament.tag')}
              placeholder={t('tournament.tagPlaceholder')}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              fullWidth
              size="small"
            />

            {tournament.status === 'preparation' && (
              <>
                <FormControl component="fieldset">
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('tournament.format')}
                  </Typography>
                  <RadioGroup
                    row
                    value={format}
                    onChange={(e) => setFormat(e.target.value as 'group' | 'ko')}
                  >
                    <FormControlLabel
                      value="group"
                      control={<Radio size="small" />}
                      label={t('tournament.formatGroup')}
                    />
                    <FormControlLabel
                      value="ko"
                      control={<Radio size="small" />}
                      label={t('tournament.formatKO')}
                    />
                  </RadioGroup>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selfRegister}
                      onChange={(e) => setSelfRegister(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{t('tournament.selfRegister')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('tournament.selfRegisterHelp')}
                      </Typography>
                    </Box>
                  }
                />
              </>
            )}

            <Divider />

            {/* Admin Management */}
            <Typography variant="subtitle2" color="text.secondary">
              {t('tournament.adminList')}
            </Typography>
            <List dense sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
              {adminsResolved.map((admin) => (
                <ListItem
                  key={admin.uid}
                  secondaryAction={
                    adminUids.length > 1 && (
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleRemoveAdmin(admin.uid)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText primary={`${admin.avatar} ${admin.displayName}`} />
                </ListItem>
              ))}
            </List>

            <Autocomplete
              options={adminOptions}
              inputValue={adminSearchInput}
              onInputChange={(_, val, reason) => {
                if (reason !== 'reset') setAdminSearchInput(val);
              }}
              onChange={(_, val) => handleAddAdmin(val)}
              getOptionLabel={(option) => `${option.avatar} ${option.displayName}`}
              renderOption={(props, option) => {
                const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & {
                  key: string;
                };
                return (
                  <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1 }}>
                    <Typography>{option.avatar}</Typography>
                    <Typography variant="body2">{option.displayName}</Typography>
                  </Box>
                );
              }}
              filterOptions={filterOptions}
              size="small"
              fullWidth
              renderInput={(params) => (
                <TextField {...params} label={t('tournament.addAdmin')} size="small" />
              )}
            />

            <Divider />

            {/* QR Code Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {t('tournament.qrCode')}
              </Typography>
              <Box
                sx={{
                  bgcolor: 'white',
                  p: 1.5,
                  borderRadius: 1,
                  boxShadow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <QRCodeSVG value={tournamentUrl} size={128} />
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      {!confirmDelete && (
        <DialogActions sx={{ px: 2, py: 2, justifyContent: 'space-between' }}>
          <Button color="error" onClick={() => setConfirmDelete(true)}>
            {t('common.delete')}
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="contained" onClick={handleSave}>
              {t('common.save')}
            </Button>
          </Box>
        </DialogActions>
      )}
    </Dialog>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useAuth } from '../../contexts/AuthContext';
import { createTournament } from '../../services/tournamentService';

interface CreateTournamentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmitSuccess: (id: string) => void;
}

export default function CreateTournamentDialog({
  open,
  onClose,
  onSubmitSuccess,
}: CreateTournamentDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [format, setFormat] = useState<'group' | 'ko'>('group');
  const [selfRegister, setSelfRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setError(t('tournament.errorNameRequired'));
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const tournamentId = await createTournament({
        name: name.trim(),
        tag: tag.trim() || undefined,
        format,
        selfRegister,
        adminUids: [user.uid],
      });
      
      // Reset form
      setName('');
      setTag('');
      setFormat('group');
      setSelfRegister(false);
      
      onSubmitSuccess(tournamentId);
    } catch (err: any) {
      console.error('Failed to create tournament:', err);
      setError(err?.message || t('common.errorAuthFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('tournament.createTitle')}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              id="tournament-name-input"
              label={t('tournament.name')}
              placeholder={t('tournament.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              disabled={submitting}
              autoFocus
            />

            <TextField
              id="tournament-tag-input"
              label={t('tournament.tag')}
              placeholder={t('tournament.tagPlaceholder')}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              fullWidth
              disabled={submitting}
            />

            <FormControl component="fieldset">
              <FormLabel component="legend">{t('tournament.format')}</FormLabel>
              <RadioGroup
                row
                value={format}
                onChange={(e) => setFormat(e.target.value as 'group' | 'ko')}
              >
                <FormControlLabel
                  value="group"
                  control={<Radio id="format-group" />}
                  label={t('tournament.formatGroup')}
                  disabled={submitting}
                />
                <FormControlLabel
                  value="ko"
                  control={<Radio id="format-ko" />}
                  label={t('tournament.formatKO')}
                  disabled={submitting}
                />
              </RadioGroup>
            </FormControl>

            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    id="self-register-checkbox"
                    checked={selfRegister}
                    onChange={(e) => setSelfRegister(e.target.checked)}
                    disabled={submitting}
                  />
                }
                label={t('tournament.selfRegister')}
              />
              <Typography variant="caption" color="text.secondary" sx={{ pl: 4, display: 'block' }}>
                {t('tournament.selfRegisterHelp')}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={submitting} variant="outlined" color="inherit">
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            id="create-tournament-submit-btn"
            disabled={submitting}
            variant="contained"
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

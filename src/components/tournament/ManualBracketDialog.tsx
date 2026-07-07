import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { TournamentTeam, KOBracket } from '../../types/tournament';
import { shape } from '../../styles/tokens';

interface ManualBracketDialogProps {
  open: boolean;
  onClose: () => void;
  teams: TournamentTeam[];
  currentBracket: KOBracket | null;
  onSave: (orderedSlots: (string | null)[]) => Promise<void>;
}

export default function ManualBracketDialog({
  open,
  onClose,
  teams,
  currentBracket,
  onSave,
}: ManualBracketDialogProps) {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<(string | null)[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Calculate and initialize slots
  useEffect(() => {
    if (open) {
      const n = teams.length;
      if (n === 0) {
        setSlots([]);
        return;
      }
      const totalSlots = Math.pow(2, Math.ceil(Math.log2(n)));
      const currentTeamIds = new Set(teams.map((t) => t.id));

      let initialSlots: (string | null)[] = [];

      // Try to load from current bracket
      if (currentBracket && currentBracket.rounds && currentBracket.rounds[0]) {
        const bracketSlots: (string | null)[] = [];
        for (const match of currentBracket.rounds[0].matches) {
          bracketSlots.push(match.team1Id);
          bracketSlots.push(match.team2Id);
        }

        const activeBracketTeamIds = bracketSlots.filter((id): id is string => id !== null);
        const isMatch =
          activeBracketTeamIds.length === n &&
          activeBracketTeamIds.every((id) => currentTeamIds.has(id));

        if (isMatch && bracketSlots.length === totalSlots) {
          initialSlots = bracketSlots;
        }
      }

      // Fallback: fill with teams and padding of byes
      if (initialSlots.length === 0) {
        const teamIds = teams.map((t) => t.id);
        initialSlots = [...teamIds];
        while (initialSlots.length < totalSlots) {
          initialSlots.push(null);
        }
      }

      setSlots(initialSlots);
      setSaving(false);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }, [open, teams, currentBracket]);

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newSlots = [...slots];
    const temp = newSlots[index];
    newSlots[index] = newSlots[index - 1];
    newSlots[index - 1] = temp;
    setSlots(newSlots);
  };

  const handleMoveDown = (index: number) => {
    if (index >= slots.length - 1) return;
    const newSlots = [...slots];
    const temp = newSlots[index];
    newSlots[index] = newSlots[index + 1];
    newSlots[index + 1] = temp;
    setSlots(newSlots);
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Nice drag effect support
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newSlots = [...slots];
    const [draggedItem] = newSlots.splice(draggedIndex, 1);
    newSlots.splice(targetIndex, 0, draggedItem);

    setSlots(newSlots);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(slots);
      onClose();
    } catch (err) {
      console.error('Failed to save manual bracket:', err);
    } finally {
      setSaving(false);
    }
  };

  const getSlotName = (slot: string | null) => {
    if (slot === null) return t('tournament.bye');
    return teamMap.get(slot)?.name || t('common.deleted');
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('tournament.manualBracketTitle')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('tournament.manualBracketDesc')}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: slots.length / 2 }).map((_, matchIndex) => {
            const leftIdx = matchIndex * 2;
            const rightIdx = matchIndex * 2 + 1;

            return (
              <Box
                key={matchIndex}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: `${shape.borderRadius}px`,
                  bgcolor: 'background.paper',
                  overflow: 'hidden',
                  boxShadow: 1,
                }}
              >
                <Box
                  sx={{
                    bgcolor: 'action.hover',
                    px: 2,
                    py: 0.75,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {t('round')} 1 - Match {matchIndex + 1}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {[leftIdx, rightIdx].map((idx) => {
                    const slot = slots[idx];
                    const isBye = slot === null;
                    const isDragged = draggedIndex === idx;
                    const isDragOver = dragOverIndex === idx;

                    return (
                      <Box
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, idx)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          px: 2,
                          py: 1,
                          borderBottom: idx === leftIdx ? '1px dashed' : 'none',
                          borderColor: 'divider',
                          opacity: isDragged ? 0.4 : 1,
                          bgcolor: isDragOver ? 'action.selected' : 'transparent',
                          transition: 'background-color 0.2s',
                          cursor: 'grab',
                          '&:active': { cursor: 'grabbing' },
                        }}
                      >
                        <DragIndicatorIcon sx={{ color: 'text.secondary', mr: 2, cursor: 'grab' }} />

                        <Typography
                          variant="body2"
                          sx={{
                            flexGrow: 1,
                            fontWeight: isBye ? 'normal' : 'bold',
                            color: isBye ? 'warning.main' : 'text.primary',
                            fontStyle: isBye ? 'italic' : 'normal',
                          }}
                        >
                          {getSlotName(slot)}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === slots.length - 1}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || slots.length === 0}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

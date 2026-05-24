import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import { useAuth } from "../contexts/AuthContext";
import { fetchAllPlayers } from "../services/playerService";
import type { RegisteredPlayer } from "../services/playerService";
import type { PlayerSlot, Game } from "../types/game";

const filterOptions = createFilterOptions<RegisteredPlayer>({
  matchFrom: "start",
  stringify: (option) => option.displayName,
});

interface NewGameDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateGame?: (
    players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot],
    isPrivate?: boolean,
    tag?: string,
    note?: string,
  ) => void;
  editMode?: boolean;
  game?: Game | null;
  onUpdateGame?: (isPrivate: boolean, tag: string, note: string) => void;
}

/** A player selection can be a registered user or a guest name */
type PlayerSelection = RegisteredPlayer | null;

const NewGameDialog = ({
  open,
  onClose,
  onCreateGame,
  editMode = false,
  game = null,
  onUpdateGame,
}: NewGameDialogProps) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();

  const [registeredPlayers, setRegisteredPlayers] = useState<
    RegisteredPlayer[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Each slot: either a selected registered player or a typed guest string
  const [player2, setPlayer2] = useState<PlayerSelection>(null);
  const [player2Input, setPlayer2Input] = useState("");
  const [player3, setPlayer3] = useState<PlayerSelection>(null);
  const [player3Input, setPlayer3Input] = useState("");
  const [player4, setPlayer4] = useState<PlayerSelection>(null);
  const [player4Input, setPlayer4Input] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [tag, setTag] = useState("");
  const [note, setNote] = useState("");

  // Fetch registered players when dialog opens
  useEffect(() => {
    if (open) {
      fetchAllPlayers(profile?.isTestUser ?? false)
        .then((players) => {
          setRegisteredPlayers(players);
          setError(null);

          if (editMode && game) {
            setIsPrivate(game.isPrivate || false);
            setTag(game.tag || "");
            setNote(game.note || "");

            const resolvePlayer = (slot: PlayerSlot) => {
              if (slot.uid) {
                const found = players.find((p) => p.uid === slot.uid);
                return (
                  found || {
                    uid: slot.uid,
                    displayName: "Player",
                    avatar: "🐉",
                  }
                );
              }
              return null;
            };

            const p2Resolved = resolvePlayer(game.players[1]);
            setPlayer2(p2Resolved);
            setPlayer2Input(p2Resolved ? "" : game.players[1].guestName || "");

            const p3Resolved = resolvePlayer(game.players[2]);
            setPlayer3(p3Resolved);
            setPlayer3Input(p3Resolved ? "" : game.players[2].guestName || "");

            const p4Resolved = resolvePlayer(game.players[3]);
            setPlayer4(p4Resolved);
            setPlayer4Input(p4Resolved ? "" : game.players[3].guestName || "");
          } else {
            setIsPrivate(false);
            setTag("");
            setNote("");
            setPlayer2(null);
            setPlayer2Input("");
            setPlayer3(null);
            setPlayer3Input("");
            setPlayer4(null);
            setPlayer4Input("");
          }
        })
        .catch(console.error);
    }
  }, [open, profile?.isTestUser, editMode, game]);

  // Dynamic filter for selectable registered players in each slot
  const getSelectablePlayers = (slotNum: number) => {
    const selectedUids = new Set<string>();
    if (user) selectedUids.add(user.uid);

    if (slotNum !== 2 && player2) selectedUids.add(player2.uid);
    if (slotNum !== 3 && player3) selectedUids.add(player3.uid);
    if (slotNum !== 4 && player4) selectedUids.add(player4.uid);

    return registeredPlayers.filter((p) => !selectedUids.has(p.uid));
  };

  const buildSlot = (
    selected: PlayerSelection,
    inputText: string,
    fallbackN: number,
  ): PlayerSlot => {
    if (selected) {
      return { uid: selected.uid, guestName: null };
    }
    const name = inputText.trim();
    return {
      uid: null,
      guestName: name || `${t("newGame.player", { n: fallbackN })}`,
    };
  };

  const handleStartOrSave = () => {
    if (!user) return;

    if (editMode) {
      if (onUpdateGame) {
        onUpdateGame(isPrivate, tag.trim(), note.trim());
      }
      return;
    }

    const p1 = { uid: user.uid, guestName: null };
    const p2 = buildSlot(player2, player2Input, 2);
    const p3 = buildSlot(player3, player3Input, 3);
    const p4 = buildSlot(player4, player4Input, 4);

    // Validate duplicate registered player selections
    const uids = [p1.uid, p2.uid, p3.uid, p4.uid].filter(Boolean);
    const uniqueUids = new Set(uids);
    if (uniqueUids.size !== uids.length) {
      setError(t("newGame.errorDuplicatePlayer"));
      return;
    }

    // Validate duplicate typed guest/profile names (case-insensitive)
    const names = [
      profile?.displayName || "You",
      player2 ? player2.displayName : p2.guestName,
      player3 ? player3.displayName : p3.guestName,
      player4 ? player4.displayName : p4.guestName,
    ].map((n) => n?.trim().toLowerCase());

    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      setError(t("newGame.errorDuplicatePlayer"));
      return;
    }

    setError(null);
    if (onCreateGame) {
      onCreateGame([p1, p2, p3, p4], isPrivate, tag.trim(), note.trim());
    }
    // Reset
    setPlayer2(null);
    setPlayer2Input("");
    setPlayer3(null);
    setPlayer3Input("");
    setPlayer4(null);
    setPlayer4Input("");
    setNote("");
  };

  const playerLabel = (n: number) => t("newGame.player", { n });

  /** Render a player picker — autocomplete for registered users, free text for guests */
  const renderPlayerPicker = (
    n: number,
    value: PlayerSelection,
    inputValue: string,
    onChange: (val: PlayerSelection) => void,
    onInputChange: (val: string) => void,
    disabled: boolean = false,
  ) => {
    const options = getSelectablePlayers(n);
    return (
      <Autocomplete
        id={`player${n}-input`}
        options={options}
        value={value}
        inputValue={inputValue}
        disabled={disabled}
        filterOptions={filterOptions}
        onChange={(_, newVal) => {
          if (disabled) return;
          // freeSolo can pass a string; we only care about RegisteredPlayer objects
          if (typeof newVal === "string" || newVal === null) {
            onChange(null);
          } else {
            onChange(newVal);
            if (n < 4) {
              setTimeout(() => {
                const nextInput = document.getElementById(
                  `player${n + 1}-input`,
                );
                if (nextInput) {
                  (nextInput as HTMLInputElement).focus();
                }
              }, 50);
            }
          }
        }}
        onInputChange={(_, newInput, reason) => {
          if (disabled) return;
          if (reason !== "reset") onInputChange(newInput);
        }}
        getOptionLabel={(option) => {
          if (typeof option === "string") return option;
          return `${option.avatar} ${option.displayName}`;
        }}
        isOptionEqualToValue={(opt, val) => {
          if (typeof opt === "string" || typeof val === "string") return false;
          return opt.uid === val.uid;
        }}
        freeSolo
        size="small"
        fullWidth
        renderOption={(props, option) => {
          const { key, ...rest } =
            props as React.HTMLAttributes<HTMLLIElement> & { key: string };
          return (
            <Box
              component="li"
              key={key}
              {...rest}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Typography sx={{ fontSize: "1.2rem" }}>
                {option.avatar}
              </Typography>
              <Typography variant="body2">{option.displayName}</Typography>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={playerLabel(n)}
            placeholder={t("newGame.playerPlaceholder")}
            disabled={disabled}
          />
        )}
      />
    );
  };

  const currentUserPlayer: RegisteredPlayer | null = user && profile ? {
    uid: user.uid,
    displayName: profile.displayName || "You",
    avatar: profile.avatar || "🐉",
  } : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{editMode ? t("newGame.editTitle") : t("newGame.title")}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {!editMode && (
            <>
              {/* Team 1 header */}
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {t("game.team1")}
              </Typography>

              {/* Player 1 — current user (read-only) */}
              {renderPlayerPicker(
                1,
                currentUserPlayer,
                currentUserPlayer ? `${currentUserPlayer.avatar} ${currentUserPlayer.displayName}` : "",
                () => {},
                () => {},
                true,
              )}

              {/* Player 2 */}
              {renderPlayerPicker(
                2,
                player2,
                player2Input,
                setPlayer2,
                setPlayer2Input,
                editMode,
              )}

              {/* Team 2 header */}
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: 600, mt: 1 }}
              >
                {t("game.team2")}
              </Typography>

              {/* Player 3 */}
              {renderPlayerPicker(
                3,
                player3,
                player3Input,
                setPlayer3,
                setPlayer3Input,
                editMode,
              )}

              {/* Player 4 */}
              {renderPlayerPicker(
                4,
                player4,
                player4Input,
                setPlayer4,
                setPlayer4Input,
                editMode,
              )}
            </>
          )}

          {/* Privacy setting */}
          <FormControl component="fieldset" variant="standard" sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  name="isPrivate"
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t("newGame.isPrivate")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("newGame.isPrivateHelp")}
                  </Typography>
                </Box>
              }
            />
          </FormControl>

          {/* Game Tag / Label */}
          <TextField
            label={t("newGame.tagLabel")}
            placeholder={t("newGame.tagPlaceholder")}
            value={tag}
            onChange={(e) => {
              if (e.target.value.length <= 12) {
                setTag(e.target.value);
              }
            }}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
          />

          {/* Game Note */}
          <TextField
            label={t("newGame.noteLabel")}
            placeholder={t("newGame.notePlaceholder")}
            value={note}
            onChange={(e) => {
              if (e.target.value.length <= 80) {
                setNote(e.target.value);
              }
            }}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button id="create-game-btn" variant="contained" onClick={handleStartOrSave}>
          {editMode ? t("common.save") : t("newGame.start")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewGameDialog;

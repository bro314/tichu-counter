import { useState, useEffect, useRef } from "react";
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
import { fetchPlayers, searchPlayers } from "../services/playerService";
import type { RegisteredPlayer } from "../services/playerService";
import type { PlayerSlot, Game } from "../types/game";
import { fetchAllTags } from "../services/gameService";
import * as sx from "../styles/commonStyles";

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
  onUpdateGame?: (
    isPrivate: boolean,
    tag: string,
    note: string,
    players?: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot],
  ) => void;
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

  const [error, setError] = useState<string | null>(null);

  // Each slot: either a selected registered player or a typed guest string
  const [player1, setPlayer1] = useState<PlayerSelection>(null);
  const [player2, setPlayer2] = useState<PlayerSelection>(null);
  const [player2Input, setPlayer2Input] = useState("");
  const [player3, setPlayer3] = useState<PlayerSelection>(null);
  const [player3Input, setPlayer3Input] = useState("");
  const [player4, setPlayer4] = useState<PlayerSelection>(null);
  const [player4Input, setPlayer4Input] = useState("");

  const [recentOpponents, setRecentOpponents] = useState<RegisteredPlayer[]>([]);
  const [player2Options, setPlayer2Options] = useState<RegisteredPlayer[]>([]);
  const [player3Options, setPlayer3Options] = useState<RegisteredPlayer[]>([]);
  const [player4Options, setPlayer4Options] = useState<RegisteredPlayer[]>([]);

  const [isPrivate, setIsPrivate] = useState(false);
  const [tag, setTag] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [note, setNote] = useState("");

  const player2Ref = useRef(player2);
  const player3Ref = useRef(player3);
  const player4Ref = useRef(player4);

  useEffect(() => {
    player2Ref.current = player2;
  }, [player2]);

  useEffect(() => {
    player3Ref.current = player3;
  }, [player3]);

  useEffect(() => {
    player4Ref.current = player4;
  }, [player4]);

  // Fetch recent opponents and tags when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);

      if (user) {
        fetchAllTags()
          .then(setAvailableTags)
          .catch(console.error);

        const recentUids = profile?.recentOpponentUids || [];
        if (recentUids.length > 0) {
          fetchPlayers(recentUids)
            .then(setRecentOpponents)
            .catch(console.error);
        } else {
          setRecentOpponents([]);
        }
      }

      if (editMode && game) {
        setIsPrivate(game.isPrivate || false);
        setTag(game.tag || "");
        setTagInput(game.tag || "");
        setNote(game.note || "");

        const resolveAndSetPlayers = async () => {
          const uidsToFetch = game.players
            .map((p) => p.uid)
            .filter((uid): uid is string => uid !== null);

          let resolvedList: RegisteredPlayer[] = [];
          if (uidsToFetch.length > 0) {
            resolvedList = await fetchPlayers(uidsToFetch);
          }

          const resolvePlayer = (slot: PlayerSlot) => {
            if (slot.uid) {
              return resolvedList.find((p) => p.uid === slot.uid) || {
                uid: slot.uid,
                displayName: "Player",
                avatar: "🐉",
              };
            }
            return null;
          };

          const p1Resolved = resolvePlayer(game.players[0]);
          setPlayer1(p1Resolved);

          const p2Resolved = resolvePlayer(game.players[1]);
          setPlayer2(p2Resolved);
          setPlayer2Input(p2Resolved ? `${p2Resolved.avatar} ${p2Resolved.displayName}` : game.players[1].guestName || "");

          const p3Resolved = resolvePlayer(game.players[2]);
          setPlayer3(p3Resolved);
          setPlayer3Input(p3Resolved ? `${p3Resolved.avatar} ${p3Resolved.displayName}` : game.players[2].guestName || "");

          const p4Resolved = resolvePlayer(game.players[3]);
          setPlayer4(p4Resolved);
          setPlayer4Input(p4Resolved ? `${p4Resolved.avatar} ${p4Resolved.displayName}` : game.players[3].guestName || "");
        };

        resolveAndSetPlayers().catch(console.error);
      } else {
        setIsPrivate(false);
        setTag("");
        setTagInput("");
        setNote("");
        setPlayer1(null);
        setPlayer2(null);
        setPlayer2Input("");
        setPlayer3(null);
        setPlayer3Input("");
        setPlayer4(null);
        setPlayer4Input("");
        setPlayer2Options([]);
        setPlayer3Options([]);
        setPlayer4Options([]);
      }
    }
  }, [open, profile?.recentOpponentUids, editMode, game, user]);

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

  // Debounced search for Player 3
  useEffect(() => {
    const term = player3Input.trim();
    if (!term) {
      setPlayer3Options([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchPlayers(term, profile?.isTestUser ?? false);
        setPlayer3Options(results);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [player3Input, profile?.isTestUser]);

  // Debounced search for Player 4
  useEffect(() => {
    const term = player4Input.trim();
    if (!term) {
      setPlayer4Options([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchPlayers(term, profile?.isTestUser ?? false);
        setPlayer4Options(results);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [player4Input, profile?.isTestUser]);

  // Dynamic filter for selectable registered players in each slot
  const getSelectablePlayers = (playersList: RegisteredPlayer[], slotNum: number) => {
    const selectedUids = new Set<string>();
    if (user) selectedUids.add(user.uid);

    if (slotNum !== 2 && player2) selectedUids.add(player2.uid);
    if (slotNum !== 3 && player3) selectedUids.add(player3.uid);
    if (slotNum !== 4 && player4) selectedUids.add(player4.uid);

    return playersList.filter((p) => !selectedUids.has(p.uid));
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
      if (game) {
        const updatedPlayers: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot] = [
          game.players[0],
          game.players[1],
          game.players[2],
          game.players[3],
        ];

        const slots = [
          { index: 1, selected: player2, input: player2Input },
          { index: 2, selected: player3, input: player3Input },
          { index: 3, selected: player4, input: player4Input },
        ];

        for (const slot of slots) {
          const original = game.players[slot.index];
          if (original.uid === null) {
            // Originally a guest
            if (slot.selected) {
              // Changed to proper user account
              updatedPlayers[slot.index] = { uid: slot.selected.uid, guestName: null };
            } else {
              // Not changed to a registered user
              if (slot.input.trim() !== (original.guestName || "")) {
                setError(t("newGame.errorGuestUpgradeOnly"));
                return;
              }
              // Unchanged
              updatedPlayers[slot.index] = original;
            }
          }
        }

        // Validate duplicate registered players
        const uids = updatedPlayers.map((p) => p.uid).filter(Boolean);
        const uniqueUids = new Set(uids);
        if (uniqueUids.size !== uids.length) {
          setError(t("newGame.errorDuplicatePlayer"));
          return;
        }

        // Validate duplicate names (registered and guest names, case-insensitive)
        const finalNames: string[] = [];
        // Player 1 name:
        finalNames.push(player1 ? player1.displayName : (profile?.displayName || "You"));
        // Players 2, 3, 4:
        const selectedState = [player2, player3, player4];
        for (let i = 1; i <= 3; i++) {
          const p = updatedPlayers[i];
          if (p.uid) {
            const stateOpt = selectedState[i - 1];
            finalNames.push(stateOpt?.displayName || "Player");
          } else {
            finalNames.push(p.guestName || "");
          }
        }

        const cleanedNames = finalNames.map((n) => n.trim().toLowerCase());
        const uniqueNames = new Set(cleanedNames);
        if (uniqueNames.size !== cleanedNames.length) {
          setError(t("newGame.errorDuplicatePlayer"));
          return;
        }

        setError(null);
        if (onUpdateGame) {
          onUpdateGame(isPrivate, tag.trim(), note.trim(), updatedPlayers);
        }
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
    setTag("");
    setTagInput("");
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
    options: RegisteredPlayer[],
    disabled: boolean = false,
  ) => {
    const filteredOptions = getSelectablePlayers(options, n);
    return (
      <Autocomplete
        id={`player${n}-input`}
        options={filteredOptions}
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
            if (n < 4 && !editMode) {
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
              <Typography sx={{ ...sx.avatarListFont }}>
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
            onFocus={() => {
              if (editMode && !disabled) {
                onInputChange("");
              }
            }}
            onBlur={() => {
              if (editMode && !disabled && game) {
                setTimeout(() => {
                  const currentSelected =
                    n === 2 ? player2Ref.current :
                      n === 3 ? player3Ref.current :
                        player4Ref.current;

                  if (currentSelected === null) {
                    onInputChange(game.players[n - 1].guestName || "");
                  }
                }, 150);
              }
            }}
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

  const p1 = player1 || currentUserPlayer;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ px: 2, py: 2 }}>{editMode ? t("newGame.editTitle") : t("newGame.title")}</DialogTitle>
      <DialogContent sx={{ px: 2, py: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {/* Team 1 header */}
          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            {t("game.team1")}
          </Typography>

          {/* Player 1 — creator / current user (read-only) */}
          {renderPlayerPicker(
            1,
            p1,
            p1 ? `${p1.avatar} ${p1.displayName}` : "",
            () => { },
            () => { },
            [],
            true,
          )}

          {/* Player 2 */}
          {renderPlayerPicker(
            2,
            player2,
            player2Input,
            setPlayer2,
            setPlayer2Input,
            player2Input.trim() === "" ? recentOpponents : player2Options,
            editMode ? (game ? game.players[1].uid !== null : true) : false,
          )}

          {/* Team 2 header */}
          <Typography
            variant="subtitle2"
            color="text.secondary"
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
            player3Input.trim() === "" ? recentOpponents : player3Options,
            editMode ? (game ? game.players[2].uid !== null : true) : false,
          )}

          {/* Player 4 */}
          {renderPlayerPicker(
            4,
            player4,
            player4Input,
            setPlayer4,
            setPlayer4Input,
            player4Input.trim() === "" ? recentOpponents : player4Options,
            editMode ? (game ? game.players[3].uid !== null : true) : false,
          )}

          {/* Privacy setting */}
          <FormControl component="fieldset" variant="standard" sx={{ ml: 1.5 }}>
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
                  <Typography variant="body2" >
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
          <Autocomplete
            freeSolo
            id="game-tag-input"
            options={availableTags}
            value={tag}
            inputValue={tagInput}
            onChange={(_, newVal) => {
              if (typeof newVal === "string") {
                setTag(newVal);
              } else if (newVal === null) {
                setTag("");
              }
            }}
            onInputChange={(_, newInput, reason) => {
              if (reason !== "reset" && newInput.length <= 12) {
                setTag(newInput);
                setTagInput(newInput);
              }
            }}
            size="small"
            fullWidth
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("newGame.tagLabel")}
                placeholder={t("newGame.tagPlaceholder")}
              />
            )}
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
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 2 }}>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button id="create-game-btn" variant="contained" onClick={handleStartOrSave}>
          {editMode ? t("common.save") : t("newGame.start")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewGameDialog;

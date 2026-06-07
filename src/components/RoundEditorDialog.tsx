import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Dialog from "@mui/material/Dialog";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Slider from "@mui/material/Slider";
import Slide from "@mui/material/Slide";
import DeleteIcon from "@mui/icons-material/Delete";
import type { TransitionProps } from "@mui/material/transitions";

import { useAuth } from "../contexts/AuthContext";
import { calculateRoundScore } from "../types/game";
import type { Game, Round, PlayerSlot } from "../types/game";
import type { PlayerNameResolver } from "../utils/playerName";
import { DateFormatter } from "../utils/date";
import * as sx from "../styles/commonStyles";
import { permutePlayerArray } from "../utils/playerPermutation";

const SlideUp = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function fmtScore(n: number): string {
  return String(n);
}

interface RoundEditorDialogProps {
  open: boolean;
  onClose: () => void;
  game: Game;
  rounds: Round[];
  editingRound: Round | null;
  playerProfiles: Map<string, PlayerNameResolver>;
  onSave: (data: Omit<Round, "id" | "createdAt">) => Promise<void>;
  onDeleteClick: () => void;
}

const RoundEditorDialog = ({
  open,
  onClose,
  game,
  rounds,
  editingRound,
  playerProfiles,
  onSave,
  onDeleteClick,
}: RoundEditorDialogProps) => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();

  // Internal editor states
  const [tichuCalls, setTichuCalls] = useState<number[]>([]);
  const [grandTichuCalls, setGrandTichuCalls] = useState<number[]>([]);
  const [finishedFirst, setFinishedFirst] = useState(0);
  const [oneTwoVictory, setOneTwoVictory] = useState(0);
  const [team1CardPoints, setTeam1CardPoints] = useState(50);
  const [roundNote, setRoundNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync / prefill state when dialog opens or editingRound changes
  useEffect(() => {
    if (open) {
      if (editingRound) {
        setTichuCalls([...editingRound.tichuCalls]);
        setGrandTichuCalls([...editingRound.grandTichuCalls]);
        setFinishedFirst(editingRound.finishedFirst);
        setOneTwoVictory(editingRound.oneTwoVictory);
        setTeam1CardPoints(editingRound.team1CardPoints);
        setRoundNote(editingRound.note || "");
        setValidationError(null);
      } else {
        setTichuCalls([]);
        setGrandTichuCalls([]);
        setFinishedFirst(0);
        setOneTwoVictory(0);
        setTeam1CardPoints(50);
        setRoundNote("");
        setValidationError(null);
      }
    }
  }, [open, editingRound]);

  const getPlayerDetails = (slot: PlayerSlot) => {
    const isCurrentUser = slot.uid === user?.uid;
    let displayName = slot.guestName || "Player";
    let avatar = "🐰";

    if (isCurrentUser && profile) {
      displayName = profile.displayName;
      avatar = profile.avatar || "🐉";
    } else if (slot.uid) {
      const cached = playerProfiles.get(slot.uid);
      if (cached) {
        displayName = cached.displayName;
        avatar = cached.avatar || "🐰";
      }
    }
    return { displayName, avatar };
  };

  const loggedInIndex = game.players.findIndex((player) => player.uid === user?.uid);
  const leftTeam = loggedInIndex !== -1 && loggedInIndex >= 2 ? 2 : 1;
  const rightTeam = loggedInIndex !== -1 && loggedInIndex >= 2 ? 1 : 2;

  const originalPlayerAvatars = game.players.map(
    (slot) => getPlayerDetails(slot).avatar,
  );
  const playerAvatars = loggedInIndex !== -1
    ? permutePlayerArray(originalPlayerAvatars, loggedInIndex)
    : originalPlayerAvatars;

  const toggleTichu = (playerNum: number) => {
    const isSelecting = !tichuCalls.includes(playerNum);
    if (isSelecting && finishedFirst === 0) {
      setFinishedFirst(playerNum);
      const isTeam1 = playerNum <= 2;
      setOneTwoVictory((prevOneTwo) =>
        prevOneTwo === (isTeam1 ? 2 : 1) ? 0 : prevOneTwo,
      );
    }
    setTichuCalls((prev) =>
      prev.includes(playerNum)
        ? prev.filter((n) => n !== playerNum)
        : [...prev, playerNum],
    );
    setGrandTichuCalls((prev) => prev.filter((n) => n !== playerNum));
    setValidationError(null);
  };

  const toggleGrandTichu = (playerNum: number) => {
    const isSelecting = !grandTichuCalls.includes(playerNum);
    if (isSelecting && finishedFirst === 0) {
      setFinishedFirst(playerNum);
      const isTeam1 = playerNum <= 2;
      setOneTwoVictory((prevOneTwo) =>
        prevOneTwo === (isTeam1 ? 2 : 1) ? 0 : prevOneTwo,
      );
    }
    setGrandTichuCalls((prev) =>
      prev.includes(playerNum)
        ? prev.filter((n) => n !== playerNum)
        : [...prev, playerNum],
    );
    setTichuCalls((prev) => prev.filter((n) => n !== playerNum));
    setValidationError(null);
  };

  const toggleFinishedFirst = (playerNum: number) => {
    setFinishedFirst((prev) => {
      const next = prev === playerNum ? 0 : playerNum;
      if (next !== 0) {
        const isTeam1 = next <= 2;
        if (isTeam1) {
          setOneTwoVictory((prevOneTwo) => (prevOneTwo === 2 ? 0 : prevOneTwo));
        } else {
          setOneTwoVictory((prevOneTwo) => (prevOneTwo === 1 ? 0 : prevOneTwo));
        }
      }
      return next;
    });
    setValidationError(null);
  };

  const toggleOneTwoVictory = (team: number) => {
    setOneTwoVictory((prev) => {
      const next = prev === team ? 0 : team;
      if (next === 1) {
        setFinishedFirst((first) => (first === 3 || first === 4 ? 0 : first));
      } else if (next === 2) {
        setFinishedFirst((first) => (first === 1 || first === 2 ? 0 : first));
      }
      return next;
    });
  };

  const buildRoundData = (): Omit<Round, "id" | "createdAt"> => ({
    roundNumber: editingRound ? editingRound.roundNumber : rounds.length + 1,
    team1CardPoints: oneTwoVictory > 0 ? 0 : team1CardPoints,
    team2CardPoints: oneTwoVictory > 0 ? 0 : 100 - team1CardPoints,
    tichuCalls,
    grandTichuCalls,
    oneTwoVictory,
    finishedFirst,
    note: roundNote.trim() || undefined,
  });

  const previewScore = calculateRoundScore(buildRoundData() as Round);

  const validate = (): boolean => {
    if (
      (tichuCalls.length > 0 || grandTichuCalls.length > 0) &&
      finishedFirst === 0
    ) {
      setValidationError(t("game.validationFirstRequired"));
      return false;
    }
    return true;
  };

  const handleSaveClick = async () => {
    if (!validate()) return;
    const data = buildRoundData();
    await onSave(data);
  };

  const renderPlayerCardInDialog = (playerIndex: number) => {
    const pn = playerIndex + 1;
    const isTeam1Layout = loggedInIndex !== -1 ? ((playerIndex ^ loggedInIndex) < 2) : (pn <= 2);
    const { displayName, avatar } = getPlayerDetails(game.players[playerIndex]);
    return (
      <Card elevation={2} key={`player-dialog-${pn}`} sx={sx.playerCard(isTeam1Layout)}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: isTeam1Layout ? "flex-start" : "flex-end",
            gap: 0.75,
            mb: 1,
          }}
        >
          {!isTeam1Layout && (
            <Typography
              variant="subtitle2"
              sx={{ ...(sx.playerNameLarge as any), mb: 0, textAlign: "right" }}
              noWrap
            >
              {displayName}
            </Typography>
          )}
          <Typography
            variant="subtitle2"
            sx={sx.lgEmojiNoneFont}
          >
            {avatar}
          </Typography>
          {isTeam1Layout && (
            <Typography
              variant="subtitle2"
              sx={{ ...(sx.playerNameLarge as any), mb: 0, textAlign: "left" }}
              noWrap
            >
              {displayName}
            </Typography>
          )}
        </Box>
        <Box
          sx={{ display: "flex", justifyContent: "space-between", gap: 0.5 }}
        >
          <Chip
            label={t("game.first")}
            color={finishedFirst === pn ? "success" : "default"}
            variant={finishedFirst === pn ? "filled" : "outlined"}
            onClick={() => toggleFinishedFirst(pn)}
            sx={{
              flex: 1,
              minWidth: 44,
              "& .MuiChip-label": { px: 0.5 },
            }}
          />
          <Chip
            label={t("game.tichu")}
            color={
              tichuCalls.includes(pn)
                ? finishedFirst === pn
                  ? "success"
                  : "error"
                : "default"
            }
            variant={tichuCalls.includes(pn) ? "filled" : "outlined"}
            onClick={() => toggleTichu(pn)}
            sx={{
              flex: 1,
              minWidth: 44,
              "& .MuiChip-label": { px: 0.5 },
            }}
          />
          <Chip
            label={t("game.grandTichu")}
            color={
              grandTichuCalls.includes(pn)
                ? finishedFirst === pn
                  ? "success"
                  : "error"
                : "default"
            }
            variant={grandTichuCalls.includes(pn) ? "filled" : "outlined"}
            onClick={() => toggleGrandTichu(pn)}
            sx={{
              flex: 1,
              minWidth: 44,
              "& .MuiChip-label": { px: 0.5 },
            }}
          />
        </Box>
      </Card>
    );
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      slots={{ transition: SlideUp }}
    >
      <AppBar
        sx={{
          position: "relative",
          borderBottom: "none",
          pt: "env(safe-area-inset-top)",
          pb: 0,
        }}
        color="default"
        elevation={0}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1.5,
          }}
        >
          <Typography
            sx={{ ...sx.avatarListFont }}
            variant="h6"
          >
            {t("game.round")}{" "}
            {editingRound
              ? rounds.findIndex((r) => r.id === editingRound.id) + 1
              : rounds.length + 1}
          </Typography>
          <Typography
            sx={{
              ...(sx.timestampFont as any),
              color: "text.secondary",
              textAlign: "right",
              whiteSpace: "pre-line",
            }}
          >
            {DateFormatter.formatDateTime(
              editingRound ? new Date(editingRound.createdAt) : new Date(),
              i18n.language
            )}
          </Typography>
        </Box>
      </AppBar>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "auto",
          p: 2,
          pb: "calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        {/* TOP: Player cards + 1-2 Victory + Slider */}
        <Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              mb: 1.5,
            }}
          >
            {renderPlayerCardInDialog(loggedInIndex !== -1 ? (0 ^ loggedInIndex) : 0)}
            {renderPlayerCardInDialog(loggedInIndex !== -1 ? (2 ^ loggedInIndex) : 2)}
            {renderPlayerCardInDialog(loggedInIndex !== -1 ? (1 ^ loggedInIndex) : 1)}
            {renderPlayerCardInDialog(loggedInIndex !== -1 ? (3 ^ loggedInIndex) : 3)}
            <Card elevation={2} sx={{ p: 1, display: "flex" }}>
              <Chip
                label={`${playerAvatars[0]} ${playerAvatars[1]}  ${t("game.oneTwoVictory")}`}
                color={oneTwoVictory === leftTeam ? "primary" : "default"}
                variant={oneTwoVictory === leftTeam ? "filled" : "outlined"}
                onClick={() => toggleOneTwoVictory(leftTeam)}
                sx={{ flex: 1 }}
              />
            </Card>
            <Card elevation={2} sx={{ p: 1, display: "flex" }}>
              <Chip
                label={`${playerAvatars[2]} ${playerAvatars[3]}  ${t("game.oneTwoVictory")}`}
                color={oneTwoVictory === rightTeam ? "primary" : "default"}
                variant={oneTwoVictory === rightTeam ? "filled" : "outlined"}
                onClick={() => toggleOneTwoVictory(rightTeam)}
                sx={{ flex: 1 }}
              />
            </Card>
          </Box>
          {validationError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {validationError}
            </Alert>
          )}
          {oneTwoVictory === 0 && (
            <Card elevation={2} sx={{ p: 1, display: "block" }}>
              <Typography
                variant="caption"
                sx={{
                  mb: 0.5,
                  display: "block",
                  textAlign: "center",
                  ...sx.avatarListFont as any,
                }}
              >
                {t("game.cardPoints")}
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    ...(sx.scoreFont as any),
                    minWidth: 32,
                    textAlign: "right",
                    ...(sx.avatarListFont as any),
                  }}
                >
                  {leftTeam === 1 ? team1CardPoints : 100 - team1CardPoints}
                </Typography>
                <Slider
                  id="card-points-slider"
                  value={leftTeam === 1 ? team1CardPoints : 100 - team1CardPoints}
                  onChange={(_, v) => setTeam1CardPoints(leftTeam === 1 ? (v as number) : 100 - (v as number))}
                  min={-25}
                  max={125}
                  step={5}
                />
                <Typography
                  variant="body2"
                  sx={{
                    ...(sx.scoreFont as any),
                    minWidth: 32,
                    ...(sx.avatarListFont as any),
                  }}
                >
                  {leftTeam === 1 ? 100 - team1CardPoints : team1CardPoints}
                </Typography>
              </Box>
            </Card>
          )}
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* BOTTOM: Note, Preview, Save/Cancel */}
        <Box>
          <TextField
            id="round-note-input"
            label={t("game.noteLabel")}
            value={roundNote}
            onChange={(e) => setRoundNote(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
          <Card elevation={2} sx={{ p: 2, mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 1,
              }}
            >
              <Typography
                variant="h5"
                sx={{ ...sx.largeScoreFont }}
              >
                {fmtScore(leftTeam === 1 ? previewScore.team1 : previewScore.team2)} : {fmtScore(leftTeam === 1 ? previewScore.team2 : previewScore.team1)}
              </Typography>
            </Box>
          </Card>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button
              id="save-round-btn"
              variant="contained"
              size="large"
              onClick={handleSaveClick}
              sx={{ flex: 1 }}
            >
              {t("common.save")}
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={onClose}
              sx={{ px: 3, whiteSpace: "nowrap" }}
            >
              {t("common.cancel")}
            </Button>
            {editingRound && (
              <IconButton
                color="error"
                onClick={onDeleteClick}
                sx={{
                  "&:hover": {
                    color: "error.main",
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>
    </Dialog >
  );
};

export default RoundEditorDialog;

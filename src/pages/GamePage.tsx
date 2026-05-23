import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Slider from "@mui/material/Slider";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Slide from "@mui/material/Slide";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LockIcon from "@mui/icons-material/Lock";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchGame,
  fetchRounds,
  addRound,
  deleteRound,
  updateRound,
  updateGameStatus,
  createGame,
  deleteGame,
} from "../services/gameService";
import {
  calculateRoundScore,
  calculateTotals,
  checkWinner,
} from "../types/game";
import type { Game, Round, PlayerSlot } from "../types/game";
import NewGameDialog from "../components/NewGameDialog";
import type { PlayerNameResolver } from "../utils/playerName";
import { fetchPlayers } from "../services/playerService";
import * as sx from "../styles/commonStyles";
import { fonts, shape } from "../styles/tokens";
import type { TransitionProps } from "@mui/material/transitions";
import React from "react";

const SlideUp = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/** Format date as DD.MM.YY HH:MM */
function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Format date as DD.MM. */
function fmtDatePart(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
}

/** Format time as HH:MM */
function fmtTimePart(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Format score number: no prefix for positive, - for negative */
function fmtScore(n: number): string {
  return String(n);
}

/** Shown when /game is visited with no game ID — auto-opens new game dialog */
function NoGameFallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateGame = async (
    players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot],
    isPrivate?: boolean,
  ) => {
    if (!user) return;
    const gameId = await createGame(user.uid, players, isPrivate);
    localStorage.setItem("lastGameId", gameId);
    navigate(`/game/${gameId}`, { replace: true });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        px: 3,
      }}
    >
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t("game.selectGame")}
      </Typography>
      <NewGameDialog
        open={true}
        onClose={() => navigate("/")}
        onCreateGame={handleCreateGame}
      />
    </Box>
  );
}

const GamePage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [game, setGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  // Game Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(event.currentTarget);
  };
  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const confirmDeleteGame = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteGame = async () => {
    if (!game) return;
    try {
      await deleteGame(game.id);
      setDeleteDialogOpen(false);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Failed to delete game:", err);
      setSnackbar({
        open: true,
        message: t("game.errorDeleteRound"),
        severity: "error",
      });
    }
  };
  const [playerProfiles, setPlayerProfiles] = useState<
    Map<string, PlayerNameResolver>
  >(new Map());

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null); // null = new round
  const [tichuCalls, setTichuCalls] = useState<number[]>([]);
  const [grandTichuCalls, setGrandTichuCalls] = useState<number[]>([]);
  const [finishedFirst, setFinishedFirst] = useState(0);
  const [oneTwoVictory, setOneTwoVictory] = useState(0);
  const [team1CardPoints, setTeam1CardPoints] = useState(50);
  const [roundNote, setRoundNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  const updateShadows = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const hasScrolledDown = scrollTop > 0;
      const hasMoreToScroll = scrollTop + clientHeight < scrollHeight - 1;

      setShowTopShadow(hasScrolledDown);
      setShowBottomShadow(hasMoreToScroll);
    }
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;

    updateShadows();

    const observer = new ResizeObserver(() => {
      updateShadows();
    });

    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [loading, updateShadows]);

  const getPlayerDetails = useCallback(
    (slot: PlayerSlot) => {
      const isCurrentUser = slot.uid === user?.uid;
      let displayName = slot.guestName || "Player";
      let avatar = "🐰"; // Default guest avatar

      if (isCurrentUser && profile) {
        displayName = profile.displayName;
        avatar = profile.avatar || "🐉";
      } else if (slot.uid) {
        const cached = playerProfiles.get(slot.uid);
        if (cached) {
          displayName = cached.displayName;
          avatar = cached.avatar || "🐰";
        } else {
          displayName = t("common.deleted");
          avatar = "👻";
        }
      }
      return { displayName, avatar };
    },
    [user, profile, playerProfiles, t],
  );

  const loadGame = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [g, r] = await Promise.all([fetchGame(id), fetchRounds(id)]);
      setGame(g);
      setRounds(r);
      // Fetch profiles for registered players in this game
      if (g) {
        const uids = g.players.map((p) => p.uid).filter((uid): uid is string => uid !== null);
        const players = await fetchPlayers(uids);
        const profileMap = new Map<string, PlayerNameResolver>();
        for (const p of players) {
          profileMap.set(p.uid, {
            displayName: p.displayName,
            avatar: p.avatar,
          });
        }
        setPlayerProfiles(profileMap);
      }
    } catch (err) {
      console.error("Failed to load game:", err);
      setSnackbar({
        open: true,
        message: t("game.errorLoadGame"),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  if (!id) return <NoGameFallback />;
  if (loading)
    return (
      <Box sx={sx.centered}>
        <CircularProgress />
      </Box>
    );
  if (!game)
    return (
      <Box sx={{ ...sx.centered, px: 3 }}>
        <Typography color="text.secondary">{t("game.gameNotFound")}</Typography>
      </Box>
    );

  const totals = calculateTotals(rounds);
  const winner = checkWinner(totals);
  const isGameOver = winner !== 0 || game.status === "finished";
  const playerAvatars = game.players.map(
    (slot) => getPlayerDetails(slot).avatar,
  );

  // --- Editor logic ---
  const resetEditor = () => {
    setTichuCalls([]);
    setGrandTichuCalls([]);
    setFinishedFirst(0);
    setOneTwoVictory(0);
    setTeam1CardPoints(50);
    setRoundNote("");
    setValidationError(null);
    setEditingRound(null);
  };

  const openNewRound = async () => {
    if (id) {
      try {
        const [g, r] = await Promise.all([fetchGame(id), fetchRounds(id)]);
        if (g) setGame(g);
        setRounds(r);
      } catch (err) {
        console.error("Failed to sync before adding round:", err);
      }
    }
    resetEditor();
    setEditorOpen(true);
  };

  const openEditRound = async (round: Round) => {
    if (id) {
      try {
        const [g, r] = await Promise.all([fetchGame(id), fetchRounds(id)]);
        if (g) setGame(g);
        setRounds(r);

        const syncedRound = r.find((refRound) => refRound.id === round.id);
        const roundToEdit = syncedRound || round;

        setEditingRound(roundToEdit);
        setTichuCalls([...roundToEdit.tichuCalls]);
        setGrandTichuCalls([...roundToEdit.grandTichuCalls]);
        setFinishedFirst(roundToEdit.finishedFirst);
        setOneTwoVictory(roundToEdit.oneTwoVictory);
        setTeam1CardPoints(roundToEdit.team1CardPoints);
        setRoundNote(roundToEdit.note || "");
        setValidationError(null);
        setEditorOpen(true);
      } catch (err) {
        console.error("Failed to sync before editing round:", err);
        setEditingRound(round);
        setTichuCalls([...round.tichuCalls]);
        setGrandTichuCalls([...round.grandTichuCalls]);
        setFinishedFirst(round.finishedFirst);
        setOneTwoVictory(round.oneTwoVictory);
        setTeam1CardPoints(round.team1CardPoints);
        setRoundNote(round.note || "");
        setValidationError(null);
        setEditorOpen(true);
      }
    }
  };

  const closeEditor = () => setEditorOpen(false);

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
    // Mutual exclusion: deselect Grand Tichu for same player
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
    // Mutual exclusion: deselect Tichu for same player
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

  const handleSaveRound = async () => {
    if (!id || !validate()) return;
    const data = buildRoundData();

    try {
      let newRounds: Round[];
      if (editingRound) {
        await updateRound(id, editingRound.id, data);
        newRounds = rounds.map((r) =>
          r.id === editingRound.id ? { ...r, ...data } : r,
        );
      } else {
        const roundId = await addRound(id, data);
        newRounds = [
          ...rounds,
          { ...data, id: roundId, createdAt: new Date() },
        ];
      }
      setRounds(newRounds);
      closeEditor();

      const newTotals = calculateTotals(newRounds);
      const w = checkWinner(newTotals);
      if (w !== 0 && game.status !== "finished") {
        await updateGameStatus(id, "finished");
        setGame((prev) => (prev ? { ...prev, status: "finished" } : prev));
      } else if (w === 0 && game.status === "finished") {
        await updateGameStatus(id, "active");
        setGame((prev) => (prev ? { ...prev, status: "active" } : prev));
      }
    } catch (err) {
      console.error("Failed to save round:", err);
      setSnackbar({
        open: true,
        message: t("game.errorAddRound"),
        severity: "error",
      });
    }
  };

  const handleDeleteClick = async () => {
    if (!id || !editingRound) return;
    try {
      await deleteRound(id, editingRound.id);
      const newRounds = rounds.filter((r) => r.id !== editingRound.id);
      setRounds(newRounds);
      closeEditor();
      const newTotals = calculateTotals(newRounds);
      const w = checkWinner(newTotals);
      if (w !== 0 && game.status !== "finished") {
        await updateGameStatus(id, "finished");
        setGame((prev) => (prev ? { ...prev, status: "finished" } : prev));
      } else if (w === 0 && game.status === "finished") {
        await updateGameStatus(id, "active");
        setGame((prev) => (prev ? { ...prev, status: "active" } : prev));
      }
    } catch (err) {
      console.error("Failed to delete round:", err);
      setSnackbar({
        open: true,
        message: t("game.errorDeleteRound"),
        severity: "error",
      });
    }
  };

  const renderPlayerCard = (playerIndex: number) => {
    const pn = playerIndex + 1;
    const isTeam1 = pn <= 2;
    const { displayName, avatar } = getPlayerDetails(game.players[playerIndex]);
    return (
      <Card key={`player-${pn}`} sx={sx.playerCard(isTeam1)}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: isTeam1 ? "flex-start" : "flex-end",
            gap: 0.75,
            mb: 1,
          }}
        >
          {!isTeam1 && (
            <Typography
              variant="subtitle2"
              sx={{
                ...sx.playerName,
                mb: 0,
                fontSize: "1.2rem",
                textAlign: "right",
              }}
              noWrap
            >
              {displayName}
            </Typography>
          )}
          <Typography
            variant="subtitle2"
            sx={{ fontSize: "1.45rem", lineHeight: 1 }}
          >
            {avatar}
          </Typography>
          {isTeam1 && (
            <Typography
              variant="subtitle2"
              sx={{ ...sx.playerName, mb: 0, fontSize: "1.2rem" }}
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
            size="small"
            color={finishedFirst === pn ? "success" : "default"}
            variant={finishedFirst === pn ? "filled" : "outlined"}
            onClick={() => toggleFinishedFirst(pn)}
            sx={{
              ...sx.editorChip,
              flex: 1,
              minWidth: 44,
              "& .MuiChip-label": { px: 0.5 },
            }}
          />
          <Chip
            label={t("game.tichu")}
            size="small"
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
              ...sx.editorChip,
              flex: 1,
              minWidth: 44,
              "& .MuiChip-label": { px: 0.5 },
            }}
          />
          <Chip
            label={t("game.grandTichu")}
            size="small"
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
              ...sx.editorChip,
              flex: 1,
              minWidth: 44,
              "& .MuiChip-label": { px: 0.5 },
            }}
          />
        </Box>
      </Card>
    );
  };

  // ==================== RENDER ====================
  const p1 = getPlayerDetails(game.players[0]);
  const p2 = getPlayerDetails(game.players[1]);
  const p3 = getPlayerDetails(game.players[2]);
  const p4 = getPlayerDetails(game.players[3]);

  // Determine game status/outcome relative to current user
  const isUserInTeam1 =
    game.players[0].uid === user?.uid || game.players[1].uid === user?.uid;
  const isUserInTeam2 =
    game.players[2].uid === user?.uid || game.players[3].uid === user?.uid;
  const isTeam1Winner = totals.team1 > totals.team2;
  const isTeam2Winner = totals.team2 > totals.team1;

  let gameResult: "active" | "won" | "lost" | "finished" = "active";
  if (game.status === "active") {
    gameResult = "active";
  } else if (isUserInTeam1) {
    gameResult = isTeam1Winner ? "won" : "lost";
  } else if (isUserInTeam2) {
    gameResult = isTeam2Winner ? "won" : "lost";
  } else {
    gameResult = "finished";
  }

  const getLabelColor = () => {
    if (gameResult === "active") return "warning.main";
    if (gameResult === "won") return "success.main";
    if (gameResult === "lost") return "error.main";
    return "text.disabled";
  };

  const getLabelText = () => {
    if (gameResult === "active") return t("home.active");
    if (gameResult === "won") return t("home.won");
    if (gameResult === "lost") return t("home.lost");
    return t("home.finished");
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Game Card Header (mostly identical to HomePage game card) */}
      <Box sx={sx.dynamicHeader(showTopShadow)}>
        <Card
          sx={{
            position: "relative",
            bgcolor: (theme) => {
              if (gameResult === "active") {
                return theme.palette.mode === "dark"
                  ? "rgba(245, 158, 11, 0.08)"
                  : "#FFFDF0";
              } else if (gameResult === "won") {
                return theme.palette.mode === "dark"
                  ? "rgba(34, 197, 94, 0.08)"
                  : "#F0FDF4";
              } else if (gameResult === "lost") {
                return theme.palette.mode === "dark"
                  ? "rgba(239, 68, 68, 0.08)"
                  : "#FEF2F2";
              } else {
                return theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.02)"
                  : "#F9FAFB";
              }
            },
            border: 1,
            borderColor: (theme) => {
              if (gameResult === "active") {
                return theme.palette.mode === "dark"
                  ? "rgba(245, 158, 11, 0.25)"
                  : "#FEF3C7";
              } else if (gameResult === "won") {
                return theme.palette.mode === "dark"
                  ? "rgba(34, 197, 94, 0.25)"
                  : "#DCFCE7";
              } else if (gameResult === "lost") {
                return theme.palette.mode === "dark"
                  ? "rgba(239, 68, 68, 0.25)"
                  : "#FEE2E2";
              } else {
                return theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.05)"
                  : "#E5E7EB";
              }
            },
            borderRadius: `${shape.borderRadius}px`,
            boxShadow:
              gameResult === "active"
                ? (theme) =>
                    theme.palette.mode === "dark"
                      ? "0 4px 20px rgba(245, 158, 11, 0.1)"
                      : "0 4px 14px rgba(245, 158, 11, 0.08)"
                : gameResult === "won"
                  ? (theme) =>
                      theme.palette.mode === "dark"
                        ? "0 4px 20px rgba(34, 197, 94, 0.1)"
                        : "0 4px 14px rgba(34, 197, 94, 0.08)"
                  : "none",
          }}
        >
          <CardActionArea
            onClick={loadGame}
            sx={{
              color: "inherit",
              display: "block",
              textAlign: "inherit",
              "&:hover": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(0, 0, 0, 0.02)",
              },
            }}
          >
            <Box sx={{ py: 1.5, px: 2 }}>
              {/* Status, timestamp, and refresh button */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: getLabelColor(),
                    }}
                  >
                    {getLabelText()}
                  </Typography>
                  {game.isPrivate && (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.25,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.08)"
                            : "rgba(0, 0, 0, 0.05)",
                        px: 0.75,
                        py: 0.25,
                        borderRadius: "4px",
                        color: "text.secondary",
                      }}
                    >
                      <LockIcon sx={{ fontSize: "0.75rem" }} />
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          lineHeight: 1,
                        }}
                      >
                        {t("game.private")}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {fmtDate(game.createdAt)}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      p: 0.25,
                      opacity: 0.6,
                    }}
                  >
                    <RefreshIcon sx={{ fontSize: "0.9rem" }} />
                  </Box>
                </Box>
              </Box>

              {/* Teams and score */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                {/* Team 1: 2 lines with avatars */}
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "1rem",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {p1.avatar}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, minWidth: 0 }}
                      noWrap
                    >
                      {p1.displayName}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "1rem",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {p2.avatar}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, minWidth: 0 }}
                      noWrap
                    >
                      {p2.displayName}
                    </Typography>
                  </Box>
                </Box>

                {/* Large Score */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    px: 0.5,
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      lineHeight: 1,
                      flex: 1,
                      minWidth: "90px",
                      textAlign: "right",
                      pr: 0.75,
                    }}
                  >
                    {totals.team1}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      lineHeight: 1,
                      color: "text.secondary",
                      flexShrink: 0,
                      textAlign: "center",
                      width: "12px",
                    }}
                  >
                    :
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      lineHeight: 1,
                      flex: 1,
                      minWidth: "90px",
                      textAlign: "left",
                      pl: 0.75,
                    }}
                  >
                    {totals.team2}
                  </Typography>
                </Box>

                {/* Team 2: 2 lines with avatars (aligned right) */}
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                    alignItems: "flex-end",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      justifyContent: "flex-end",
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, minWidth: 0 }}
                      noWrap
                    >
                      {p3.displayName}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "1rem",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {p3.avatar}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      justifyContent: "flex-end",
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, minWidth: 0 }}
                      noWrap
                    >
                      {p4.displayName}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "1rem",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {p4.avatar}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </CardActionArea>
        </Card>
      </Box>

      {/* Round history */}
      <Box
        ref={scrollRef}
        onScroll={updateShadows}
        sx={{
          flex: 1,
          overflow: "auto",
          px: 2,
          py: 1.5,
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, fontWeight: 600, pl: "12px" }}
        >
          {rounds.length > 4
            ? `${rounds.length} ${t("game.roundHistory")}`
            : t("game.roundHistory")}
        </Typography>

        {rounds.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 2 }}
          >
            {t("game.noRounds")}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 2 }}>
            {[...rounds].reverse().map((round) => {
              const score = calculateRoundScore(round);

              const getPlayerCallChip = (r: Round, pNum: number) => {
                const isTichu = r.tichuCalls.includes(pNum);
                const isGrand = r.grandTichuCalls.includes(pNum);
                if (!isTichu && !isGrand) return null;
                const success = r.finishedFirst === pNum;
                return (
                  <Chip
                    label={isTichu ? "T" : "GT"}
                    size="small"
                    color={success ? "success" : "error"}
                    sx={sx.historyChip}
                  />
                );
              };

              // Resolve T/GT chips for Team 1 (Player 1, Player 2)
              const p1Chip = getPlayerCallChip(round, 1);
              const p2Chip = getPlayerCallChip(round, 2);

              // Resolve T/GT chips for Team 2 (Player 3, Player 4)
              const p3Chip = getPlayerCallChip(round, 3);
              const p4Chip = getPlayerCallChip(round, 4);

              // Resolve 1-2 victory chips
              const t1VictoryChip =
                round.oneTwoVictory === 1 ? (
                  <Chip
                    label="1-2"
                    size="small"
                    color="primary"
                    sx={sx.historyChip}
                  />
                ) : null;

              const t2VictoryChip =
                round.oneTwoVictory === 2 ? (
                  <Chip
                    label="1-2"
                    size="small"
                    color="primary"
                    sx={sx.historyChip}
                  />
                ) : null;

              return (
                <Card
                  key={round.id}
                  variant="outlined"
                  sx={{ overflow: "visible" }}
                >
                  <CardActionArea
                    onClick={() => openEditRound(round)}
                    sx={{ px: 2, py: 1 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {/* Date & Time Column (DD.MM. top, HH:MM bottom) */}
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          minWidth: 24,
                          mr: 1.5,
                          flex: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            color: "text.disabled",
                            fontWeight: 500,
                            fontSize: "0.72rem",
                            lineHeight: 1.2,
                          }}
                        >
                          {fmtDatePart(new Date(round.createdAt))}
                        </Typography>
                        <Typography
                          sx={{
                            color: "text.disabled",
                            fontWeight: 500,
                            fontSize: "0.72rem",
                            lineHeight: 1.2,
                          }}
                        >
                          {fmtTimePart(new Date(round.createdAt))}
                        </Typography>
                      </Box>

                      {/* Team 1 side: chips + score */}
                      <Box
                        sx={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                        }}
                      >
                        {/* Cell 1: T/GT calls (two stacked rows) */}
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.25,
                            flexShrink: 0,
                          }}
                        >
                          {/* Player 1 Row */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              height: 18,
                            }}
                          >
                            <Typography
                              sx={{ fontSize: "0.95rem", lineHeight: 1 }}
                            >
                              {playerAvatars[0]}
                            </Typography>
                            {p1Chip || <Box sx={{ width: 26, height: 18 }} />}
                          </Box>
                          {/* Player 2 Row */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              height: 18,
                            }}
                          >
                            <Typography
                              sx={{ fontSize: "0.95rem", lineHeight: 1 }}
                            >
                              {playerAvatars[1]}
                            </Typography>
                            {p2Chip || <Box sx={{ width: 26, height: 18 }} />}
                          </Box>
                        </Box>

                        {/* Cell 2: 1-2 chip */}
                        <Box
                          sx={{
                            minWidth: 26,
                            display: "flex",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {t1VictoryChip || (
                            <Box sx={{ width: 26, height: 18 }} />
                          )}
                        </Box>

                        {/* Team 1 Score */}
                        <Typography
                          variant="body2"
                          sx={{
                            ...sx.roundScore("primary"),
                            ml: "auto",
                            minWidth: 40,
                            textAlign: "right",
                          }}
                        >
                          {fmtScore(score.team1)}
                        </Typography>
                      </Box>

                      {/* Center colon */}
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ px: 0.5, fontWeight: 700 }}
                      >
                        :
                      </Typography>

                      {/* Team 2 side: score + chips */}
                      <Box
                        sx={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                        }}
                      >
                        {/* Team 2 Score */}
                        <Typography
                          variant="body2"
                          sx={{
                            ...sx.roundScore("secondary"),
                            mr: "auto",
                            minWidth: 40,
                          }}
                        >
                          {fmtScore(score.team2)}
                        </Typography>

                        {/* Cell 1: 1-2 chip */}
                        <Box
                          sx={{
                            minWidth: 26,
                            display: "flex",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {t2VictoryChip || (
                            <Box sx={{ width: 26, height: 18 }} />
                          )}
                        </Box>

                        {/* Cell 2: T/GT calls (two stacked rows, avatars to the right) */}
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.25,
                            flexShrink: 0,
                          }}
                        >
                          {/* Player 3 Row */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              justifyContent: "flex-end",
                              height: 18,
                            }}
                          >
                            {p3Chip || <Box sx={{ width: 26, height: 18 }} />}
                            <Typography
                              sx={{ fontSize: "0.95rem", lineHeight: 1 }}
                            >
                              {playerAvatars[2]}
                            </Typography>
                          </Box>
                          {/* Player 4 Row */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              justifyContent: "flex-end",
                              height: 18,
                            }}
                          >
                            {p4Chip || <Box sx={{ width: 26, height: 18 }} />}
                            <Typography
                              sx={{ fontSize: "0.95rem", lineHeight: 1 }}
                            >
                              {playerAvatars[3]}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Edit Icon Button for symmetry */}
                      <IconButton
                        size="small"
                        sx={{
                          ml: 1.5,
                          p: 0.25,
                          color: "text.disabled",
                          opacity: 0.6,
                          minWidth: 12,
                          justifyContent: "flex-end",
                          flex: 1,
                        }}
                      >
                        <EditIcon sx={{ fontSize: "0.95rem" }} />
                      </IconButton>
                    </Box>

                    {/* Optional Note Row */}
                    {round.note && (
                      <Box
                        sx={{
                          mt: 0.5,
                          pl: "58px",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ fontSize: "0.8rem", lineHeight: 1 }}
                        >
                          💬
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ ...sx.metaText, fontStyle: "italic" }}
                        >
                          {round.note}
                        </Typography>
                      </Box>
                    )}
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Bottom action block */}
      <Box sx={sx.dynamicBottomBar(showBottomShadow)}>
        {!isGameOver ? (
          <Button
            id="open-round-editor-btn"
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={openNewRound}
            sx={{
              ...sx.ctaButton,
              flex: 1,
            }}
          >
            {t("game.addRound")}
          </Button>
        ) : (
          <Box sx={{ flex: 1 }} />
        )}

        <IconButton
          id="game-options-menu-btn"
          onClick={handleMenuOpen}
          sx={{
            bgcolor: "action.hover",
            border: 1,
            borderColor: "divider",
            borderRadius: `${shape.buttonRadius}px`,
            p: 1.5,
            flexShrink: 0,
            transition: "all 0.15s ease",
            "&:hover": {
              bgcolor: "action.selected",
            },
          }}
        >
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* ========== ROUND EDITOR ========== */}
      <Dialog
        fullScreen
        open={editorOpen}
        onClose={closeEditor}
        slots={{ transition: SlideUp }}
        sx={{
          "& .MuiDialog-paper": {
            maxWidth: 480,
            mx: "auto",
            bgcolor: "background.default",
          },
        }}
      >
        <AppBar
          sx={{
            position: "relative",
            borderBottom: "none",
            pt: "env(safe-area-inset-top)",
          }}
          color="default"
          elevation={0}
        >
          <Toolbar>
            <Box
              sx={{
                flex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 0.5,
              }}
            >
              <Typography
                sx={{ fontWeight: 600, fontSize: "1.2rem" }}
                variant="h6"
              >
                {t("game.round")}{" "}
                {editingRound
                  ? rounds.findIndex((r) => r.id === editingRound.id) + 1
                  : rounds.length + 1}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  fontWeight: 500,
                  textAlign: "right",
                  lineHeight: 1.2,
                  whiteSpace: "pre-line",
                }}
              >
                {(() => {
                  const d = editingRound
                    ? new Date(editingRound.createdAt)
                    : new Date();
                  const pad = (n: number) => String(n).padStart(2, "0");
                  const day = pad(d.getDate());
                  const year = d.getFullYear();
                  const hours = pad(d.getHours());
                  const minutes = pad(d.getMinutes());
                  const locale = i18n.language || "en";
                  const month = d.toLocaleString(locale, { month: "long" });
                  return `${day}. ${month} ${year}\n${hours}:${minutes}`;
                })()}
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "auto",
            px: 2,
            pt: 2,
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
              {renderPlayerCard(0)}
              {renderPlayerCard(2)}
              {renderPlayerCard(1)}
              {renderPlayerCard(3)}
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                mb: 2,
              }}
            >
              <Chip
                label={`${playerAvatars[0]} ${playerAvatars[1]}  ${t("game.oneTwoVictory")}`}
                color={oneTwoVictory === 1 ? "primary" : "default"}
                variant={oneTwoVictory === 1 ? "filled" : "outlined"}
                onClick={() => toggleOneTwoVictory(1)}
                sx={sx.victoryChip}
              />
              <Chip
                label={`${playerAvatars[2]} ${playerAvatars[3]}  ${t("game.oneTwoVictory")}`}
                color={oneTwoVictory === 2 ? "primary" : "default"}
                variant={oneTwoVictory === 2 ? "filled" : "outlined"}
                onClick={() => toggleOneTwoVictory(2)}
                sx={sx.victoryChip}
              />
            </Box>
            {validationError && (
              <Alert
                severity="warning"
                sx={{ mb: 2, fontSize: fonts.size.editorChip }}
              >
                {validationError}
              </Alert>
            )}
            {oneTwoVictory === 0 && (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: fonts.weight.semibold,
                    mb: 0.5,
                    display: "block",
                    fontSize: "1.2rem",
                  }}
                >
                  {t("game.cardPoints")}
                </Typography>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, px: 1 }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      ...sx.roundScore("primary"),
                      minWidth: 32,
                      textAlign: "right",
                      fontSize: "1.2rem",
                    }}
                  >
                    {team1CardPoints}
                  </Typography>
                  <Slider
                    id="card-points-slider"
                    value={100 - team1CardPoints}
                    onChange={(_, v) => setTeam1CardPoints(100 - (v as number))}
                    min={-25}
                    max={125}
                    step={5}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      ...sx.roundScore("secondary"),
                      minWidth: 32,
                      fontSize: "1.2rem",
                    }}
                  >
                    {100 - team1CardPoints}
                  </Typography>
                </Box>
              </>
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
            <Card variant="outlined" sx={sx.previewCard}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{ ...sx.scoreNumber("primary"), fontSize: "1.2rem" }}
                >
                  {fmtScore(previewScore.team1)}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ ...sx.scoreSeparator, fontSize: "1.2rem" }}
                >
                  :
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ ...sx.scoreNumber("secondary"), fontSize: "1.2rem" }}
                >
                  {fmtScore(previewScore.team2)}
                </Typography>
              </Box>
            </Card>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              {editingRound && (
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  fullWidth
                  onClick={handleDeleteClick}
                  sx={{ py: 1.3 }}
                >
                  {t("common.delete")}
                </Button>
              )}
              <Button
                variant="outlined"
                size="large"
                fullWidth
                onClick={closeEditor}
                sx={{ py: 1.3 }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                id="save-round-btn"
                variant="contained"
                size="large"
                fullWidth
                onClick={handleSaveRound}
                sx={{ py: 1.3 }}
              >
                {t("common.save")}
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* Game actions menu */}
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <MenuItem
          onClick={confirmDeleteGame}
          sx={{ color: "error.main", fontWeight: 600 }}
        >
          {t("home.deleteGame")}
        </MenuItem>
      </Menu>

      {/* Delete game confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("home.deleteConfirmTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t("home.deleteConfirm")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteGame}>
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GamePage;

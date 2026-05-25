import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
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
  updateGameMetadata,
} from "../services/gameService";
import {
  calculateTotals,
  checkWinner,
  calculateRoundScore,
} from "../types/game";
import type { Game, Round, PlayerSlot } from "../types/game";
import NewGameDialog from "../components/NewGameDialog";
import RoundEditorDialog from "../components/RoundEditorDialog";
import type { PlayerNameResolver } from "../utils/playerName";
import { fetchPlayers } from "../services/playerService";
import * as sx from "../styles/commonStyles";
import { shape } from "../styles/tokens";

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
    tag?: string,
    note?: string,
  ) => {
    if (!user) return;
    const gameId = await createGame(user.uid, players, isPrivate, tag, note);
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
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [game, setGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editGameDialogOpen, setEditGameDialogOpen] = useState(false);
  const [deleteRoundDialogOpen, setDeleteRoundDialogOpen] = useState(false);

  const confirmDeleteGame = () => {
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

  const handleUpdateGame = async (isPrivate: boolean, tag: string, note: string) => {
    if (!game) return;
    try {
      await updateGameMetadata(game.id, isPrivate, tag, note);
      setEditGameDialogOpen(false);
      // Reload game metadata
      const updatedGame = await fetchGame(game.id);
      if (updatedGame) {
        setGame(updatedGame);
      }
      setSnackbar({
        open: true,
        message: t("game.gameUpdated"),
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to update game settings:", err);
      setSnackbar({
        open: true,
        message: t("game.errorLoadGame"),
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
  const isPlayer = game.players.some((p) => p.uid === user?.uid);
  const playerAvatars = game.players.map(
    (slot) => getPlayerDetails(slot).avatar,
  );

  // --- Editor logic ---
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
    setEditingRound(null);
    setEditorOpen(true);
  };

  const openEditRound = async (round: Round) => {
    if (id) {
      try {
        const [g, r] = await Promise.all([fetchGame(id), fetchRounds(id)]);
        if (g) setGame(g);
        setRounds(r);

        const syncedRound = r.find((refRound) => refRound.id === round.id);
        setEditingRound(syncedRound || round);
        setEditorOpen(true);
      } catch (err) {
        console.error("Failed to sync before editing round:", err);
        setEditingRound(round);
        setEditorOpen(true);
      }
    }
  };

  const closeEditor = () => setEditorOpen(false);

  const handleSaveRound = async (data: Omit<Round, "id" | "createdAt">) => {
    if (!id) return;
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

  const handleDeleteClick = () => {
    setDeleteRoundDialogOpen(true);
  };

  const handleConfirmDeleteRound = async () => {
    if (!id || !editingRound) return;
    try {
      await deleteRound(id, editingRound.id);
      const newRounds = rounds.filter((r) => r.id !== editingRound.id);
      setRounds(newRounds);
      setDeleteRoundDialogOpen(false);
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
      setDeleteRoundDialogOpen(false);
      setSnackbar({
        open: true,
        message: t("game.errorDeleteRound"),
        severity: "error",
      });
    }
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
                      ...sx.uppercaseBadgeFont,
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
                      <LockIcon sx={{ ...sx.smIconFont }} />
                      <Typography
                        variant="caption"
                        sx={sx.cardBadgeFont}
                      >
                        {t("game.private")}
                      </Typography>
                    </Box>
                  )}
                  {game.tag && (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.25,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(147, 51, 234, 0.15)"
                            : "rgba(147, 51, 234, 0.08)",
                        px: 0.75,
                        py: 0.25,
                        borderRadius: "4px",
                        color: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgb(216, 180, 254)"
                            : "rgb(126, 34, 206)",
                      }}
                    >
                      <LocalOfferIcon sx={{ ...sx.smIconFont }} />
                      <Typography
                        variant="caption"
                        sx={sx.cardBadgeFont}
                      >
                        {game.tag}
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
                    <RefreshIcon sx={sx.mdIconFont} />
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
                        ...sx.avatarIconFont,
                        flexShrink: 0,
                      }}
                    >
                      {p1.avatar}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ ...sx.semiboldFont, minWidth: 0 }}
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
                        ...sx.avatarIconFont,
                        flexShrink: 0,
                      }}
                    >
                      {p2.avatar}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ ...sx.semiboldFont, minWidth: 0 }}
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
                      ...sx.largeScoreFont,
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
                      ...sx.largeScoreFont,
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
                      ...sx.largeScoreFont,
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
                      sx={{ ...sx.semiboldFont, minWidth: 0 }}
                      noWrap
                    >
                      {p3.displayName}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        ...sx.avatarIconFont,
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
                      sx={{ ...sx.semiboldFont, minWidth: 0 }}
                      noWrap
                    >
                      {p4.displayName}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        ...sx.avatarIconFont,
                        flexShrink: 0,
                      }}
                    >
                      {p4.avatar}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              {/* Optional Game Note */}
              {game.note && (
                <Box
                  sx={{
                    mt: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ ...sx.metaText, fontStyle: "italic" }}
                  >
                    {game.note}
                  </Typography>
                </Box>
              )}
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
          sx={{ mb: 1, ...sx.semiboldFont, pl: "12px" }}
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
                    onClick={isPlayer ? () => openEditRound(round) : undefined}
                    disabled={!isPlayer}
                    sx={{
                      px: 2,
                      py: 1,
                      cursor: isPlayer ? "pointer" : "default",
                      "&.Mui-disabled": {
                        opacity: 1,
                      },
                    }}
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
                            ...sx.historyTimeFont,
                          }}
                        >
                          {fmtDatePart(new Date(round.createdAt))}
                        </Typography>
                        <Typography
                          sx={{
                            color: "text.disabled",
                            ...sx.historyTimeFont,
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
                              sx={sx.avatarMediumFont}
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
                              sx={sx.avatarMediumFont}
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
                        sx={{ px: 0.5, ...sx.boldFont }}
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
                              sx={sx.avatarMediumFont}
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
                              sx={sx.avatarMediumFont}
                            >
                              {playerAvatars[3]}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Edit Icon Button for symmetry */}
                      {isPlayer && (
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
                          <EditIcon sx={sx.avatarMediumFont} />
                        </IconButton>
                      )}
                    </Box>

                    {/* Optional Note Row */}
                    {round.note && (
                      <Box
                        sx={{
                          mt: 0.5,
                        }}
                      >
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
      {isPlayer && (
        <Box sx={sx.dynamicBottomBar(showBottomShadow)}>
          {!isGameOver ? (
            <>
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
              <IconButton
                id="edit-game-btn"
                onClick={() => setEditGameDialogOpen(true)}
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
                <EditIcon />
              </IconButton>
              <IconButton
                id="delete-game-btn"
                onClick={confirmDeleteGame}
                sx={{
                  bgcolor: "action.hover",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: `${shape.buttonRadius}px`,
                  p: 1.5,
                  flexShrink: 0,
                  color: "error.main",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: "action.selected",
                    color: "error.dark",
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </>
          ) : (
            <>
              <Button
                id="edit-game-btn"
                variant="outlined"
                size="large"
                startIcon={<EditIcon />}
                onClick={() => setEditGameDialogOpen(true)}
                sx={{
                  py: 1.5,
                  borderRadius: `${shape.buttonRadius}px`,
                  flex: 1,
                }}
              >
                {t("common.edit")}
              </Button>
              <Button
                id="delete-game-btn"
                variant="outlined"
                color="error"
                size="large"
                startIcon={<DeleteIcon />}
                onClick={confirmDeleteGame}
                sx={{
                  py: 1.5,
                  borderRadius: `${shape.buttonRadius}px`,
                  flex: 1,
                }}
              >
                {t("common.delete")}
              </Button>
            </>
          )}
        </Box>
      )}

      <RoundEditorDialog
        open={editorOpen}
        onClose={closeEditor}
        game={game}
        rounds={rounds}
        editingRound={editingRound}
        playerProfiles={playerProfiles}
        onSave={handleSaveRound}
        onDeleteClick={handleDeleteClick}
      />



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

      {/* Delete round confirmation dialog */}
      <Dialog
        open={deleteRoundDialogOpen}
        onClose={() => setDeleteRoundDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("game.deleteRoundTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t("game.deleteRoundConfirm")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteRoundDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeleteRound}>
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit game settings dialog */}
      <NewGameDialog
        open={editGameDialogOpen}
        onClose={() => setEditGameDialogOpen(false)}
        editMode={true}
        game={game}
        onUpdateGame={handleUpdateGame}
      />

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

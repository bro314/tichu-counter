import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
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
import GameCard from "../components/GameCard";
import RoundCard from "../components/RoundCard";
import PullToRefresh from "../components/PullToRefresh";
import type { PlayerNameResolver } from "../utils/playerName";
import { fetchPlayers } from "../services/playerService";
import * as sx from "../styles/commonStyles";
import { shape } from "../styles/tokens";

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

  const loadGame = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (!isRefresh) {
      setLoading(true);
    }
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

  const handleUpdateGame = async (
    isPrivate: boolean,
    tag: string,
    note: string,
    players?: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot],
  ) => {
    if (!game) return;
    try {
      await updateGameMetadata(game.id, isPrivate, tag, note, players);
      setEditGameDialogOpen(false);
      
      // Reload game and player profiles
      await loadGame(true);

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
  const loggedInIndex = game ? game.players.findIndex((p) => p.uid === user?.uid) : -1;
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
        <GameCard
          game={game}
          score={totals}
          playerProfileMap={playerProfiles}
          onClick={loadGame}
        />
      </Box>

      {/* Round history */}
      <PullToRefresh scrollRef={scrollRef} onRefresh={() => loadGame(true)}>
        <Box
          ref={scrollRef}
          onScroll={updateShadows}
          sx={{
            flex: 1,
            overflow: "auto",
            px: 1,
            py: 1,
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
              {[...rounds].reverse().map((round, index) => {
                const chronologicalIndex = rounds.length - 1 - index;
                const cumulativeRounds = rounds.slice(0, chronologicalIndex + 1);
                const cumulativeScore = cumulativeRounds.reduce(
                  (acc, r) => {
                    const s = calculateRoundScore(r);
                    return {
                      team1: acc.team1 + s.team1,
                      team2: acc.team2 + s.team2,
                    };
                  },
                  { team1: 0, team2: 0 }
                );
                return (
                  <RoundCard
                    key={round.id}
                    round={round}
                    playerAvatars={playerAvatars}
                    isPlayer={isPlayer}
                    onEditRound={openEditRound}
                    cumulativeScore={cumulativeScore}
                    loggedInIndex={loggedInIndex}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      </PullToRefresh>

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
                  py: 1,
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
                  py: 1,
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

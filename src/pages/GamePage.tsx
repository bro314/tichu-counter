import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import CloudOffIcon from "@mui/icons-material/CloudOff";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchGame,
  fetchRounds,
  deleteGame,
  updateGameMetadata,
} from "../services/gameService";
import {
  calculateTotals,
  checkWinner,
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
import { useOfflineSync, mergeRounds } from "../contexts/offlineSyncContext";

/** Shown when /game is visited with no game ID — auto-opens new game dialog */
function NoGameFallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { queueOperation } = useOfflineSync();

  const handleCreateGame = async (
    players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot],
    isPrivate?: boolean,
    tag?: string,
    note?: string,
  ) => {
    if (!user) return;
    const tempGameId = 'temp_' + Math.random().toString(36).substring(2, 15);
    queueOperation({
      gameId: tempGameId,
      type: 'CREATE_GAME',
      gameData: {
        createdBy: user.uid,
        players,
        isPrivate: isPrivate || false,
        tag: tag?.trim() || '',
        note: note?.trim() || '',
        createdAt: new Date().toISOString(),
      }
    });
    localStorage.setItem("lastGameId", tempGameId);
    navigate(`/game/${tempGameId}`, { replace: true });
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

  const { pendingOps, isOnline, queueOperation, getPendingRounds, tempToRealIds, hasUnsavedData, getGameSyncStatus } = useOfflineSync();

  const [game, setGame] = useState<Game | null>(null);
  const [serverRounds, setServerRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive rounds (merge server rounds with local pending operations for this game)
  const rounds = useMemo(() => {
    return mergeRounds(serverRounds, pendingOps.filter((op) => op.gameId === id));
  }, [serverRounds, pendingOps, id]);

  // Redirect if a pending temp game ID gets resolved to a real game ID
  useEffect(() => {
    if (id && tempToRealIds[id]) {
      navigate(`/game/${tempToRealIds[id]}`, { replace: true });
    }
  }, [id, tempToRealIds, navigate]);

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

  // Auto-scroll to bottom of rounds list on initial load or changes (adds/edits/deletes)
  useEffect(() => {
    if (rounds.length > 0) {
      const timeoutId = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [rounds]);

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

    if (id.startsWith('temp_')) {
      setLoading(true);
      const createOp = pendingOps.find(op => op.type === 'CREATE_GAME' && op.gameId === id);
      if (createOp && createOp.gameData) {
        const localGame: Game = {
          id: id,
          createdBy: createOp.gameData.createdBy,
          createdAt: new Date(createOp.gameData.createdAt),
          status: 'active',
          players: createOp.gameData.players,
          playerUids: createOp.gameData.players.map(p => p.uid).filter((uid): uid is string => uid !== null),
          isPrivate: createOp.gameData.isPrivate,
          tag: createOp.gameData.tag,
          note: createOp.gameData.note,
          rounds: [],
        };
        setGame(localGame);
        setServerRounds([]);
      } else {
        setGame(null);
      }
      setLoading(false);
      return;
    }

    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const [g, r] = await Promise.all([fetchGame(id), fetchRounds(id)]);
      setGame(g);
      setServerRounds(r);
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
  }, [id, t, pendingOps]);

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
    if (id && !id.startsWith('temp_')) {
      try {
        const [g, r] = await Promise.all([fetchGame(id), fetchRounds(id)]);
        if (g) setGame(g);
        setServerRounds(r);
      } catch (err) {
        console.error("Failed to sync before adding round:", err);
      }
    }
    setEditingRound(null);
    setEditorOpen(true);
  };

  const openEditRound = async (round: Round) => {
    if (id) {
      if (id.startsWith('temp_')) {
        setEditingRound(round);
        setEditorOpen(true);
        return;
      }
      try {
        const [g, r] = await Promise.all([fetchGame(id), fetchRounds(id)]);
        if (g) setGame(g);
        setServerRounds(r);

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
    if (editingRound) {
      queueOperation({
        gameId: id,
        type: 'UPDATE_ROUND',
        roundId: editingRound.id,
        roundData: data,
      });
    } else {
      const roundId = Math.random().toString(36).substring(2, 15);
      queueOperation({
        gameId: id,
        type: 'ADD_ROUND',
        roundId: roundId,
        roundData: data,
      });
    }
    closeEditor();
  };

  const handleDeleteClick = () => {
    setDeleteRoundDialogOpen(true);
  };

  const handleConfirmDeleteRound = async () => {
    if (!id || !editingRound) return;
    queueOperation({
      gameId: id,
      type: 'DELETE_ROUND',
      roundId: editingRound.id,
    });
    setDeleteRoundDialogOpen(false);
    closeEditor();
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
        position: "relative",
      }}
    >
      {/* Top dynamic scroll shadow */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 32,
          zIndex: 10,
          background: showTopShadow
            ? `linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)`
            : "transparent",
          pointerEvents: "none",
          transition: "background 0.15s ease",
        }}
      />

      {/* Sync Status Banner */}
      {(!isOnline || pendingOps.filter(op => op.gameId === id).length > 0) && (
        <Box sx={{ p: 1, bgcolor: "background.default", flexShrink: 0 }}>
          <Alert
            severity="info"
            icon={isOnline ? undefined : <CloudOffIcon />}
            sx={{
              borderRadius: `${shape.borderRadius}px`,
            }}
          >
            {isOnline
              ? t("game.syncBannerOnlineOps", { count: pendingOps.filter(op => op.gameId === id).length })
              : pendingOps.filter(op => op.gameId === id).length > 0
                ? t("game.syncBannerOfflineOps", { count: pendingOps.filter(op => op.gameId === id).length })
                : t("game.syncBannerOffline")}
          </Alert>
        </Box>
      )}

      {/* Round history */}
      <PullToRefresh scrollRef={scrollRef} onRefresh={() => loadGame(true)}>
        <Box
          ref={scrollRef}
          onScroll={updateShadows}
          sx={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            px: 1,
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          {rounds.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", py: 2, m: "auto" }}
            >
              {t("game.noRounds")}
            </Typography>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                minHeight: "100%",
                pb: 0,
              }}
            >
              <Box sx={{ flex: 1 }} />
              {rounds.map((round, index) => {
                const pendingRounds = getPendingRounds(id || '');
                const roundSyncStatus = pendingRounds[round.id]?.status;
                const roundNumber = index + 1;
                return (
                  <RoundCard
                    key={round.id}
                    round={round}
                    roundNumber={roundNumber}
                    playerAvatars={playerAvatars}
                    isPlayer={isPlayer}
                    onEditRound={openEditRound}
                    loggedInIndex={loggedInIndex}
                    syncStatus={roundSyncStatus}
                  />
                );
              })}
              <Box sx={{ height: "1px", flexShrink: 0 }} />
            </Box>
          )}
        </Box>
      </PullToRefresh>

      {/* Game Card (placed below rounds, above action buttons) */}
      <Box
        sx={{
          px: 1,
          pt: 1,
          pb: 0.5,
          flexShrink: 0,
          bgcolor: "background.default",
          borderTop: 1,
          borderColor: "divider",
          boxShadow: (theme) => showBottomShadow ? theme.palette.dynamicBottomBarShadow : "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        <GameCard
          game={game}
          score={totals}
          playerProfileMap={playerProfiles}
          syncStatus={getGameSyncStatus(game.id)}
          onClick={loadGame}
        />
      </Box>

      {/* Bottom action block */}
      {isPlayer && (
        <Box
          sx={{
            p: 1,
            display: "flex",
            gap: 1,
            alignItems: "center",
            bgcolor: "background.default",
            flexShrink: 0,
            position: "relative",
            zIndex: 2,
          }}
        >
          {!isGameOver ? (
            <>
              <Button
                id="open-round-editor-btn"
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={openNewRound}
                sx={{ flex: 1 }}
              >
                {t("game.addRound")}
              </Button>
              {!hasUnsavedData(id || '') && (
                <IconButton
                  id="edit-game-btn"
                  onClick={() => setEditGameDialogOpen(true)}
                  sx={{ flexShrink: 0 }}
                >
                  <EditIcon />
                </IconButton>
              )}
              <IconButton
                id="delete-game-btn"
                onClick={confirmDeleteGame}
                sx={{
                  flexShrink: 0,
                  color: "error.main",
                  "&:hover": {
                    color: "error.dark",
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </>
          ) : (
            <>
              {!hasUnsavedData(id || '') && (
                <Button
                  id="edit-game-btn"
                  variant="outlined"
                  size="large"
                  startIcon={<EditIcon />}
                  onClick={() => setEditGameDialogOpen(true)}
                  sx={{ flex: 1 }}
                >
                  {t("common.edit")}
                </Button>
              )}
              <Button
                id="delete-game-btn"
                variant="outlined"
                color="error"
                size="large"
                startIcon={<DeleteIcon />}
                onClick={confirmDeleteGame}
                sx={{ flex: 1 }}
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

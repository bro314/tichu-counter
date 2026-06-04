import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SearchIcon from "@mui/icons-material/Search";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CloseIcon from "@mui/icons-material/Close";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import Chip from "@mui/material/Chip";
import { useAuth } from "../contexts/AuthContext";
import { fetchUserGames, searchGamesByPlayer, searchGamesByTag } from "../services/gameService";
import { calculateTotals } from "../types/game";
import type { Game, PlayerSlot, RoundScore } from "../types/game";
import NewGameDialog from "../components/NewGameDialog";
import SearchDialog from "../components/SearchDialog";
import GameCard from "../components/GameCard";
import PullToRefresh from "../components/PullToRefresh";
import * as sx from "../styles/commonStyles";
import { shape } from "../styles/tokens";
import { fetchPlayers } from "../services/playerService";
import appIconImg from "../assets/app-icon.png";
import type { RegisteredPlayer } from "../services/playerService";
import type { PlayerNameResolver } from "../utils/playerName";
import { useOfflineSync, mergeGames } from "../contexts/offlineSyncContext";

type SearchFilter =
  | { type: "player"; player: RegisteredPlayer }
  | { type: "tag"; tag: string }
  | null;

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { pendingOps, isOnline, queueOperation, getGameSyncStatus } = useOfflineSync();

  const [serverGames, setServerGames] = useState<Game[]>([]);

  const games = useMemo(() => {
    return mergeGames(serverGames, pendingOps);
  }, [serverGames, pendingOps]);

  const scores = useMemo(() => {
    const scoreMap: Record<string, RoundScore> = {};
    for (const g of games) {
      scoreMap[g.id] = calculateTotals(g.rounds || []);
    }
    return scoreMap;
  }, [games]);

  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>(null);
  const [playerProfileMap, setPlayerProfileMap] = useState<
    Map<string, PlayerNameResolver>
  >(new Map());

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

  const loadGames = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (!isRefresh) {
      setLoading(true);
      setServerGames([]); // Clear stale/merged-looking list while loading on initial load
    }
    try {
      let gameList: Game[];
      if (searchFilter?.type === "player") {
        gameList = await searchGamesByPlayer(searchFilter.player.uid, user.uid);
      } else if (searchFilter?.type === "tag") {
        gameList = await searchGamesByTag(searchFilter.tag, user.uid);
      } else {
        gameList = await fetchUserGames(user.uid);
      }
      setServerGames(gameList);

      // Collect all player UIDs from the user's games
      const uids: string[] = [];
      for (const game of gameList) {
        for (const slot of game.players) {
          if (slot.uid) uids.push(slot.uid);
        }
      }

      // Fetch profiles only for those UIDs (using cache where possible)
      const players = await fetchPlayers(uids);
      const profileMap = new Map<string, PlayerNameResolver>();
      for (const p of players) {
        profileMap.set(p.uid, { displayName: p.displayName, avatar: p.avatar });
      }

      setPlayerProfileMap(profileMap);
    } catch (err) {
      console.error("Failed to load games:", err);
    } finally {
      setLoading(false);
    }
  }, [user, searchFilter]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    if (!isOnline) {
      setSearchFilter(null);
    }
  }, [isOnline]);

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
    setDialogOpen(false);
    navigate(`/game/${tempGameId}`);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Title Header */}
      <Box sx={sx.dynamicHeader(showTopShadow)}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <Box
              component="img"
              src={appIconImg}
              alt="Dragon's Count"
              sx={{
                width: 40,
                height: 40,
                objectFit: "contain",
                borderRadius: `${shape.borderRadius}px`,
              }}
            />
            <Typography variant="h6" >
              {t("app.name")}
            </Typography>
          </Box>
          {searchFilter ? (
            <Chip
              icon={
                searchFilter.type === "player" ? (
                  <Typography sx={{ ...sx.avatarIconFont }}>
                    {searchFilter.player.avatar}
                  </Typography>
                ) : (
                  <LocalOfferIcon sx={{ ...sx.mdIconFont }} />
                )
              }
              label={
                searchFilter.type === "player"
                  ? searchFilter.player.displayName
                  : searchFilter.tag
              }
              size="small"
              onDelete={() => setSearchFilter(null)}
              deleteIcon={<CloseIcon sx={{ ...sx.mdIconFont }} />}
              sx={{
                ...sx.uppercaseBadgeFont,
                maxWidth: 180,
              }}
            />
          ) : (
            profile && (
              <Chip
                icon={
                  <Typography sx={{ ...sx.avatarIconFont }}>
                    {profile.avatar || "🐉"}
                  </Typography>
                }
                label={profile.displayName || "Player"}
                size="small"
                sx={{
                  ...sx.uppercaseBadgeFont,
                  maxWidth: 180,
                }}
              />
            )
          )}
        </Box>
      </Box>

      {/* Sync Status Banner */}
      {(!isOnline || pendingOps.length > 0) && (
        <Alert
          severity="info"
          icon={isOnline ? undefined : <CloudOffIcon />}
          sx={{
            mx: 2,
            mt: 1,
            borderRadius: `${shape.borderRadius}px`,
          }}
        >
          {isOnline
            ? t("game.syncBannerOnlineOps", { count: pendingOps.length })
            : pendingOps.length > 0
              ? t("game.syncBannerOfflineOps", { count: pendingOps.length })
              : t("game.syncBannerOffline")}
        </Alert>
      )}

      {/* Game list */}
      <PullToRefresh scrollRef={scrollRef} onRefresh={() => loadGames(true)}>
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
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
              <CircularProgress />
            </Box>
          ) : games.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ textAlign: "center", px: 4 }}
              >
                {searchFilter ? t("home.noResults") : t("home.noGames")}
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 1.5, pb: 1 }}
            >
              {games.map((game) => {
                const score = scores[game.id] || { team1: 0, team2: 0 };
                const syncStatus = getGameSyncStatus(game.id);
                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    score={score}
                    playerProfileMap={playerProfileMap}
                    syncStatus={syncStatus}
                    onClick={() => navigate(`/game/${game.id}`)}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      </PullToRefresh>

      {/* Bottom bar with Start New Game and Search */}
      <Box sx={sx.dynamicBottomBar(showBottomShadow)}>
        <Button
          id="start-new-game-btn"
          variant="contained"
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ flex: 1 }}
        >
          {t("home.newGame")}
        </Button>
        <Button
          id="search-games-btn"
          variant="outlined"
          size="large"
          startIcon={<SearchIcon />}
          onClick={() => setSearchDialogOpen(true)}
          disabled={!isOnline}
          sx={{ minWidth: 0 }}
        >
          {t("home.search")}
        </Button>
      </Box>

      {/* New game dialog */}
      <NewGameDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreateGame={handleCreateGame}
      />

      {/* Search dialog */}
      <SearchDialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        onSearchPlayer={(player) => {
          setSearchFilter({ type: "player", player });
          setSearchDialogOpen(false);
        }}
        onSearchTag={(tag) => {
          setSearchFilter({ type: "tag", tag });
          setSearchDialogOpen(false);
        }}
      />
    </Box>
  );
};

export default HomePage;

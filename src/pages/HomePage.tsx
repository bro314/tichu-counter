import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SearchIcon from "@mui/icons-material/Search";
import LockIcon from "@mui/icons-material/Lock";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CloseIcon from "@mui/icons-material/Close";
import Chip from "@mui/material/Chip";
import { useAuth } from "../contexts/AuthContext";
import { createGame, fetchUserGames, searchGamesByPlayer, searchGamesByTag } from "../services/gameService";
import { calculateTotals } from "../types/game";
import type { Game, PlayerSlot, RoundScore } from "../types/game";
import NewGameDialog from "../components/NewGameDialog";
import SearchDialog from "../components/SearchDialog";
import * as sx from "../styles/commonStyles";
import { shape } from "../styles/tokens";
import { fetchPlayers } from "../services/playerService";
import appIconImg from "../assets/app-icon.png";
import type { RegisteredPlayer } from "../services/playerService";
import type { PlayerNameResolver } from "../utils/playerName";

type SearchFilter =
  | { type: "player"; player: RegisteredPlayer }
  | { type: "tag"; tag: string }
  | null;

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [scores, setScores] = useState<Record<string, RoundScore>>({});
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

  const loadGames = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setGames([]); // Clear stale/merged-looking list while loading
    try {
      let gameList: Game[];
      if (searchFilter?.type === "player") {
        gameList = await searchGamesByPlayer(searchFilter.player.uid, user.uid);
      } else if (searchFilter?.type === "tag") {
        gameList = await searchGamesByTag(searchFilter.tag, user.uid);
      } else {
        gameList = await fetchUserGames(user.uid);
      }
      setGames(gameList);

      // Compute scores directly from the embedded rounds in each game doc
      const scoreMap: Record<string, RoundScore> = {};
      for (const game of gameList) {
        scoreMap[game.id] = calculateTotals(game.rounds || []);
      }
      setScores(scoreMap);

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

  const handleCreateGame = async (
    players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot],
    isPrivate?: boolean,
    tag?: string,
    note?: string,
  ) => {
    if (!user) return;
    try {
      const gameId = await createGame(user.uid, players, isPrivate, tag, note);
      setDialogOpen(false);
      navigate(`/game/${gameId}`);
    } catch (err) {
      console.error("Failed to create game:", err);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
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
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
              {t("app.name")}
            </Typography>
          </Box>
          {searchFilter ? (
            <Chip
              icon={
                searchFilter.type === "player" ? (
                  <Typography sx={{ fontSize: "1rem", lineHeight: 1 }}>
                    {searchFilter.player.avatar}
                  </Typography>
                ) : (
                  <LocalOfferIcon sx={{ fontSize: "0.9rem" }} />
                )
              }
              label={
                searchFilter.type === "player"
                  ? searchFilter.player.displayName
                  : searchFilter.tag
              }
              size="small"
              onDelete={() => setSearchFilter(null)}
              deleteIcon={<CloseIcon sx={{ fontSize: "0.9rem" }} />}
              sx={{
                fontWeight: 700,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                maxWidth: 180,
              }}
            />
          ) : (
            profile && (
              <Chip
                icon={
                  <Typography sx={{ fontSize: "1rem", lineHeight: 1 }}>
                    {profile.avatar || "🐉"}
                  </Typography>
                }
                label={profile.displayName || "Player"}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  maxWidth: 180,
                }}
              />
            )
          )}
        </Box>
      </Box>

      {/* Game list */}
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
              const p = game.players;
              const isActive = game.status === "active";

              const getPlayerDetails = (slot: PlayerSlot) => {
                const isCurrentUser = slot.uid === user?.uid;
                let displayName = slot.guestName || "Player";
                let avatar = "🐰"; // Default guest avatar

                if (isCurrentUser && profile) {
                  displayName = profile.displayName;
                  avatar = profile.avatar || "🐉";
                } else if (slot.uid) {
                  const cached = playerProfileMap.get(slot.uid);
                  if (cached) {
                    displayName = cached.displayName;
                    avatar = cached.avatar || "🐰";
                  }
                }
                return { displayName, avatar };
              };

              const p1 = getPlayerDetails(p[0]);
              const p2 = getPlayerDetails(p[1]);
              const p3 = getPlayerDetails(p[2]);
              const p4 = getPlayerDetails(p[3]);

              // Determine game status/outcome relative to current user
              const isUserInTeam1 =
                p[0].uid === user?.uid || p[1].uid === user?.uid;
              const isUserInTeam2 =
                p[2].uid === user?.uid || p[3].uid === user?.uid;
              const isTeam1Winner = score.team1 > score.team2;
              const isTeam2Winner = score.team2 > score.team1;

              let gameResult: "active" | "won" | "lost" | "finished" = "active";
              if (isActive) {
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
                <Card
                  key={game.id}
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
                  <CardActionArea onClick={() => navigate(`/game/${game.id}`)}>
                    <CardContent
                      sx={{ py: 1, px: 1, "&:last-child": { pb: 1.5 } }}
                    >
                      {/* Status and timestamp */}
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
                              <LocalOfferIcon sx={{ fontSize: "0.75rem" }} />
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
                                {game.tag}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(game.createdAt)}
                        </Typography>
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
                            {score.team1}
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
                            {score.team2}
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
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Bottom bar with Start New Game and Search */}
      <Box sx={sx.dynamicBottomBar(showBottomShadow)}>
        <Button
          id="start-new-game-btn"
          variant="contained"
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ ...sx.ctaButton, flex: 1 }}
        >
          {t("home.newGame")}
        </Button>
        <Button
          id="search-games-btn"
          variant="outlined"
          size="large"
          startIcon={<SearchIcon />}
          onClick={() => setSearchDialogOpen(true)}
          sx={{
            py: 1.5,
            borderRadius: `${shape.buttonRadius}px`,
            minWidth: 0,
            px: 2,
          }}
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

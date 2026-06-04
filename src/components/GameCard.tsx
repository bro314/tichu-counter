import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import LockIcon from "@mui/icons-material/Lock";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import * as sx from "../styles/commonStyles";
import type { Game, PlayerSlot } from "../types/game";
import type { PlayerNameResolver } from "../utils/playerName";
import { DateFormatter } from "../utils/date";
import { permutePlayerArray } from "../utils/playerPermutation";

interface GameCardProps {
  game: Game;
  score: { team1: number; team2: number };
  playerProfileMap: Map<string, PlayerNameResolver>;
  onClick?: () => void;
  syncStatus?: 'saving' | 'offline';
}

const GameCard = ({ game, score, playerProfileMap, onClick, syncStatus }: GameCardProps) => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();

  const loggedInIndex = game.players.findIndex((player) => player.uid === user?.uid);
  const p = loggedInIndex !== -1 ? permutePlayerArray(game.players, loggedInIndex) : game.players;
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
      } else {
        displayName = t("common.deleted");
        avatar = "👻";
      }
    }
    return { displayName, avatar };
  };

  const p1 = getPlayerDetails(p[0]);
  const p2 = getPlayerDetails(p[1]);
  const p3 = getPlayerDetails(p[2]);
  const p4 = getPlayerDetails(p[3]);

  // Determine game status/outcome relative to current user
  const isUserInTeam1 = game.players[0].uid === user?.uid || game.players[1].uid === user?.uid;
  const isUserInTeam2 = game.players[2].uid === user?.uid || game.players[3].uid === user?.uid;
  const isTeam1Winner = score.team1 > score.team2;
  const isTeam2Winner = score.team2 > score.team1;

  const displayScore = loggedInIndex >= 2
    ? { team1: score.team2, team2: score.team1 }
    : score;

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

  const formatDateOnly = (date: Date) => DateFormatter.formatDateOnly(date, i18n.language);
  const formatTimeOnly = (date: Date) => DateFormatter.formatTimeOnly(date);

  const cardContent = (
    <CardContent sx={{ py: 1, px: 1, "&:last-child": { pb: 1.5 } }}>
      {/* Status, score and timestamp */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 0.5,
        }}
      >
        {/* Left side: Status */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            flex: 1,
            minWidth: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              ...sx.uppercaseBadgeFont,
              color: getLabelColor(),
            }}
          >
            {getLabelText()}
          </Typography>
        </Box>

        {/* Middle: Large Score */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            px: 1,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              ...sx.largeScoreFont,
              flex: 1,
              minWidth: "82px",
              textAlign: "right",
            }}
          >
            {displayScore.team1}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              ...sx.largeScoreFont,
              flexShrink: 0,
              textAlign: "center",
            }}
          >
            :
          </Typography>
          <Typography
            variant="h4"
            sx={{
              ...sx.largeScoreFont,
              flex: 1,
              minWidth: "82px",
              textAlign: "left",
            }}
          >
            {displayScore.team2}
          </Typography>
        </Box>

        {/* Right side: Date & Time, and sync status */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            flex: 1,
            justifyContent: "flex-end",
            minWidth: 0,
          }}
        >
          {syncStatus && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {syncStatus === 'saving' ? (
                <CircularProgress size={12} sx={{ color: 'warning.main' }} />
              ) : (
                <CloudOffIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              )}
            </Box>
          )}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 0,
            }}
          >
            <Typography sx={{ ...sx.timestampFont, whiteSpace: "nowrap" }}>
              {formatDateOnly(game.createdAt)}
            </Typography>
            <Typography sx={{ ...sx.timestampFont, whiteSpace: "nowrap" }}>
              {formatTimeOnly(game.createdAt)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Teams display without the score */}
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
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              width: "100%",
              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                ...sx.lgEmojiNoneFont,
                flexShrink: 0,
              }}
            >
              {p1.avatar}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                ...sx.playerNameLarge,
                minWidth: 0,
              }}
              noWrap
            >
              {p1.displayName}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              width: "100%",
              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                ...sx.lgEmojiNoneFont,
                flexShrink: 0,
              }}
            >
              {p2.avatar}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                ...sx.playerNameLarge,
                minWidth: 0,
              }}
              noWrap
            >
              {p2.displayName}
            </Typography>
          </Box>
        </Box>

        {/* Team 2: 2 lines with avatars (aligned right) */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              justifyContent: "flex-end",
              width: "100%",
              minWidth: 0,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                ...sx.playerNameLarge,
                minWidth: 0,
              }}
              noWrap
            >
              {p3.displayName}
            </Typography>
            <Typography
              sx={{
                ...sx.lgEmojiNoneFont,
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
              gap: 1,
              justifyContent: "flex-end",
              width: "100%",
              minWidth: 0,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                ...sx.playerNameLarge,
                minWidth: 0,
              }}
              noWrap
            >
              {p4.displayName}
            </Typography>
            <Typography
              sx={{
                ...sx.lgEmojiNoneFont,
                flexShrink: 0,
              }}
            >
              {p4.avatar}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Bottom Row: Optional Game Note & Tags */}
      {(game.note || game.isPrivate || game.tag) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mt: 1,
          }}
        >
          {/* Tags on the left */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexShrink: 0,
            }}
          >
            {game.isPrivate && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.25,
                  bgcolor: "badgeBg.private",
                  px: 0.75,
                  py: 0.25,
                  borderRadius: "4px",
                  color: "text.secondary",
                }}
              >
                <LockIcon sx={{ ...sx.smIconFont }} />
                <Typography variant="caption" sx={{ ...sx.cardBadgeFont }}>
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
                  bgcolor: "badgeBg.tag",
                  px: 0.75,
                  py: 0.25,
                  borderRadius: "4px",
                  color: "badgeBg.tagText",
                }}
              >
                <LocalOfferIcon sx={{ ...sx.smIconFont }} />
                <Typography variant="caption" sx={{ ...sx.cardBadgeFont }}>
                  {game.tag}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Note on the right */}
          <Box sx={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            {game.note && (
              <Typography
                variant="caption"
                sx={{ ...sx.metaText, fontStyle: "italic" }}
              >
                {game.note}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </CardContent>
  );

  return (
    <Card sx={{ position: "relative" }}>
      {onClick ? (
        <CardActionArea
          onClick={onClick}
          sx={{
            color: "inherit",
            display: "block",
            textAlign: "inherit",
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          {cardContent}
        </CardActionArea>
      ) : (
        cardContent
      )}
    </Card>
  );
};

export default GameCard;

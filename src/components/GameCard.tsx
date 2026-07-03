import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import LockIcon from "@mui/icons-material/Lock";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import * as sx from "../styles/commonStyles";
import { shape, fonts } from "../styles/tokens";
import type { Game, PlayerSlot } from "../types/game";
import type { PlayerNameResolver } from "../utils/playerName";
import { DateFormatter } from "../utils/date";
import { permutePlayerArray } from "../utils/playerPermutation";
import TeamPlayerBlock from "./TeamPlayerBlock";

interface GameCardProps {
  game: Game;
  score: { team1: number; team2: number };
  playerProfileMap: Map<string, PlayerNameResolver>;
  onClick?: () => void;
  syncStatus?: 'saving' | 'offline';
  team1Name?: string;
  team2Name?: string;
  winnerTeam?: 1 | 2 | null;
}

const GameCard = ({
  game,
  score,
  playerProfileMap,
  onClick,
  syncStatus,
  team1Name,
  team2Name,
  winnerTeam,
}: GameCardProps) => {
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

  const getLabelIcon = () => {
    if (gameResult === "active") return <PlayArrowIcon sx={{ ...sx.smIconFont }} />;
    if (gameResult === "won") return <EmojiEventsIcon sx={{ ...sx.smIconFont }} />;
    if (gameResult === "lost") return <CancelIcon sx={{ ...sx.smIconFont }} />;
    return <CheckCircleIcon sx={{ ...sx.smIconFont }} />;
  };

  const createdDate = new Date(game.createdAt);
  const isRecent = new Date().getTime() - createdDate.getTime() < 24 * 60 * 60 * 1000;

  const formatDateOnly = (date: Date) => DateFormatter.formatDateOnly(date, i18n.language);
  const formatTimeOnly = (date: Date) => DateFormatter.formatTimeOnly(date);

  const noteText = [game.note, game.tournamentLabel ? `(${game.tournamentLabel})` : '']
    .filter(Boolean)
    .join(' ');

  const cardContent = (
    <CardContent sx={{ py: 1, px: 1, "&:last-child": { pb: 1.5 } }}>

      {/* Team Names Row (optional) */}
      {(team1Name || team2Name) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 1,
            px: 0.5,
          }}
        >
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            {winnerTeam === 1 && <EmojiEventsIcon sx={{ fontSize: '1rem', color: 'success.main' }} />}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: winnerTeam === 1 ? 'bold' : 'normal',
                color: winnerTeam === 1 ? 'success.main' : 'text.primary',
                fontFamily: fonts.display,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {team1Name}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: winnerTeam === 2 ? 'bold' : 'normal',
                color: winnerTeam === 2 ? 'success.main' : 'text.primary',
                fontFamily: fonts.display,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'right',
              }}
            >
              {team2Name}
            </Typography>
            {winnerTeam === 2 && <EmojiEventsIcon sx={{ fontSize: '1rem', color: 'success.main' }} />}
          </Box>
        </Box>
      )}

      {/* Teams display without the score */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 1,
        }}
      >
        {/* Team 1 */}
        <TeamPlayerBlock player1={p1} player2={p2} align="left" />

        {/* Team 2 */}
        <TeamPlayerBlock player1={p3} player2={p4} align="right" />
      </Box>

      {/* Score Row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 0.5,
        }}
      >
        {/* Left side: Spacer to keep score centered */}
        <Box sx={{ flex: 1 }} />

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
              flex: "none",
              textAlign: "center",
            }}
          >
            &nbsp;:&nbsp;
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

        {/* Right side: Spacer to keep score centered */}
        <Box sx={{ flex: 1 }} />
      </Box>

      {/* Tags & Date/Time Row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mt: 1,
        }}
      >
        {/* Left box: status tag only */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.25,
              bgcolor: (theme) => {
                const color = getLabelColor();
                let hexColor = "";
                if (color === "warning.main") hexColor = theme.palette.warning.main;
                else if (color === "success.main") hexColor = theme.palette.success.main;
                else if (color === "error.main") hexColor = theme.palette.error.main;
                else hexColor = theme.palette.text.disabled;
                return `${hexColor}1A`; // ~10% opacity
              },
              px: 0.75,
              py: 0.25,
              borderRadius: `${shape.buttonRadius}px`,
              color: getLabelColor(),
            }}
          >
            {getLabelIcon()}
            <Typography variant="caption" sx={{ ...sx.cardBadgeFont, fontWeight: "bold" }}>
              {getLabelText()}
            </Typography>
          </Box>
        </Box>

        {/* Middle box: private tag and game tag */}
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
                borderRadius: `${shape.buttonRadius}px`,
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
                borderRadius: `${shape.buttonRadius}px`,
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

        {/* Right box: date/time */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
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
          <Typography sx={{ ...sx.timestampFont, whiteSpace: "nowrap" }}>
            {isRecent ? formatTimeOnly(createdDate) : formatDateOnly(createdDate)}
          </Typography>
        </Box>
      </Box>

      {/* Note Row */}
      {noteText && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mt: 0.75,
            ml: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{ ...sx.metaText, fontStyle: "italic", textAlign: "left" }}
          >
            {noteText}
          </Typography>
        </Box>
      )}
    </CardContent>
  );

  return (
    <Card elevation={2} sx={{ position: "relative" }}>
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

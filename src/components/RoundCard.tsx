import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import { calculateRoundScore } from "../types/game";
import type { Round } from "../types/game";
import * as sx from "../styles/commonStyles";
import { permutePlayerArray } from "../utils/playerPermutation";

interface RoundCardProps {
  round: Round;
  playerAvatars: string[];
  isPlayer: boolean;
  onEditRound: (round: Round) => void;
  loggedInIndex?: number;
  syncStatus?: 'saving' | 'offline';
}

const RoundCard = ({ round, playerAvatars, isPlayer, onEditRound, loggedInIndex, syncStatus }: RoundCardProps) => {
  const score = calculateRoundScore(round);
  const hasLoggedIn = loggedInIndex !== undefined && loggedInIndex !== -1;
  const avatars = hasLoggedIn ? permutePlayerArray(playerAvatars, loggedInIndex) : playerAvatars;

  const orig1 = hasLoggedIn ? (0 ^ loggedInIndex) + 1 : 1;
  const orig2 = hasLoggedIn ? (1 ^ loggedInIndex) + 1 : 2;
  const orig3 = hasLoggedIn ? (2 ^ loggedInIndex) + 1 : 3;
  const orig4 = hasLoggedIn ? (3 ^ loggedInIndex) + 1 : 4;

  const leftTeam = hasLoggedIn && loggedInIndex >= 2 ? 2 : 1;
  const rightTeam = hasLoggedIn && loggedInIndex >= 2 ? 1 : 2;

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

  const p1Chip = getPlayerCallChip(round, orig1);
  const p2Chip = getPlayerCallChip(round, orig2);
  const p3Chip = getPlayerCallChip(round, orig3);
  const p4Chip = getPlayerCallChip(round, orig4);

  const hasP1Call = round.tichuCalls.includes(orig1) || round.grandTichuCalls.includes(orig1);
  const hasP2Call = round.tichuCalls.includes(orig2) || round.grandTichuCalls.includes(orig2);
  const p1Success = round.finishedFirst === orig1;

  let t1VictoryTarget = orig1;
  if (round.oneTwoVictory === leftTeam) {
    if (!hasP1Call && !hasP2Call) {
      t1VictoryTarget = orig1;
    } else if (hasP1Call && !hasP2Call) {
      t1VictoryTarget = orig2;
    } else if (!hasP1Call && hasP2Call) {
      t1VictoryTarget = orig1;
    } else {
      t1VictoryTarget = !p1Success ? orig1 : orig2;
    }
  }

  const victoryChip = (
    <Chip label="1-2" size="small" color="primary" sx={sx.historyChip} />
  );

  const slot1Content =
    round.oneTwoVictory === leftTeam && t1VictoryTarget === orig1
      ? victoryChip
      : p1Chip;

  const slot2Content =
    round.oneTwoVictory === leftTeam && t1VictoryTarget === orig2
      ? victoryChip
      : p2Chip;

  const hasP3Call = round.tichuCalls.includes(orig3) || round.grandTichuCalls.includes(orig3);
  const hasP4Call = round.tichuCalls.includes(orig4) || round.grandTichuCalls.includes(orig4);
  const p3Success = round.finishedFirst === orig3;

  let t2VictoryTarget = orig3;
  if (round.oneTwoVictory === rightTeam) {
    if (!hasP3Call && !hasP4Call) {
      t2VictoryTarget = orig3;
    } else if (hasP3Call && !hasP4Call) {
      t2VictoryTarget = orig4;
    } else if (!hasP3Call && hasP4Call) {
      t2VictoryTarget = orig3;
    } else {
      t2VictoryTarget = !p3Success ? orig3 : orig4;
    }
  }

  const slot3Content =
    round.oneTwoVictory === rightTeam && t2VictoryTarget === orig3
      ? victoryChip
      : p3Chip;

  const slot4Content =
    round.oneTwoVictory === rightTeam && t2VictoryTarget === orig4
      ? victoryChip
      : p4Chip;



  return (
    <Card sx={{ overflow: "visible", position: "relative" }}>
      {syncStatus && (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          {syncStatus === 'saving' ? (
            <CircularProgress size={10} sx={{ color: 'warning.main' }} />
          ) : (
            <CloudOffIcon sx={{ fontSize: 12, color: 'warning.main' }} />
          )}
        </Box>
      )}
      <CardActionArea
        onClick={isPlayer ? () => onEditRound(round) : undefined}
        disabled={!isPlayer}
        sx={{
          px: 1,
          py: 1,
          cursor: isPlayer ? "pointer" : "default",
          "&.Mui-disabled": {
            opacity: 1,
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {/* Team 1 */}
          <Box
            sx={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              minWidth: 70,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                flexShrink: 0,
              }}
            >
              {/* Player 1 Row */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  height: 18,
                }}
              >
                <Typography sx={sx.lgEmojiNoneFont}>
                  {avatars[0]}
                </Typography>
                {slot1Content || <Box sx={{ width: 26, height: 18 }} />}
              </Box>
              {/* Player 2 Row */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  height: 18,
                }}
              >
                <Typography sx={sx.lgEmojiNoneFont}>
                  {avatars[1]}
                </Typography>
                {slot2Content || <Box sx={{ width: 26, height: 18 }} />}
              </Box>
            </Box>
          </Box>

          {/* Round score */}
          <Box sx={{ flex: 1 }}>
          </Box>
          <Box sx={{ flex: "none", textAlign: "right", minWidth: 50 }}>
            <Typography
              variant="body2"
              sx={{ ...sx.scoreFont }}
            >
              {leftTeam === 1 ? score.team1 : score.team2}
            </Typography>
          </Box>
          <Box sx={{ flex: "none" }}>
            <Typography
              variant="body2"
              sx={{ ...sx.scoreFont }}
            >
              &nbsp;:&nbsp;
            </Typography>
          </Box>
          <Box sx={{ flex: "none", minWidth: 50 }}>
            <Typography
              variant="body2"
              sx={{ ...sx.scoreFont }}
            >
              {leftTeam === 1 ? score.team2 : score.team1}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
          </Box>

          {/* Team 2 */}
          <Box
            sx={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 1,
              minWidth: 70,
            }}
          >
            {/* Cell 2: T/GT/Victory calls (two stacked rows, avatars to the right) */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                flexShrink: 0,
              }}
            >
              {/* Player 3 Row */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  justifyContent: "flex-end",
                  height: 18,
                }}
              >
                {slot3Content || <Box sx={{ width: 26, height: 18 }} />}
                <Typography sx={sx.lgEmojiNoneFont}>
                  {avatars[2]}
                </Typography>
              </Box>
              {/* Player 4 Row */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  justifyContent: "flex-end",
                  height: 18,
                }}
              >
                {slot4Content || <Box sx={{ width: 26, height: 18 }} />}
                <Typography sx={sx.lgEmojiNoneFont}>
                  {avatars[3]}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Optional Note Row */}
        {round.note && (
          <Box
            sx={{
              mt: 0.5,
              textAlign: "center",
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
};

export default RoundCard;

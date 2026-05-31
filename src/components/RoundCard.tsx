import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { calculateRoundScore } from "../types/game";
import type { Round } from "../types/game";
import * as sx from "../styles/commonStyles";

interface RoundCardProps {
  round: Round;
  playerAvatars: string[];
  isPlayer: boolean;
  onEditRound: (round: Round) => void;
  cumulativeScore: { team1: number; team2: number };
}

const RoundCard = ({ round, playerAvatars, isPlayer, onEditRound, cumulativeScore }: RoundCardProps) => {
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

  const p1Chip = getPlayerCallChip(round, 1);
  const p2Chip = getPlayerCallChip(round, 2);
  const p3Chip = getPlayerCallChip(round, 3);
  const p4Chip = getPlayerCallChip(round, 4);

  const hasP1Call = round.tichuCalls.includes(1) || round.grandTichuCalls.includes(1);
  const hasP2Call = round.tichuCalls.includes(2) || round.grandTichuCalls.includes(2);
  const p1Success = round.finishedFirst === 1;

  let t1VictoryTarget: 1 | 2 = 1;
  if (round.oneTwoVictory === 1) {
    if (!hasP1Call && !hasP2Call) {
      t1VictoryTarget = 1;
    } else if (hasP1Call && !hasP2Call) {
      t1VictoryTarget = 2;
    } else if (!hasP1Call && hasP2Call) {
      t1VictoryTarget = 1;
    } else {
      t1VictoryTarget = !p1Success ? 1 : 2;
    }
  }

  const victoryChip = (
    <Chip label="1-2" size="small" color="primary" sx={sx.historyChip} />
  );

  const slot1Content =
    round.oneTwoVictory === 1 && t1VictoryTarget === 1
      ? victoryChip
      : p1Chip;

  const slot2Content =
    round.oneTwoVictory === 1 && t1VictoryTarget === 2
      ? victoryChip
      : p2Chip;

  const hasP3Call = round.tichuCalls.includes(3) || round.grandTichuCalls.includes(3);
  const hasP4Call = round.tichuCalls.includes(4) || round.grandTichuCalls.includes(4);
  const p3Success = round.finishedFirst === 3;

  let t2VictoryTarget: 3 | 4 = 3;
  if (round.oneTwoVictory === 2) {
    if (!hasP3Call && !hasP4Call) {
      t2VictoryTarget = 3;
    } else if (hasP3Call && !hasP4Call) {
      t2VictoryTarget = 4;
    } else if (!hasP3Call && hasP4Call) {
      t2VictoryTarget = 3;
    } else {
      t2VictoryTarget = !p3Success ? 3 : 4;
    }
  }

  const slot3Content =
    round.oneTwoVictory === 2 && t2VictoryTarget === 3
      ? victoryChip
      : p3Chip;

  const slot4Content =
    round.oneTwoVictory === 2 && t2VictoryTarget === 4
      ? victoryChip
      : p4Chip;



  return (
    <Card variant="outlined" sx={{ overflow: "visible" }}>
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
                <Typography sx={sx.avatarMediumFont}>
                  {playerAvatars[0]}
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
                <Typography sx={sx.avatarMediumFont}>
                  {playerAvatars[1]}
                </Typography>
                {slot2Content || <Box sx={{ width: 26, height: 18 }} />}
              </Box>
            </Box>
          </Box>

          {/* Round score */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              ml: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{ ...sx.scoreFont }}
            >
              {score.team1}
            </Typography>
            <Typography
              variant="body2"
              sx={{ ...sx.scoreFont }}
            >
              :
            </Typography>
            <Typography
              variant="body2"
              sx={{ ...sx.scoreFont }}
            >
              {score.team2}
            </Typography>
          </Box>

          {/* Cumulative overall score */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              mr: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{ ...sx.scoreFont }}
            >
              {cumulativeScore.team1}
            </Typography>
            <Typography
              variant="body2"
              sx={{ ...sx.scoreFont }}
            >
              :
            </Typography>
            <Typography
              variant="body2"
              sx={{ ...sx.scoreFont }}
            >
              {cumulativeScore.team2}
            </Typography>
          </Box>

          {/* Team 2 */}
          <Box
            sx={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 1,
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
                <Typography sx={sx.avatarMediumFont}>
                  {playerAvatars[2]}
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
                <Typography sx={sx.avatarMediumFont}>
                  {playerAvatars[3]}
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

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import { calculateRoundScore } from "../types/game";
import type { Round } from "../types/game";
import { permutePlayerArray } from "../utils/playerPermutation";
import TeamPlayerBlock from "./TeamPlayerBlock";

interface ScoreProgressDialogProps {
  open: boolean;
  onClose: () => void;
  rounds: Round[];
  players: { avatar: string; displayName: string }[];
  loggedInIndex: number;
}

/** Annotation info for a single round */
interface RoundAnnotation {
  roundIndex: number;
  team: 1 | 2;
  type: "call-success" | "call-fail" | "one-two";
  callType?: "T" | "G" | "D";
}

function computeAnnotations(
  rounds: Round[],
  loggedInIndex: number,
): RoundAnnotation[] {
  const annotations: RoundAnnotation[] = [];
  const hasLoggedIn = loggedInIndex !== undefined && loggedInIndex !== -1;
  const leftTeam = hasLoggedIn && loggedInIndex >= 2 ? 2 : 1;

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];

    // Tichu calls
    for (const pNum of round.tichuCalls) {
      const isTeam1 = pNum <= 2;
      const team = isTeam1 ? 1 : 2;
      const displayTeam = (team === leftTeam ? 1 : 2) as 1 | 2;
      const success = round.finishedFirst === pNum;
      annotations.push({ roundIndex: i, team: displayTeam, type: success ? "call-success" : "call-fail", callType: "T" });
    }

    // Grand Tichu calls
    for (const pNum of round.grandTichuCalls) {
      const isTeam1 = pNum <= 2;
      const team = isTeam1 ? 1 : 2;
      const displayTeam = (team === leftTeam ? 1 : 2) as 1 | 2;
      const success = round.finishedFirst === pNum;
      annotations.push({ roundIndex: i, team: displayTeam, type: success ? "call-success" : "call-fail", callType: "G" });
    }

    // 1-2 victory
    if (round.oneTwoVictory > 0) {
      const displayTeam = (round.oneTwoVictory === leftTeam ? 1 : 2) as 1 | 2;
      annotations.push({ roundIndex: i, team: displayTeam, type: "one-two", callType: "D" });
    }
  }

  return annotations;
}

const ScoreProgressDialog = ({
  open,
  onClose,
  rounds,
  players,
  loggedInIndex,
}: ScoreProgressDialogProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const hasLoggedIn = loggedInIndex !== undefined && loggedInIndex !== -1;
  const permutedPlayers = hasLoggedIn
    ? permutePlayerArray(players, loggedInIndex)
    : players;

  // Compute cumulative scores and chart data
  const { team1Points, team2Points, minPlotted, maxPlotted, annotations } = useMemo(() => {
    const t1: number[] = [0];
    const t2: number[] = [0];
    let cum1 = 0;
    let cum2 = 0;

    // Determine left team same as GamePage/RoundCard
    const leftTeam = hasLoggedIn && loggedInIndex >= 2 ? 2 : 1;

    for (const round of rounds) {
      const score = calculateRoundScore(round);
      if (leftTeam === 1) {
        cum1 += score.team1;
        cum2 += score.team2;
      } else {
        cum1 += score.team2;
        cum2 += score.team1;
      }
      t1.push(cum1);
      t2.push(cum2);
    }

    const allPlotted = [...t1, ...t2];
    const minVal = Math.min(0, ...allPlotted);
    const maxVal = Math.max(1000, ...allPlotted);
    const annots = computeAnnotations(rounds, loggedInIndex);

    return {
      team1Points: t1,
      team2Points: t2,
      minPlotted: minVal,
      maxPlotted: maxVal,
      annotations: annots,
    };
  }, [rounds, hasLoggedIn, loggedInIndex]);

  // Chart dimensions
  const chartPadding = { top: 12, right: 0, bottom: 12, left: 0 };
  const svgWidth = 360;
  const svgHeight = 264;
  const chartWidth = svgWidth - chartPadding.left - chartPadding.right;
  const chartHeight = svgHeight - chartPadding.top - chartPadding.bottom;

  const totalPoints = team1Points.length; // rounds + 1 (includes starting 0)

  // Map data to SVG coordinates
  const toX = (roundIdx: number) => {
    if (totalPoints <= 1) return chartPadding.left + chartWidth / 2;
    return chartPadding.left + (roundIdx / (totalPoints - 1)) * chartWidth;
  };

  const toY = (score: number) => {
    // Y is inverted: minPlotted at bottom, maxPlotted at top
    const range = maxPlotted - minPlotted;
    if (range === 0) return chartPadding.top + chartHeight / 2;
    return chartPadding.top + (1 - (score - minPlotted) / range) * chartHeight;
  };

  // Build polyline points strings
  // Team 1: climbs from 0 toward 1000 (bottom to top)
  const team1Line = team1Points
    .map((score, i) => `${toX(i)},${toY(score)}`)
    .join(" ");

  // Team 2: climbs from 0 toward 1000 (bottom to top)
  const team2Line = team2Points
    .map((score, i) => `${toX(i)},${toY(score)}`)
    .join(" ");

  // Neutral line colors — subtle but visible in both modes
  const isDark = theme.palette.mode === "dark";
  const lineColor1 = theme.palette.team1;
  const lineColor2 = theme.palette.team2;
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const boundaryGridColor = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";
  const fillColor1 = theme.palette.team1;
  const fillColor2 = theme.palette.team2;

  // Grid lines at 100 intervals, covering full plotted range
  const gridLines = useMemo(() => {
    const startGrid = Math.floor(minPlotted / 100) * 100;
    const endGrid = Math.ceil(maxPlotted / 100) * 100;
    const lines: number[] = [];
    for (let g = startGrid; g <= endGrid; g += 100) {
      if (g >= minPlotted && g <= maxPlotted) {
        lines.push(g);
      }
    }
    return lines;
  }, [minPlotted, maxPlotted]);

  // Annotation dot size
  const dotSize = 14;
  const dotRadius = 3;

  // Build area fills
  // Team 1 area: from bottom edge up to the line
  const team1Area =
    team1Points.map((score, i) => `${toX(i)},${toY(score)}`).join(" ") +
    ` ${toX(totalPoints - 1)},${toY(minPlotted)} ${toX(0)},${toY(minPlotted)}`;

  // Team 2 area: from bottom edge up to the line
  const team2Area =
    team2Points.map((score, i) => `${toX(i)},${toY(score)}`).join(" ") +
    ` ${toX(totalPoints - 1)},${toY(minPlotted)} ${toX(0)},${toY(minPlotted)}`;

  // Separate annotations by team
  const team1Annotations = annotations.filter((a) => a.team === 1);
  const team2Annotations = annotations.filter((a) => a.team === 2);

  // Annotation color: green = successful call, red = failed call, blue = 1-2
  const getAnnotationColor = (a: RoundAnnotation) => {
    switch (a.type) {
      case "call-success": return theme.palette.success.main;
      case "call-fail": return theme.palette.error.main;
      case "one-two": return theme.palette.primary.main;
    }
  };

  // Group annotations by roundIndex within each team row for stacking
  const groupByRound = (annots: RoundAnnotation[]) => {
    const groups = new Map<number, RoundAnnotation[]>();
    for (const a of annots) {
      if (!groups.has(a.roundIndex)) groups.set(a.roundIndex, []);
      groups.get(a.roundIndex)!.push(a);
    }
    return groups;
  };

  const team1Groups = groupByRound(team1Annotations);
  const team2Groups = groupByRound(team2Annotations);

  // Annotation row height (enough for up to 3 stacked squares)
  const annotSpacing = dotSize + 2;
  const annotRowHeight = dotSize + 2 * annotSpacing;

  const totalSvgHeight = annotRowHeight + svgHeight + annotRowHeight;

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          pt: "calc(16px + env(safe-area-inset-top))",
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.default",
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, pl: 1 }}>
          {t("game.scoreProgress")}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Chart body */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          p: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Team 2 Player Block */}
          <Box sx={{ borderTop: `3px solid ${theme.palette.team2}`, pt: 1, width: "100%" }}>
            <TeamPlayerBlock
              player1={permutedPlayers[2]}
              player2={permutedPlayers[3]}
              align="left"
            />
          </Box>

          <svg
            viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
            width="100%"
            style={{ display: "block", overflow: "visible" }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* ── Team 2 annotation row (above chart) ── */}
            <g transform={`translate(0, 0)`}>
              {Array.from(team2Groups.entries()).map(([roundIdx, annots]) =>
                annots.map((a, ai) => {
                  const rectY = annotRowHeight - dotSize - ai * annotSpacing;
                  const centerX = toX(roundIdx + 1);
                  const centerY = rectY + dotSize / 2;
                  return (
                    <g key={`t2-${roundIdx}-${ai}`}>
                      <rect
                        x={centerX - dotSize / 2}
                        y={rectY}
                        width={dotSize}
                        height={dotSize}
                        rx={dotRadius}
                        fill={getAnnotationColor(a)}
                        opacity={0.9}
                      />
                      {a.callType && (
                        <text
                          x={centerX}
                          y={centerY}
                          fontSize="9px"
                          fontWeight="bold"
                          fill="#fff"
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {a.callType}
                        </text>
                      )}
                    </g>
                  );
                }),
              )}
            </g>

            {/* ── Main chart area ── */}
            <g transform={`translate(0, ${annotRowHeight})`}>
              {gridLines.map((val) => {
                const isBoundary = val === 0 || val === 1000;
                return (
                  <line
                    key={`grid-${val}`}
                    x1={chartPadding.left}
                    y1={toY(val)}
                    x2={chartPadding.left + chartWidth}
                    y2={toY(val)}
                    stroke={isBoundary ? boundaryGridColor : gridColor}
                    strokeWidth={isBoundary ? 1.5 : 1}
                  />
                );
              })}


              {/* Area fills */}
              <polygon points={team1Area} fill={fillColor1} fillOpacity={isDark ? 0.08 : 0.04} />
              <polygon points={team2Area} fill={fillColor2} fillOpacity={isDark ? 0.08 : 0.04} />

              {/* Team 1 line (climbs from bottom) */}
              <polyline
                points={team1Line}
                fill="none"
                stroke={lineColor1}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Team 2 line (climbs from bottom) */}
              <polyline
                points={team2Line}
                fill="none"
                stroke={lineColor2}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data point dots — Team 1 */}
              {team1Points.map((score, i) => (
                <circle
                  key={`d1-${i}`}
                  cx={toX(i)}
                  cy={toY(score)}
                  r={3}
                  fill={lineColor1}
                />
              ))}

              {/* Data point dots — Team 2 */}
              {team2Points.map((score, i) => (
                <circle
                  key={`d2-${i}`}
                  cx={toX(i)}
                  cy={toY(score)}
                  r={3}
                  fill={lineColor2}
                />
              ))}

            </g>

            {/* ── Team 1 annotation row (below chart) ── */}
            <g transform={`translate(0, ${annotRowHeight + svgHeight})`}>
              {Array.from(team1Groups.entries()).map(([roundIdx, annots]) =>
                annots.map((a, ai) => {
                  const rectY = ai * annotSpacing;
                  const centerX = toX(roundIdx + 1);
                  const centerY = rectY + dotSize / 2;
                  return (
                    <g key={`t1-${roundIdx}-${ai}`}>
                      <rect
                        x={centerX - dotSize / 2}
                        y={rectY}
                        width={dotSize}
                        height={dotSize}
                        rx={dotRadius}
                        fill={getAnnotationColor(a)}
                        opacity={0.9}
                      />
                      {a.callType && (
                        <text
                          x={centerX}
                          y={centerY}
                          fontSize="9px"
                          fontWeight="bold"
                          fill="#fff"
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {a.callType}
                        </text>
                      )}
                    </g>
                  );
                }),
              )}
            </g>
          </svg>

          {/* Team 1 Player Block */}
          <Box sx={{ borderBottom: `3px solid ${theme.palette.team1}`, pb: 1, width: "100%" }}>
            <TeamPlayerBlock
              player1={permutedPlayers[0]}
              player2={permutedPlayers[1]}
              align="left"
            />
          </Box>
        </Box>
      </Box>

      {/* Footer / Close Button */}
      <Box
        sx={{
          p: 2,
          pb: "calc(16px + env(safe-area-inset-bottom))",
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.default",
          flexShrink: 0,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={onClose}
          fullWidth
          size="large"
        >
          {t("game.scoreProgressClose")}
        </Button>
      </Box>
    </Dialog>
  );
};

export default ScoreProgressDialog;

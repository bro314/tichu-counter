import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import * as sx from "../styles/commonStyles";

interface PlayerInfo {
  avatar: string;
  displayName: string;
}

interface TeamPlayerBlockProps {
  player1: PlayerInfo;
  player2: PlayerInfo;
  align?: "left" | "right";
}

const TeamPlayerBlock = ({ player1, player2, align = "left" }: TeamPlayerBlockProps) => {
  const isRight = align === "right";

  const renderPlayerRow = (p: PlayerInfo) => {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          justifyContent: isRight ? "flex-end" : "flex-start",
          width: "100%",
          minWidth: 0,
        }}
      >
        {!isRight ? (
          <>
            <Typography
              sx={{
                ...sx.lgEmojiNoneFont,
                flexShrink: 0,
              }}
            >
              {p.avatar}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                ...sx.playerNameLarge,
                minWidth: 0,
              }}
              noWrap
            >
              {p.displayName}
            </Typography>
          </>
        ) : (
          <>
            <Typography
              variant="body1"
              sx={{
                ...sx.playerNameLarge,
                minWidth: 0,
              }}
              noWrap
            >
              {p.displayName}
            </Typography>
            <Typography
              sx={{
                ...sx.lgEmojiNoneFont,
                flexShrink: 0,
              }}
            >
              {p.avatar}
            </Typography>
          </>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: isRight ? "flex-end" : "flex-start",
        gap: 0.5,
      }}
    >
      {renderPlayerRow(player1)}
      {renderPlayerRow(player2)}
    </Box>
  );
};

export default TeamPlayerBlock;

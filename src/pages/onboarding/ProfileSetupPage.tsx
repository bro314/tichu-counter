import { useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeMode } from "../../contexts/ThemeContext";
import { AVATAR_EMOJIS } from "../../constants";
import * as sx from "../../styles/commonStyles";

interface ProfileSetupPageProps {
  onComplete: () => void;
}

const ProfileSetupPage = ({ onComplete }: ProfileSetupPageProps) => {
  const { t, i18n } = useTranslation();
  const { user, updateProfile } = useAuth();
  const { mode, setMode } = useThemeMode();

  const [displayName, setDisplayName] = useState(() => {
    if (user?.displayName) return user.displayName;
    if (user?.email) {
      const localPart = user.email.split("@")[0];
      if (localPart) {
        const cleaned = localPart.replace(/[^a-zA-ZäöüßÄÖÜ]/g, " ");
        const words = cleaned.split(/\s+/).filter(Boolean);
        return words
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
      }
    }
    return "";
  });
  const [avatar, setAvatar] = useState(() => {
    const idx = Math.floor(Math.random() * Math.min(12, AVATAR_EMOJIS.length));
    return AVATAR_EMOJIS[idx] || "🦊";
  });
  const [language, setLanguage] = useState(i18n.language);
  const [theme, setTheme] = useState(mode);
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const handleThemeChange = (
    _: React.MouseEvent<HTMLElement>,
    newTheme: string | null,
  ) => {
    if (newTheme === "light" || newTheme === "dark") {
      setTheme(newTheme);
      setMode(newTheme);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await updateProfile({
        displayName: displayName || "Player",
        avatar,
        language,
        theme,
        createdAt: new Date(),
      });
      onComplete();
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "auto",
        px: 3,
        py: 4,
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <Typography variant="h5" sx={{ mb: 4, fontWeight: 700 }}>
        {t("onboarding.setupProfile")}
      </Typography>

      {/* Avatar picker — scrollable container showing ~3 rows */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t("onboarding.chooseAvatar")}
      </Typography>
      <Box sx={sx.avatarGridContainer}>
        <Box sx={sx.avatarGrid}>
          {AVATAR_EMOJIS.map((emoji) => (
            <Box
              key={emoji}
              onClick={() => setAvatar(emoji)}
              sx={sx.avatarItem(avatar === emoji)}
            >
              {emoji}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Display name */}
      <TextField
        id="display-name-input"
        label={t("settings.displayName")}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
        placeholder="Player"
      />

      {/* Language */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="language-label">
          {t("onboarding.chooseLanguage")}
        </InputLabel>
        <Select
          id="onboarding-language-select"
          labelId="language-label"
          value={language}
          label={t("onboarding.chooseLanguage")}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="de">Deutsch</MenuItem>
        </Select>
      </FormControl>

      {/* Theme */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t("onboarding.chooseTheme")}
      </Typography>
      <ToggleButtonGroup
        id="theme-toggle-group"
        value={theme}
        exclusive
        onChange={handleThemeChange}
        fullWidth
        sx={{ mb: 4 }}
      >
        <ToggleButton value="light" sx={{ py: 1.2 }}>
          ☀️ {t("settings.lightTheme")}
        </ToggleButton>
        <ToggleButton value="dark" sx={{ py: 1.2 }}>
          🌙 {t("settings.darkTheme")}
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Finish button */}
      <Box sx={{ mt: "auto" }}>
        <Button
          id="finish-onboarding-btn"
          variant="contained"
          size="large"
          fullWidth
          onClick={handleFinish}
          disabled={loading}
          sx={sx.ctaButton}
        >
          {t("onboarding.finish")}
        </Button>
      </Box>
    </Box>
  );
};

export default ProfileSetupPage;

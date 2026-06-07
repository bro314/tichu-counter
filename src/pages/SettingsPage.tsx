import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import LanguageIcon from "@mui/icons-material/Language";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { useThemeMode } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { AVATAR_EMOJIS } from "../constants";
import * as sx from "../styles/commonStyles";
import { shape } from "../styles/tokens";
import { useOfflineSync } from "../contexts/offlineSyncContext";

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { themeSetting } = useThemeMode();
  const { profile, updateProfile, signOut, deleteAccount } = useAuth();
  const { hasAnyUnsavedData, clearPendingQueue } = useOfflineSync();

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [editName, setEditName] = useState(profile?.displayName || "");

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [signOutUnsavedDialogOpen, setSignOutUnsavedDialogOpen] = useState(false);

  const [errorSnackbarOpen, setErrorSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleDeleteConfirmOpen = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirmClose = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteDialogOpen(false);
      await deleteAccount();
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("Failed to delete account:", err);
      if (err?.code === "auth/requires-recent-login" || err?.message?.includes("recent")) {
        setErrorMessage(t("settings.deleteAccountReauth"));
      } else {
        setErrorMessage(err?.message || t("auth.errorAuthFailed"));
      }
      setErrorSnackbarOpen(true);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    await updateProfile({ language: lang });
  };

  const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
    await updateProfile({ theme: newTheme });
  };

  const handleAvatarSelect = async (emoji: string) => {
    try {
      await updateProfile({ avatar: emoji });
      setAvatarDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message || t("settings.errorUpdateProfile"));
      setErrorSnackbarOpen(true);
    }
  };

  const handleNameSave = async () => {
    if (editName.trim()) {
      try {
        await updateProfile({ displayName: editName.trim() });
        setNameDialogOpen(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMessage(message || t("settings.errorUpdateProfile"));
        setErrorSnackbarOpen(true);
      }
    } else {
      setNameDialogOpen(false);
    }
  };

  const handleSignOut = async () => {
    if (hasAnyUnsavedData()) {
      setSignOutUnsavedDialogOpen(true);
    } else {
      navigate("/", { replace: true });
      await signOut();
    }
  };

  const handleConfirmSignOut = async () => {
    setSignOutUnsavedDialogOpen(false);
    clearPendingQueue();
    navigate("/", { replace: true });
    await signOut();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        boxSizing: "border-box",
        px: 1,
        pt: 2,
        overflowY: "auto",
      }}
    >
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t("settings.title")}
      </Typography>

      <Card
        elevation={2}
        sx={{
          mb: 1,
          borderRadius: `${shape.borderRadius}px`,
        }}
      >
        <List dense>
          {/* Avatar */}
          <ListItem
            sx={{ cursor: "pointer" }}
            onClick={() => setAvatarDialogOpen(true)}
          >
            <ListItemIcon>
              <EmojiEmotionsIcon />
            </ListItemIcon>
            <ListItemText primary={t("settings.avatar")} />
            <Typography variant="h5">{profile?.avatar || "🐉"}</Typography>
          </ListItem>

          {/* Display Name */}
          <ListItem
            sx={{ cursor: "pointer" }}
            onClick={() => {
              setEditName(profile?.displayName || "");
              setNameDialogOpen(true);
            }}
          >
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText
              primary={t("settings.displayName")}
              secondary={profile?.displayName || "Player"}
            />
          </ListItem>
        </List>
      </Card>

      <Card
        elevation={2}
        sx={{
          mb: 1,
          borderRadius: `${shape.borderRadius}px`,
        }}
      >
        <List dense>
          {/* Language */}
          <ListItem>
            <ListItemIcon>
              <LanguageIcon />
            </ListItemIcon>
            <ListItemText primary={t("settings.language")} />
            <Select
              id="language-select"
              value={i18n.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              size="small"
              variant="outlined"
              sx={{ minWidth: 100 }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="de">Deutsch</MenuItem>
            </Select>
          </ListItem>

          {/* Theme */}
          <ListItem>
            <ListItemIcon>
              <DarkModeIcon />
            </ListItemIcon>
            <ListItemText primary={t("settings.theme")} />
            <Select
              id="theme-select"
              value={themeSetting}
              onChange={(e) => handleThemeChange(e.target.value as any)}
              size="small"
              variant="outlined"
              sx={{ minWidth: 100 }}
            >
              <MenuItem value="system">{t("settings.systemTheme")}</MenuItem>
              <MenuItem value="light">{t("settings.lightTheme")}</MenuItem>
              <MenuItem value="dark">{t("settings.darkTheme")}</MenuItem>
            </Select>
          </ListItem>
        </List>
      </Card>

      <Box sx={{ mt: "auto", pb: 1, display: "flex", gap: 1, alignItems: "center" }}>
        <Button
          id="sign-out-btn"
          variant="outlined"
          size="large"
          color="error"
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={handleSignOut}
        >
          {t("settings.signOut")}
        </Button>
        <IconButton
          id="settings-options-menu-btn"
          onClick={handleMenuOpen}
          sx={{ flexShrink: 0 }}
        >
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* Settings Options Menu */}
      <Menu
        id="settings-options-menu"
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          id="delete-account-menu-item"
          onClick={handleDeleteConfirmOpen}
          sx={{ color: "error.main" }}
        >
          {t("settings.deleteAccount")}
        </MenuItem>
      </Menu>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteConfirmClose}
      >
        <DialogTitle>{t("settings.deleteAccountConfirmTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.deleteAccountConfirmMessage")}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            id="cancel-delete-account-btn"
            onClick={handleDeleteConfirmClose}
            variant="outlined"
            color="inherit"
          >
            {t("common.cancel")}
          </Button>
          <Button
            id="confirm-delete-account-btn"
            onClick={handleDeleteAccount}
            variant="contained"
            color="error"
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sign Out Unsaved Changes Warning Dialog */}
      <Dialog
        open={signOutUnsavedDialogOpen}
        onClose={() => setSignOutUnsavedDialogOpen(false)}
      >
        <DialogTitle>{t("settings.signOutUnsavedConfirmTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.signOutUnsavedConfirmMessage")}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            id="cancel-sign-out-unsaved-btn"
            onClick={() => setSignOutUnsavedDialogOpen(false)}
            variant="outlined"
            color="inherit"
          >
            {t("common.cancel")}
          </Button>
          <Button
            id="confirm-sign-out-unsaved-btn"
            onClick={handleConfirmSignOut}
            variant="contained"
            color="error"
          >
            {t("settings.signOut")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Avatar picker dialog */}
      <Dialog
        open={avatarDialogOpen}
        onClose={() => setAvatarDialogOpen(false)}
      >
        <DialogTitle>{t("onboarding.chooseAvatar")}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={sx.avatarGrid}>
            {AVATAR_EMOJIS.map((emoji) => (
              <Box
                key={emoji}
                onClick={() => handleAvatarSelect(emoji)}
                sx={sx.avatarItemLarge(profile?.avatar === emoji)}
              >
                {emoji}
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Display name edit dialog */}
      <Dialog
        open={nameDialogOpen}
        onClose={() => setNameDialogOpen(false)}
      >
        <DialogTitle>{t("settings.displayName")}</DialogTitle>
        <DialogContent>
          <TextField
            id="edit-display-name-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            fullWidth
            autoFocus
            sx={{ mt: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSave();
            }}
          />
          <Button
            id="save-name-btn"
            variant="contained"
            fullWidth
            onClick={handleNameSave}
            sx={{ mt: 2 }}
          >
            {t("common.save")}
          </Button>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={errorSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setErrorSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setErrorSnackbarOpen(false)}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage;

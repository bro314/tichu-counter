import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import PersonIcon from "@mui/icons-material/Person";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { useAuth } from "../contexts/AuthContext";
import { fetchPlayers, searchPlayers } from "../services/playerService";
import type { RegisteredPlayer } from "../services/playerService";
import { fetchAllTags } from "../services/gameService";
import * as sx from "../styles/commonStyles";

const filterOptions = createFilterOptions<RegisteredPlayer>({
  matchFrom: "start",
  stringify: (option) => option.displayName,
});

type SearchMode = "player" | "tag";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSearchPlayer: (player: RegisteredPlayer) => void;
  onSearchTag: (tag: string) => void;
}

const SearchDialog = ({
  open,
  onClose,
  onSearchPlayer,
  onSearchTag,
}: SearchDialogProps) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();

  const [mode, setMode] = useState<SearchMode>("player");
  const [selectedPlayer, setSelectedPlayer] =
    useState<RegisteredPlayer | null>(null);
  const [playerInput, setPlayerInput] = useState("");

  const [recentOpponents, setRecentOpponents] = useState<RegisteredPlayer[]>([]);
  const [playerOptions, setPlayerOptions] = useState<RegisteredPlayer[]>([]);

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  // Load recent opponents and tags when dialog opens
  useEffect(() => {
    if (open) {
      if (user) {
        fetchAllTags()
          .then(setAvailableTags)
          .catch(console.error);

        const recentUids = profile?.recentOpponentUids || [];
        if (recentUids.length > 0) {
          fetchPlayers(recentUids)
            .then(setRecentOpponents)
            .catch(console.error);
        } else {
          setRecentOpponents([]);
        }
      }

      setSelectedPlayer(null);
      setPlayerInput("");
      setSelectedTag(null);
      setTagInput("");
      setPlayerOptions([]);
    }
  }, [open, profile?.recentOpponentUids, user]);

  // Debounced search for Player Input
  useEffect(() => {
    const term = playerInput.trim();
    if (!term) {
      setPlayerOptions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchPlayers(term, profile?.isTestUser ?? false);
        setPlayerOptions(results);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [playerInput, profile?.isTestUser]);

  const handleApply = () => {
    if (mode === "player" && selectedPlayer) {
      onSearchPlayer(selectedPlayer);
    } else if (mode === "tag" && selectedTag) {
      onSearchTag(selectedTag);
    }
  };

  const canApply =
    (mode === "player" && selectedPlayer !== null) ||
    (mode === "tag" && selectedTag !== null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("home.searchTitle")}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {/* Mode toggle chips */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip
              icon={<PersonIcon />}
              label={t("home.searchByPlayer")}
              variant={mode === "player" ? "filled" : "outlined"}
              color={mode === "player" ? "primary" : "default"}
              onClick={() => setMode("player")}
              sx={{ ...sx.semiboldFont }}
            />
            <Chip
              icon={<LocalOfferIcon />}
              label={t("home.searchByTag")}
              variant={mode === "tag" ? "filled" : "outlined"}
              color={mode === "tag" ? "primary" : "default"}
              onClick={() => setMode("tag")}
              sx={{ ...sx.semiboldFont }}
            />
          </Box>

          {/* Player search mode */}
          {mode === "player" && (
            <Autocomplete
              id="search-player-input"
              options={playerInput.trim() === "" ? recentOpponents : playerOptions}
              value={selectedPlayer}
              inputValue={playerInput}
              filterOptions={filterOptions}
              onChange={(_, newVal) => {
                if (typeof newVal === "string" || newVal === null) {
                  setSelectedPlayer(null);
                } else {
                  setSelectedPlayer(newVal);
                }
              }}
              onInputChange={(_, newInput, reason) => {
                if (reason !== "reset") setPlayerInput(newInput);
              }}
              getOptionLabel={(option) => {
                if (typeof option === "string") return option;
                return `${option.avatar} ${option.displayName}`;
              }}
              isOptionEqualToValue={(opt, val) => opt.uid === val.uid}
              size="small"
              fullWidth
              renderOption={(props, option) => {
                const { key, ...rest } =
                  props as React.HTMLAttributes<HTMLLIElement> & {
                    key: string;
                  };
                return (
                  <Box
                    component="li"
                    key={key}
                    {...rest}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Typography sx={{ ...sx.avatarListFont }}>
                      {option.avatar}
                    </Typography>
                    <Typography variant="body2">
                      {option.displayName}
                    </Typography>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("home.searchByPlayer")}
                  placeholder={t("home.searchPlayerPlaceholder")}
                  autoFocus
                />
              )}
            />
          )}

          {/* Tag search mode */}
          {mode === "tag" && (
            <Autocomplete
              id="search-tag-input"
              options={availableTags}
              value={selectedTag}
              inputValue={tagInput}
              onChange={(_, newVal) => {
                setSelectedTag(newVal);
              }}
              onInputChange={(_, newInput, reason) => {
                if (reason !== "reset") setTagInput(newInput);
              }}
              size="small"
              fullWidth
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("home.searchByTag")}
                  placeholder={t("home.searchTagPlaceholder")}
                  autoFocus
                />
              )}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={!canApply}
        >
          {t("home.search")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SearchDialog;

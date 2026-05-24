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
import { fetchAllPlayers } from "../services/playerService";
import type { RegisteredPlayer } from "../services/playerService";

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
  const { profile } = useAuth();

  const [mode, setMode] = useState<SearchMode>("player");
  const [registeredPlayers, setRegisteredPlayers] = useState<
    RegisteredPlayer[]
  >([]);
  const [selectedPlayer, setSelectedPlayer] =
    useState<RegisteredPlayer | null>(null);
  const [playerInput, setPlayerInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  // Load registered players when dialog opens
  useEffect(() => {
    if (open) {
      fetchAllPlayers(profile?.isTestUser ?? false)
        .then(setRegisteredPlayers)
        .catch(console.error);
      setSelectedPlayer(null);
      setPlayerInput("");
      setTagInput("");
    }
  }, [open, profile?.isTestUser]);

  const handleApply = () => {
    if (mode === "player" && selectedPlayer) {
      onSearchPlayer(selectedPlayer);
    } else if (mode === "tag" && tagInput.trim()) {
      onSearchTag(tagInput.trim());
    }
  };

  const canApply =
    (mode === "player" && selectedPlayer !== null) ||
    (mode === "tag" && tagInput.trim().length > 0);

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
              sx={{ fontWeight: 600 }}
            />
            <Chip
              icon={<LocalOfferIcon />}
              label={t("home.searchByTag")}
              variant={mode === "tag" ? "filled" : "outlined"}
              color={mode === "tag" ? "primary" : "default"}
              onClick={() => setMode("tag")}
              sx={{ fontWeight: 600 }}
            />
          </Box>

          {/* Player search mode */}
          {mode === "player" && (
            <Autocomplete
              id="search-player-input"
              options={registeredPlayers}
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
                    <Typography sx={{ fontSize: "1.2rem" }}>
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
            <TextField
              label={t("home.searchByTag")}
              placeholder={t("home.searchTagPlaceholder")}
              value={tagInput}
              onChange={(e) => {
                if (e.target.value.length <= 12) {
                  setTagInput(e.target.value);
                }
              }}
              helperText={`${tagInput.length}/12`}
              size="small"
              fullWidth
              autoFocus
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

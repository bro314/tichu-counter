import type { PlayerSlot } from '../types/game';

export interface PlayerNameResolver {
  displayName: string;
  avatar?: string;
}

/**
 * Get display name for a player slot.
 *
 * @param slot - The player slot to resolve
 * @param currentUserProfile - Profile of the logged-in user (for self-reference)
 * @param isCurrentUser - Whether this slot is the current user
 * @param playerProfiles - Optional map of uid → profile for resolving other registered players
 */
export function getPlayerName(
  slot: PlayerSlot,
  currentUserProfile: PlayerNameResolver | null,
  isCurrentUser: boolean,
  playerProfiles?: Map<string, PlayerNameResolver>,
): string {
  if (isCurrentUser && currentUserProfile) return currentUserProfile.displayName;
  if (slot.uid && playerProfiles) {
    const resolved = playerProfiles.get(slot.uid);
    if (resolved) return resolved.displayName;
  }
  if (slot.guestName) return slot.guestName;
  return 'Player';
}

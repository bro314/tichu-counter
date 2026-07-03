import type { PlayerSlot } from './game';

// ─── Status ───────────────────────────────────────────────────
export type TournamentStatus = 'preparation' | 'creation' | 'execution' | 'finished';

// ─── Core types ───────────────────────────────────────────────
export interface Tournament {
  id: string;
  createdAt: Date;
  name: string;
  tag?: string;
  format: 'group' | 'ko';
  selfRegister: boolean;
  adminUids: string[];
  status: TournamentStatus;

  /** Group format only — populated during creation phase */
  groupCount?: number;
  groups?: TournamentGroup[];

  /** KO format only — populated during creation phase */
  bracket?: KOBracket;
}

export interface TournamentTeam {
  id: string;
  name: string;
  player1: PlayerSlot;
  player2: PlayerSlot;
}

// ─── Group types ──────────────────────────────────────────────
export interface TournamentGroup {
  name: string;       // "A", "B", "C", ...
  teamIds: string[];
}

export interface GroupFixture {
  team1Id: string;
  team2Id: string;
}

/** Row in the group ranking table */
export interface GroupRankingEntry {
  teamId: string;
  wins: number;
  pointDifferential: number;
}

// ─── KO types ─────────────────────────────────────────────────
export interface KOBracket {
  rounds: KORound[];
}

export interface KORound {
  name: string;       // "Round of 16", "Quarterfinal", etc.
  matches: KOMatch[];
}

export interface KOMatch {
  team1Id: string | null;  // null = TBD
  team2Id: string | null;  // null = TBD or bye
  gameId: string | null;   // Firestore game ID (null until execution)
  isBye: boolean;
  winnerId?: string;
}

// ─── KO round naming ─────────────────────────────────────────

/**
 * Get the KO round name based on how many teams compete in the round.
 *
 * Uses "Round of N" pattern:
 * - 2 teams  (1 match) → Final
 * - 4 teams  (2 matches) → Semifinal
 * - 8 teams  (4 matches) → Quarterfinal
 * - N teams  → Round of N
 */
export function getKORoundName(teamCount: number, lang: 'en' | 'de' = 'en'): string {
  if (teamCount <= 2) return lang === 'de' ? 'Finale' : 'Final';
  if (teamCount <= 4) return lang === 'de' ? 'Halbfinale' : 'Semifinal';
  if (teamCount <= 8) return lang === 'de' ? 'Viertelfinale' : 'Quarterfinal';
  return lang === 'de' ? `Runde der ${teamCount}` : `Round of ${teamCount}`;
}

// ─── Group generation ─────────────────────────────────────────

/**
 * Randomly distribute teams across groups as evenly as possible.
 * Group names are uppercase letters: A, B, C, ...
 * The largest group has at most 1 more team than the smallest.
 */
export function generateGroupAssignments(
  teamIds: string[],
  groupCount: number,
): TournamentGroup[] {
  // Shuffle randomly
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);

  const groups: TournamentGroup[] = [];
  for (let i = 0; i < groupCount; i++) {
    groups.push({
      name: String.fromCharCode(65 + i), // A, B, C, ...
      teamIds: [],
    });
  }

  // Distribute round-robin
  shuffled.forEach((teamId, index) => {
    groups[index % groupCount].teamIds.push(teamId);
  });

  return groups;
}

/**
 * Generate all pairings for a round-robin group (each pair plays once).
 */
export function generateGroupFixtures(group: TournamentGroup): GroupFixture[] {
  const fixtures: GroupFixture[] = [];
  const teams = group.teamIds;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      fixtures.push({ team1Id: teams[i], team2Id: teams[j] });
    }
  }
  return fixtures;
}

// ─── KO bracket generation ───────────────────────────────────

/**
 * Generate a single-elimination KO bracket for the given teams.
 *
 * If the number of teams is not a power of 2, some teams receive
 * first-round byes (randomly assigned). The bracket is structured
 * so that the total slots in round 1 equal the next power of 2.
 */
export function generateKOBracket(teamIds: string[]): KOBracket {
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  const n = shuffled.length;

  // Next power of 2
  const totalSlots = Math.pow(2, Math.ceil(Math.log2(n)));
  const byeCount = totalSlots - n;

  // Round 1: pair up. Some get byes.
  const round1Matches: KOMatch[] = [];
  let teamIndex = 0;

  // First, create bye matches for teams that advance automatically
  for (let i = 0; i < byeCount; i++) {
    round1Matches.push({
      team1Id: shuffled[teamIndex],
      team2Id: null,
      gameId: null,
      isBye: true,
      winnerId: shuffled[teamIndex], // auto-advance
    });
    teamIndex++;
  }

  // Then, create real matches for the remaining teams
  while (teamIndex < n) {
    round1Matches.push({
      team1Id: shuffled[teamIndex],
      team2Id: shuffled[teamIndex + 1],
      gameId: null,
      isBye: false,
    });
    teamIndex += 2;
  }

  // Build subsequent rounds with empty (TBD) matches
  const rounds: KORound[] = [];
  const round1TeamCount = totalSlots;
  rounds.push({
    name: getKORoundName(round1TeamCount),
    matches: round1Matches,
  });

  let currentMatchCount = round1Matches.length;
  let currentTeamCount = totalSlots;
  while (currentTeamCount > 2) {
    currentTeamCount = currentTeamCount / 2;
    currentMatchCount = Math.ceil(currentMatchCount / 2);
    const nextRoundMatches: KOMatch[] = [];
    for (let i = 0; i < currentMatchCount; i++) {
      nextRoundMatches.push({
        team1Id: null,
        team2Id: null,
        gameId: null,
        isBye: false,
      });
    }
    rounds.push({
      name: getKORoundName(currentTeamCount),
      matches: nextRoundMatches,
    });
  }

  return { rounds };
}

// ─── Player and Team matching helpers ────────────────────────

export function matchPlayer(p1: PlayerSlot, p2: PlayerSlot): boolean {
  if (p1.uid && p2.uid) return p1.uid === p2.uid;
  if (!p1.uid && !p2.uid) {
    const n1 = p1.guestName?.trim().toLowerCase();
    const n2 = p2.guestName?.trim().toLowerCase();
    return !!n1 && n1 === n2;
  }
  return false;
}

export function matchTeam(team: TournamentTeam, s1: PlayerSlot, s2: PlayerSlot): boolean {
  return (
    (matchPlayer(team.player1, s1) && matchPlayer(team.player2, s2)) ||
    (matchPlayer(team.player1, s2) && matchPlayer(team.player2, s1))
  );
}

export function findTeamForPlayers(
  teams: TournamentTeam[],
  slots: PlayerSlot[],
): TournamentTeam | undefined {
  if (slots.length < 2) return undefined;
  return teams.find((t) => matchTeam(t, slots[0], slots[1]));
}


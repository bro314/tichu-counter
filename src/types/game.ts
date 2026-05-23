/** Represents a player slot in a game — either a registered user or a guest */
export interface PlayerSlot {
  uid: string | null;       // Firebase UID if registered user
  guestName: string | null; // Name string if guest
}

/** A Tichu game with 4 players in 2 teams */
export interface Game {
  id: string;
  createdBy: string;        // uid of player 1
  createdAt: Date;
  status: 'active' | 'finished';
  /** Player 1 is always the creator. Team 1 = P1+P2, Team 2 = P3+P4 */
  players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot];
  playerUids?: string[];
  isPrivate?: boolean;
  tag?: string;
}

/** A single round of scoring */
export interface Round {
  id: string;
  roundNumber: number;
  team1CardPoints: number;    // -25 to 125, step 5
  team2CardPoints: number;    // always 100 - team1CardPoints (unless 1-2 victory)
  tichuCalls: number[];       // player indices (1-4) who called Tichu
  grandTichuCalls: number[];  // player indices (1-4) who called Grand Tichu
  oneTwoVictory: number;      // 0 = none, 1 = Team 1, 2 = Team 2
  finishedFirst: number;      // player index (1-4) who finished first
  note?: string;              // optional round annotation
  createdAt: Date;
}

/** Computed score for a round including bonuses */
export interface RoundScore {
  team1: number;
  team2: number;
}

/**
 * Calculate the total score for a single round including Tichu/Grand Tichu bonuses.
 */
export function calculateRoundScore(round: Round): RoundScore {
  let team1 = 0;
  let team2 = 0;

  // Card points (or 1-2 victory)
  if (round.oneTwoVictory === 1) {
    team1 += 200;
  } else if (round.oneTwoVictory === 2) {
    team2 += 200;
  } else {
    team1 += round.team1CardPoints;
    team2 += round.team2CardPoints;
  }

  // Tichu calls: +100 if caller finished first, -100 otherwise
  for (const playerNum of round.tichuCalls) {
    const isTeam1 = playerNum <= 2;
    // Tichu requires the caller specifically to finish first
    const callerFinishedFirst = round.finishedFirst === playerNum;

    if (callerFinishedFirst) {
      if (isTeam1) team1 += 100; else team2 += 100;
    } else {
      if (isTeam1) team1 -= 100; else team2 -= 100;
    }
  }

  // Grand Tichu calls: +200 if caller finished first, -200 otherwise
  for (const playerNum of round.grandTichuCalls) {
    const isTeam1 = playerNum <= 2;
    // Grand Tichu requires the caller specifically to finish first
    const callerFinishedFirst = round.finishedFirst === playerNum;

    if (callerFinishedFirst) {
      if (isTeam1) team1 += 200; else team2 += 200;
    } else {
      if (isTeam1) team1 -= 200; else team2 -= 200;
    }
  }

  return { team1, team2 };
}

/**
 * Calculate running totals from a list of rounds.
 * Returns the cumulative score after all rounds.
 */
export function calculateTotals(rounds: Round[]): RoundScore {
  let team1 = 0;
  let team2 = 0;
  for (const round of rounds) {
    const score = calculateRoundScore(round);
    team1 += score.team1;
    team2 += score.team2;
  }
  return { team1, team2 };
}

/**
 * Check if the game is over.
 * A team wins when score >= 1000 AND strictly higher than opponent.
 * Returns 0 if no winner, 1 if Team 1 wins, 2 if Team 2 wins.
 */
export function checkWinner(totals: RoundScore): number {
  if (totals.team1 >= 1000 && totals.team1 > totals.team2) return 1;
  if (totals.team2 >= 1000 && totals.team2 > totals.team1) return 2;
  return 0;
}

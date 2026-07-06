import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { createGame, fetchGamesByTournament } from './gameService';
import type { PlayerSlot } from '../types/game';
import { calculateTotals, checkWinner } from '../types/game';
import type {
  Tournament,
  TournamentTeam,
  TournamentGroup,
  KOBracket,
} from '../types/tournament';
import { generateGroupFixtures, matchTeam } from '../types/tournament';

// ─── Firestore conversion ─────────────────────────────────────

function docToTournament(id: string, data: Record<string, unknown>): Tournament {
  return {
    id,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    name: data.name as string,
    tag: data.tag as string | undefined,
    format: data.format as 'group' | 'ko',
    selfRegister: data.selfRegister as boolean,
    adminUids: (data.adminUids as string[]) || [],
    status: data.status as Tournament['status'],
    groupCount: data.groupCount as number | undefined,
    groups: data.groups as TournamentGroup[] | undefined,
    bracket: data.bracket as KOBracket | undefined,
  };
}

function docToTeam(id: string, data: Record<string, unknown>): TournamentTeam {
  return {
    id,
    name: data.name as string,
    player1: data.player1 as PlayerSlot,
    player2: data.player2 as PlayerSlot,
  };
}

// ─── Tournament CRUD ──────────────────────────────────────────

/** Create a new tournament */
export async function createTournament(data: {
  name: string;
  tag?: string;
  format: 'group' | 'ko';
  selfRegister: boolean;
  adminUids: string[];
}): Promise<string> {
  const docRef = await addDoc(collection(db, 'tournaments'), {
    ...data,
    tag: data.tag?.trim() || null,
    createdAt: Timestamp.now(),
    status: 'preparation',
  });
  return docRef.id;
}

/** Fetch a single tournament by ID */
export async function fetchTournament(id: string): Promise<Tournament | null> {
  const docSnap = await getDoc(doc(db, 'tournaments', id));
  if (!docSnap.exists()) return null;
  return docToTournament(docSnap.id, docSnap.data());
}

/** Fetch all tournaments */
export async function fetchAllTournaments(): Promise<Tournament[]> {
  const snap = await getDocs(collection(db, 'tournaments'));
  const tournaments = snap.docs.map((d) => docToTournament(d.id, d.data()));
  return tournaments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Update tournament fields */
export async function updateTournament(
  id: string,
  data: Partial<Omit<Tournament, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'tournaments', id), data as Record<string, any>);
}

/** Delete a tournament, all its teams, and all its games */
export async function deleteTournament(id: string): Promise<void> {
  // Delete all teams first
  const teamsSnap = await getDocs(collection(db, 'tournaments', id, 'teams'));
  const deletePromises = teamsSnap.docs.map((d) =>
    deleteDoc(doc(db, 'tournaments', id, 'teams', d.id))
  );
  await Promise.all(deletePromises);

  // Delete all games associated with this tournament
  const games = await fetchGamesByTournament(id);
  const deleteGamesPromises = games.map((g) =>
    deleteDoc(doc(db, 'games', g.id))
  );
  await Promise.all(deleteGamesPromises);

  // Delete the tournament document
  await deleteDoc(doc(db, 'tournaments', id));
}

// ─── Phase transitions ───────────────────────────────────────

/** Advance tournament to a new status */
export async function advancePhase(
  id: string,
  newStatus: Tournament['status'],
): Promise<void> {
  await updateDoc(doc(db, 'tournaments', id), { status: newStatus });
}

// ─── Team CRUD ────────────────────────────────────────────────

/** Add a team to a tournament */
export async function addTeam(
  tournamentId: string,
  team: Omit<TournamentTeam, 'id'>,
): Promise<string> {
  // Validate unique name within tournament
  const existingTeams = await fetchTeams(tournamentId);
  const nameTaken = existingTeams.some(
    (t) => t.name.toLowerCase() === team.name.toLowerCase(),
  );
  if (nameTaken) {
    throw new Error('TEAM_NAME_TAKEN');
  }

  // Validate no registered player participates twice in the tournament
  const registeredUids = [team.player1.uid, team.player2.uid].filter(Boolean) as string[];
  for (const t of existingTeams) {
    const existingUids = [t.player1.uid, t.player2.uid].filter(Boolean) as string[];
    for (const uid of registeredUids) {
      if (existingUids.includes(uid)) {
        throw new Error('PLAYER_ALREADY_IN_TOURNAMENT');
      }
    }
  }

  const docRef = await addDoc(
    collection(db, 'tournaments', tournamentId, 'teams'),
    {
      name: team.name,
      player1: team.player1,
      player2: team.player2,
    },
  );
  return docRef.id;
}

/** Update a team in a tournament */
export async function updateTeam(
  tournamentId: string,
  teamId: string,
  data: Partial<Omit<TournamentTeam, 'id'>>,
): Promise<void> {
  // If name is changing, validate uniqueness
  if (data.name !== undefined) {
    const existingTeams = await fetchTeams(tournamentId);
    const nameTaken = existingTeams.some(
      (t) => t.id !== teamId && t.name.toLowerCase() === data.name!.toLowerCase(),
    );
    if (nameTaken) {
      throw new Error('TEAM_NAME_TAKEN');
    }
  }

  // If players are changing, validate no duplicate registered players
  if (data.player1 !== undefined || data.player2 !== undefined) {
    const existingTeams = await fetchTeams(tournamentId);
    const currentTeam = existingTeams.find((t) => t.id === teamId);
    const newPlayer1 = data.player1 || currentTeam?.player1;
    const newPlayer2 = data.player2 || currentTeam?.player2;
    const registeredUids = [newPlayer1?.uid, newPlayer2?.uid].filter(Boolean) as string[];

    for (const t of existingTeams) {
      if (t.id === teamId) continue;
      const existingUids = [t.player1.uid, t.player2.uid].filter(Boolean) as string[];
      for (const uid of registeredUids) {
        if (existingUids.includes(uid)) {
          throw new Error('PLAYER_ALREADY_IN_TOURNAMENT');
        }
      }
    }
  }

  await updateDoc(
    doc(db, 'tournaments', tournamentId, 'teams', teamId),
    data as Record<string, any>,
  );
}

/** Delete a team from a tournament */
export async function deleteTeam(
  tournamentId: string,
  teamId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'tournaments', tournamentId, 'teams', teamId));
}

/** Fetch all teams for a tournament */
export async function fetchTeams(tournamentId: string): Promise<TournamentTeam[]> {
  const snap = await getDocs(
    collection(db, 'tournaments', tournamentId, 'teams'),
  );
  return snap.docs.map((d) => docToTeam(d.id, d.data()));
}

/** Import (copy) teams from another tournament */
export async function importTeamsFromTournament(
  sourceTournamentId: string,
  targetTournamentId: string,
  teamIds: string[],
): Promise<void> {
  const sourceTeams = await fetchTeams(sourceTournamentId);
  const teamsToImport = sourceTeams.filter((t) => teamIds.includes(t.id));

  for (const team of teamsToImport) {
    // addTeam handles name and player uniqueness validation
    await addTeam(targetTournamentId, {
      name: team.name,
      player1: team.player1,
      player2: team.player2,
    });
  }
}

// ─── Tournament execution: Groups ────────────────────────────

/**
 * Start a group tournament: create all games for every group.
 * Each pair of teams in a group plays one game.
 */
export async function startGroupTournament(
  tournamentId: string,
  adminUid: string,
): Promise<void> {
  const tournament = await fetchTournament(tournamentId);
  if (!tournament || !tournament.groups) {
    throw new Error('Tournament or groups not found');
  }

  const teams = await fetchTeams(tournamentId);
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  for (const group of tournament.groups) {
    const fixtures = generateGroupFixtures(group);
    for (const fixture of fixtures) {
      const team1 = teamMap.get(fixture.team1Id);
      const team2 = teamMap.get(fixture.team2Id);
      if (!team1 || !team2) continue;

      const players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot] = [
        team1.player1,
        team1.player2,
        team2.player1,
        team2.player2,
      ];

      const label = `Gruppe ${group.name}`;
      await createGame(
        adminUid,
        players,
        false,          // not private
        undefined,      // no tag
        undefined,      // no note
        tournamentId,
        label,
      );
    }
  }

  // Advance to execution
  await advancePhase(tournamentId, 'execution');
}

// ─── Tournament execution: KO ────────────────────────────────

/**
 * Start a KO tournament: create games for the first round
 * (skipping bye matches, which are already resolved).
 */
export async function startKOTournament(
  tournamentId: string,
  adminUid: string,
): Promise<void> {
  const tournament = await fetchTournament(tournamentId);
  if (!tournament || !tournament.bracket) {
    throw new Error('Tournament or bracket not found');
  }

  const teams = await fetchTeams(tournamentId);
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const bracket = { ...tournament.bracket };
  const round1 = bracket.rounds[0];

  for (let i = 0; i < round1.matches.length; i++) {
    const match = round1.matches[i];
    if (match.isBye) continue; // bye already resolved
    if (!match.team1Id || !match.team2Id) continue;

    const team1 = teamMap.get(match.team1Id);
    const team2 = teamMap.get(match.team2Id);
    if (!team1 || !team2) continue;

    const players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot] = [
      team1.player1,
      team1.player2,
      team2.player1,
      team2.player2,
    ];

    const label = round1.name;
    const gameId = await createGame(
      adminUid,
      players,
      false,
      undefined,
      undefined,
      tournamentId,
      label,
    );

    // Store the game ID in the bracket
    round1.matches[i] = { ...match, gameId };
  }

  // Propagate bye winners to the next round
  if (bracket.rounds.length > 1) {
    const round2 = bracket.rounds[1];
    for (let i = 0; i < round1.matches.length; i++) {
      const match = round1.matches[i];
      if (match.isBye && match.winnerId) {
        const nextMatchIndex = Math.floor(i / 2);
        if (nextMatchIndex < round2.matches.length) {
          const nextMatch = { ...round2.matches[nextMatchIndex] };
          if (i % 2 === 0) {
            nextMatch.team1Id = match.winnerId;
          } else {
            nextMatch.team2Id = match.winnerId;
          }
          round2.matches[nextMatchIndex] = nextMatch;
        }
      }
    }

    // Create games for any Round 2 matches that are now fully determined (e.g. from byes)
    for (let i = 0; i < round2.matches.length; i++) {
      const match = round2.matches[i];
      if (match.team1Id && match.team2Id && !match.gameId) {
        const team1 = teamMap.get(match.team1Id);
        const team2 = teamMap.get(match.team2Id);
        if (team1 && team2) {
          const players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot] = [
            team1.player1,
            team1.player2,
            team2.player1,
            team2.player2,
          ];

          const gameId = await createGame(
            adminUid,
            players,
            false,
            undefined,
            undefined,
            tournamentId,
            round2.name,
          );

          round2.matches[i] = { ...match, gameId };
        }
      }
    }
    bracket.rounds[1] = round2;
  }

  // Save updated bracket and advance
  await updateTournament(tournamentId, { bracket });
  await advancePhase(tournamentId, 'execution');
}

/**
 * Handle a KO game finishing: update bracket, optionally create next game.
 * Called client-side when a tournament game finishes.
 */
export async function handleKOGameFinished(
  tournamentId: string,
  gameId: string,
  winnerTeamIndex: 1 | 2, // 1 = team1 won, 2 = team2 won
): Promise<void> {
  const tournament = await fetchTournament(tournamentId);
  if (!tournament || !tournament.bracket) return;

  const bracket = structuredClone(tournament.bracket);

  // Find the match in the bracket
  let foundRoundIdx = -1;
  let foundMatchIdx = -1;
  for (let ri = 0; ri < bracket.rounds.length; ri++) {
    for (let mi = 0; mi < bracket.rounds[ri].matches.length; mi++) {
      if (bracket.rounds[ri].matches[mi].gameId === gameId) {
        foundRoundIdx = ri;
        foundMatchIdx = mi;
        break;
      }
    }
    if (foundRoundIdx >= 0) break;
  }

  if (foundRoundIdx < 0 || foundMatchIdx < 0) return;

  const match = bracket.rounds[foundRoundIdx].matches[foundMatchIdx];
  const winnerId = winnerTeamIndex === 1 ? match.team1Id : match.team2Id;
  if (!winnerId) return;

  if (match.winnerId === winnerId) return;

  // Set the winner
  bracket.rounds[foundRoundIdx].matches[foundMatchIdx] = {
    ...match,
    winnerId,
  };

  // Propagate winner to the next round
  const nextRoundIdx = foundRoundIdx + 1;
  if (nextRoundIdx < bracket.rounds.length) {
    const nextMatchIdx = Math.floor(foundMatchIdx / 2);
    const nextRound = bracket.rounds[nextRoundIdx];
    if (nextMatchIdx < nextRound.matches.length) {
      const nextMatch = { ...nextRound.matches[nextMatchIdx] };
      if (foundMatchIdx % 2 === 0) {
        nextMatch.team1Id = winnerId;
      } else {
        nextMatch.team2Id = winnerId;
      }
      nextRound.matches[nextMatchIdx] = nextMatch;

      // If both teams in the next match are now determined, create the game
      if (nextMatch.team1Id && nextMatch.team2Id && !nextMatch.gameId) {
        const teams = await fetchTeams(tournamentId);
        const teamMap = new Map(teams.map((t) => [t.id, t]));
        const t1 = teamMap.get(nextMatch.team1Id);
        const t2 = teamMap.get(nextMatch.team2Id);

        if (t1 && t2) {
          const players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot] = [
            t1.player1,
            t1.player2,
            t2.player1,
            t2.player2,
          ];

          const adminUid = tournament.adminUids[0];
          const newGameId = await createGame(
            adminUid,
            players,
            false,
            undefined,
            undefined,
            tournamentId,
            nextRound.name,
          );
          nextMatch.gameId = newGameId;
          nextRound.matches[nextMatchIdx] = nextMatch;
        }
      }

      bracket.rounds[nextRoundIdx] = nextRound;
    }
  }

  // Save updated bracket
  await updateTournament(tournamentId, { bracket });
}

// ─── Group ranking ────────────────────────────────────────────

export interface GroupRankingEntry {
  teamId: string;
  wins: number;
  pointDifferential: number;
}

/**
 * Compute the ranking for a group.
 * Sort by: wins (desc) → point differential (desc) → head-to-head.
 */
export async function computeGroupRanking(
  tournamentId: string,
  group: TournamentGroup,
): Promise<GroupRankingEntry[]> {
  const allGames = await fetchGamesByTournament(tournamentId);
  const teams = await fetchTeams(tournamentId);
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Filter games belonging to this group
  const groupTeamIds = new Set(group.teamIds);
  const groupGames = allGames.filter((g) => {
    if (g.tournamentLabel !== `Gruppe ${group.name}`) return false;
    // Check if both teams in the game are from this group
    // by matching player UIDs against team members
    return true;
  });

  // Build stats per team
  const stats = new Map<string, GroupRankingEntry>();
  for (const teamId of group.teamIds) {
    stats.set(teamId, { teamId, wins: 0, pointDifferential: 0 });
  }

  // Track head-to-head results
  const headToHead = new Map<string, boolean>(); // "teamA-teamB" -> true if A beat B

  // Identify which team is team1/team2 in a game by matching player UIDs
  const findTeamIdByPlayers = (playerSlots: PlayerSlot[]): string | null => {
    if (playerSlots.length < 2) return null;
    for (const [teamId, team] of teamMap) {
      if (!groupTeamIds.has(teamId)) continue;
      if (matchTeam(team, playerSlots[0], playerSlots[1])) {
        return teamId;
      }
    }
    return null;
  };

  for (const game of groupGames) {
    const team1Id = findTeamIdByPlayers([game.players[0], game.players[1]]);
    const team2Id = findTeamIdByPlayers([game.players[2], game.players[3]]);

    if (!team1Id || !team2Id) continue;
    if (!stats.has(team1Id) || !stats.has(team2Id)) continue;

    const totals = calculateTotals(game.rounds || []);
    const winner = checkWinner(totals);

    const entry1 = stats.get(team1Id)!;
    const entry2 = stats.get(team2Id)!;

    entry1.pointDifferential += totals.team1 - totals.team2;
    entry2.pointDifferential += totals.team2 - totals.team1;

    if (winner === 1 || game.status === 'finished') {
      if (winner === 1) {
        entry1.wins++;
        headToHead.set(`${team1Id}-${team2Id}`, true);
        headToHead.set(`${team2Id}-${team1Id}`, false);
      } else if (winner === 2) {
        entry2.wins++;
        headToHead.set(`${team2Id}-${team1Id}`, true);
        headToHead.set(`${team1Id}-${team2Id}`, false);
      }
    }
  }

  // Sort: wins desc → point differential desc → head-to-head
  const entries = Array.from(stats.values());
  entries.sort((a, b) => {
    // 1. Wins
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 2. Point differential
    if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;
    // 3. Head-to-head
    const aBeatsB = headToHead.get(`${a.teamId}-${b.teamId}`);
    if (aBeatsB === true) return -1;
    if (aBeatsB === false) return 1;
    return 0;
  });

  return entries;
}

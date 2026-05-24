import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Game, Round, PlayerSlot } from '../types/game';

/** Convert Firestore doc to Game */
function docToGame(id: string, data: Record<string, unknown>): Game {
  return {
    id,
    createdBy: data.createdBy as string,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    status: data.status as 'active' | 'finished',
    players: data.players as [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot],
    playerUids: (data.playerUids as string[]) || undefined,
    isPrivate: data.isPrivate as boolean | undefined,
    tag: data.tag as string | undefined,
    note: data.note as string | undefined,
  };
}

/** Convert Firestore doc to Round */
function docToRound(id: string, data: Record<string, unknown>): Round {
  return {
    id,
    roundNumber: data.roundNumber as number,
    team1CardPoints: data.team1CardPoints as number,
    team2CardPoints: data.team2CardPoints as number,
    tichuCalls: (data.tichuCalls as number[]) || [],
    grandTichuCalls: (data.grandTichuCalls as number[]) || [],
    oneTwoVictory: data.oneTwoVictory as number,
    finishedFirst: data.finishedFirst as number,
    note: (data.note as string) || undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
  };
}

/** Create a new game */
export async function createGame(
  createdBy: string,
  players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot],
  isPrivate?: boolean,
  tag?: string,
  note?: string,
): Promise<string> {
  const playerUids = players
    .map((p) => p.uid)
    .filter((uid): uid is string => uid !== null);

  const docRef = await addDoc(collection(db, 'games'), {
    createdBy,
    createdAt: Timestamp.now(),
    status: 'active',
    players,
    playerUids,
    isPrivate: isPrivate || false,
    tag: tag?.trim() || null,
    note: note?.trim() || null,
  });
  return docRef.id;
}

/** Fetch all games for a user (where they are a player or creator) */
export async function fetchUserGames(uid: string): Promise<Game[]> {
  // Query 1: games created by this user (covers legacy games and games they started)
  const qCreated = query(
    collection(db, 'games'),
    where('createdBy', '==', uid)
  );

  // Query 2: games where this user is a participant
  const qParticipant = query(
    collection(db, 'games'),
    where('playerUids', 'array-contains', uid)
  );

  const [snapCreated, snapParticipant] = await Promise.all([
    getDocs(qCreated),
    getDocs(qParticipant)
  ]);

  const gameMap = new Map<string, Game>();

  snapCreated.docs.forEach((d) => {
    gameMap.set(d.id, docToGame(d.id, d.data()));
  });

  snapParticipant.docs.forEach((d) => {
    gameMap.set(d.id, docToGame(d.id, d.data()));
  });

  const games = Array.from(gameMap.values());
  // Sort in memory by createdAt descending
  return games.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Search games by player UID (games where this player participates) */
export async function searchGamesByPlayer(playerUid: string, currentUserUid: string): Promise<Game[]> {
  // Query 1: Public games where playerUid participates
  const qPublic = query(
    collection(db, 'games'),
    where('playerUids', 'array-contains', playerUid),
    where('isPrivate', '==', false)
  );

  // Query 2: All games where current user participates/created
  const userGames = await fetchUserGames(currentUserUid);
  
  // Filter user's games to those where playerUid is also a participant
  const matchingUserGames = userGames.filter(g => g.playerUids?.includes(playerUid));

  const snapPublic = await getDocs(qPublic);
  const publicGames = snapPublic.docs.map((d) => docToGame(d.id, d.data()));

  // Merge lists and deduplicate
  const gameMap = new Map<string, Game>();
  publicGames.forEach(g => gameMap.set(g.id, g));
  matchingUserGames.forEach(g => gameMap.set(g.id, g));

  const merged = Array.from(gameMap.values());
  return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Search games by tag (exact match) */
export async function searchGamesByTag(tag: string, currentUserUid: string): Promise<Game[]> {
  // Query 1: Public games with this tag
  const qPublic = query(
    collection(db, 'games'),
    where('tag', '==', tag),
    where('isPrivate', '==', false)
  );

  // Query 2: All games where current user participates/created
  const userGames = await fetchUserGames(currentUserUid);

  // Filter user's games to those with the tag
  const matchingUserGames = userGames.filter(g => g.tag === tag);

  const snapPublic = await getDocs(qPublic);
  const publicGames = snapPublic.docs.map((d) => docToGame(d.id, d.data()));

  // Merge lists and deduplicate
  const gameMap = new Map<string, Game>();
  publicGames.forEach(g => gameMap.set(g.id, g));
  matchingUserGames.forEach(g => gameMap.set(g.id, g));

  const merged = Array.from(gameMap.values());
  return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Fetch a single game by ID */
export async function fetchGame(gameId: string): Promise<Game | null> {
  const docSnap = await getDoc(doc(db, 'games', gameId));
  if (!docSnap.exists()) return null;
  return docToGame(docSnap.id, docSnap.data());
}

/** Delete a game and all its rounds */
export async function deleteGame(gameId: string): Promise<void> {
  // Delete all rounds first
  const roundsSnap = await getDocs(collection(db, 'games', gameId, 'rounds'));
  const deletePromises = roundsSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  // Delete the game
  await deleteDoc(doc(db, 'games', gameId));
}

/** Update game status */
export async function updateGameStatus(
  gameId: string,
  status: 'active' | 'finished',
): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), { status });
}

/** Update game metadata (isPrivate, tag) */
export async function updateGameMetadata(
  gameId: string,
  isPrivate: boolean,
  tag: string,
  note: string,
): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    isPrivate,
    tag: tag.trim() || null,
    note: note.trim() || null,
  });
}

/** Add a round to a game */
export async function addRound(
  gameId: string,
  round: Omit<Round, 'id' | 'createdAt'>,
): Promise<string> {
  // Firestore does not accept undefined values — strip them
  const data: Record<string, unknown> = { ...round, createdAt: Timestamp.now() };
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key];
  }
  const docRef = await addDoc(collection(db, 'games', gameId, 'rounds'), data);
  return docRef.id;
}

/** Fetch all rounds for a game */
export async function fetchRounds(gameId: string): Promise<Round[]> {
  const q = query(
    collection(db, 'games', gameId, 'rounds'),
    orderBy('roundNumber', 'asc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => docToRound(d.id, d.data()));
}

/** Delete a round */
export async function deleteRound(gameId: string, roundId: string): Promise<void> {
  await deleteDoc(doc(db, 'games', gameId, 'rounds', roundId));
}

/** Update an existing round */
export async function updateRound(
  gameId: string,
  roundId: string,
  round: Omit<Round, 'id' | 'createdAt'>,
): Promise<void> {
  // Firestore does not accept undefined values — strip them
  const data: Record<string, unknown> = { ...round };
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key];
  }
  // If note was cleared, explicitly delete it
  if (!round.note) {
    data.note = null;
  }
  await updateDoc(doc(db, 'games', gameId, 'rounds', roundId), data);
}

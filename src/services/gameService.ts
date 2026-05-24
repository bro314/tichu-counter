import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  updateDoc,
  Timestamp,
  setDoc,
  arrayUnion,
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
    rounds: (data.rounds as Array<Record<string, unknown>>)?.map((r) => ({
      id: r.id as string,
      roundNumber: r.roundNumber as number,
      team1CardPoints: r.team1CardPoints as number,
      team2CardPoints: r.team2CardPoints as number,
      tichuCalls: (r.tichuCalls as number[]) || [],
      grandTichuCalls: (r.grandTichuCalls as number[]) || [],
      oneTwoVictory: r.oneTwoVictory as number,
      finishedFirst: r.finishedFirst as number,
      note: (r.note as string) || undefined,
      createdAt: (r.createdAt as Timestamp)?.toDate() || new Date(),
    })) || [],
  };
}

/** Update a user's recent opponent UIDs */
export async function updateRecentOpponents(uid: string, opponentUids: string[]): Promise<void> {
  if (opponentUids.length === 0) return;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const currentUids: string[] = snap.data().recentOpponentUids || [];

  // Merge the new opponent UIDs at the start of the list and keep unique values
  const merged = Array.from(new Set([...opponentUids, ...currentUids])).slice(0, 10);

  await updateDoc(userRef, { recentOpponentUids: merged });
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
    rounds: [],
  });

  // Centralized Tags: add tag to metadata document if present
  if (tag?.trim()) {
    await setDoc(doc(db, 'metadata', 'tags'), {
      tags: arrayUnion(tag.trim())
    }, { merge: true });
  }

  // Update creator's recent opponent UIDs
  const opponents = players
    .slice(1) // indices 1, 2, 3
    .map(p => p.uid)
    .filter((id): id is string => id !== null && id !== createdBy);

  if (opponents.length > 0) {
    await updateRecentOpponents(createdBy, opponents);
  }

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

/** Delete a game */
export async function deleteGame(gameId: string): Promise<void> {
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

  if (tag.trim()) {
    await setDoc(doc(db, 'metadata', 'tags'), {
      tags: arrayUnion(tag.trim())
    }, { merge: true });
  }
}

const generateId = () => Math.random().toString(36).substring(2, 15);

/** Add a round to a game */
export async function addRound(
  gameId: string,
  round: Omit<Round, 'id' | 'createdAt'>,
): Promise<string> {
  const gameRef = doc(db, 'games', gameId);
  const roundId = generateId();
  const newRound: Round = {
    ...round,
    id: roundId,
    createdAt: new Date(),
  };

  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found');
  const currentRounds = gameSnap.data().rounds || [];

  // Clean undefined properties for Firestore
  const cleanRound = JSON.parse(JSON.stringify(newRound));
  // Firestore Timestamp needs to be set properly for createdAt
  cleanRound.createdAt = Timestamp.now();

  await updateDoc(gameRef, {
    rounds: [...currentRounds, cleanRound]
  });

  return roundId;
}

/** Fetch all rounds for a game */
export async function fetchRounds(gameId: string): Promise<Round[]> {
  const game = await fetchGame(gameId);
  return game?.rounds || [];
}

/** Delete a round */
export async function deleteRound(gameId: string, roundId: string): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found');
  const currentRounds = gameSnap.data().rounds || [];
  const updatedRounds = currentRounds.filter((r: any) => r.id !== roundId);
  await updateDoc(gameRef, { rounds: updatedRounds });
}

/** Update an existing round */
export async function updateRound(
  gameId: string,
  roundId: string,
  round: Omit<Round, 'id' | 'createdAt'>,
): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found');
  const currentRounds = gameSnap.data().rounds || [];
  const updatedRounds = currentRounds.map((r: any) => {
    if (r.id === roundId) {
      const updatedItem = {
        ...r,
        ...round,
        note: round.note || null, // Clear note explicitly if empty
      };
      // Keep original timestamp if it existed
      if (r.createdAt) updatedItem.createdAt = r.createdAt;
      return updatedItem;
    }
    return r;
  });
  await updateDoc(gameRef, { rounds: updatedRounds });
}

/** Fetch all unique tags from metadata document */
export async function fetchAllTags(): Promise<string[]> {
  const snap = await getDoc(doc(db, 'metadata', 'tags'));
  if (!snap.exists()) return [];
  const tags = snap.data().tags as string[] || [];
  return tags.sort((a, b) => a.localeCompare(b));
}


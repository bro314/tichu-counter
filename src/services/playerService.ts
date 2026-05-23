import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../firebase';

export interface RegisteredPlayer {
  uid: string;
  displayName: string;
  avatar: string;
}

// Global, in-memory cache of resolved player profiles
const resolvedPlayersCache = new Map<string, RegisteredPlayer>();

/** Fetch specific registered user profiles by their UIDs using cache when possible */
export async function fetchPlayers(uids: string[]): Promise<RegisteredPlayer[]> {
  const uniqueUids = Array.from(new Set(uids)).filter(Boolean);
  const missingUids = uniqueUids.filter((uid) => !resolvedPlayersCache.has(uid));

  if (missingUids.length > 0) {
    // Firestore 'in' query allows up to 30 items per batch
    const BATCH_SIZE = 30;
    const batches: string[][] = [];
    for (let i = 0; i < missingUids.length; i += BATCH_SIZE) {
      batches.push(missingUids.slice(i, i + BATCH_SIZE));
    }

    const promises = batches.map(async (batch) => {
      const q = query(collection(db, 'users'), where(documentId(), 'in', batch));
      const snap = await getDocs(q);
      return snap.docs;
    });

    const results = await Promise.all(promises);
    const docs = results.flat();

    docs.forEach((d) => {
      resolvedPlayersCache.set(d.id, {
        uid: d.id,
        displayName: (d.data().displayName as string) || 'Player',
        avatar: (d.data().avatar as string) || '🐉',
      });
    });
  }

  return uniqueUids
    .map((uid) => resolvedPlayersCache.get(uid))
    .filter((p): p is RegisteredPlayer => !!p);
}

/** Fetch all registered user profiles for player selection (e.g., in a new game dialog) */
export async function fetchAllPlayers(shouldFetchTestPlayers: boolean = false): Promise<RegisteredPlayer[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  const players = snapshot.docs
    .filter((d) => {
      const isTest = !!d.data().isTestUser;
      return isTest === shouldFetchTestPlayers;
    })
    .map((d) => ({
      uid: d.id,
      displayName: (d.data().displayName as string) || 'Player',
      avatar: (d.data().avatar as string) || '🐉',
    }));

  // Update the player cache with the fetched profiles
  players.forEach((p) => resolvedPlayersCache.set(p.uid, p));

  return players;
}

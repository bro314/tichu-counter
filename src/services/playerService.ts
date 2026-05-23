import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
    const promises = missingUids.map((uid) => getDoc(doc(db, 'users', uid)));
    const snapshots = await Promise.all(promises);

    snapshots.forEach((snap) => {
      if (snap.exists()) {
        resolvedPlayersCache.set(snap.id, {
          uid: snap.id,
          displayName: (snap.data().displayName as string) || 'Player',
          avatar: (snap.data().avatar as string) || '🐉',
        });
      }
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

import { collection, getDocs, query, where, documentId, limit } from 'firebase/firestore';
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

/** Search registered users matching the display name prefix */
export async function searchPlayers(
  queryText: string,
  shouldFetchTestPlayers: boolean = false
): Promise<RegisteredPlayer[]> {
  const term = queryText.trim();
  if (!term) return [];

  // Firestore range queries are case-sensitive. We construct queries for both capitalized
  // and lowercase display name patterns (the most common formatting scenarios) to be robust.
  const capitalized = term.charAt(0).toUpperCase() + term.slice(1);
  const lowercase = term.charAt(0).toLowerCase() + term.slice(1);

  const qCap = query(
    collection(db, 'users'),
    where('displayName', '>=', capitalized),
    where('displayName', '<=', capitalized + '\uf8ff'),
    limit(10)
  );

  const qLow = query(
    collection(db, 'users'),
    where('displayName', '>=', lowercase),
    where('displayName', '<=', lowercase + '\uf8ff'),
    limit(10)
  );

  const [snapCap, snapLow] = await Promise.all([
    getDocs(qCap),
    getDocs(qLow)
  ]);

  const mergedMap = new Map<string, RegisteredPlayer>();

  const processDoc = (docSnap: any) => {
    const data = docSnap.data();
    const isTest = !!data.isTestUser;
    if (isTest === shouldFetchTestPlayers) {
      mergedMap.set(docSnap.id, {
        uid: docSnap.id,
        displayName: (data.displayName as string) || 'Player',
        avatar: (data.avatar as string) || '🐉',
      });
    }
  };

  snapCap.docs.forEach(processDoc);
  snapLow.docs.forEach(processDoc);

  const results = Array.from(mergedMap.values()).slice(0, 10);

  // Keep global cache up to date
  results.forEach(p => resolvedPlayersCache.set(p.uid, p));

  return results;
}

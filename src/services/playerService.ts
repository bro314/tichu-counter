import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface RegisteredPlayer {
  uid: string;
  displayName: string;
  avatar: string;
}

let cachedPlayers: RegisteredPlayer[] | null = null;
let cachedIsTest: boolean | null = null;

/** Fetch all registered user profiles for player selection */
export async function fetchAllPlayers(
  shouldFetchTestPlayers: boolean = false,
  forceRefresh: boolean = false
): Promise<RegisteredPlayer[]> {
  if (!forceRefresh && cachedPlayers !== null && cachedIsTest === shouldFetchTestPlayers) {
    return cachedPlayers;
  }

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

  cachedPlayers = players;
  cachedIsTest = shouldFetchTestPlayers;
  return players;
}

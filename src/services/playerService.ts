import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface RegisteredPlayer {
  uid: string;
  displayName: string;
  avatar: string;
}

/** Fetch all registered user profiles for player selection */
export async function fetchAllPlayers(): Promise<RegisteredPlayer[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map((d) => ({
    uid: d.id,
    displayName: (d.data().displayName as string) || 'Player',
    avatar: (d.data().avatar as string) || '🐉',
  }));
}

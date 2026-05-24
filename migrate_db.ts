import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize firebase admin. If running locally with firebase logged in,
// it will automatically authenticate with your active project.
initializeApp({
  projectId: 'tichu-counter-2c9ff',
});

const db = getFirestore();

async function runMigration() {
  console.log('Starting Firestore database migration...\n');

  // 1. Gather all tags and write to /metadata/tags
  console.log('--- Step 1: Centralizing Tags ---');
  const gamesSnap = await db.collection('games').get();
  console.log(`Found ${gamesSnap.size} games in total.`);

  const tags = new Set<string>();
  gamesSnap.forEach((doc) => {
    const data = doc.data();
    if (typeof data.tag === 'string') {
      const trimmed = data.tag.trim();
      if (trimmed) {
        tags.add(trimmed);
      }
    }
  });

  const uniqueTags = Array.from(tags).sort((a, b) => a.localeCompare(b));
  console.log('Unique tags found in database:', uniqueTags);

  if (uniqueTags.length > 0) {
    await db.collection('metadata').doc('tags').set({
      tags: uniqueTags
    }, { merge: true });
    console.log('Successfully wrote centralized /metadata/tags document!');
  } else {
    console.log('No tags found to migrate.');
  }

  // 2. Migrate rounds subcollection to embedded array
  console.log('\n--- Step 2: Nesting Rounds Array ---');
  for (const gameDoc of gamesSnap.docs) {
    const gameId = gameDoc.id;

    // Fetch rounds subcollection sorted by roundNumber ascending
    const roundsSnap = await db
      .collection('games')
      .doc(gameId)
      .collection('rounds')
      .orderBy('roundNumber', 'asc')
      .get();

    if (roundsSnap.size > 0) {
      console.log(`Migrating ${roundsSnap.size} rounds for game ${gameId}...`);

      const roundsArray = roundsSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          roundNumber: d.roundNumber,
          team1CardPoints: d.team1CardPoints,
          team2CardPoints: d.team2CardPoints,
          tichuCalls: d.tichuCalls || [],
          grandTichuCalls: d.grandTichuCalls || [],
          oneTwoVictory: d.oneTwoVictory || 0,
          finishedFirst: d.finishedFirst || 0,
          note: d.note || null,
          createdAt: d.createdAt || FieldValue.serverTimestamp(),
        };
      });

      // Update game document with embedded rounds array
      await db.collection('games').doc(gameId).update({
        rounds: roundsArray
      });

      // Delete rounds from old nested subcollection
      const batch = db.batch();
      roundsSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      console.log(`Successfully embedded rounds and deleted subcollection for game ${gameId}`);
    } else {
      console.log(`Game ${gameId} rounds already migrated or empty, skipping.`);
    }
  }

  // 3. Compute recentOpponentUids for each player
  console.log('\n--- Step 3: Computing Recent Opponents ---');
  // Fetch games sorted by createdAt ascending to simulate real chronology
  const sortedGamesSnap = await db.collection('games').orderBy('createdAt', 'asc').get();
  console.log(`Processing ${sortedGamesSnap.size} games chronologically...`);

  // Map of uid -> list of recent opponent uids
  const recentOpponentsMap = new Map<string, string[]>();

  sortedGamesSnap.forEach((gameDoc) => {
    const data = gameDoc.data();
    const players = data.players || [];
    
    // Extract registered player UIDs in this game
    const uids = players
      .map((p: any) => p.uid)
      .filter((uid: any): uid is string => typeof uid === 'string' && uid.trim().length > 0);

    // For each player in the game, the other players are their opponents
    uids.forEach((uid: string) => {
      const opponents = uids.filter((otherId: string) => otherId !== uid);
      if (opponents.length === 0) return;

      const currentList = recentOpponentsMap.get(uid) || [];

      // Prepend opponents to the current list and keep unique first 10
      const mergedList = Array.from(new Set([...opponents, ...currentList])).slice(0, 10);
      recentOpponentsMap.set(uid, mergedList);
    });
  });

  // Write calculated recent opponents to user profiles
  console.log(`Writing recent opponent lists for ${recentOpponentsMap.size} users...`);
  for (const [uid, opponentList] of recentOpponentsMap.entries()) {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      await userRef.update({
        recentOpponentUids: opponentList
      });
      console.log(`Updated recentOpponentUids for user ${uid}:`, opponentList);
    } else {
      console.log(`User profile ${uid} not found in users collection, skipping.`);
    }
  }

  console.log('\nFirestore migration successfully completed!');
}

runMigration().catch((err) => {
  console.error('\nMigration failed with error:', err);
});

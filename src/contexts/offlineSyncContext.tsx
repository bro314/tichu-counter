import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { createGame } from '../services/gameService';
import type { Game, Round, PlayerSlot } from '../types/game';
import { calculateTotals, checkWinner } from '../types/game';

export interface PendingOperation {
  id: string; // unique operation ID
  gameId: string; // temp ID or real ID
  type: 'CREATE_GAME' | 'ADD_ROUND' | 'UPDATE_ROUND' | 'DELETE_ROUND';
  roundId?: string;
  roundData?: Omit<Round, 'id' | 'createdAt'>;
  gameData?: {
    createdBy: string;
    players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot];
    isPrivate: boolean;
    tag: string;
    note: string;
    createdAt: string; // ISO String
  };
  createdAt: number; // timestamp when queued
}

export interface OfflineSyncContextType {
  pendingOps: PendingOperation[];
  isOnline: boolean;
  isSyncing: boolean;
  tempToRealIds: Record<string, string>;
  queueOperation: (op: Omit<PendingOperation, 'id' | 'createdAt'>) => void;
  getPendingRounds: (gameId: string) => Record<string, { status: 'saving' | 'offline'; createdAt: number }>;
  hasUnsavedData: (gameId: string) => boolean;
  hasAnyUnsavedData: () => boolean;
  clearPendingQueue: () => void;
  getGameSyncStatus: (gameId: string) => 'saving' | 'offline' | undefined;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

function detectConnectionError(error: any): boolean {
  if (!navigator.onLine) return true;
  if (error && typeof error === 'object') {
    const code = error.code;
    const msg = error.message?.toLowerCase() || '';
    if (code === 'unavailable' || code === 'deadline-exceeded') {
      return true;
    }
    if (msg.includes('network') || msg.includes('offline') || msg.includes('failed to fetch') || msg.includes('could not reach')) {
      return true;
    }
  }
  return false;
}

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>(() => {
    const saved = localStorage.getItem('pendingOps');
    return saved ? JSON.parse(saved) : [];
  });

  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFailedOffline, setSyncFailedOffline] = useState(false);

  const [tempToRealIds, setTempToRealIds] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('tempToRealIds');
    return saved ? JSON.parse(saved) : {};
  });

  const saveTempToRealIds = (newMap: Record<string, string>) => {
    setTempToRealIds(newMap);
    localStorage.setItem('tempToRealIds', JSON.stringify(newMap));
  };

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncFailedOffline(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Tick timer to re-evaluate 'saving' -> 'offline' transition reactively in the UI
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (pendingOps.length === 0) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingOps.length]);

  const triggerSync = useCallback(async () => {
    if (isSyncing || pendingOps.length === 0) return;
    if (!navigator.onLine) {
      setSyncFailedOffline(true);
      return;
    }

    setIsSyncing(true);
    let currentOps = [...pendingOps];
    let currentTempMap = { ...tempToRealIds };

    for (const op of currentOps) {
      try {
        let activeGameId = op.gameId;
        if (currentTempMap[op.gameId]) {
          activeGameId = currentTempMap[op.gameId];
        }

        if (op.type === 'CREATE_GAME') {
          const realId = await createGame(
            op.gameData!.createdBy,
            op.gameData!.players,
            op.gameData!.isPrivate,
            op.gameData!.tag,
            op.gameData!.note
          );

          currentTempMap[op.gameId] = realId;
          saveTempToRealIds(currentTempMap);

          if (localStorage.getItem('lastGameId') === op.gameId) {
            localStorage.setItem('lastGameId', realId);
          }

          currentOps = currentOps.map(item => {
            if (item.gameId === op.gameId) {
              return { ...item, gameId: realId };
            }
            return item;
          });
        } else if (op.type === 'ADD_ROUND') {
          const gameRef = doc(db, 'games', activeGameId);
          await runTransaction(db, async (transaction) => {
            const gameSnap = await transaction.get(gameRef);
            if (!gameSnap.exists()) throw new Error('Game not found');

            const serverRounds = gameSnap.data().rounds || [];
            const exists = serverRounds.some((r: any) => r.id === op.roundId);
            if (!exists) {
              const cleanRound = JSON.parse(JSON.stringify(op.roundData));
              cleanRound.id = op.roundId;
              cleanRound.createdAt = Timestamp.fromMillis(op.createdAt);

              const updatedRounds = [...serverRounds, cleanRound];
              const totals = calculateTotals(updatedRounds);
              const winner = checkWinner(totals);
              const status = winner !== 0 ? 'finished' : 'active';

              transaction.update(gameRef, {
                rounds: updatedRounds,
                status: status
              });
            }
          });
        } else if (op.type === 'UPDATE_ROUND') {
          const gameRef = doc(db, 'games', activeGameId);
          await runTransaction(db, async (transaction) => {
            const gameSnap = await transaction.get(gameRef);
            if (!gameSnap.exists()) throw new Error('Game not found');

            const serverRounds = gameSnap.data().rounds || [];
            const updatedRounds = serverRounds.map((r: any) => {
              if (r.id === op.roundId) {
                return {
                  ...r,
                  ...op.roundData,
                  note: op.roundData!.note || null,
                };
              }
              return r;
            });

            const totals = calculateTotals(updatedRounds);
            const winner = checkWinner(totals);
            const status = winner !== 0 ? 'finished' : 'active';

            transaction.update(gameRef, {
              rounds: updatedRounds,
              status: status
            });
          });
        } else if (op.type === 'DELETE_ROUND') {
          const gameRef = doc(db, 'games', activeGameId);
          await runTransaction(db, async (transaction) => {
            const gameSnap = await transaction.get(gameRef);
            if (!gameSnap.exists()) throw new Error('Game not found');

            const serverRounds = gameSnap.data().rounds || [];
            const updatedRounds = serverRounds.filter((r: any) => r.id !== op.roundId);

            const totals = calculateTotals(updatedRounds);
            const winner = checkWinner(totals);
            const status = winner !== 0 ? 'finished' : 'active';

            transaction.update(gameRef, {
              rounds: updatedRounds,
              status: status
            });
          });
        }

        setPendingOps(prev => {
          const next = prev.filter(item => item.id !== op.id);
          localStorage.setItem('pendingOps', JSON.stringify(next));
          return next;
        });
        setSyncFailedOffline(false);
      } catch (err: any) {
        console.error(`Sync failed for operation ${op.id}:`, err);
        const isConnErr = detectConnectionError(err);
        if (isConnErr) {
          setSyncFailedOffline(true);
          break;
        } else {
          setPendingOps(prev => {
            const next = prev.filter(item => item.id !== op.id);
            localStorage.setItem('pendingOps', JSON.stringify(next));
            return next;
          });
        }
      }
    }
    setIsSyncing(false);
  }, [pendingOps, tempToRealIds, isSyncing]);

  // Sync trigger on online transition
  useEffect(() => {
    if (isOnline && pendingOps.length > 0 && !isSyncing) {
      triggerSync();
    }
  }, [isOnline, pendingOps.length, isSyncing, triggerSync]);

  // Visibility polling for backoff recovery
  useEffect(() => {
    if (pendingOps.length === 0 || !syncFailedOffline) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        triggerSync();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [pendingOps.length, syncFailedOffline, triggerSync]);

  const queueOperation = useCallback((op: Omit<PendingOperation, 'id' | 'createdAt'>) => {
    const newOp: PendingOperation = {
      ...op,
      id: Math.random().toString(36).substring(2, 15),
      createdAt: Date.now(),
    };
    setPendingOps(prev => {
      const next = [...prev, newOp];
      localStorage.setItem('pendingOps', JSON.stringify(next));
      return next;
    });
  }, []);

  const getPendingRounds = useCallback((gameId: string) => {
    const now = Date.now();
    const result: Record<string, { status: 'saving' | 'offline'; createdAt: number }> = {};
    pendingOps.forEach(op => {
      if (op.gameId === gameId && op.roundId) {
        const isOfflineStatus = !isOnline || (now - op.createdAt >= 5000);
        result[op.roundId] = {
          status: isOfflineStatus ? 'offline' : 'saving',
          createdAt: op.createdAt,
        };
      }
    });
    return result;
  }, [pendingOps, isOnline, tick]);

  const hasUnsavedData = useCallback((gameId: string) => {
    return pendingOps.some(op => op.gameId === gameId);
  }, [pendingOps]);

  const hasAnyUnsavedData = useCallback(() => {
    return pendingOps.length > 0;
  }, [pendingOps]);

  const clearPendingQueue = useCallback(() => {
    setPendingOps([]);
    localStorage.removeItem('pendingOps');
    setTempToRealIds({});
    localStorage.removeItem('tempToRealIds');
  }, []);

  const getGameSyncStatus = useCallback((gameId: string): 'saving' | 'offline' | undefined => {
    const gameOps = pendingOps.filter(op => op.gameId === gameId);
    if (gameOps.length === 0) return undefined;

    const now = Date.now();
    const hasOfflineOp = gameOps.some(op => {
      return !isOnline || (now - op.createdAt >= 5000);
    });

    return hasOfflineOp ? 'offline' : 'saving';
  }, [pendingOps, isOnline, tick]);

  const contextValue = useMemo(() => ({
    pendingOps,
    isOnline,
    isSyncing,
    tempToRealIds,
    queueOperation,
    getPendingRounds,
    hasUnsavedData,
    hasAnyUnsavedData,
    clearPendingQueue,
    getGameSyncStatus,
  }), [
    pendingOps,
    isOnline,
    isSyncing,
    tempToRealIds,
    queueOperation,
    getPendingRounds,
    hasUnsavedData,
    hasAnyUnsavedData,
    clearPendingQueue,
    getGameSyncStatus,
  ]);

  return (
    <OfflineSyncContext.Provider value={contextValue}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSync = () => {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
};

export function mergeRounds(serverRounds: Round[], pendingOpsForGame: PendingOperation[]): Round[] {
  let list = [...serverRounds];

  for (const op of pendingOpsForGame) {
    if (op.type === 'ADD_ROUND') {
      if (!list.some(r => r.id === op.roundId)) {
        const newRound: Round = {
          ...op.roundData!,
          id: op.roundId!,
          createdAt: new Date(op.createdAt),
        };
        list.push(newRound);
      }
    } else if (op.type === 'UPDATE_ROUND') {
      list = list.map(r => {
        if (r.id === op.roundId) {
          return {
            ...r,
            ...op.roundData!,
          };
        }
        return r;
      });
    } else if (op.type === 'DELETE_ROUND') {
      list = list.filter(r => r.id !== op.roundId);
    }
  }

  return list;
}

export function mergeGames(serverGames: Game[], pendingOps: PendingOperation[]): Game[] {
  let list = [...serverGames];

  const pendingCreateOps = pendingOps.filter(op => op.type === 'CREATE_GAME');
  for (const op of pendingCreateOps) {
    if (!list.some(g => g.id === op.gameId)) {
      const newGame: Game = {
        id: op.gameId,
        createdBy: op.gameData!.createdBy,
        createdAt: new Date(op.gameData!.createdAt),
        status: 'active',
        players: op.gameData!.players,
        playerUids: op.gameData!.players.map(p => p.uid).filter((uid): uid is string => uid !== null),
        isPrivate: op.gameData!.isPrivate,
        tag: op.gameData!.tag,
        note: op.gameData!.note,
        rounds: [],
      };
      list.unshift(newGame);
    }
  }

  list = list.map(g => {
    const gameRounds = g.rounds || [];
    const gameOps = pendingOps.filter(op => op.gameId === g.id && op.type !== 'CREATE_GAME');
    if (gameOps.length > 0) {
      return {
        ...g,
        rounds: mergeRounds(gameRounds, gameOps),
      };
    }
    return g;
  });

  return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

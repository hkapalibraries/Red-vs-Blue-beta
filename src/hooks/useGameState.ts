import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GameState, GameEvent, Team } from '../types';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [scores, setScores] = useState({ red: 0, blue: 0 });

  // Listen to game state
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'game_state', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          setGameState(snapshot.data() as GameState);
        } else {
          setGameState(null);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'game_state/current')
    );
    return () => unsub();
  }, []);

  // Listen to events for the current session to calculate score
  useEffect(() => {
    if (!gameState?.sessionId) return;

    const q = query(
      collection(db, 'rvb_events'),
      where('sessionId', '==', gameState.sessionId)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        let redScore = 0;
        let blueScore = 0;
        snapshot.docs.forEach((doc) => {
          const evt = doc.data() as GameEvent;
          if (evt.team === 'red') redScore++;
          if (evt.team === 'blue') blueScore++;
        });
        setScores({ red: redScore, blue: blueScore });
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'rvb_events')
    );
    return () => unsub();
  }, [gameState?.sessionId]);

  return { gameState, scores };
}

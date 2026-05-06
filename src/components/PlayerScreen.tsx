import { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { GameEvent, Team } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function PlayerScreen() {
  const { gameState, scores } = useGameState();
  const [team, setTeam] = useState<Team | null>(null);
  const [answeredQ, setAnsweredQ] = useState<string | null>(null); // track current Q text to prevent multiple answers
  const [flashScore, setFlashScore] = useState(false);

  useEffect(() => {
    // Assign team randomly if not in URL
    const params = new URLSearchParams(window.location.search);
    let t = params.get('team') as Team;
    if (t !== 'red' && t !== 'blue') {
       t = Math.random() > 0.5 ? 'red' : 'blue';
       window.history.replaceState(null, '', `?team=${t}`);
    }
    setTeam(t);
  }, []);

  const handleAnswer = async (index: number) => {
    if (!gameState || !gameState.question || answeredQ === gameState.question.text) return;
    
    if (index === gameState.question.correctOptionIndex) {
       // Correct!
       if (navigator.vibrate) navigator.vibrate(100); // short vibe
       
       setFlashScore(true);
       setTimeout(() => setFlashScore(false), 500);

       try {
         const evt: Partial<GameEvent> = {
            sessionId: gameState.sessionId,
            team: team!,
            userId: auth.currentUser!.uid,
         };
         // We must use object spread to include serverTimestamp correctly for Firestore types
         await addDoc(collection(db, 'rvb_events'), {
           ...evt,
           createdAt: serverTimestamp()
         });
         setAnsweredQ(gameState.question.text);
       } catch (error) {
         handleFirestoreError(error, OperationType.CREATE, 'rvb_events');
       }
    } else {
       // Wrong
       if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // Error vibe
       // Optionally show visual feedback for error
       setAnsweredQ(gameState.question.text); // They only get one chance per question! Or do we allow retry?
       // The prompt says: "答錯：不計分，手機提供觸覺反饋（震動）。" Let's let them keep trying actually.
       // So we don't setAnsweredQ here!
       setAnsweredQ(null); // allow retry
    }
  }

  // Clear answer state when question changes
  useEffect(() => {
    if (gameState?.question?.text !== answeredQ) {
       setAnsweredQ(null);
    }
  }, [gameState?.question?.text]);

  if (!team) return null;

  const isRed = team === 'red';
  const bgColor = isRed ? 'bg-red-600' : 'bg-blue-600';
  const activeColor = isRed ? 'active:bg-red-800' : 'active:bg-blue-800';

  let winnerText = '遊戲結束!';
  let amIWinner = false;
  if (gameState?.status === 'finished' || gameState?.status === 'reward') {
     const targetScore = gameState.targetScore || 100;
     if (scores.red >= targetScore) {
       winnerText = '紅隊獲勝!';
       amIWinner = team === 'red';
     } else if (scores.blue >= targetScore) {
       winnerText = '藍隊獲勝!';
       amIWinner = team === 'blue';
     }
  }

  return (
    <div className={`h-[100dvh] w-full flex flex-col font-sans ${bgColor} text-white selection:bg-white/30 transition-colors duration-500`}>
      {/* Header */}
      <div className="p-6 text-center text-xl font-bold bg-black/20 flex flex-col pt-[env(safe-area-inset-top)]">
         你是 {isRed ? '紅隊' : '藍隊'}
         <span className="text-sm font-normal opacity-80 mt-1">
            目標分數: {gameState?.targetScore || 100}
         </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <AnimatePresence>
          {flashScore && (
             <motion.div 
               initial={{ opacity: 1, scale: 1 }}
               animate={{ opacity: 0, scale: 2 }}
               className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-white text-black text-9xl font-black mix-blend-screen"
             >
               +1
             </motion.div>
          )}
        </AnimatePresence>

        {!gameState || gameState.status === 'waiting' ? (
           <div className="text-3xl font-bold animate-pulse text-center leading-relaxed">
             準備中...<br/>看大螢幕，等待遊戲開始
           </div>
        ) : gameState.status === 'finished' || gameState.status === 'reward' ? (
           <div className="text-center flex flex-col items-center justify-center h-full space-y-8 absolute inset-0 bg-black/40 backdrop-blur-sm z-10">
             <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-6xl font-black ${amIWinner ? 'text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]' : 'text-gray-300'} tracking-wide`}
             >
                {winnerText}
             </motion.div>
             
             {amIWinner && (
                <div className="text-3xl font-bold animate-bounce text-white drop-shadow-md">
                   🥳 恭喜您的隊伍獲勝！ 🥳
                </div>
             )}

             {gameState.status === 'reward' && amIWinner && (
               <motion.div 
                 initial={{ y: 50, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 className="text-2xl bg-gradient-to-r from-yellow-400 to-yellow-300 text-yellow-950 border-4 border-white p-8 rounded-3xl shadow-2xl font-black mx-6 leading-relaxed"
               >
                 🏆 請憑此畫面<br/>前往服務台領取專屬小禮物！
               </motion.div>
             )}

             {gameState.status === 'reward' && !amIWinner && (
               <div className="text-xl bg-white/20 text-white p-6 rounded-2xl font-bold mt-8 shadow-lg backdrop-blur-md border border-white/20">
                 再接再厲！<br/>感謝您的參與 🎉
               </div>
             )}
           </div>
        ) : gameState.status === 'playing' ? (
           gameState.question ? (
              <div className="w-full flex flex-col h-full justify-between items-stretch">
                <div className="text-3xl font-bold mt-4 mb-8 text-center text-white/90 drop-shadow-md">
                   {gameState.question.text}
                </div>
                {answeredQ === gameState.question.text ? (
                   <div className="flex-1 flex items-center justify-center text-2xl font-bold text-center">
                      答對了！等待下一題...
                   </div>
                ) : (
                   <div className="grid grid-cols-1 gap-4 flex-1 pb-[env(safe-area-inset-bottom)]">
                     {gameState.question.options.map((opt, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleAnswer(i)}
                          className={`w-full h-full bg-white text-gray-900 rounded-3xl text-2xl font-bold shadow-[0_8px_0_rgba(0,0,0,0.2)] active:translate-y-2 active:shadow-[0_0_0_rgba(0,0,0,0)] transition-all`}
                        >
                          {opt}
                        </button>
                     ))}
                   </div>
                )}
              </div>
           ) : (
             <div className="text-2xl font-bold text-center mb-8">
               準備搶答下一題！
             </div>
           )
        ) : null}
      </div>
    </div>
  );
}

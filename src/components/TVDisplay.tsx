import { useEffect, useState, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

export default function TVDisplay() {
  const { gameState, scores } = useGameState();
  const [winner, setWinner] = useState<'red'|'blue'|null>(null);
  
  useEffect(() => {
    if (!gameState) return;
    
    // Check win condition locally for real-time
    if (gameState.status !== 'reward' && !winner) {
      const targetScore = gameState.targetScore || 100;
      if (scores.red >= targetScore) {
         setWinner('red');
         triggerConfetti('red');
      } else if (scores.blue >= targetScore) {
         setWinner('blue');
         triggerConfetti('blue');
      }
    } else if (gameState.status === 'waiting') {
      setWinner(null);
    }
  }, [scores, gameState?.targetScore, gameState?.status, winner]);

  const triggerConfetti = (team: 'red'|'blue') => {
    const colors = team === 'red' ? ['#ef4444', '#b91c1c'] : ['#3b82f6', '#1d4ed8'];
    const duration = 10 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors
      });
    }, 250);
  }

  if (!gameState) return <div className="h-screen bg-black text-white flex items-center justify-center text-4xl">Waiting for game to start...</div>;

  const targetScore = gameState.targetScore || 100;
  const redPct = Math.min(100, (scores.red / targetScore) * 100) || 0;
  const bluePct = Math.min(100, (scores.blue / targetScore) * 100) || 0;

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden font-sans text-white">
      {/* Header */}
      <div className="h-32 flex items-center justify-between px-16 z-10 bg-black/60 shadow-2xl relative">
          <div className="text-6xl font-black text-red-500 drop-shadow-lg">紅隊 {scores.red}</div>
          <div className="text-4xl font-bold flex flex-col items-center">
             <span>目標: {targetScore}</span>
          </div>
          <div className="text-6xl font-black text-blue-500 drop-shadow-lg">{scores.blue} 藍隊</div>
      </div>

      {/* Main Content Split */}
      <div className="flex-1 flex w-full relative">
         <div className="w-1/2 h-full bg-red-900/20 relative border-r border-white/10 flex items-center justify-center">
             <div className="absolute bottom-0 w-full bg-gradient-to-t from-red-600 to-red-400 transition-all duration-500 ease-out"
                  style={{ height: `${redPct}%` }} />
         </div>
         <div className="w-1/2 h-full bg-blue-900/20 relative flex items-center justify-center">
             <div className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 ease-out"
                  style={{ height: `${bluePct}%` }} />
         </div>

         {/* Question overlay */}
         <AnimatePresence>
         {gameState.status === 'playing' && gameState.question && !winner && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-16">
               <div className="bg-white text-gray-900 rounded-3xl p-12 text-center shadow-[0_0_100px_rgba(255,255,255,0.2)] max-w-4xl w-full">
                  <h2 className="text-5xl font-bold mb-12">{gameState.question.text}</h2>
                  <div className="grid grid-cols-2 gap-8">
                     {gameState.question.options.map((opt, i) => (
                       <div key={i} className="bg-gray-100 rounded-xl p-8 text-3xl font-medium border-4 border-gray-200">
                          {opt}
                       </div>
                     ))}
                  </div>
               </div>
            </motion.div>
         )}
         </AnimatePresence>

         {/* Winner/Reward Overlay */}
         <AnimatePresence>
         {winner && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className={`absolute inset-0 flex flex-col items-center justify-center z-50 ${winner === 'red' ? 'bg-red-950/90' : 'bg-blue-950/90'} backdrop-blur-md`}>
               
               <motion.div 
                  initial={{ scale: 0, y: 100 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", bounce: 0.6, duration: 1 }}
                  className="mb-8"
               >
                 <svg className="w-64 h-64 text-yellow-400 drop-shadow-[0_0_50px_rgba(250,204,21,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
                 </svg>
               </motion.div>

               <motion.h1 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-b tracking-tight ${winner === 'red' ? 'from-red-200 to-red-500 drop-shadow-[0_0_60px_rgba(239,68,68,0.8)]' : 'from-blue-200 to-blue-500 drop-shadow-[0_0_60px_rgba(59,130,246,0.8)]'}`}>
                  {winner === 'red' ? '紅隊獲勝!' : '藍隊獲勝!'}
               </motion.h1>

               {gameState.status === 'reward' && (
                 <motion.div 
                   initial={{ opacity: 0, y: 50 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.5 }}
                   className="mt-16 bg-white/10 p-10 rounded-full border-4 border-yellow-400/50 backdrop-blur-sm"
                 >
                   <p className="text-6xl text-yellow-300 font-bold animate-pulse">
                     🎉 請獲勝隊伍前往服務台 領取專屬小禮物 🎉
                   </p>
                 </motion.div>
               )}
            </motion.div>
         )}
         </AnimatePresence>
      </div>
    </div>
  )
}

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
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50">
               <h1 className={`text-9xl font-black mb-8 ${winner === 'red' ? 'text-red-500' : 'text-blue-500'}`}>
                  {winner === 'red' ? '紅隊獲勝!' : '藍隊獲勝!'}
               </h1>
               {gameState.status === 'reward' && (
                 <p className="text-4xl text-white mt-8 animate-bounce">請獲勝隊伍前往服務台領取專屬小禮物！</p>
               )}
            </motion.div>
         )}
         </AnimatePresence>
      </div>
    </div>
  )
}

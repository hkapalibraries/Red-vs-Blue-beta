import { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GameState, Question } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

export default function AdminScreen() {
  const { gameState, scores } = useGameState();
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [csvUrl, setCsvUrl] = useState('');
  const [questionsBank, setQuestionsBank] = useState<Question[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  
  const [targetScore, setTargetScore] = useState(100);
  const [feedbackMsg, setFeedbackMsg] = useState<{text: string, type: 'error'|'success'} | null>(null);

  const showFeedback = (text: string, type: 'error'|'success' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleLogin = () => {
    if (passwordInput === '8510') {
      setIsAdmin(true);
    } else {
      showFeedback('密碼錯誤', 'error');
    }
  };

  const loadQuestionsFromCSV = () => {
    if (!csvUrl) return;
    setIsParsing(true);
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedQ = results.data.map((row: any) => {
          return {
            text: row['text'] || row['題目'] || '',
            options: [
              row['opt0'] || row['選項1'] || '',
              row['opt1'] || row['選項2'] || '',
              row['opt2'] || row['選項3'] || '',
              row['opt3'] || row['選項4'] || ''
            ].filter(Boolean),
            correctOptionIndex: parseInt(row['correctIdx'] || row['正確選項'] || '0', 10) || 0
          };
        }).filter(q => q.text && q.options.length > 0);
        setQuestionsBank(parsedQ);
        setIsParsing(false);
        if(parsedQ.length === 0) {
           showFeedback('找不到題目，請確認 CSV 格式標題。', 'error');
        } else {
           showFeedback(`成功載入 ${parsedQ.length} 題！`);
        }
      },
      error: (error) => {
        console.error(error);
        setIsParsing(false);
        showFeedback('讀取 CSV 失敗，請確認網址與共用設定。', 'error');
      }
    });
  };

  const startNewGame = async () => {
    try {
      const newState: GameState = {
        sessionId: uuidv4(),
        status: 'waiting',
        targetScore,
        winner: 'none'
      };
      await setDoc(doc(db, 'game_state', 'current'), newState);
      showFeedback('已建立新遊戲！');
    } catch (error) {
      showFeedback('建立失敗: ' + (error instanceof Error ? error.message : String(error)), 'error');
      handleFirestoreError(error, OperationType.WRITE, 'game_state/current');
    }
  };

  const setStatus = async (status: GameState['status']) => {
    if (!gameState) {
       showFeedback('請先建立新遊戲！', 'error');
       return;
    }
    try {
      await updateDoc(doc(db, 'game_state', 'current'), { status });
      showFeedback(`狀態已更新為: ${status}`);
    } catch (error) {
      showFeedback('更新失敗: ' + (error instanceof Error ? error.message : String(error)), 'error');
      handleFirestoreError(error, OperationType.UPDATE, 'game_state/current');
    }
  };

  const pushQuestion = async (q: Question) => {
    try {
      if (!gameState) {
         const newState: GameState = {
           sessionId: uuidv4(),
           status: 'playing',
           targetScore,
           winner: 'none',
           question: q
         };
         await setDoc(doc(db, 'game_state', 'current'), newState);
      } else {
         await updateDoc(doc(db, 'game_state', 'current'), { question: q, status: 'playing' });
      }
      showFeedback('已同步到大螢幕與玩家端！');
    } catch (error) {
       showFeedback('投放失敗: ' + (error instanceof Error ? error.message : String(error)), 'error');
       handleFirestoreError(error, OperationType.UPDATE, 'game_state/current');
    }
  };

  const endSession = async () => {
    if (!gameState) {
       showFeedback('目前沒有進行中的遊戲！', 'error');
       return;
    }
    try {
      await updateDoc(doc(db, 'game_state', 'current'), { status: 'reward' });
      showFeedback('已結束遊戲！');
    } catch (error) {
       showFeedback('操作失敗: ' + (error instanceof Error ? error.message : String(error)), 'error');
       handleFirestoreError(error, OperationType.UPDATE, 'game_state/current');
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-100 relative">
        {feedbackMsg && (
          <div className={`absolute top-10 px-6 py-3 rounded text-white font-bold shadow-lg ${feedbackMsg.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            {feedbackMsg.text}
          </div>
        )}
        <div className="bg-white p-8 rounded shadow-lg max-w-sm w-full space-y-4">
          <h1 className="text-2xl font-bold text-center">控台登入</h1>
          <input 
            type="password" 
            placeholder="請輸入密碼" 
            className="w-full border p-2 rounded" 
            value={passwordInput} 
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white px-4 py-2 rounded font-bold">登入</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 pb-20 relative">
      {feedbackMsg && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded text-white font-bold shadow-lg z-50 ${feedbackMsg.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {feedbackMsg.text}
        </div>
      )}
      <h1 className="text-3xl font-bold">控台 Admin Dashboard</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">遊戲狀態: {gameState?.status || 'No Game'}</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <button onClick={startNewGame} className="bg-green-600 font-bold px-4 py-2 text-white rounded">1. 建立新遊戲 (Waiting)</button>
          <button onClick={() => setStatus('playing')} className="bg-blue-600 font-bold px-4 py-2 text-white rounded">2. 開始遊戲 (Playing)</button>
          <button onClick={endSession} className="bg-purple-600 font-bold px-4 py-2 text-white rounded">3. 結束並顯示獲勝畫面</button>
        </div>
        <div className="flex items-center gap-2 mb-4">
           <label className="font-bold">目標分數 (勝出條件):</label>
           <input type="number" value={targetScore} onChange={e=>setTargetScore(Number(e.target.value))} className="border p-2 w-24 rounded"/>
        </div>
        <div className="text-xl font-bold p-4 bg-white rounded shadow-sm">
           <span className="text-red-500">紅隊: {scores.red}</span> <span className="mx-4">|</span> <span className="text-blue-500">藍隊: {scores.blue}</span>
        </div>
      </div>

      <div className="bg-yellow-50 p-6 rounded-lg shadow space-y-4 border border-yellow-200">
        <h2 className="text-xl font-bold">載入 Google Sheet 題庫</h2>
        <p className="text-sm text-gray-700">
          請建立一個 Google Sheet，並設定以下欄位標題：<br/>
          <code className="bg-gray-200 px-1">text</code>, <code className="bg-gray-200 px-1">opt0</code>, <code className="bg-gray-200 px-1">opt1</code>, <code className="bg-gray-200 px-1">opt2</code>, <code className="bg-gray-200 px-1">opt3</code>, <code className="bg-gray-200 px-1">correctIdx</code>（正確選項為0,1,2,3）<br/>
          然後點擊「檔案」&gt;「共用」&gt;「發佈到網路」，選擇「逗號分隔值 (.csv)」並複製連結。
        </p>
        <div className="flex gap-2">
          <input 
             className="flex-1 border p-2 rounded" 
             placeholder="貼上 CSV 網址..." 
             value={csvUrl} 
             onChange={e => setCsvUrl(e.target.value)} 
          />
          <button 
             onClick={loadQuestionsFromCSV} 
             disabled={isParsing || !csvUrl}
             className="bg-black text-white px-4 py-2 rounded font-bold disabled:opacity-50"
          >
             {isParsing ? '載入中...' : '載入題庫'}
          </button>
        </div>
      </div>

      {gameState?.status === 'playing' && (
        <div className="bg-white p-4 rounded-lg shadow border space-y-4">
          <h2 className="text-xl font-bold">投放題目</h2>
          {questionsBank.length === 0 ? (
            <p className="text-gray-500 italic">尚未載入題庫</p>
          ) : (
            <div className="space-y-4">
              {questionsBank.map((q, i) => {
                 const isCurrent = gameState.question?.text === q.text;
                 return (
                 <div key={i} className={`p-4 border rounded relative flex flex-col gap-2 ${isCurrent ? 'bg-blue-50 border-blue-400' : 'bg-gray-50'}`}>
                    <div className="font-bold text-lg">{i+1}. {q.text}</div>
                    <div className="text-sm text-gray-600 flex gap-4">
                      {q.options.map((opt, idx) => (
                        <span key={idx} className={idx === q.correctOptionIndex ? 'text-green-600 font-bold' : ''}>
                          [{idx}] {opt}
                        </span>
                      ))}
                    </div>
                    <button 
                      onClick={() => pushQuestion(q)} 
                      disabled={isCurrent}
                      className="absolute right-4 top-4 bg-blue-600 text-white px-4 py-2 rounded font-bold disabled:bg-gray-400"
                    >
                      {isCurrent ? '投放中' : '立即投放'}
                    </button>
                 </div>
                 );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

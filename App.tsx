
import React, { useState, useEffect, useRef } from 'react';
import { useSnakeGame } from './hooks/useSnakeGame';
import GameCanvas from './components/GameCanvas';
import ParticleBackground from './components/ParticleBackground';
import { GameState, WordItem } from './types';

const GRID_SIZE = 12; 
const LEVEL_CSVS: Record<string, string> = {
  "1": "https://ducj-creator.github.io/iVocab-Self-Practice/level1.csv",
  "2": "https://ducj-creator.github.io/iVocab-Self-Practice/level2.csv",
  "3": "https://ducj-creator.github.io/iVocab-Self-Practice/level3.csv",
  "4": "https://ducj-creator.github.io/iVocab-Self-Practice/level4.csv",
  "5": "https://ducj-creator.github.io/iVocab-Self-Practice/level5.csv",
  "6": "https://ducj-creator.github.io/iVocab-Self-Practice/level6.csv",
  "C1": "https://ducj-creator.github.io/iVocab-Self-Practice/CAP1C.csv",
  "C2": "https://ducj-creator.github.io/iVocab-Self-Practice/CAP2D.csv",
  "C3": "https://ducj-creator.github.io/iVocab-Self-Practice/CAP3H.csv",
  "C4": "https://ducj-creator.github.io/iVocab-Self-Practice/CAP4T.csv",
};

const LEVELS = ["1", "2", "3", "4", "5", "6", "C1", "C2", "C3", "C4"];
const UNIT_RANGES = [[1,5],[6,10],[11,15],[16,20],[21,25],[26,30],[31,35],[36,40],[41,45],[46,50]];

const Section = ({ title, content, isChinese }: { title: string, content: React.ReactNode, isChinese?: boolean }) => (
  <div className="mb-5 last:mb-0">
    <h3 className={`text-tan font-black underline mb-1.5 ${isChinese ? 'text-lg' : 'text-base uppercase tracking-wider'}`}>
      {title}
    </h3>
    <div className={`font-bold leading-relaxed text-ink/90 ${isChinese ? 'text-[15px]' : 'text-[14px]'}`}>
      {content}
    </div>
  </div>
);

const ChineseInstructions = () => (
  <div className="flex flex-col h-full bg-[#F0EDE5] p-6 sm:p-10 select-none text-left">
    <div className="mb-6">
      <h2 className="text-4xl sm:text-5xl font-serif font-black text-olive mb-2">遊戲說明</h2>
      <div className="w-full h-0.5 bg-olive/30" />
    </div>
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1">
      <Section isChinese title="遊戲目標：" content="控制貪吃蛇吃到與英文單字對應的中文釋義。" />
      <Section isChinese title="操作方式：" content={
        <div className="space-y-1">
          <p>電腦：使用 <span className="text-olive">方向鍵</span> 移動，<span className="text-olive">空白鍵</span> 暫停。</p>
          <p>手機：直接在 <span className="text-olive">遊戲盤面滑動</span> 控制方向。</p>
        </div>
      } />
      <Section isChinese title="連勝獎勵：" content="連續答對可獲得遞增分數 (+10, +20...) 並增長蛇身。" />
      <Section isChinese title="失誤懲罰：" content="撞牆、撞身或吃錯字將扣分 (-10, -20...) 並縮短蛇身。" />
      <Section isChinese title="無敵護盾：" content="答對後獲得 1 秒無敵，期間可安全穿越牆壁與障礙。" />
      <Section isChinese title="遊戲結束：" content="時間耗盡或分數歸零時遊戲結束。" />
    </div>
    <div className="mt-4 text-center text-olive/50 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
      點擊翻轉查看英文版
    </div>
  </div>
);

const EnglishInstructions = () => (
  <div className="flex flex-col h-full bg-[#F0EDE5] p-6 sm:p-10 select-none text-left">
    <div className="mb-6">
      <h2 className="text-4xl sm:text-5xl font-serif font-black text-olive mb-2">How to Play</h2>
      <div className="w-full h-0.5 bg-olive/30" />
    </div>
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1">
      <Section title="Objective:" content="Control the snake to eat the Chinese meaning that matches the English word." />
      <Section title="Controls:" content={
        <div className="space-y-1">
          <p><span className="text-tan">PC:</span> Arrow Keys to move, Spacebar to pause.</p>
          <p><span className="text-tan">Mobile:</span> Swipe anywhere on screen to steer.</p>
        </div>
      } />
      <Section title="Streak Bonus:" content="Consecutive correct answers increase points (+10, +20...) and grow your snake." />
      <Section title="Penalties:" content="Hitting walls, yourself, or wrong words reduces score (-10, -20...) and shrinks your snake." />
      <Section title="Shield:" content="Gain 1 second of invincibility after a correct eat to safely pass through walls and obstacles." />
      <Section title="Game Over:" content="The game ends if time runs out or your score hits zero." />
    </div>
    <div className="mt-4 text-center text-olive/50 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
      Click to view Chinese version
    </div>
  </div>
);

function App() {
  const [isMuted, setIsMuted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showConfig, setShowConfig] = useState(false); 

  const { 
    gameState, score, timeLeft, snake, currentRound, words, setWords, 
    startGame, pauseGame, updateDirection, setGameState, isInvincible 
  } = useSnakeGame(isMuted);
  
  const { word: currentWord, foods } = currentRound;

  const [isLoading, setIsLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<number[] | null>(null);
  const [gameDuration, setGameDuration] = useState(10); 

  const joystickStart = useRef<{x: number, y: number} | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    joystickStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (gameState !== GameState.PLAYING || !joystickStart.current) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - joystickStart.current.x;
      const dy = currentY - joystickStart.current.y;
      const threshold = 15; 
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > threshold) {
          if (Math.abs(dx) > Math.abs(dy)) {
              updateDirection({ x: dx > 0 ? 1 : -1, y: 0 });
          } else {
              updateDirection({ x: 0, y: dy > 0 ? 1 : -1 });
          }
          joystickStart.current = { x: currentX, y: currentY };
      }
  };

  const handleTouchEnd = () => { joystickStart.current = null; };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (gameState === GameState.PLAYING) {
        if (e.key === 'ArrowUp') updateDirection({ x: 0, y: -1 });
        if (e.key === 'ArrowDown') updateDirection({ x: 0, y: 1 });
        if (e.key === 'ArrowLeft') updateDirection({ x: -1, y: 0 });
        if (e.key === 'ArrowRight') updateDirection({ x: 1, y: 0 });
      }
      if (e.key === ' ') pauseGame();
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, pauseGame, updateDirection]);

  const handleLoadCSV = async () => {
    if (!selectedLevel || !selectedRange) return;
    setIsLoading(true);
    try {
      const res = await fetch(LEVEL_CSVS[selectedLevel]);
      const txt = await res.text();
      const lines = txt.split(/\r?\n/);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const parsed: WordItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',').map(c => c.trim());
        const row: any = {};
        headers.forEach((h, idx) => row[h] = cols[idx]);
        const unit = parseInt(row['unit'] || '0');
        if (unit >= selectedRange[0] && unit <= selectedRange[1]) {
           const w = row['word'];
           const m = row['chinese meaning'] || row['meaning'] || row['chinesemeaning'];
           const p = row['pos'];
           if (w && m) parsed.push({ word: w, pos: p || '', meaning: m });
        }
      }
      setWords(parsed);
      setShowConfig(false);
      startGame(gameDuration, parsed);
    } catch (e: any) { alert("Failed to load vocabulary."); } 
    finally { setIsLoading(false); }
  };

  const isRangeDisabled = (range: number[]) => {
    if (selectedLevel?.startsWith('C')) {
      return range[0] >= 26;
    }
    return false;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const InstructionModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[100] flex items-center justify-center p-4 sm:p-8" onClick={() => setShowInstructions(false)}>
      <div className="relative w-full max-w-lg aspect-[3/4.8] sm:aspect-[3/4.2] cursor-pointer" style={{ perspective: '2000px' }} onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}>
        <div className="relative w-full h-full transition-transform duration-700 shadow-2xl rounded-[2.5rem]" style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-inner border border-white/20" style={{ backfaceVisibility: 'hidden' }}>
            <ChineseInstructions />
          </div>
          <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-inner border border-white/20" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <EnglishInstructions />
          </div>
        </div>
      </div>
    </div>
  );

  const UtilityButtons = () => (
    <div className="flex gap-2 z-50">
      <button onClick={() => setShowInstructions(true)} className="p-2.5 bg-white/50 backdrop-blur-md rounded-full border border-white/60 shadow-lg active:scale-90 transition-transform text-lg hover:bg-white/70">❓</button>
      <button onClick={() => setIsMuted(!isMuted)} className="p-2.5 bg-white/50 backdrop-blur-md rounded-full border border-white/60 shadow-lg active:scale-90 transition-transform text-lg hover:bg-white/70">{isMuted ? '🔇' : '🔊'}</button>
    </div>
  );

  if (showIntro) {
    return (
      <div className="flex flex-col h-[100dvh] w-full items-center justify-between bg-[#E8E5DA] text-ink p-8 select-none font-serif relative overflow-hidden">
        <ParticleBackground />
        {showInstructions && <InstructionModal />}
        
        <div className="w-full flex justify-between items-start z-10">
          <p className="text-olive uppercase tracking-[0.3em] font-bold text-[10px] opacity-70 mt-3">Developed by Shirley Du</p>
          <UtilityButtons />
        </div>

        <div className="z-10 flex flex-col items-center gap-4 text-center">
           <h1 className="text-6xl sm:text-8xl font-black text-ink leading-tight drop-shadow-2xl">
             iVocab <br/><span className="text-olive italic">Hungry Snake</span>
           </h1>
        </div>
        
        <div className="z-10 flex flex-col items-center gap-12 mb-20 w-full max-w-sm">
           <div className="relative text-8xl animate-bounce drop-shadow-2xl">
             🐍 <span className="absolute -right-4 -bottom-2 text-4xl">🍞</span>
           </div>
           <button 
             onClick={() => { setShowIntro(false); setShowConfig(true); }} 
             className="w-full py-5 rounded-full bg-olive text-white font-bold text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all border-b-4 border-black/10"
           >
             Enter Expedition
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full font-sans touch-none select-none overflow-hidden relative bg-[#E0DDD5]">
      {showInstructions && <InstructionModal />}
      
      {/* HEADER */}
      <header className="w-full px-4 py-3 flex justify-between items-center z-30 shrink-0 bg-[#E0DDD5]/70 backdrop-blur-md border-b border-black/5">
          <div className="bg-white/50 backdrop-blur-md px-4 py-1.5 rounded-full shadow-md border border-white/40 flex gap-4">
             <div><span className="text-[9px] uppercase text-ink/60 font-black block leading-none mb-1">Score</span><span className="text-lg font-bold text-ink leading-none">{score}</span></div>
             <div className="w-px h-6 bg-black/5 self-center" />
             <div><span className="text-[9px] uppercase text-ink/60 font-black block leading-none mb-1">Time</span><span className="text-lg font-bold text-ink leading-none">{formatTime(timeLeft)}</span></div>
          </div>
          <UtilityButtons />
      </header>

      {/* MOBILE CUE WORD CARD */}
      <div className="sm:hidden w-full px-4 py-3 z-30 bg-[#E0DDD5]/95 backdrop-blur-xl border-b border-black/10 flex justify-center sticky top-0 shadow-sm">
          <div className="bg-white shadow-xl border-2 border-olive/20 px-10 py-4 rounded-[2rem] flex flex-col items-center w-full max-w-xs transform transition-all animate-[slideDown_0.3s_ease-out]">
              <span className="text-[11px] uppercase font-black text-olive tracking-[0.3em] leading-none mb-2 opacity-60">Target Word</span>
              <span className="text-4xl font-serif font-black text-ink">{currentWord?.word || '...'}</span>
              <div className="mt-2 flex items-center gap-2">
                 <span className="text-[12px] font-black text-olive/90 bg-olive/10 px-3 py-1 rounded-lg border border-olive/20 uppercase tracking-tighter">{currentWord?.pos}</span>
              </div>
          </div>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden w-full relative">
        <main className="flex-1 relative flex items-center justify-center p-2 sm:p-6 overflow-hidden min-h-0">
          {/* TOUCH LAYER */}
          <div className="absolute inset-0 z-20" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}></div>
          
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-10">
               <div className="relative aspect-square shadow-2xl rounded-[2.5rem] border-4 border-white/50 overflow-hidden bg-white/10 backdrop-blur-md pointer-events-auto" style={{ width: '800px', height: '800px', maxWidth: '100%', maxHeight: '100%' }}>
                  <GameCanvas snake={snake} foods={foods} gridSize={GRID_SIZE} isInvincible={isInvincible} />
               </div>
          </div>

          {(gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 pointer-events-auto p-4">
                <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center border-4 border-white/50 w-full max-w-xs animate-[scaleIn_0.2s_ease-out]">
                  <h2 className="text-4xl font-serif font-black mb-4 text-ink">{gameState === GameState.GAME_OVER ? 'Game Over' : 'Paused'}</h2>
                  <div className="text-2xl mb-8 font-black text-olive">Score: {score}</div>
                  <button onClick={() => gameState === GameState.GAME_OVER ? setShowConfig(true) : pauseGame()} className="bg-olive text-white w-full py-5 rounded-2xl font-black text-xl shadow-2xl active:scale-95 transition-all border-b-4 border-black/10">
                    {gameState === GameState.GAME_OVER ? 'New Mission' : 'Resume'}
                  </button>
                </div>
            </div>
          )}
        </main>

        <aside className="w-full sm:w-[320px] lg:w-[380px] bg-white/80 backdrop-blur-2xl sm:border-l-2 border-white/60 z-40 flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.05)] shrink-0 sm:overflow-hidden">
          <div className="p-4 sm:p-10 flex flex-row sm:flex-col items-center sm:items-stretch gap-4 sm:gap-10 w-full">
              
              <div className="hidden sm:flex bg-white rounded-[2.5rem] p-10 shadow-inner border border-olive/10 flex-1 flex-col justify-center min-h-[240px]">
                  {currentWord ? (
                      <>
                          <div className="text-[11px] font-black text-olive/50 uppercase mb-4 tracking-widest">Active Word</div>
                          <div className="text-5xl font-serif font-black text-ink leading-tight mb-2">{currentWord.word}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-olive/80 bg-olive/10 px-3 py-1 rounded-lg border border-olive/20 uppercase tracking-widest">{currentWord.pos}</span>
                          </div>
                      </>
                  ) : <div className="animate-pulse text-tan italic font-serif text-lg">Initializing...</div>}
              </div>
              
              <div className="hidden sm:grid grid-cols-3 gap-3 p-4 bg-black/5 rounded-[2rem]">
                  <div /> <button className="p-5 bg-white rounded-2xl shadow-md hover:bg-olive hover:text-white active:scale-90 transition-all text-xl" onClick={() => updateDirection({x:0, y:-1})}>▲</button> <div />
                  <button className="p-5 bg-white rounded-2xl shadow-md hover:bg-olive hover:text-white active:scale-90 transition-all text-xl" onClick={() => updateDirection({x:-1, y:0})}>◀</button>
                  <button className="p-5 bg-white rounded-2xl shadow-md hover:bg-olive hover:text-white active:scale-90 transition-all text-xl" onClick={() => updateDirection({x:0, y:1})}>▼</button>
                  <button className="p-5 bg-white rounded-2xl shadow-md hover:bg-olive hover:text-white active:scale-90 transition-all text-xl" onClick={() => updateDirection({x:1, y:0})}>▶</button>
              </div>

              <button onClick={pauseGame} className="flex-1 sm:w-full py-5 rounded-2xl bg-tan/10 font-black text-ink uppercase tracking-[0.2em] border-2 border-tan/20 active:scale-95 transition-all flex items-center justify-center text-sm">
                  {gameState === GameState.PAUSED ? 'RESUME ▶' : 'PAUSE ||'}
              </button>
          </div>
        </aside>
      </div>

      {showConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#F0EDE5] rounded-[3.5rem] shadow-2xl max-w-lg w-full p-10 border border-white/60 animate-[scaleIn_0.2s_ease-out] my-auto">
                <h2 className="text-4xl font-serif font-black text-ink mb-12 text-center">Expedition Setup</h2>
                <div className="space-y-10">
                    <div>
                        <label className="block text-[12px] font-black text-ink/40 uppercase mb-5 tracking-[0.3em] text-center">Time Limit</label>
                        <div className="flex gap-4 px-2">
                            {[5, 10, 15].map(m => (
                                <button key={m} onClick={() => setGameDuration(m)} className={`flex-1 py-5 rounded-3xl border-2 font-black text-2xl transition-all ${gameDuration === m ? 'bg-ink text-white border-ink shadow-2xl scale-105' : 'bg-white/50 border-ink/5 text-ink hover:bg-white/80'}`}>{m}m</button>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white/40 p-8 rounded-[3.5rem] space-y-8 border-2 border-tan/20 shadow-inner">
                        <div className="flex flex-wrap gap-3 justify-center">
                            {LEVELS.map(l => (
                                <button key={l} onClick={() => { setSelectedLevel(l); setSelectedRange(null); }} className={`w-12 h-12 rounded-full font-black text-lg transition-all flex items-center justify-center ${selectedLevel === l ? 'bg-olive text-white shadow-2xl scale-125' : 'bg-white text-olive border-2 border-olive/10 hover:border-olive/40'}`}>{l}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                            {UNIT_RANGES.map((r, i) => {
                                const disabled = isRangeDisabled(r);
                                return (
                                    <button 
                                      key={i} 
                                      disabled={disabled}
                                      onClick={() => setSelectedRange(r)} 
                                      className={`text-[11px] py-4 rounded-2xl border-2 transition-all font-black ${disabled ? 'opacity-5 cursor-not-allowed' : selectedRange === r ? 'bg-olive text-white border-olive shadow-xl scale-110' : 'bg-white border-olive/10 text-ink hover:bg-olive/10 shadow-sm'}`}
                                    >
                                      {r[0]}<br/>{r[1]}
                                    </button>
                                );
                            })}
                        </div>
                        <button 
                          onClick={handleLoadCSV} 
                          disabled={!selectedLevel || !selectedRange || isLoading} 
                          className="w-full bg-olive text-white py-6 rounded-3xl font-black text-3xl shadow-2xl disabled:opacity-20 active:scale-95 transition-all border-b-[10px] border-black/10 mt-4"
                        >
                          {isLoading ? 'SYNCING...' : 'START HUNT'}
                        </button>
                    </div>
                </div>
                <button onClick={() => setShowConfig(false)} className="mt-10 w-full text-xs text-ink/40 font-black uppercase tracking-[0.5em] hover:text-ink transition-colors block text-center">GO BACK</button>
            </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 183, 165, 0.4);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

export default App;

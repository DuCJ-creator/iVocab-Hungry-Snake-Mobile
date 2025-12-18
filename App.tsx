
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

const CN_INSTRUCTION_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="600" height="800" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#F0EDE5"/>
  <text x="40" y="80" font-family="Georgia, serif" font-size="50" font-weight="bold" fill="#7D8D70">遊戲說明</text>
  <line x1="40" y1="105" x2="560" y2="105" stroke="#A8B7A5" stroke-width="2" />
  <g transform="translate(40, 160)">
    <text font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#5A4A42">
      <tspan x="0" y="0" text-decoration="underline" fill="#B7AFA1">遊戲目標：</tspan>
      <tspan x="110" y="0">吃掉對應英文單字的中釋義。</tspan>
      
      <tspan x="0" y="70" text-decoration="underline" fill="#B7AFA1">操作方式：</tspan>
      <tspan x="110" y="70">電腦：方向鍵移動，空白鍵暫停。</tspan>
      <tspan x="110" y="100">手機：滑動螢幕控制方向。</tspan>
      
      <tspan x="0" y="170" text-decoration="underline" fill="#B7AFA1">連勝獎勵：</tspan>
      <tspan x="110" y="170">連續答對獲得遞增分數並增長蛇身。</tspan>
      
      <tspan x="0" y="240" text-decoration="underline" fill="#B7AFA1">失誤懲罰：</tspan>
      <tspan x="110" y="240">撞牆、撞身或吃錯字扣分並縮短蛇身。</tspan>
      
      <tspan x="0" y="310" text-decoration="underline" fill="#B7AFA1">無敵護盾：</tspan>
      <tspan x="110" y="310">答對後獲得 1 秒無敵，可穿牆穿身。</tspan>
      
      <tspan x="0" y="380" text-decoration="underline" fill="#B7AFA1">遊戲結束：</tspan>
      <tspan x="110" y="380">時間耗盡或分數歸零。</tspan>
    </text>
  </g>
</svg>
`)}`;

const EN_INSTRUCTION_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="600" height="800" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#F0EDE5"/>
  <text x="40" y="80" font-family="Georgia, serif" font-size="50" font-weight="bold" fill="#7D8D70">How to Play</text>
  <line x1="40" y1="105" x2="560" y2="105" stroke="#A8B7A5" stroke-width="2" />
  <g transform="translate(40, 160)">
    <text font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#5A4A42">
      <tspan x="0" y="0" text-decoration="underline" fill="#B7AFA1">Objective:</tspan>
      <tspan x="110" y="0">Eat the correct Chinese meaning.</tspan>
      
      <tspan x="0" y="70" text-decoration="underline" fill="#B7AFA1">Controls:</tspan>
      <tspan x="110" y="70">PC: Arrow keys. Space to Pause.</tspan>
      <tspan x="110" y="100">Mobile: Swipe screen to steer.</tspan>
      
      <tspan x="0" y="170" text-decoration="underline" fill="#B7AFA1">Streaks:</tspan>
      <tspan x="110" y="170">Correct hits grow snake and score.</tspan>
      
      <tspan x="0" y="240" text-decoration="underline" fill="#B7AFA1">Penalties:</tspan>
      <tspan x="110" y="240">Wrong hits or walls shrink snake.</tspan>
      
      <tspan x="0" y="310" text-decoration="underline" fill="#B7AFA1">Shield:</tspan>
      <tspan x="110" y="310">1s invincibility after correct hit.</tspan>
      
      <tspan x="0" y="380" text-decoration="underline" fill="#B7AFA1">Game Over:</tspan>
      <tspan x="110" y="380">Time out or zero score.</tspan>
    </text>
  </g>
</svg>
`)}`;

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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const InstructionModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[100] flex items-center justify-center p-4 sm:p-8" onClick={() => setShowInstructions(false)}>
      <div className="relative w-full max-w-lg aspect-[3/4] cursor-pointer" style={{ perspective: '2000px' }} onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}>
        <div className="relative w-full h-full transition-transform duration-700 shadow-2xl rounded-3xl" style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          <div className="absolute inset-0 rounded-3xl overflow-hidden bg-[#F0EDE5]" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <img src={CN_INSTRUCTION_SVG} alt="Instructions (CN)" className="w-full h-full object-fill" />
          </div>
          <div className="absolute inset-0 rounded-3xl overflow-hidden bg-[#F0EDE5]" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <img src={EN_INSTRUCTION_SVG} alt="Instructions (EN)" className="w-full h-full object-fill" />
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
      
      {/* HEADER: FIXED TOP */}
      <header className="w-full px-4 py-3 flex justify-between items-center z-30 shrink-0 bg-[#E0DDD5]/70 backdrop-blur-md border-b border-black/5">
          <div className="bg-white/50 backdrop-blur-md px-4 py-1.5 rounded-full shadow-md border border-white/40 flex gap-4">
             <div><span className="text-[9px] uppercase text-ink/60 font-black block leading-none mb-1">Score</span><span className="text-lg font-bold text-ink leading-none">{score}</span></div>
             <div className="w-px h-6 bg-black/5 self-center" />
             <div><span className="text-[9px] uppercase text-ink/60 font-black block leading-none mb-1">Time</span><span className="text-lg font-bold text-ink leading-none">{formatTime(timeLeft)}</span></div>
          </div>
          <UtilityButtons />
      </header>

      {/* BODY: RESPONSIVE SPLIT */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden w-full relative">
        
        {/* GAME AREA: CENTERED SQUARE */}
        <main className="flex-1 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          {/* TOUCH LAYER */}
          <div className="absolute inset-0 z-20 cursor-crosshair" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}></div>
          
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-10">
               <div className="relative aspect-square shadow-2xl rounded-2xl border-2 border-white/40 overflow-hidden bg-white/5 backdrop-blur-sm pointer-events-auto" style={{ width: '800px', height: '800px', maxWidth: '100%', maxHeight: '100%' }}>
                  <GameCanvas snake={snake} foods={foods} gridSize={GRID_SIZE} isInvincible={isInvincible} />
               </div>
          </div>
          
          {/* OVERLAYS */}
          {(gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 pointer-events-auto p-4">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center border border-white/50 w-full max-w-xs animate-[scaleIn_0.2s_ease-out]">
                  <h2 className="text-3xl font-serif font-black mb-4 text-ink">{gameState === GameState.GAME_OVER ? 'Expedition End' : 'Expedition Paused'}</h2>
                  <div className="text-xl mb-8">Score: <span className="font-bold text-olive">{score}</span></div>
                  <button onClick={() => gameState === GameState.GAME_OVER ? setShowConfig(true) : pauseGame()} className="bg-olive text-white w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all">
                    {gameState === GameState.GAME_OVER ? 'New Goal' : 'Continue'}
                  </button>
                </div>
            </div>
          )}
        </main>

        {/* SIDEBAR: RIGHT ON DESKTOP, BOTTOM ON MOBILE */}
        <aside className="w-full sm:w-[320px] lg:w-[380px] bg-white/80 backdrop-blur-2xl sm:border-l border-white/60 z-40 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.05)] shrink-0 overflow-y-auto sm:overflow-hidden">
          <div className="p-3 sm:p-8 flex flex-row sm:flex-col items-center sm:items-stretch gap-3 sm:gap-8 w-full">
              
              <div className="bg-white rounded-2xl sm:rounded-[2rem] px-4 py-2 sm:p-8 shadow-sm border border-white flex-1 flex flex-col justify-center min-h-[70px] sm:min-h-[200px]">
                  {currentWord ? (
                      <>
                          <div className="hidden sm:block text-[10px] font-black text-olive uppercase mb-2 tracking-widest opacity-60">Target Vocabulary</div>
                          <div className="text-xl sm:text-4xl font-serif font-black text-ink leading-tight">{currentWord.word}</div>
                          <div className="flex items-center gap-2 mt-1 sm:mt-3">
                            <span className="text-[10px] sm:text-xs font-bold text-olive/80 bg-olive/10 px-2 py-0.5 rounded-md border border-olive/10">{currentWord.pos}</span>
                            <span className="sm:hidden text-[9px] uppercase font-bold text-ink/40 tracking-tighter">Current hunt</span>
                          </div>
                      </>
                  ) : <div className="animate-pulse text-tan italic font-serif text-sm">Waiting...</div>}
              </div>
              
              <div className="hidden sm:grid grid-cols-3 gap-2 p-3 bg-black/5 rounded-3xl">
                  <div /> <button className="p-4 bg-white rounded-xl shadow-sm hover:bg-olive hover:text-white transition-colors" onClick={() => updateDirection({x:0, y:-1})}>▲</button> <div />
                  <button className="p-4 bg-white rounded-xl shadow-sm hover:bg-olive hover:text-white transition-colors" onClick={() => updateDirection({x:-1, y:0})}>◀</button>
                  <button className="p-4 bg-white rounded-xl shadow-sm hover:bg-olive hover:text-white transition-colors" onClick={() => updateDirection({x:0, y:1})}>▼</button>
                  <button className="p-4 bg-white rounded-xl shadow-sm hover:bg-olive hover:text-white transition-colors" onClick={() => updateDirection({x:1, y:0})}>▶</button>
              </div>

              <button onClick={pauseGame} className="px-6 sm:w-full py-4 rounded-xl sm:rounded-2xl bg-tan/20 font-black text-ink uppercase tracking-widest border border-tan/30 active:scale-95 transition-all h-[70px] sm:h-auto flex items-center justify-center shrink-0">
                  {gameState === GameState.PAUSED ? '▶' : '||'}
              </button>
          </div>
          <div className="hidden sm:block mt-auto p-8 border-t border-black/5">
               <p className="text-[10px] text-ink/40 uppercase font-black tracking-widest">Instructions</p>
               <p className="text-xs text-ink/60 mt-1 italic leading-relaxed">Eat matching Chinese meanings. Correct hits grant 1s invincibility. Don't hit walls!</p>
          </div>
        </aside>
      </div>

      {/* SETUP MODAL */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[70] flex items-center justify-center p-4">
            <div className="bg-[#F0EDE5] rounded-[3rem] shadow-2xl max-w-md w-full p-8 border border-white/60 animate-[scaleIn_0.2s_ease-out]">
                <h2 className="text-3xl font-serif font-black text-ink mb-8 text-center">Setup Expedition</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-ink/40 uppercase mb-2 tracking-widest">Feeding Duration</label>
                        <div className="flex gap-2">
                            {[5, 10, 15].map(m => (
                                <button key={m} onClick={() => setGameDuration(m)} className={`flex-1 py-3 rounded-xl border-2 font-black transition-all ${gameDuration === m ? 'bg-ink text-white border-ink' : 'border-ink/10 text-ink hover:bg-ink/5'}`}>{m}m</button>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white/60 p-6 rounded-[2.5rem] space-y-6 border border-tan/30 shadow-inner">
                        <div className="flex flex-wrap gap-2 justify-center">
                            {LEVELS.map(l => (
                                <button key={l} onClick={() => setSelectedLevel(l)} className={`w-10 h-10 rounded-full font-black transition-all ${selectedLevel === l ? 'bg-olive text-white shadow-md scale-110' : 'bg-white text-olive border border-olive/10 hover:border-olive/40'}`}>{l}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                            {UNIT_RANGES.map((r, i) => (
                                <button key={i} onClick={() => setSelectedRange(r)} className={`text-[9px] py-2 rounded-lg border transition-all ${selectedRange === r ? 'bg-olive text-white border-olive font-black' : 'border-olive/20 text-ink hover:bg-olive/5'}`}>{r[0]}-{r[1]}</button>
                            ))}
                        </div>
                        <button onClick={handleLoadCSV} disabled={!selectedLevel || !selectedRange || isLoading} className="w-full bg-olive text-white py-4 rounded-xl font-black text-lg shadow-xl disabled:opacity-30 active:scale-95 transition-all border-b-4 border-black/10">
                          {isLoading ? 'Preparing...' : 'Start Hunting'}
                        </button>
                    </div>
                </div>
                <button onClick={() => setShowConfig(false)} className="mt-4 w-full text-xs text-ink/40 font-bold uppercase hover:text-ink transition-colors">Go Back</button>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;

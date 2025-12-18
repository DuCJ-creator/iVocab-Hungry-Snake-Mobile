
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
const CAP_LEVELS = ["C1", "C2", "C3", "C4"];
const UNIT_RANGES = [[1,5],[6,10],[11,15],[16,20],[21,25],[26,30],[31,35],[36,40],[41,45],[46,50]];

// Inlined SVGs as Data URLs for guaranteed loading
const CN_INSTRUCTION_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="600" height="800" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#F0EDE5"/>
  <circle cx="500" cy="100" r="80" fill="#FFFFFF" fill-opacity="0.4" />
  <circle cx="550" cy="150" r="60" fill="#FFFFFF" fill-opacity="0.4" />
  <circle cx="50" cy="700" r="100" fill="#FFFFFF" fill-opacity="0.4" />
  <text x="40" y="100" font-family="Georgia, serif" font-size="56" font-weight="bold" fill="#7D8D70">遊戲說明</text>
  <line x1="40" y1="125" x2="560" y2="125" stroke="#A8B7A5" stroke-width="2" />
  <g transform="translate(40, 180)">
    <text font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#5A4A42">
      <tspan x="0" y="0" text-decoration="underline" fill="#B7AFA1">遊戲目標：</tspan>
      <tspan x="115" y="0">控制貪吃蛇吃到與英文單字對應的中</tspan>
      <tspan x="0" y="35">文釋義。</tspan>
      <tspan x="0" y="90" text-decoration="underline" fill="#B7AFA1">操作方式：</tspan>
      <tspan x="115" y="90">電腦： 使用方向鍵移動，空白鍵暫停。</tspan>
      <tspan x="115" y="125">手機： 滑動螢幕控制方向。</tspan>
      <tspan x="0" y="180" text-decoration="underline" fill="#B7AFA1">連勝獎勵：</tspan>
      <tspan x="115" y="180">連續答對可獲得遞增分數 (+10, +20...) </tspan>
      <tspan x="0" y="215">並增長蛇身。</tspan>
      <tspan x="0" y="270" text-decoration="underline" fill="#B7AFA1">失誤懲罰：</tspan>
      <tspan x="115" y="270">撞牆、撞身或吃錯字將扣分 (-10, -20...) </tspan>
      <tspan x="0" y="305">並縮短蛇身。</tspan>
      <tspan x="0" y="360" text-decoration="underline" fill="#B7AFA1">無敵護盾：</tspan>
      <tspan x="115" y="360">答對後獲得 1 秒無敵，期間可安全穿越</tspan>
      <tspan x="0" y="395">牆壁與障礙。</tspan>
      <tspan x="0" y="450" text-decoration="underline" fill="#B7AFA1">遊戲結束：</tspan>
      <tspan x="115" y="450">時間耗盡或分數歸零時遊戲結束。</tspan>
    </text>
  </g>
</svg>
`)}`;

const EN_INSTRUCTION_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="600" height="800" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#F0EDE5"/>
  <circle cx="500" cy="100" r="80" fill="#FFFFFF" fill-opacity="0.4" />
  <circle cx="50" cy="700" r="100" fill="#FFFFFF" fill-opacity="0.4" />
  <text x="40" y="100" font-family="Georgia, serif" font-size="56" font-weight="bold" fill="#7D8D70">How to Play</text>
  <line x1="40" y1="125" x2="560" y2="125" stroke="#A8B7A5" stroke-width="2" />
  <g transform="translate(40, 180)">
    <text font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#5A4A42">
      <tspan x="0" y="0" text-decoration="underline" fill="#B7AFA1">Objective:</tspan>
      <tspan x="110" y="0">Control the snake to eat the Chinese</tspan>
      <tspan x="0" y="30">meaning that matches the English word.</tspan>
      <tspan x="0" y="90" text-decoration="underline" fill="#B7AFA1">Controls PC:</tspan>
      <tspan x="130" y="90">Arrow Keys to move, Spacebar to</tspan>
      <tspan x="0" y="120">pause.</tspan>
      <tspan x="80" y="120" text-decoration="underline" fill="#B7AFA1">Mobile:</tspan>
      <tspan x="170" y="120">Swipe screen to steer.</tspan>
      <tspan x="0" y="180" text-decoration="underline" fill="#B7AFA1">Streak Bonus:</tspan>
      <tspan x="140" y="180">Consecutive correct answers</tspan>
      <tspan x="0" y="210">increase points (+10, +20...) and grow your snake.</tspan>
      <tspan x="0" y="270" text-decoration="underline" fill="#B7AFA1">Penalties:</tspan>
      <tspan x="110" y="270">Hitting walls, yourself, or wrong</tspan>
      <tspan x="0" y="300">words reduces score (-10, -20...) and shrinks your</tspan>
      <tspan x="0" y="330">snake.</tspan>
      <tspan x="0" y="390" text-decoration="underline" fill="#B7AFA1">Shield:</tspan>
      <tspan x="80" y="390">Gain 1 second of invincibility after a</tspan>
      <tspan x="0" y="420">correct eat to safely pass through walls and</tspan>
      <tspan x="0" y="450">obstacles.</tspan>
      <tspan x="0" y="510" text-decoration="underline" fill="#B7AFA1">Game Over:</tspan>
      <tspan x="125" y="510">The game ends if time runs out or</tspan>
      <tspan x="0" y="540">your score hits zero.</tspan>
    </text>
  </g>
</svg>
`)}`;

function App() {
  const [isMuted, setIsMuted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const { 
    gameState, score, timeLeft, snake, currentRound, words, setWords, 
    startGame, pauseGame, updateDirection, setGameState, isInvincible 
  } = useSnakeGame(isMuted);
  
  const { word: currentWord, foods } = currentRound;

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [showConfig, setShowConfig] = useState(false); 
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

  const handleLevelSelect = (lvl: string) => {
    setSelectedLevel(lvl);
    if (CAP_LEVELS.includes(lvl) && selectedRange && selectedRange[0] > 25) {
      setSelectedRange(null);
    }
  };

  const handleLoadCSV = async () => {
    if (!selectedLevel || !selectedRange) return;
    setIsLoading(true);
    setLoadingMsg("Fetching vocabulary...");
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
      if (parsed.length === 0) throw new Error("No words found.");
      setWords(parsed);
      setShowConfig(false);
      startGame(gameDuration, parsed);
    } catch (e: any) { alert(e.message); } 
    finally { setIsLoading(false); }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const InstructionModal = () => (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-lg z-[100] flex items-center justify-center p-4 sm:p-8"
      onClick={() => setShowInstructions(false)}
    >
      <div 
        className="relative w-full max-w-lg aspect-[3/4] cursor-pointer"
        style={{ perspective: '2000px' }}
        onClick={(e) => {
          e.stopPropagation();
          setIsFlipped(!isFlipped);
        }}
      >
        <div 
          className="relative w-full h-full transition-transform duration-700 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-3xl"
          style={{ 
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
          }}
        >
          {/* FRONT (Chinese) */}
          <div 
            className="absolute inset-0 rounded-3xl overflow-hidden bg-[#F0EDE5]"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <img src={CN_INSTRUCTION_SVG} alt="Instructions (CN)" className="w-full h-full object-fill" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-olive text-white px-8 py-3 rounded-full text-sm font-bold shadow-xl animate-bounce border-2 border-white/20 whitespace-nowrap">
              點擊切換英文 (Tap for English)
            </div>
          </div>
          {/* BACK (English) */}
          <div 
            className="absolute inset-0 rounded-3xl overflow-hidden bg-[#F0EDE5]"
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)' 
            }}
          >
            <img src={EN_INSTRUCTION_SVG} alt="Instructions (EN)" className="w-full h-full object-fill" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-olive text-white px-8 py-3 rounded-full text-sm font-bold shadow-xl animate-bounce border-2 border-white/20 whitespace-nowrap">
              Tap for Chinese (切換中文)
            </div>
          </div>
        </div>
        <button 
          className="absolute -top-14 right-0 bg-white/20 hover:bg-white/40 text-white w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/30 text-2xl font-bold transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowInstructions(false); }}
        >
          ✕
        </button>
      </div>
    </div>
  );

  if (showIntro) {
    return (
      <div className="flex flex-col h-[100dvh] w-full items-center justify-between bg-[#E8E5DA] text-ink p-4 sm:p-6 select-none font-serif relative overflow-hidden">
        <ParticleBackground />
        <div className="absolute top-4 right-4 flex gap-3 z-20">
          <button 
            onClick={() => { setIsFlipped(false); setShowInstructions(true); }}
            className="p-3 bg-white/30 hover:bg-white/50 backdrop-blur-md rounded-full transition-all text-2xl border border-white/40 w-12 h-12 flex items-center justify-center shadow-xl active:scale-90"
            title="How to Play"
          >
            ❓
          </button>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 bg-white/30 hover:bg-white/50 backdrop-blur-md rounded-full transition-all text-2xl border border-white/40 w-12 h-12 flex items-center justify-center shadow-xl active:scale-90"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md gap-8 z-10">
          <h1 className="text-6xl sm:text-8xl font-bold text-ink text-center leading-tight drop-shadow-lg">
            iVocab <br/> <span className="text-olive italic">Hungry Snake</span>
          </h1>
          <div className="text-center">
            <p className="text-olive uppercase tracking-[0.3em] font-bold text-sm opacity-80">Developed by Shirley Du</p>
          </div>
          <div className="relative h-24 sm:h-40 flex items-center justify-center">
             <div className="text-8xl sm:text-9xl animate-bounce drop-shadow-2xl">🐍</div>
             <div className="absolute translate-x-16 translate-y-6 text-6xl drop-shadow-xl">🍞</div>
          </div>
          <button 
            onClick={() => { setShowIntro(false); setShowConfig(true); }}
            className="w-full max-w-xs py-5 rounded-full bg-olive text-white font-bold text-2xl uppercase tracking-[0.2em] shadow-2xl hover:-translate-y-2 active:scale-95 transition-all border-b-4 border-black/10"
          >
            Start Game →
          </button>
        </div>
        {showInstructions && <InstructionModal />}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row h-[100dvh] w-full mx-auto font-sans touch-none select-none overflow-hidden relative bg-[#E0DDD5]">
      {showInstructions && <InstructionModal />}
      {/* MOBILE HEADER */}
      <div className="sm:hidden w-full px-4 py-3 flex justify-between items-center z-30 shrink-0 bg-[#E0DDD5]/70 backdrop-blur-md border-b border-black/5">
          <div className="bg-white/50 backdrop-blur-md px-5 py-2 rounded-full shadow-lg border border-white/40 flex gap-6">
             <div><span className="text-[10px] uppercase text-ink/60 font-black block">Score</span><span className="text-xl font-bold text-ink leading-none">{score}</span></div>
             <div><span className="text-[10px] uppercase text-ink/60 font-black block">Time</span><span className="text-xl font-bold text-ink leading-none">{formatTime(timeLeft)}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setIsFlipped(false); setShowInstructions(true); }} className="p-2.5 bg-white/50 backdrop-blur-md rounded-full border border-white/60 shadow-md">❓</button>
            <button onClick={() => setIsMuted(!isMuted)} className="p-2.5 bg-white/50 backdrop-blur-md rounded-full border border-white/60 shadow-md">{isMuted ? '🔇' : '🔊'}</button>
          </div>
      </div>

      <div className="flex-1 relative w-full h-full overflow-hidden bg-white/10 order-1 flex flex-col justify-center">
        <div className="absolute inset-0 z-20" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}></div>
        <div className="relative w-full h-full p-4 flex items-center justify-center pointer-events-none z-10">
             <div className="relative aspect-square shadow-[0_30px_60px_rgba(0,0,0,0.15)] rounded-3xl border-4 border-white/60 overflow-hidden bg-white/5 backdrop-blur-sm pointer-events-auto" style={{ width: '1000px', height: '1000px', maxWidth: '100%', maxHeight: '100%' }}>
                <GameCanvas snake={snake} foods={foods} gridSize={GRID_SIZE} isInvincible={isInvincible} />
             </div>
        </div>
        {(gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xl flex items-center justify-center z-50 pointer-events-auto">
              <div className="bg-white/90 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl text-center border border-white max-w-xs scale-in animate-[scaleIn_0.3s_ease-out]">
                <h2 className="text-4xl font-serif font-black mb-6 text-ink">{gameState === GameState.GAME_OVER ? 'Game Over' : 'Paused'}</h2>
                <div className="text-2xl mb-8 font-serif italic">Score: <span className="font-bold text-olive not-italic">{score}</span></div>
                <button onClick={() => gameState === GameState.GAME_OVER ? setShowConfig(true) : pauseGame()} className="bg-olive text-white w-full py-4 rounded-full font-bold text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all">
                  {gameState === GameState.GAME_OVER ? 'New Challenge' : 'Resume Play'}
                </button>
              </div>
          </div>
        )}
      </div>

      {/* SIDEBAR */}
      <div className="order-2 w-full sm:w-[300px] lg:w-[340px] bg-white/80 backdrop-blur-2xl sm:border-l border-white/60 z-40 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.05)]">
        <div className="hidden sm:flex flex-col p-8 gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-serif font-black text-ink">iVocab</h1>
                <div className="flex gap-3">
                    <button onClick={() => { setIsFlipped(false); setShowInstructions(true); }} className="p-2.5 bg-white/60 rounded-full border border-white/80 hover:bg-white transition-all shadow-sm active:scale-90">❓</button>
                    <button onClick={() => setIsMuted(!isMuted)} className="p-2.5 bg-white/60 rounded-full border border-white/80 hover:bg-white transition-all shadow-sm active:scale-90">{isMuted ? '🔇' : '🔊'}</button>
                </div>
            </div>
            <div className="bg-white/60 p-5 rounded-3xl border border-white/60 shadow-sm grid grid-cols-2 gap-6">
                <div className="text-center"><span className="text-xs uppercase text-ink/50 font-black block mb-1">Score</span><span className="text-3xl font-bold text-ink">{score}</span></div>
                <div className="text-center"><span className="text-xs uppercase text-ink/50 font-black block mb-1">Time</span><span className="text-3xl font-bold text-ink">{formatTime(timeLeft)}</span></div>
            </div>
        </div>
        <div className="p-5 sm:p-8 sm:pt-0 flex flex-col gap-6 flex-1">
            <div className="bg-white rounded-[2rem] p-8 shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)] text-center border border-white min-h-[180px] flex flex-col justify-center">
                {currentWord ? (
                    <>
                        <div className="text-[10px] font-black text-olive uppercase mb-2 tracking-[0.2em] opacity-70">Target Vocabulary</div>
                        <div className="text-4xl font-serif font-black text-ink mb-3 break-words leading-tight">{currentWord.word}</div>
                        <span className="inline-block text-xs font-bold text-olive/80 bg-olive/5 px-3 py-1 rounded-full self-center border border-olive/10">{currentWord.pos}</span>
                    </>
                ) : <div className="animate-pulse text-tan italic font-serif">Awaiting bread...</div>}
            </div>
            <div className="hidden sm:flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2 p-2 bg-black/5 rounded-3xl">
                    <div /> <button className="p-5 bg-white rounded-2xl shadow-sm active:bg-olive active:text-white transition-all hover:translate-y-[-2px] active:translate-y-0" onClick={() => updateDirection({x:0, y:-1})}>▲</button> <div />
                    <button className="p-5 bg-white rounded-2xl shadow-sm active:bg-olive active:text-white transition-all hover:translate-x-[-2px] active:translate-x-0" onClick={() => updateDirection({x:-1, y:0})}>◀</button>
                    <button className="p-5 bg-white rounded-2xl shadow-sm active:bg-olive active:text-white transition-all hover:translate-y-[2px] active:translate-y-0" onClick={() => updateDirection({x:0, y:1})}>▼</button>
                    <button className="p-5 bg-white rounded-2xl shadow-sm active:bg-olive active:text-white transition-all hover:translate-x-[2px] active:translate-x-0" onClick={() => updateDirection({x:1, y:0})}>▶</button>
                </div>
            </div>
            <button onClick={pauseGame} className="w-full py-4 rounded-2xl bg-tan/20 font-black text-ink uppercase tracking-widest mt-auto border border-tan/40 hover:bg-tan/30 transition-all active:scale-95">
                {gameState === GameState.PAUSED ? 'Resume' : 'Pause'}
            </button>
        </div>
      </div>

      {showConfig && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-2xl z-[60] flex items-center justify-center p-4">
            <div className="bg-[#F0EDE5] rounded-[3rem] shadow-2xl max-w-md w-full p-8 border border-white/60 scale-in animate-[scaleIn_0.3s_ease-out]">
                <h2 className="text-3xl font-serif font-black text-ink mb-8 text-center">New Expedition</h2>
                {isLoading ? (
                    <div className="text-center py-12"><div className="animate-spin text-5xl mb-4">⏳</div><p className="font-serif italic">{loadingMsg}</p></div>
                ) : (
                    <div className="space-y-8">
                        <div>
                            <label className="block text-[10px] font-black text-ink/40 uppercase mb-3 tracking-widest">Select Feeding Time</label>
                            <div className="flex gap-3">
                                {[5, 10, 15].map(m => (
                                    <button key={m} onClick={() => setGameDuration(m)} className={`flex-1 py-4 rounded-2xl border-2 font-black transition-all ${gameDuration === m ? 'bg-ink text-white border-ink shadow-lg' : 'border-ink/10 text-ink hover:border-ink/30'}`}>{m}m</button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-5">
                            <label className="block text-[10px] font-black text-ink/40 uppercase tracking-widest">Select Library</label>
                            <div className="bg-white/60 p-6 rounded-[2rem] space-y-6 border border-tan/30 shadow-sm">
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {LEVELS.map(l => (
                                        <button key={l} onClick={() => handleLevelSelect(l)} className={`w-11 h-11 rounded-full font-black transition-all ${selectedLevel === l ? 'bg-olive text-white scale-110 shadow-lg' : 'bg-white text-olive border border-olive/10 hover:border-olive/40'}`}>{l}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {UNIT_RANGES.map((r, i) => {
                                        const isDisabled = selectedLevel && CAP_LEVELS.includes(selectedLevel) && r[0] > 25;
                                        return (
                                            <button key={i} onClick={() => setSelectedRange(r)} disabled={isDisabled} className={`text-[10px] py-2.5 rounded-xl border transition-all ${isDisabled ? 'opacity-5 pointer-events-none' : selectedRange === r ? 'bg-olive text-white border-olive font-black shadow-md' : 'border-olive/20 text-ink hover:bg-olive/5'}`}>{r[0]}-{r[1]}</button>
                                        );
                                    })}
                                </div>
                                <button onClick={handleLoadCSV} disabled={!selectedLevel || !selectedRange} className="w-full bg-olive text-white py-5 rounded-2xl font-black text-lg shadow-2xl disabled:opacity-30 active:scale-95 transition-all border-b-4 border-black/10">Launch Expedition</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}

export default App;

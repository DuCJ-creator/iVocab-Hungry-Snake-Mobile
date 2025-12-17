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

function App() {
  const [isMuted, setIsMuted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const { 
    gameState, score, timeLeft, snake, currentRound, words, setWords, 
    startGame, pauseGame, updateDirection, setGameState, isInvincible 
  } = useSnakeGame(isMuted);
  
  const { word: currentWord, foods } = currentRound;

  // Loading & Config
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [showConfig, setShowConfig] = useState(false); 
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<number[] | null>(null);
  const [gameDuration, setGameDuration] = useState(10); 

  // --- JOYSTICK TOUCH CONTROLS ---
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

  const handleTouchEnd = () => {
    joystickStart.current = null;
  };

  // Keyboard
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

  // Handle Level Selection with validation
  const handleLevelSelect = (lvl: string) => {
    setSelectedLevel(lvl);
    // If switching to a CAP level (C1-C4) and current range starts > 25, reset the range
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
      if (parsed.length === 0) throw new Error("No words found in this range.");
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

  if (showIntro) {
    return (
      <div className="flex flex-col h-[100dvh] w-full items-center justify-between bg-[#E8E5DA] text-ink p-4 sm:p-6 select-none font-serif relative overflow-hidden">
        {/* Background Particles */}
        <ParticleBackground />

        {/* Mute Button */}
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full transition-colors z-20 text-xl border border-white/30"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md gap-6 z-10 min-h-0">
          
          {/* Header Section - Compact on mobile */}
          <div className="flex flex-col items-center gap-2 sm:gap-6 shrink-0">
            <h1 className="text-4xl sm:text-7xl font-bold text-ink tracking-tight font-serif drop-shadow-sm text-center leading-tight">
              iVocab <br/> <span className="text-olive italic">Hungry Snake</span>
            </h1>
            
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <div className="inline-block px-3 py-1 rounded-full border border-olive/30 bg-olive/5 backdrop-blur-sm">
                <p className="text-[10px] sm:text-xs font-bold text-olive uppercase tracking-[0.2em]">
                  Developed by Shirley Du
                </p>
              </div>
              <div className="flex flex-col items-center gap-0.5 sm:gap-1 opacity-70">
                 <span className="text-xs sm:text-sm font-serif italic text-ink">Designed for GSAT & CAP Vocab</span>
                 <span className="text-[10px] sm:text-xs font-sans uppercase tracking-widest text-tan font-bold">Mobile-Friendly</span>
              </div>
            </div>
          </div>
          
          {/* Icon Animation - Smaller on mobile */}
          <div className="relative h-20 sm:h-32 flex items-center justify-center shrink-0">
             <div className="absolute inset-0 bg-olive/20 blur-3xl rounded-full animate-pulse"></div>
             <div className="text-6xl sm:text-8xl animate-[bounce_3s_infinite] drop-shadow-2xl z-10">🐍</div>
             <div className="absolute text-4xl sm:text-6xl animate-[bounce_3s_infinite] delay-100 translate-x-8 sm:translate-x-12 translate-y-2 sm:translate-y-4 opacity-90 z-0">🍞</div>
          </div>
          
          {/* Artistic Instruction Panel - Reduced padding on mobile */}
          <div className="relative group w-full shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-olive/40 via-tan/40 to-olive/40 rounded-2xl blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white/40 backdrop-blur-xl p-5 sm:p-8 rounded-2xl border border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.3)] text-ink text-center">
              <p className="text-base sm:text-xl font-serif italic leading-relaxed text-ink/90">
                "Guide the serpent to the <span className="font-bold text-olive">Bread of Knowledge</span>."
              </p>
              <div className="mt-2 sm:mt-4 flex flex-col gap-0.5 sm:gap-1 text-xs sm:text-sm font-sans opacity-70">
                 <span>Set feeding time. Choose difficulty.</span>
                 <span>Eat right to grow.</span>
              </div>
            </div>
          </div>

        </div>
          
        {/* Button - Separated to bottom for safe area visibility */}
        <div className="w-full max-w-md z-10 pb-4 sm:pb-0 shrink-0">
          <button 
            onClick={() => { setShowIntro(false); setShowConfig(true); }}
            className="group relative w-full py-3 sm:py-4 px-8 rounded-full overflow-hidden shadow-2xl transition-all hover:-translate-y-1 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-olive to-[#8B9D88] transition-all group-hover:scale-105"></div>
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative text-lg sm:text-xl font-bold text-white tracking-widest uppercase flex items-center justify-center gap-2">
               Enter Game <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row h-[100dvh] w-full mx-auto font-sans touch-none select-none overflow-hidden overscroll-none relative bg-[#E0DDD5]">
      
      {/* --- MOBILE HEADER (Hidden on Desktop) --- */}
      <div className="sm:hidden w-full px-3 py-2 flex justify-between items-center z-30 shrink-0 bg-[#E0DDD5]/50 backdrop-blur-sm">
          <div className="bg-white/40 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-white/40 flex gap-4">
             <div>
                <span className="text-[10px] uppercase text-ink/60 font-bold block">Score</span>
                <span className="text-lg font-bold text-ink">{score}</span>
             </div>
             <div>
                <span className="text-[10px] uppercase text-ink/60 font-bold block">Time</span>
                <span className="text-lg font-bold text-ink">{formatTime(timeLeft)}</span>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-white/40 backdrop-blur-md rounded-full shadow-sm border border-white/40 text-lg"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
      </div>

      {/* --- MAIN GAME AREA --- */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-white/20 order-1 sm:order-1 flex flex-col justify-center">
        {/* Touch Controls Layer - z-20 to be above the canvas (z-10) */}
        <div 
          className="absolute inset-0 z-20"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        ></div>
        
        {/* Canvas Area - Maximized (Removed padding for desktop) */}
        <div className="relative w-full h-full p-2 lg:p-1 flex items-center justify-center pointer-events-none z-10">
             <div 
                className="relative aspect-square shadow-2xl rounded-2xl border border-white/50 overflow-hidden bg-white/10 backdrop-blur-sm pointer-events-auto"
                style={{ width: '10000px', height: '10000px', maxWidth: '100%', maxHeight: '100%' }}
             >
                <GameCanvas snake={snake} foods={foods} gridSize={GRID_SIZE} isInvincible={isInvincible} />
             </div>
        </div>
        
        {/* Overlays */}
        {(gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 pointer-events-auto">
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-2xl text-center mx-6 max-w-sm border border-white">
            <h2 className="text-3xl font-serif font-bold mb-4 text-ink">
                {gameState === GameState.GAME_OVER ? 'Game Over' : 'Paused'}
            </h2>
            <div className="text-lg mb-6 text-ink/80">Score: <span className="font-bold text-ink">{score}</span></div>
            <div className="flex flex-col gap-3">
                {gameState === GameState.GAME_OVER ? (
                <button 
                    onClick={() => setShowConfig(true)}
                    className="bg-olive hover:bg-opacity-80 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95"
                >
                    Play Again
                </button>
                ) : (
                <button 
                    onClick={pauseGame}
                    className="bg-tan hover:bg-opacity-80 text-ink px-8 py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95"
                >
                    Resume
                </button>
                )}
            </div>
            </div>
        </div>
        )}
      </div>

      {/* --- CONTROL / INFO PANEL (Sidebar on Desktop, Bottom on Mobile) --- */}
      <div className="
        order-2 sm:order-2 
        w-full sm:w-[280px] lg:w-[320px] 
        bg-white/60 backdrop-blur-xl 
        sm:border-l border-t sm:border-t-0 border-white/40 
        z-40 shrink-0
        flex flex-col
        pb-safe sm:pb-0
      ">
        {/* DESKTOP HEADER (Hidden on Mobile) */}
        <div className="hidden sm:flex flex-col p-6 pb-2 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-serif font-bold text-ink">Hungry Snake</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 bg-white/40 rounded-full hover:bg-white/60 transition-colors shadow-sm"
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                </div>
            </div>
            
            <div className="bg-white/40 p-4 rounded-2xl border border-white/40 shadow-sm grid grid-cols-2 gap-4">
                <div className="text-center">
                    <span className="text-xs uppercase text-ink/60 font-bold block">Score</span>
                    <span className="text-3xl font-bold text-ink">{score}</span>
                </div>
                <div className="text-center">
                    <span className="text-xs uppercase text-ink/60 font-bold block">Time</span>
                    <span className="text-3xl font-bold text-ink">{formatTime(timeLeft)}</span>
                </div>
            </div>
        </div>

        {/* SHARED CONTROLS AREA */}
        <div className="
            p-4 sm:p-6 sm:pt-4
            grid grid-cols-[1.2fr_1fr] sm:flex sm:flex-col 
            gap-4 
            h-[160px] sm:h-auto sm:flex-1
        ">
            {/* Word Card */}
            <div className="bg-white/40 rounded-2xl border border-white/50 p-4 flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden sm:grow sm:max-h-[250px] sm:min-h-[200px]">
                <div className="absolute top-0 left-0 w-full h-1 bg-olive/80"></div>
                {currentWord ? (
                    <>
                        <div className="text-xs font-bold text-ink/50 uppercase mb-1">Current Word</div>
                        <div className="text-3xl lg:text-5xl font-serif font-bold text-ink mb-4 break-words w-full leading-tight drop-shadow-sm">
                            {currentWord.word}
                        </div>
                        <span className="inline-block px-2 py-0.5 bg-olive/20 text-olive text-sm md:text-base font-bold rounded-md">
                            {currentWord.pos}
                        </span>
                    </>
                ) : (
                    <div className="text-tan animate-pulse font-serif italic">Get Ready...</div>
                )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2 sm:gap-4 sm:shrink-0">
                <div className="flex-1 bg-white/40 rounded-2xl border border-white/50 p-2 relative shadow-lg sm:h-48">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <button 
                            className="w-10 h-7 sm:w-14 sm:h-10 bg-white/80 shadow-sm border border-white rounded-t-lg active:bg-olive active:text-white transition-colors mb-1 text-ink flex items-center justify-center text-xs sm:text-sm"
                            onClick={() => updateDirection({x:0, y:-1})}
                        >▲</button>
                        <div className="flex gap-2">
                            <button 
                                className="w-10 h-7 sm:w-14 sm:h-10 bg-white/80 shadow-sm border border-white rounded-l-lg active:bg-olive active:text-white transition-colors text-ink flex items-center justify-center text-xs sm:text-sm"
                                onClick={() => updateDirection({x:-1, y:0})}
                            >◀</button>
                            <button 
                                className="w-10 h-7 sm:w-14 sm:h-10 bg-white/80 shadow-sm border border-white rounded-r-lg active:bg-olive active:text-white transition-colors text-ink flex items-center justify-center text-xs sm:text-sm"
                                onClick={() => updateDirection({x:1, y:0})}
                            >▶</button>
                        </div>
                        <button 
                            className="w-10 h-7 sm:w-14 sm:h-10 bg-white/80 shadow-sm border border-white rounded-b-lg active:bg-olive active:text-white transition-colors mt-1 text-ink flex items-center justify-center text-xs sm:text-sm"
                            onClick={() => updateDirection({x:0, y:1})}
                        >▼</button>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={pauseGame} 
                        className="flex-1 bg-tan/30 hover:bg-tan/50 text-ink text-[10px] sm:text-sm font-bold py-2 sm:py-3 rounded-xl transition-colors uppercase tracking-wide border border-tan/20"
                    >
                        {gameState === GameState.PAUSED ? 'Resume' : 'Pause'}
                    </button>
                    <button 
                        onClick={() => { setGameState(GameState.GAME_OVER); setShowConfig(true); }} 
                        className="flex-1 bg-head/20 hover:bg-head/40 text-head-stroke text-[10px] sm:text-sm font-bold py-2 sm:py-3 rounded-xl transition-colors uppercase tracking-wide border border-head/20"
                    >
                        End
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfig && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                <div className="bg-[#F0EDE5] rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 border border-white/60">
                    <h2 className="text-2xl font-serif font-bold text-ink mb-4 text-center">Setup Game</h2>
                    {isLoading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin text-4xl mb-2">⏳</div>
                            <p>{loadingMsg}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-ink mb-2">Duration (Minutes)</label>
                                <div className="flex gap-2">
                                    {[5, 10, 15].map(m => (
                                        <button 
                                            key={m} 
                                            onClick={() => setGameDuration(m)}
                                            className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${gameDuration === m ? 'bg-ink text-white border-ink shadow-lg' : 'bg-transparent text-ink border-ink/20 hover:border-ink/50'}`}
                                        >
                                            {m}m
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <hr className="border-tan/30" />
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-ink">Select Vocabulary Source</h3>
                                <div className="bg-white/50 p-4 rounded-2xl border border-tan/30">
                                    <div className="text-xs font-bold text-olive uppercase mb-2 tracking-wider">iVocab Level</div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {LEVELS.map(l => (
                                            <button 
                                                key={l}
                                                onClick={() => handleLevelSelect(l)}
                                                className={`w-10 h-10 rounded-full text-base font-bold shadow-sm transition-all ${selectedLevel === l ? 'bg-olive text-white scale-110' : 'bg-white text-olive hover:bg-olive/10'}`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="text-xs font-bold text-olive uppercase mb-2 tracking-wider">Unit Range</div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {UNIT_RANGES.map((r, i) => {
                                            const isDisabled = selectedLevel && CAP_LEVELS.includes(selectedLevel) && r[0] > 25;
                                            return (
                                                <button 
                                                    key={i}
                                                    onClick={() => setSelectedRange(r)}
                                                    disabled={isDisabled}
                                                    className={`text-[10px] py-1.5 px-1 rounded-lg border transition-all ${
                                                        isDisabled 
                                                            ? 'opacity-30 cursor-not-allowed border-transparent bg-gray-200 text-gray-400' 
                                                            : selectedRange === r 
                                                                ? 'bg-olive text-white border-olive font-bold' 
                                                                : 'bg-transparent border-olive/30 text-ink hover:bg-olive/5'
                                                    }`}
                                                >
                                                    {r[0]}-{r[1]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button 
                                        onClick={handleLoadCSV}
                                        disabled={!selectedLevel || !selectedRange}
                                        className="w-full mt-4 bg-ink text-white py-3 rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-all shadow-lg hover:shadow-xl"
                                    >
                                        Load Words & Start
                                    </button>
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
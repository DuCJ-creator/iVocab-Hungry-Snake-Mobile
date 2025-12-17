import React, { useState, useEffect, useRef } from 'react';
import { useSnakeGame } from './hooks/useSnakeGame';
import GameCanvas from './components/GameCanvas';
import { GameState, WordItem } from './types';

const GRID_SIZE = 12; 
const LEVEL_CSVS: Record<number, string> = {
  1: "https://ducj-creator.github.io/iVocab-Self-Practice/level1.csv",
  2: "https://ducj-creator.github.io/iVocab-Self-Practice/level2.csv",
  3: "https://ducj-creator.github.io/iVocab-Self-Practice/level3.csv",
  4: "https://ducj-creator.github.io/iVocab-Self-Practice/level4.csv",
  5: "https://ducj-creator.github.io/iVocab-Self-Practice/level5.csv",
  6: "https://ducj-creator.github.io/iVocab-Self-Practice/level6.csv",
};

const UNIT_RANGES = [[1,5],[6,10],[11,15],[16,20],[21,25],[26,30],[31,35],[36,40],[41,45],[46,50]];

function App() {
  const [isMuted, setIsMuted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const { 
    gameState, score, timeLeft, snake, currentRound, words, setWords, 
    startGame, pauseGame, updateDirection, setGameState 
  } = useSnakeGame(isMuted);
  
  const { word: currentWord, foods } = currentRound;

  // Loading & Config
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [showConfig, setShowConfig] = useState(false); 
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<number[] | null>(null);
  const [gameDuration, setGameDuration] = useState(10); 

  // --- JOYSTICK TOUCH CONTROLS ---
  // To provide "silk smooth" feel, we detect dragging from the initial touch point
  const joystickStart = useRef<{x: number, y: number} | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only capture 1 finger
    if (e.touches.length !== 1) return;
    joystickStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (gameState !== GameState.PLAYING || !joystickStart.current) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - joystickStart.current.x;
      const dy = currentY - joystickStart.current.y;
      
      const threshold = 15; // Lower threshold for high responsiveness ("silk smooth")

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
      <div className="flex flex-col h-[100dvh] w-full items-center justify-center bg-paper text-ink p-6 select-none font-serif relative overflow-hidden">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 p-2 bg-tan/20 rounded-full hover:bg-tan/40 transition-colors"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        <div className="max-w-md w-full text-center space-y-8 animate-fade-in z-10">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-ink tracking-tight font-serif">
              iVocab Hungry Snake
            </h1>
            <p className="text-sm font-bold text-olive uppercase tracking-widest">
              Developed by Shirley Du
            </p>
          </div>
          
          <div className="text-6xl md:text-8xl py-4 animate-bounce">🐍 🍞</div>
          
          <div className="bg-white/40 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-xl">
            <p className="text-base md:text-lg text-ink/90 leading-relaxed font-sans">
              Guide the hungry snake to the bread with the correct chinese meaning. 
              <br/>
              Set the feeding time, choose the difficulty level and the units range; 
              <br/>
              Eat right to grow and score.
            </p>
          </div>
          
          <button 
            onClick={() => { setShowIntro(false); setShowConfig(true); }}
            className="w-full bg-olive hover:bg-opacity-80 text-white text-xl font-bold py-4 rounded-full shadow-xl transform transition-all active:scale-95 hover:-translate-y-1"
          >
            Enter Game
          </button>
        </div>

        {/* Decorative Background Blobs for Glass effect */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-olive/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-head/20 rounded-full blur-[100px] pointer-events-none"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full mx-auto font-sans touch-none select-none overflow-hidden overscroll-none relative bg-[#E0DDD5]">
      
      {/* Top HUD */}
      <div className="w-full px-3 py-2 flex justify-between items-center z-30 shrink-0">
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
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-white/40 backdrop-blur-md rounded-full shadow-sm border border-white/40 text-lg"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
      </div>

      {/* Main Game Board Area - MAXIMIZED */}
      <div className="flex-1 w-full relative flex flex-col min-h-0">
        <div 
          className="flex-1 relative w-full overflow-hidden bg-white/20"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
             {/* The Canvas container fills the flex area, but we limit the inner div to be square */}
             <div className="absolute inset-0 flex items-center justify-center p-2">
                 <div className="relative max-w-full max-h-full aspect-square w-auto h-auto shadow-2xl rounded-2xl border border-white/50 overflow-hidden bg-white/10 backdrop-blur-sm">
                    <GameCanvas snake={snake} foods={foods} gridSize={GRID_SIZE} />
                 </div>
             </div>
             
             {/* Overlays */}
             {(gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50">
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

        {/* Bottom Panel: Two Columns */}
        <div className="bg-white/60 backdrop-blur-xl border-t border-white/40 w-full z-40 pb-safe shrink-0">
            <div className="max-w-[600px] mx-auto grid grid-cols-[1.2fr_1fr] gap-4 p-4 h-[160px]">
                
                {/* Left Column: Cue Word */}
                <div className="bg-white/40 rounded-2xl border border-white/50 p-4 flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-olive/80"></div>
                    {currentWord ? (
                        <>
                            <div className="text-xs font-bold text-ink/50 uppercase mb-1">Current Word</div>
                            <div className="text-2xl md:text-3xl font-serif font-bold text-ink mb-1 break-words w-full leading-tight drop-shadow-sm">
                                {currentWord.word}
                            </div>
                            <span className="inline-block px-2 py-0.5 bg-olive/20 text-olive text-xs font-bold rounded-md">
                                {currentWord.pos}
                            </span>
                        </>
                    ) : (
                        <div className="text-tan animate-pulse font-serif italic">Get Ready...</div>
                    )}
                </div>

                {/* Right Column: Direction Panel + Actions */}
                <div className="flex flex-col gap-2">
                    {/* D-Pad Area */}
                    <div className="flex-1 bg-white/40 rounded-2xl border border-white/50 p-2 relative shadow-lg">
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <button 
                                className="w-10 h-7 bg-white/80 shadow-sm border border-white rounded-t-lg active:bg-olive active:text-white transition-colors mb-1 text-ink flex items-center justify-center text-xs"
                                onClick={() => updateDirection({x:0, y:-1})}
                            >▲</button>
                            <div className="flex gap-2">
                                <button 
                                    className="w-10 h-7 bg-white/80 shadow-sm border border-white rounded-l-lg active:bg-olive active:text-white transition-colors text-ink flex items-center justify-center text-xs"
                                    onClick={() => updateDirection({x:-1, y:0})}
                                >◀</button>
                                <button 
                                    className="w-10 h-7 bg-white/80 shadow-sm border border-white rounded-r-lg active:bg-olive active:text-white transition-colors text-ink flex items-center justify-center text-xs"
                                    onClick={() => updateDirection({x:1, y:0})}
                                >▶</button>
                            </div>
                            <button 
                                className="w-10 h-7 bg-white/80 shadow-sm border border-white rounded-b-lg active:bg-olive active:text-white transition-colors mt-1 text-ink flex items-center justify-center text-xs"
                                onClick={() => updateDirection({x:0, y:1})}
                            >▼</button>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button 
                            onClick={pauseGame} 
                            className="flex-1 bg-tan/30 hover:bg-tan/50 text-ink text-[10px] font-bold py-2 rounded-xl transition-colors uppercase tracking-wide border border-tan/20"
                        >
                            {gameState === GameState.PAUSED ? 'Resume' : 'Pause'}
                        </button>
                        <button 
                            onClick={() => { setGameState(GameState.GAME_OVER); setShowConfig(true); }} 
                            className="flex-1 bg-head/20 hover:bg-head/40 text-head-stroke text-[10px] font-bold py-2 rounded-xl transition-colors uppercase tracking-wide border border-head/20"
                        >
                            End
                        </button>
                    </div>
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
                                        {[1,2,3,4,5,6].map(l => (
                                            <button 
                                                key={l}
                                                onClick={() => setSelectedLevel(l)}
                                                className={`w-10 h-10 rounded-full text-base font-bold shadow-sm transition-all ${selectedLevel === l ? 'bg-olive text-white scale-110' : 'bg-white text-olive hover:bg-olive/10'}`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="text-xs font-bold text-olive uppercase mb-2 tracking-wider">Unit Range</div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {UNIT_RANGES.map((r, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => setSelectedRange(r)}
                                                className={`text-[10px] py-1.5 px-1 rounded-lg border transition-all ${selectedRange === r ? 'bg-olive text-white border-olive font-bold' : 'bg-transparent border-olive/30 text-ink hover:bg-olive/5'}`}
                                            >
                                                {r[0]}-{r[1]}
                                            </button>
                                        ))}
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
import React, { useState, useEffect, useRef } from 'react';
import { useSnakeGame } from './hooks/useSnakeGame';
import { useHandTracking } from './hooks/useHandTracking';
import GameCanvas from './components/GameCanvas';
import { GameState, WordItem } from './types';

// Constants
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

  // Destructure state
  const { 
    gameState, score, timeLeft, snake, currentRound, words, setWords, 
    startGame, pauseGame, updateDirection, setGameState 
  } = useSnakeGame(isMuted);
  
  const { word: currentWord, foods } = currentRound;

  // Hand Tracking Logic
  const videoRef = useRef<HTMLVideoElement>(null);
  const { fingerPosition, isCameraReady } = useHandTracking(videoRef.current, gameState === GameState.PLAYING);
  
  // Convert Finger Position (0-1) to Joystick Direction
  useEffect(() => {
    if (fingerPosition && gameState === GameState.PLAYING) {
        // Center is 0.5, 0.5
        const dx = fingerPosition.x - 0.5;
        const dy = fingerPosition.y - 0.5;
        
        // Deadzone
        if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal
                updateDirection({ x: dx > 0 ? 1 : -1, y: 0 });
            } else {
                // Vertical
                updateDirection({ x: 0, y: dy > 0 ? 1 : -1 });
            }
        }
    }
  }, [fingerPosition, gameState, updateDirection]);


  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [showConfig, setShowConfig] = useState(false); 
  
  // Selection state
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<number[] | null>(null);
  const [gameDuration, setGameDuration] = useState(10); // minutes

  // Swipe handling (Backup Controls)
  const touchStart = useRef<{x: number, y: number} | null>(null);

  // Keyboard controls
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
      if (e.key === ' ') {
        pauseGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, pauseGame, updateDirection]);

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStart.current.x;
    const dy = endY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) updateDirection({ x: dx > 0 ? 1 : -1, y: 0 });
    } else {
        if (Math.abs(dy) > 30) updateDirection({ x: 0, y: dy > 0 ? 1 : -1 });
    }
    touchStart.current = null;
  };

  // Data Loading
  const handleLoadCSV = async () => {
    if (!selectedLevel || !selectedRange) return;
    setIsLoading(true);
    setLoadingMsg("Fetching vocabulary...");
    try {
      const res = await fetch(LEVEL_CSVS[selectedLevel]);
      const txt = await res.text();
      // Simple CSV Parse
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
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleEnterGame = () => {
    setShowIntro(false);
    setShowConfig(true);
  };

  // --- INTRO SCREEN ---
  if (showIntro) {
    return (
      <div className="flex flex-col h-[100dvh] w-full items-center justify-center bg-paper text-ink p-6 select-none font-serif relative overflow-hidden">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 p-2 bg-tan/20 rounded-full hover:bg-tan/40 transition-colors"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-bold text-ink tracking-tight">
              iVocab <br/>
              <span className="text-olive">Hungry Snake</span>
            </h1>
            <p className="text-sm md:text-base text-frame italic font-sans tracking-widest mt-2">
              Finger & Camera Edition
            </p>
          </div>
          <div className="text-6xl md:text-8xl py-4 animate-bounce">🐍 🍞</div>
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-tan shadow-lg">
            <h2 className="text-lg font-bold text-ink mb-2 uppercase tracking-wide">Instruction</h2>
            <p className="text-base md:text-lg text-ink/80 leading-relaxed font-sans">
              Use your <b>Index Finger</b> in front of the camera to guide the snake!
              <br/>
              Eat the bread with the correct meaning.
            </p>
          </div>
          <button 
            onClick={handleEnterGame}
            className="w-full bg-olive hover:bg-opacity-80 text-white text-xl font-bold py-4 rounded-full shadow-xl transform transition-all active:scale-95 hover:-translate-y-1"
          >
            Enter Game
          </button>
        </div>
      </div>
    );
  }

  // --- GAME UI ---
  return (
    <div className="flex flex-col h-[100dvh] w-full mx-auto font-sans touch-none select-none overflow-hidden overscroll-none relative bg-black">
      
      {/* Hidden Video Element for Tracking */}
      <video 
        ref={videoRef} 
        className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" 
        playsInline 
        muted
      />

      {/* Top Bar: HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 p-2 md:p-4 flex justify-between items-start pointer-events-none">
          <div className="bg-paper/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20 flex gap-4 pointer-events-auto">
             <div>
                <span className="text-xs uppercase text-frame font-bold block">Score</span>
                <span className="text-xl font-bold text-ink">{score}</span>
             </div>
             <div>
                <span className="text-xs uppercase text-frame font-bold block">Time</span>
                <span className="text-xl font-bold text-ink">{formatTime(timeLeft)}</span>
             </div>
          </div>

          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 bg-paper/90 backdrop-blur-md rounded-full shadow-lg pointer-events-auto"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
      </div>

      {/* --- Main Game Area --- */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div 
          className="relative w-full max-w-[500px] aspect-square m-4 touch-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Glass Board */}
          <div className="absolute inset-0 bg-paper/30 backdrop-blur-md rounded-2xl border-2 border-white/50 shadow-2xl overflow-hidden">
             <GameCanvas snake={snake} foods={foods} gridSize={GRID_SIZE} />
             
             {/* Finger Guide Dot (Virtual Joystick Feedback) */}
             {fingerPosition && (
                 <div 
                    className="absolute w-6 h-6 bg-head/80 border-2 border-white rounded-full shadow-glow pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                    style={{ 
                        left: `${fingerPosition.x * 100}%`, 
                        top: `${fingerPosition.y * 100}%` 
                    }}
                 />
             )}
          </div>

          {/* Loading / Camera Wait */}
          {gameState === GameState.PLAYING && !isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl z-40 text-white">
                  <div className="text-center">
                      <div className="text-4xl mb-2 animate-spin">📷</div>
                      <p>Starting Camera...</p>
                  </div>
              </div>
          )}
          
          {/* Pause / Game Over Overlay */}
          {(gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-50">
              <div className="bg-paper p-8 rounded-xl shadow-2xl text-center mx-6 max-w-sm">
                <h2 className="text-3xl font-serif font-bold mb-4 text-ink">
                  {gameState === GameState.GAME_OVER ? 'Game Over' : 'Paused'}
                </h2>
                <div className="text-lg mb-6">Score: {score}</div>
                <div className="flex flex-col gap-3">
                    {gameState === GameState.GAME_OVER && (
                    <button 
                        onClick={() => setShowConfig(true)}
                        className="bg-olive hover:bg-opacity-80 text-white px-8 py-3 rounded-full font-bold shadow-lg"
                    >
                        Play Again
                    </button>
                    )}
                    {gameState === GameState.PAUSED && (
                    <button 
                        onClick={pauseGame}
                        className="bg-tan hover:bg-opacity-80 text-ink px-8 py-3 rounded-full font-bold shadow-lg"
                    >
                        Resume
                    </button>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Area: Word Card */}
      <div className="pb-8 px-4 flex justify-center z-20 pointer-events-none">
         <div className="bg-paper/90 backdrop-blur-xl w-full max-w-[500px] p-4 rounded-2xl shadow-2xl border border-white/40 flex items-center justify-between pointer-events-auto">
            <div className="flex-1 text-center">
                {currentWord ? (
                    <div>
                        <div className="text-3xl font-serif font-bold text-ink">{currentWord.word}</div>
                        <div className="text-sm text-olive font-bold mt-1 bg-olive/10 inline-block px-2 rounded">{currentWord.pos}</div>
                    </div>
                ) : (
                    <div className="text-tan animate-pulse">Get Ready...</div>
                )}
            </div>
            
            <div className="border-l border-frame/20 pl-4 flex flex-col gap-2">
                 <button onClick={pauseGame} className="p-2 bg-tan/20 rounded-lg text-xs font-bold text-ink hover:bg-tan/40">
                    {gameState === GameState.PAUSED ? 'RESUME' : 'PAUSE'}
                 </button>
                 <button onClick={() => { setGameState(GameState.GAME_OVER); setShowConfig(true); }} className="p-2 bg-head/20 rounded-lg text-xs font-bold text-head-stroke hover:bg-head/40">
                    END
                 </button>
            </div>
         </div>
      </div>

      {/* Configuration Modal */}
      {showConfig && (
            <div className="absolute inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                <div className="bg-paper rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 border-4 border-frame">
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
                                            className={`flex-1 py-2 rounded-lg border ${gameDuration === m ? 'bg-ink text-white' : 'bg-transparent text-ink border-ink'}`}
                                        >
                                            {m}m
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <hr className="border-tan" />
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-ink">Select Vocabulary Source</h3>
                                <div className="bg-white/50 p-4 rounded-xl border border-tan">
                                    <div className="text-sm font-bold text-olive uppercase mb-2">iVocab Level & Unit</div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {[1,2,3,4,5,6].map(l => (
                                            <button 
                                                key={l}
                                                onClick={() => setSelectedLevel(l)}
                                                className={`w-8 h-8 rounded-full text-sm font-bold ${selectedLevel === l ? 'bg-olive text-white' : 'bg-white border border-olive text-olive'}`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-5 gap-1">
                                        {UNIT_RANGES.map((r, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => setSelectedRange(r)}
                                                className={`text-[10px] py-1 px-1 rounded border ${selectedRange === r ? 'bg-olive text-white' : 'bg-transparent border-olive text-ink'}`}
                                            >
                                                {r[0]}-{r[1]}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={handleLoadCSV}
                                        disabled={!selectedLevel || !selectedRange}
                                        className="w-full mt-3 bg-ink text-white py-2 rounded-lg font-bold disabled:opacity-50 active:scale-95 transition-transform"
                                    >
                                        Load from CSV
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
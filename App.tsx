import React, { useState, useEffect, useRef } from 'react';
import { useSnakeGame } from './hooks/useSnakeGame';
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

  const { 
    gameState, score, timeLeft, snake, foods, currentWord, words, setWords, 
    startGame, pauseGame, updateDirection, setGameState 
  } = useSnakeGame(isMuted);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [showConfig, setShowConfig] = useState(false); 
  
  // Selection state
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<number[] | null>(null);
  const [gameDuration, setGameDuration] = useState(10); // minutes

  // Swipe handling
  const touchStart = useRef<{x: number, y: number} | null>(null);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for game keys
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

  // Touch Handlers (Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (gameState === GameState.PLAYING) {
        // e.preventDefault(); 
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStart.current.x;
    const dy = endY - touchStart.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) { 
            updateDirection({ x: dx > 0 ? 1 : -1, y: 0 });
        }
    } else {
        if (Math.abs(dy) > 30) {
            updateDirection({ x: 0, y: dy > 0 ? 1 : -1 });
        }
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
        {/* Mute Toggle on Intro */}
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 p-2 bg-tan/20 rounded-full hover:bg-tan/40 transition-colors"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-bold text-ink tracking-tight">
              iVocab <br/>
              <span className="text-olive">Hungry Snake</span>
            </h1>
            <p className="text-sm md:text-base text-frame italic font-sans tracking-widest mt-2">
              Developed by Shirley Du
            </p>
          </div>

          {/* Deco Snake */}
          <div className="text-6xl md:text-8xl py-4 animate-bounce">
            🐍 🍞
          </div>

          {/* Instruction Card */}
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-tan shadow-lg">
            <h2 className="text-lg font-bold text-ink mb-2 uppercase tracking-wide">Instruction</h2>
            <p className="text-base md:text-lg text-ink/80 leading-relaxed font-sans">
              Guide the hungry snake to the bread with the correct <span className="font-bold text-olive">Chinese meaning</span>. 
              <br/>
              Set the feeding time, Choose the Difficulty Level and the Units range; 
              <br/>
              Eat right to <span className="font-bold text-head-stroke">Grow</span> and <span className="font-bold text-head-stroke">Score!</span>
            </p>
          </div>

          {/* Start Button */}
          <button 
            onClick={handleEnterGame}
            className="w-full bg-olive hover:bg-opacity-80 text-white text-xl font-bold py-4 rounded-full shadow-xl transform transition-all active:scale-95 hover:-translate-y-1"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // --- GAME UI ---
  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-[600px] md:max-w-[1400px] md:flex-row mx-auto p-2 md:p-4 gap-2 md:gap-4 font-sans touch-none select-none overflow-hidden overscroll-none relative">
      
      {/* Mute Toggle (Floating top right) */}
      <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-2 right-2 md:top-4 md:right-4 z-30 p-2 bg-paper/80 backdrop-blur border border-tan rounded-full shadow-sm hover:bg-tan/20 active:scale-95 text-xl"
          title={isMuted ? "Unmute" : "Mute"}
      >
          {isMuted ? '🔇' : '🔊'}
      </button>

      {/* --- Main Game Area (Flex Grow) --- */}
      <div className="flex-1 relative flex flex-col items-center justify-center min-h-0">
        <div 
          className="relative w-full aspect-square max-h-[60vh] md:max-h-[85vh] touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <GameCanvas snake={snake} foods={foods} gridSize={GRID_SIZE} />
          
          {/* Pause / Game Over Overlay */}
          {(gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
              <div className="bg-paper p-6 md:p-8 rounded-lg shadow-2xl text-center border border-frame mx-4">
                <h2 className="text-3xl font-serif font-bold mb-4 text-ink">
                  {gameState === GameState.GAME_OVER ? 'Game Over' : 'Paused'}
                </h2>
                <div className="text-lg mb-6">Score: {score}</div>
                {gameState === GameState.GAME_OVER && (
                   <button 
                     onClick={() => setShowConfig(true)}
                     className="bg-olive hover:bg-opacity-80 text-white px-6 py-2 rounded-full font-bold transition-all shadow-lg active:scale-95"
                   >
                     New Game
                   </button>
                )}
                {gameState === GameState.PAUSED && (
                   <button 
                     onClick={pauseGame}
                     className="bg-tan hover:bg-opacity-80 text-ink px-6 py-2 rounded-full font-bold transition-all shadow-lg active:scale-95"
                   >
                     Resume
                   </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Controls Section --- */}
      <div className="w-full md:w-80 flex flex-col gap-2 md:gap-4 shrink-0 pb-safe">
        
        {/* Stats Row */}
        <div className="bg-paper p-3 md:p-4 rounded-xl shadow-md border border-tan flex flex-row justify-between items-center gap-2">
            <div className="flex gap-4 md:gap-0 md:justify-between w-full px-2 justify-center">
                <div className="text-center">
                    <div className="text-[10px] text-frame uppercase">Score</div>
                    <div className="text-lg font-bold text-ink">{score}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-frame uppercase">Time</div>
                    <div className="text-lg font-bold text-ink">{formatTime(timeLeft)}</div>
                </div>
            </div>
        </div>

        {/* 2-Column Control Panel */}
        <div className="grid grid-cols-2 gap-2 h-40 md:h-48">
            
            {/* Left Column: Cue Word (Swapped & Bigger) */}
            <div className="bg-paper rounded-xl border-2 border-ink/10 shadow-inner p-2 flex flex-col items-center justify-center text-center overflow-hidden relative">
                {currentWord ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-ink leading-tight break-words w-full px-1">
                            {currentWord.word}
                        </div>
                        <div className="text-xs md:text-sm text-olive font-bold mt-2 bg-olive/10 px-2 py-0.5 rounded-full">
                            {currentWord.pos}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-tan animate-pulse">Waiting...</div>
                )}
            </div>

            {/* Right Column: D-Pad */}
            <div className="bg-tan/10 p-2 rounded-xl border border-frame/30 flex items-center justify-center">
                 <div className="grid grid-cols-3 gap-1 w-full max-w-[140px] aspect-square">
                    {/* UP */}
                    <div className="col-start-2">
                        <button 
                            className="w-full h-full bg-olive/20 active:bg-olive text-olive active:text-white rounded-lg border-2 border-olive flex items-center justify-center text-xl transition-colors shadow-sm"
                            onClick={() => updateDirection({x:0, y:-1})}
                        >▲</button>
                    </div>
                    
                    {/* LEFT */}
                    <div className="col-start-1 row-start-2">
                        <button 
                            className="w-full h-full bg-olive/20 active:bg-olive text-olive active:text-white rounded-lg border-2 border-olive flex items-center justify-center text-xl transition-colors shadow-sm"
                            onClick={() => updateDirection({x:-1, y:0})}
                        >◀</button>
                    </div>

                    {/* CENTER (Empty or Dot) */}
                    <div className="col-start-2 row-start-2 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-tan/50"></div>
                    </div>

                    {/* RIGHT */}
                    <div className="col-start-3 row-start-2">
                        <button 
                            className="w-full h-full bg-olive/20 active:bg-olive text-olive active:text-white rounded-lg border-2 border-olive flex items-center justify-center text-xl transition-colors shadow-sm"
                            onClick={() => updateDirection({x:1, y:0})}
                        >▶</button>
                    </div>

                    {/* DOWN */}
                    <div className="col-start-2 row-start-3">
                        <button 
                            className="w-full h-full bg-olive/20 active:bg-olive text-olive active:text-white rounded-lg border-2 border-olive flex items-center justify-center text-xl transition-colors shadow-sm"
                            onClick={() => updateDirection({x:0, y:1})}
                        >▼</button>
                    </div>
                </div>
            </div>

        </div>

        {/* System Buttons */}
        <div className="grid grid-cols-2 gap-2">
             <button 
                onClick={pauseGame} 
                className="bg-tan text-ink font-bold py-3 rounded-xl hover:bg-opacity-80 active:scale-95 transition-all text-sm md:text-base shadow-sm"
                disabled={gameState === GameState.IDLE || gameState === GameState.GAME_OVER}
             >
                {gameState === GameState.PAUSED ? 'Resume' : 'Pause'}
             </button>
             <button 
                onClick={() => { setGameState(GameState.GAME_OVER); setShowConfig(true); }}
                className="bg-head text-white font-bold py-3 rounded-xl hover:bg-opacity-80 active:scale-95 transition-all text-sm md:text-base shadow-sm"
             >
                End Game
             </button>
        </div>

        {/* Configuration Modal (Inline) */}
        {showConfig && (
            <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-paper rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 border-4 border-frame">
                    <h2 className="text-2xl font-serif font-bold text-ink mb-4 text-center">Setup Game</h2>
                    
                    {isLoading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin text-4xl mb-2">⏳</div>
                            <p>{loadingMsg}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Duration */}
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

                            {/* Mode Selection Tab */}
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
    </div>
  );
}

export default App;
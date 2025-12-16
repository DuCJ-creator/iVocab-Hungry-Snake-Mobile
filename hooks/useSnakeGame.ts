import { useState, useRef, useCallback, useEffect } from 'react';
import { GameState, Point, Food, WordItem, ControlMode } from '../types';

const GRID_SIZE = 12;

interface RoundData {
  word: WordItem | null;
  foods: Food[];
}

export const useSnakeGame = (isMuted: boolean = false) => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);
  const [words, setWords] = useState<WordItem[]>([]);
  
  // Consolidate Word and Foods to prevent sync issues
  const [currentRound, setCurrentRound] = useState<RoundData>({ word: null, foods: [] });
  
  const [snake, setSnake] = useState<Point[]>([{ x: 5, y: 5 }]);
  
  // Mutable state for game loop
  const foodsRef = useRef<Food[]>([]); 
  const direction = useRef<Point>({ x: 1, y: 0 }); 
  const nextDirection = useRef<Point>({ x: 1, y: 0 });
  const snakeRef = useRef<Point[]>([{ x: 5, y: 5 }]);
  const lastTimeRef = useRef<number>(0);
  const moveAccumulator = useRef<number>(0);
  const gameLoopRef = useRef<number>(0);
  const usedWordsRef = useRef<Set<string>>(new Set());
  
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // --- Sound Synthesizer ---
  const playTone = useCallback((type: 'correct' | 'wrong' | 'gameover') => {
    if (isMutedRef.current) return;
    
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        
        if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'gameover') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(50, now + 1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 1);
            osc.start(now);
            osc.stop(now + 1);
        }
    } catch (e) {
        console.error("Audio synth error", e);
    }
  }, []);

  const generateRound = (targetWord: WordItem, allWords: WordItem[], currentSnake: Point[]): { foods: Food[] } => {
    // 1. Prepare Content List
    const foodItems: { meaning: string; correct: boolean }[] = [];
    
    // Always add Correct Answer first
    foodItems.push({ meaning: targetWord.meaning, correct: true });

    // Find Distractors
    const otherWords = allWords.filter(w => w.meaning.trim() !== targetWord.meaning.trim());
    
    // Get unique meanings from other words
    const uniqueMeanings = Array.from(new Set(otherWords.map(w => w.meaning)));
    const shuffledMeanings = uniqueMeanings.sort(() => 0.5 - Math.random());

    // Fill up to 4 items (1 correct + 3 distractors)
    for (const meaning of shuffledMeanings) {
        if (foodItems.length >= 4) break;
        foodItems.push({ meaning, correct: false });
    }
    
    // FALLBACK: If we still don't have 4 items (because dataset is too small), 
    // fill with whatever we have or duplicates to ensure the UI looks consistent.
    // This addresses the "must have 4 options" requirement rigidly.
    while (foodItems.length < 4 && uniqueMeanings.length > 0) {
        // Just pick random ones from uniqueMeanings again if we have to
        const randomMeaning = uniqueMeanings[Math.floor(Math.random() * uniqueMeanings.length)];
        foodItems.push({ meaning: randomMeaning, correct: false });
    }

    // 2. Find Empty Cells on Grid
    const snakeBodySet = new Set(currentSnake.map(p => `${p.x},${p.y}`));
    const emptyCells: Point[] = [];
    for(let y=0; y<GRID_SIZE; y++) {
        for(let x=0; x<GRID_SIZE; x++) {
            if (!snakeBodySet.has(`${x},${y}`)) {
                emptyCells.push({x, y});
            }
        }
    }

    // Shuffle empty cells
    for (let i = emptyCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
    }

    // 3. Assign Positions to Food Items
    const newFoods: Food[] = [];
    
    // We iterate through our prepared foodItems and assign them to random empty spots
    for (const item of foodItems) {
        if (emptyCells.length === 0) break; 
        const pos = emptyCells.pop()!;
        newFoods.push({
            x: pos.x,
            y: pos.y,
            meaning: item.meaning,
            correct: item.correct
        });
    }

    return { foods: newFoods };
  };

  const nextQuestion = useCallback((overrideWords?: WordItem[]) => {
    const currentList = overrideWords || words;
    if (currentList.length === 0) return;
    
    let available = currentList.filter(w => !usedWordsRef.current.has(w.word));
    if (available.length === 0) {
      usedWordsRef.current.clear();
      available = [...currentList];
    }

    const next = available[Math.floor(Math.random() * available.length)];
    usedWordsRef.current.add(next.word);
    
    const { foods } = generateRound(next, currentList, snakeRef.current);
    
    // Update State Atomically
    setCurrentRound({ word: next, foods });
    foodsRef.current = foods;
  }, [words]);

  const startGame = useCallback((duration: number, initialWords?: WordItem[]) => {
    const activeWords = initialWords || words;
    if (activeWords.length === 0) {
        console.warn("Start Game aborted: No words available.");
        return;
    }

    // Ensure we have enough data to generate 4 options effectively
    if (activeWords.length < 2) {
        alert("Not enough vocabulary words to play. Please load a larger list.");
        return;
    }

    if (initialWords) {
        setWords(initialWords);
    }

    setScore(0);
    setTimeLeft(duration * 60);
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    setSnake([{ x: startX, y: startY }]);
    snakeRef.current = [{ x: startX, y: startY }];
    
    direction.current = { x: 1, y: 0 };
    nextDirection.current = { x: 1, y: 0 };
    usedWordsRef.current.clear();
    setGameState(GameState.PLAYING);
    
    nextQuestion(activeWords);
    
    lastTimeRef.current = performance.now();
  }, [words, nextQuestion]);

  const pauseGame = () => {
    if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
    else if (gameState === GameState.PAUSED) {
        lastTimeRef.current = performance.now(); 
        setGameState(GameState.PLAYING);
    }
  };

  const updateDirection = (newDir: Point) => {
    if (newDir.x !== 0 && direction.current.x !== 0 && newDir.x === -direction.current.x) return;
    if (newDir.y !== 0 && direction.current.y !== 0 && newDir.y === -direction.current.y) return;
    nextDirection.current = newDir;
  };

  // Main Game Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING) {
      cancelAnimationFrame(gameLoopRef.current);
      return;
    }

    const loop = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      const speed = Math.max(150, 350 - Math.floor(score / 50) * 10);
      
      moveAccumulator.current += dt;

      if (moveAccumulator.current >= speed) {
        moveAccumulator.current = 0;
        
        direction.current = nextDirection.current;

        const head = snakeRef.current[0];
        let newHead = {
          x: head.x + direction.current.x,
          y: head.y + direction.current.y
        };

        // --- Wall Collision Logic ---
        let wallHit = false;
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
            wallHit = true;
            playTone('wrong');
            setScore(s => Math.max(0, s - 5));
            
            // Bounce logic: Reverse direction
            const bounceDir = { x: -direction.current.x, y: -direction.current.y };
            direction.current = bounceDir;
            nextDirection.current = bounceDir; // Commit bounce immediately
            
            // New head position based on bounce
            newHead = {
                x: head.x + bounceDir.x,
                y: head.y + bounceDir.y
            };
            
            if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                newHead = head; // Stay put if bounce fails
            }
        }

        // --- Self Collision Logic ---
        if (snakeRef.current.some(p => p.x === newHead.x && p.y === newHead.y)) {
            playTone('gameover');
            setGameState(GameState.GAME_OVER);
            return;
        }

        let ate = false;
        const currentFoods = foodsRef.current;
        const hitFood = currentFoods.find(f => f.x === newHead.x && f.y === newHead.y);

        if (hitFood) {
             if (hitFood.correct) {
                 ate = true;
                 playTone('correct');
                 setScore(s => s + 10);
                 setTimeout(() => nextQuestion(), 0);
             } else {
                 playTone('wrong');
                 setScore(s => Math.max(0, s - 5));
                 
                 // Remove only the hit food
                 const remainingFoods = currentFoods.filter(f => f !== hitFood);
                 foodsRef.current = remainingFoods;
                 setCurrentRound(prev => ({ ...prev, foods: remainingFoods }));
             }
        }

        const newSnake = [newHead, ...snakeRef.current];
        
        if (wallHit) {
             if (newSnake.length > 2) {
                 newSnake.pop(); 
                 newSnake.pop(); 
             } else {
                 if (newSnake.length > 1) newSnake.pop();
                 else {
                     setGameState(GameState.GAME_OVER);
                     playTone('gameover');
                     return;
                 }
             }
        } else if (!ate) {
            newSnake.pop(); 
            
            if (hitFood && !hitFood.correct) {
                if (newSnake.length > 1) {
                    newSnake.pop();
                } else {
                     setGameState(GameState.GAME_OVER);
                     playTone('gameover');
                     return;
                }
            }
        }

        if (newSnake.length === 0) {
            setGameState(GameState.GAME_OVER);
            playTone('gameover');
            return;
        }

        snakeRef.current = newSnake;
        setSnake(newSnake);
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [gameState, nextQuestion, playTone]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
            setGameState(GameState.GAME_OVER);
            playTone('gameover');
            return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [gameState, playTone]);

  return {
    gameState,
    score,
    timeLeft,
    snake,
    currentRound, 
    foods: currentRound.foods, 
    currentWord: currentRound.word, 
    words,
    setWords,
    startGame,
    pauseGame,
    updateDirection,
    setGameState,
    snakeDirection: direction.current
  };
};
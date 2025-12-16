import { useState, useRef, useCallback, useEffect } from 'react';
import { GameState, Point, Food, WordItem } from '../types';

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
  
  const [currentRound, setCurrentRound] = useState<RoundData>({ word: null, foods: [] });
  const [snake, setSnake] = useState<Point[]>([{ x: 5, y: 5 }]);
  
  const foodsRef = useRef<Food[]>([]); 
  const direction = useRef<Point>({ x: 1, y: 0 }); 
  const nextDirection = useRef<Point>({ x: 1, y: 0 });
  const snakeRef = useRef<Point[]>([{ x: 5, y: 5 }]);
  const lastTimeRef = useRef<number>(0);
  const moveAccumulator = useRef<number>(0);
  const gameLoopRef = useRef<number>(0);
  const usedWordsRef = useRef<Set<string>>(new Set());
  const penaltyRef = useRef<number>(0);
  
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
    } catch (e) { console.error(e); }
  }, []);

  const generateRound = (targetWord: WordItem, allWords: WordItem[], currentSnake: Point[]): { foods: Food[] } => {
    const foodItems: { meaning: string; correct: boolean }[] = [];
    foodItems.push({ meaning: targetWord.meaning, correct: true });

    const otherWords = allWords.filter(w => w.meaning.trim() !== targetWord.meaning.trim());
    const uniqueMeanings = Array.from(new Set(otherWords.map(w => w.meaning)));
    const shuffledMeanings = uniqueMeanings.sort(() => 0.5 - Math.random());

    for (const meaning of shuffledMeanings) {
        if (foodItems.length >= 4) break;
        foodItems.push({ meaning, correct: false });
    }
    
    while (foodItems.length < 4) {
        const filler = uniqueMeanings.length > 0 
            ? uniqueMeanings[Math.floor(Math.random() * uniqueMeanings.length)] 
            : (foodItems[0]?.meaning || "...");
        foodItems.push({ meaning: filler, correct: false });
    }

    const snakeBodySet = new Set(currentSnake.map(p => `${p.x},${p.y}`));
    const emptyCells: Point[] = [];
    for(let y=0; y<GRID_SIZE; y++) {
        for(let x=0; x<GRID_SIZE; x++) {
            if (!snakeBodySet.has(`${x},${y}`)) emptyCells.push({x, y});
        }
    }

    for (let i = emptyCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
    }

    const newFoods: Food[] = [];
    for (const item of foodItems) {
        if (emptyCells.length === 0) break; 
        const pos = emptyCells.pop()!;
        newFoods.push({ x: pos.x, y: pos.y, meaning: item.meaning, correct: item.correct });
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
    
    // We must use snakeRef.current here to avoid placing food on the snake
    const { foods } = generateRound(next, currentList, snakeRef.current);
    setCurrentRound({ word: next, foods });
    foodsRef.current = foods;
  }, [words]);

  const startGame = useCallback((duration: number, initialWords?: WordItem[]) => {
    const activeWords = initialWords || words;
    if (activeWords.length === 0) return;
    
    if (initialWords) setWords(initialWords);

    setScore(0);
    setTimeLeft(duration * 60);
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    setSnake([{ x: startX, y: startY }]);
    snakeRef.current = [{ x: startX, y: startY }];
    
    direction.current = { x: 1, y: 0 };
    nextDirection.current = { x: 1, y: 0 };
    usedWordsRef.current.clear();
    penaltyRef.current = 0; // Reset penalty
    
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

  // Helper to handle penalties (wall hit or wrong food)
  const handlePenalty = () => {
      penaltyRef.current += 1;
      const cost = penaltyRef.current * 10;
      
      // Check if player can afford the penalty
      if (score >= cost) {
          playTone('wrong');
          setScore(s => s - cost);
          
          // Shrink snake by 'penalty' amount, but keep at least length 1
          const currentSnake = [...snakeRef.current];
          for(let i=0; i<penaltyRef.current && currentSnake.length > 1; i++){
              currentSnake.pop();
          }
          snakeRef.current = currentSnake;
          setSnake(currentSnake);

          // Force new round
          setTimeout(() => nextQuestion(), 0);
          return true; // Game continues
      } else {
          playTone('gameover');
          setGameState(GameState.GAME_OVER);
          return false; // Game over
      }
  };

  useEffect(() => {
    if (gameState !== GameState.PLAYING) {
      cancelAnimationFrame(gameLoopRef.current);
      return;
    }

    const loop = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      // Speed logic
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

        // --- Collision Check (Wall or Self) ---
        let collision = false;
        
        // Wall
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
            collision = true;
        }
        // Self
        else if (snakeRef.current.some((p, i) => i > 0 && p.x === newHead.x && p.y === newHead.y)) {
             collision = true;
        }

        if (collision) {
             handlePenalty();
             return; // Don't move if we hit something, wait for next round or game over
        }

        // --- Movement & Eating ---
        const currentFoods = foodsRef.current;
        const hitFood = currentFoods.find(f => f.x === newHead.x && f.y === newHead.y);

        let ateCorrect = false;

        if (hitFood) {
             if (hitFood.correct) {
                 ateCorrect = true;
                 playTone('correct');
                 setScore(s => s + 10 + (penaltyRef.current > 0 ? 0 : 5)); // Bonus if no penalty
                 penaltyRef.current = 0; // Reset penalty streak on correct eat
                 setTimeout(() => nextQuestion(), 0);
             } else {
                 // Ate wrong food
                 const survived = handlePenalty();
                 if (!survived) return;
                 // If survived, we basically skip the move update because the round reset
                 return;
             }
        }

        const newSnake = [newHead, ...snakeRef.current];
        
        if (ateCorrect) {
            // Grow (don't pop)
        } else {
            newSnake.pop(); // Move normally
        }

        snakeRef.current = newSnake;
        setSnake(newSnake);
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [gameState, nextQuestion, playTone, score]); // score is dependency for penalty calculation

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
    gameState, score, timeLeft, snake, currentRound, 
    foods: currentRound.foods, currentWord: currentRound.word, 
    words, setWords, startGame, pauseGame, updateDirection, setGameState,
    snakeDirection: direction.current
  };
};
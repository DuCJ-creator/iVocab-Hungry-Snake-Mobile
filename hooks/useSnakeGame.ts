
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
  const [isInvincible, setIsInvincible] = useState(false);
  
  const foodsRef = useRef<Food[]>([]); 
  const direction = useRef<Point>({ x: 1, y: 0 }); 
  const nextDirection = useRef<Point>({ x: 1, y: 0 });
  const snakeRef = useRef<Point[]>([{ x: 5, y: 5 }]);
  const lastTimeRef = useRef<number>(0);
  const moveAccumulator = useRef<number>(0);
  const gameLoopRef = useRef<number>(0);
  const usedWordsRef = useRef<Set<string>>(new Set());
  
  // Scoring & Penalty Streaks
  const correctStreakRef = useRef<number>(0);
  const mistakeStreakRef = useRef<number>(0);

  const invincibleUntilRef = useRef<number>(0);
  const invincibleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

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
    
    const { foods } = generateRound(next, currentList, snakeRef.current);
    setCurrentRound({ word: next, foods });
    foodsRef.current = foods;
  }, [words]);

  const handlePenalty = (currentScore: number) => {
    correctStreakRef.current = 0;
    mistakeStreakRef.current += 1;
    
    const cost = mistakeStreakRef.current * 10;
    const newScore = currentScore - cost;
    
    if (newScore <= 0) {
        setScore(0);
        setGameState(GameState.GAME_OVER);
        playTone('gameover');
        return true;
    }
    
    playTone('wrong');
    setScore(newScore);
    
    // Shrink snake
    const currentSnake = [...snakeRef.current];
    for(let i = 0; i < mistakeStreakRef.current && currentSnake.length > 1; i++){
        currentSnake.pop();
    }
    snakeRef.current = currentSnake;
    setSnake(currentSnake);

    setTimeout(() => nextQuestion(), 0);
    return false;
  };

  const startGame = useCallback((duration: number, initialWords?: WordItem[]) => {
    const activeWords = initialWords || words;
    if (activeWords.length === 0) return;
    
    if (initialWords) setWords(initialWords);

    setScore(100); // Start with some base score to allow for mistakes
    setTimeLeft(duration * 60);
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    setSnake([{ x: startX, y: startY }]);
    snakeRef.current = [{ x: startX, y: startY }];
    
    direction.current = { x: 1, y: 0 };
    nextDirection.current = { x: 1, y: 0 };
    usedWordsRef.current.clear();
    correctStreakRef.current = 0;
    mistakeStreakRef.current = 0;
    
    setIsInvincible(false);
    invincibleUntilRef.current = 0;

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

  useEffect(() => {
    if (gameState !== GameState.PLAYING) {
      cancelAnimationFrame(gameLoopRef.current);
      return;
    }

    const loop = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      const speed = Math.max(100, 300 - Math.floor(score / 500) * 10);
      moveAccumulator.current += dt;

      if (moveAccumulator.current >= speed) {
        moveAccumulator.current = 0;
        direction.current = nextDirection.current;
        const head = snakeRef.current[0];
        let newHead = {
          x: head.x + direction.current.x,
          y: head.y + direction.current.y
        };

        const isInvincibleNow = time < invincibleUntilRef.current;
        let shouldMove = true;

        // Collision: Wall
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
            if (!isInvincibleNow) {
                if (handlePenalty(score)) return;
                shouldMove = false;
            } else {
                shouldMove = false; // Just stop at wall if invincible
            }
        }
        // Collision: Self
        else if (snakeRef.current.some((p, i) => i > 0 && p.x === newHead.x && p.y === newHead.y)) {
             if (!isInvincibleNow) {
                 if (handlePenalty(score)) return;
                 shouldMove = false;
             }
        }

        if (shouldMove) {
            const currentFoods = foodsRef.current;
            const hitFood = currentFoods.find(f => f.x === newHead.x && f.y === newHead.y);
            let ateCorrect = false;

            if (hitFood) {
                 if (hitFood.correct) {
                     ateCorrect = true;
                     playTone('correct');
                     correctStreakRef.current += 1;
                     mistakeStreakRef.current = 0;
                     setScore(s => s + correctStreakRef.current * 10);
                     
                     // 1s Invincibility
                     invincibleUntilRef.current = time + 1000;
                     setIsInvincible(true);
                     if (invincibleTimerRef.current) clearTimeout(invincibleTimerRef.current);
                     invincibleTimerRef.current = setTimeout(() => setIsInvincible(false), 1000);
                     setTimeout(() => nextQuestion(), 0);
                 } else {
                     if (!isInvincibleNow) {
                        if (handlePenalty(score)) return;
                        return;
                     }
                 }
            }

            const newSnake = [newHead, ...snakeRef.current];
            if (!ateCorrect) newSnake.pop();
            snakeRef.current = newSnake;
            setSnake(newSnake);
        }
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [gameState, nextQuestion, playTone, score]);

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
    snakeDirection: direction.current, isInvincible
  };
};

import { useState, useRef, useCallback, useEffect } from 'react';
import { GameState, Point, Food, WordItem, ControlMode } from '../types';

const GRID_SIZE = 12;

export const useSnakeGame = (isMuted: boolean = false) => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);
  const [words, setWords] = useState<WordItem[]>([]);
  const [currentWord, setCurrentWord] = useState<WordItem | null>(null);
  const [snake, setSnake] = useState<Point[]>([{ x: 5, y: 5 }]);
  const [foods, setFoods] = useState<Food[]>([]);
  
  // Mutable state
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

  const generateFoods = (targetWord: WordItem, allWords: WordItem[], currentSnake: Point[]) => {
    const options = [targetWord];
    // Get 3 random wrong meanings
    const otherWords = allWords.filter(w => w.meaning !== targetWord.meaning);
    const uniqueMeanings = Array.from(new Set(otherWords.map(w => w.meaning)));
    
    // Ensure we try to get 3 distractors
    while (options.length < 4 && uniqueMeanings.length > 0) {
      const randomIndex = Math.floor(Math.random() * uniqueMeanings.length);
      const meaning = uniqueMeanings.splice(randomIndex, 1)[0];
      options.push({ word: '', pos: '', meaning });
    }

    // Shuffle options
    const shuffled = options.sort(() => 0.5 - Math.random());

    // Place on grid avoiding snake
    const newFoods: Food[] = [];
    const snakeBodySet = new Set(currentSnake.map(p => `${p.x},${p.y}`));

    const emptyCells: Point[] = [];
    for(let y=0; y<GRID_SIZE; y++) {
        for(let x=0; x<GRID_SIZE; x++) {
            if (!snakeBodySet.has(`${x},${y}`)) {
                emptyCells.push({x, y});
            }
        }
    }

    for (let i = emptyCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
    }

    shuffled.forEach((opt, index) => {
        if (index < emptyCells.length) {
            const pos = emptyCells[index];
            newFoods.push({
                x: pos.x, 
                y: pos.y,
                meaning: opt.meaning,
                correct: opt.meaning === targetWord.meaning
            });
        }
    });

    setFoods(newFoods);
    foodsRef.current = newFoods; 
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
    setCurrentWord(next);
    generateFoods(next, currentList, snakeRef.current);
  }, [words]);

  const startGame = useCallback((duration: number, initialWords?: WordItem[]) => {
    const activeWords = initialWords || words;
    if (activeWords.length === 0) {
        console.warn("Start Game aborted: No words available.");
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
            
            // If bounce pushes out of bounds (e.g. 1-length snake at edge), clamp it? 
            // In grid, just don't move if still invalid
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
                 setTimeout(() => nextQuestion(), 0);
             }
        }

        // Construct new snake
        const newSnake = [newHead, ...snakeRef.current];
        
        if (wallHit) {
             // Shrink on wall hit
             if (newSnake.length > 2) {
                 newSnake.pop(); // Pop tail movement
                 newSnake.pop(); // Pop for damage
             } else {
                 // Too small to survive
                 if (newSnake.length > 1) newSnake.pop();
                 else {
                     setGameState(GameState.GAME_OVER);
                     playTone('gameover');
                     return;
                 }
             }
        } else if (!ate) {
            newSnake.pop(); // Normal move
            
            // Additional penalty shrink for wrong food
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

        // Final check on survival
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
    foods,
    currentWord,
    words,
    setWords,
    startGame,
    pauseGame,
    updateDirection,
    setGameState,
    snakeDirection: direction.current
  };
};
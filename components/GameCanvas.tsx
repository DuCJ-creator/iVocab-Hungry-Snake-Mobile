import React, { useRef, useEffect } from 'react';
import { Point, Food } from '../types';

interface GameCanvasProps {
  snake: Point[];
  foods: Food[];
  gridSize: number;
}

// Linear Interpolation Helper
const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

const GameCanvas: React.FC<GameCanvasProps> = ({ snake, foods, gridSize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Store the *visual* positions of the snake segments to animate them
  const visualSnakeRef = useRef<Point[]>([]);
  const reqIdRef = useRef<number>(0);

  // Initialize visual snake on first load or reset
  useEffect(() => {
    if (visualSnakeRef.current.length === 0 || visualSnakeRef.current.length !== snake.length) {
       visualSnakeRef.current = snake.map(p => ({ x: p.x, y: p.y }));
    }
  }, [snake.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on canvas itself if possible, though we need transparency for layers
    if (!ctx) return;

    const render = () => {
      // Handle High DPI
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Resize buffer if needed
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
         canvas.width = rect.width * dpr;
         canvas.height = rect.height * dpr;
      }
      
      // Reset transform to identity before calculations
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // --- CALCULATE SQUARE PLAY AREA ---
      // Determine the largest square that fits in the canvas
      const sizeRect = Math.min(rect.width, rect.height);
      const offsetX = (rect.width - sizeRect) / 2;
      const offsetY = (rect.height - sizeRect) / 2;
      const cellSize = sizeRect / gridSize;

      // Translate context to center the grid
      ctx.translate(offsetX, offsetY);

      // --- GLASS BOARD BACKGROUND (Square Only) ---
      // Clip to the playable area to prevent "phantom space"
      ctx.beginPath();
      ctx.rect(0, 0, sizeRect, sizeRect);
      ctx.clip();

      const bgGradient = ctx.createLinearGradient(0, 0, sizeRect, sizeRect);
      bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, sizeRect, sizeRect);

      // Glass Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath(); // Batch grid drawing
      for (let i = 0; i <= gridSize; i++) {
        // Vertical
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, sizeRect);
        // Horizontal
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(sizeRect, i * cellSize);
      }
      ctx.stroke();

      // --- WALL BORDER (VISIBLE) ---
      ctx.save();
      // Thick semi-transparent warning track (half clipped, so 10px visible)
      ctx.lineWidth = 20; 
      ctx.strokeStyle = 'rgba(160, 82, 45, 0.2)'; // Sienna with low opacity
      ctx.strokeRect(0, 0, sizeRect, sizeRect);

      // Distinct solid line at edge (half clipped, so 3px visible)
      ctx.lineWidth = 6; 
      ctx.strokeStyle = '#8D6E63'; // Brownish visible frame
      ctx.strokeRect(0, 0, sizeRect, sizeRect);
      ctx.restore();

      // --- UPDATE SNAKE INTERPOLATION ---
      if (visualSnakeRef.current.length !== snake.length) {
          visualSnakeRef.current = snake.map(p => ({x: p.x, y: p.y}));
      } else {
          // Reset to 0.25 to match 300ms speed for smooth continuous movement
          const smoothSpeed = 0.25; 
          visualSnakeRef.current = visualSnakeRef.current.map((v, i) => ({
              x: lerp(v.x, snake[i].x, smoothSpeed),
              y: lerp(v.y, snake[i].y, smoothSpeed)
          }));
      }

      // --- FOOD (BREAD) ---
      foods.forEach(f => {
        const cx = (f.x + 0.5) * cellSize;
        const cy = (f.y + 0.5) * cellSize;
        // INCREASED SIZE from 1.1 to 1.4 for better visibility
        const size = cellSize * 1.4; 

        // PERFORMANCE OPTIMIZATION: Manually draw shadow instead of using ctx.shadowBlur
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, size * 0.45, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        
        // Bread Shape
        ctx.beginPath();
        ctx.ellipse(cx, cy, size * 0.45, size * 0.35, 0, 0, Math.PI * 2);
        
        // Glassy Bread Fill
        const breadGrad = ctx.createRadialGradient(cx - size*0.1, cy - size*0.1, size*0.1, cx, cy, size*0.5);
        breadGrad.addColorStop(0, 'rgba(240, 230, 210, 0.95)'); 
        breadGrad.addColorStop(1, 'rgba(216, 196, 168, 0.9)'); 
        ctx.fillStyle = breadGrad;
        ctx.fill();

        // Rim
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; 
        ctx.stroke();
        
        // Highlight
        ctx.beginPath();
        ctx.ellipse(cx - size*0.15, cy - size*0.15, size * 0.1, size * 0.06, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        ctx.restore();

        // Text (No Truncation)
        ctx.fillStyle = '#3E2723'; 
        // INCREASED FONT SIZE from 0.35 to 0.5
        const fontSize = Math.floor(cellSize * 0.5); 
        ctx.font = `bold ${fontSize}px "Georgia", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Allow text to overflow
        ctx.fillText(f.meaning, cx, cy);
      });

      // --- SNAKE (GLASS STYLE) ---
      for (let i = visualSnakeRef.current.length - 1; i >= 0; i--) {
          const segment = visualSnakeRef.current[i];
          const cx = (segment.x + 0.5) * cellSize;
          const cy = (segment.y + 0.5) * cellSize;
          const isHead = i === 0;

          const radius = cellSize * (isHead ? 0.48 : 0.45);
          
          ctx.save();
          
          // Pre-calculate gradient to avoid recreating if possible, but per-segment is tricky
          // Optimized: Removed shadowBlur on snake segments
          
          const snakeGrad = ctx.createRadialGradient(cx - radius*0.3, cy - radius*0.3, 0, cx, cy, radius);
          if (isHead) {
              snakeGrad.addColorStop(0, 'rgba(255, 200, 200, 0.9)');
              snakeGrad.addColorStop(1, 'rgba(216, 168, 168, 0.8)');
          } else {
              snakeGrad.addColorStop(0, 'rgba(200, 220, 200, 0.8)');
              snakeGrad.addColorStop(1, 'rgba(168, 183, 165, 0.7)');
          }

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = snakeGrad;
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx - radius*0.3, cy - radius*0.3, radius * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fill();

          if (isHead && visualSnakeRef.current.length > 1) {
             const second = visualSnakeRef.current[1];
             const dx = segment.x - second.x;
             const dy = segment.y - second.y;
             const angle = Math.atan2(dy, dx);
             
             const eyeOffset = radius * 0.5;
             const ex1 = cx + Math.cos(angle - 0.5) * eyeOffset;
             const ey1 = cy + Math.sin(angle - 0.5) * eyeOffset;
             const ex2 = cx + Math.cos(angle + 0.5) * eyeOffset;
             const ey2 = cy + Math.sin(angle + 0.5) * eyeOffset;
             const eyeSize = radius * 0.25;

             ctx.fillStyle = 'white';
             ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2); ctx.fill();
             ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2); ctx.fill();

             ctx.fillStyle = '#333';
             ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize * 0.6, 0, Math.PI * 2); ctx.fill();
             ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize * 0.6, 0, Math.PI * 2); ctx.fill();
          }
          
          ctx.restore();
      }

      reqIdRef.current = requestAnimationFrame(render);
    };

    reqIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(reqIdRef.current);
  }, [snake, foods, gridSize]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block" 
    />
  );
};

export default GameCanvas;
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
       // Deep copy to avoid referencing the prop directly if we were mutating (we aren't, but safety)
       visualSnakeRef.current = snake.map(p => ({ x: p.x, y: p.y }));
    }
  }, [snake.length]); // Only reset if length changes significantly (respawn) logic handled inside loop

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Handle High DPI
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Check if we need to resize canvas buffer
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
         canvas.width = rect.width * dpr;
         canvas.height = rect.height * dpr;
         ctx.scale(dpr, dpr);
      }

      // 1. Interpolate Snake Positions for Smoothness
      // We want the visual segments to move towards the logical 'snake' prop positions
      if (visualSnakeRef.current.length !== snake.length) {
          // If length mismatch (grew or shrank), simpler to just snap or adjust array
          visualSnakeRef.current = snake.map(p => ({x: p.x, y: p.y}));
      } else {
          // Lerp each segment
          // The head needs to be responsive, body follows
          const smoothSpeed = 0.25; 
          visualSnakeRef.current = visualSnakeRef.current.map((v, i) => ({
              x: lerp(v.x, snake[i].x, smoothSpeed),
              y: lerp(v.y, snake[i].y, smoothSpeed)
          }));
      }

      const cellSize = rect.width / gridSize;
      
      // Clear Canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // --- GLASS BOARD BACKGROUND ---
      // Subtle gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Glass Grid (Very subtle white lines)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, rect.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(rect.width, i * cellSize);
        ctx.stroke();
      }

      // --- FOOD (BREAD) ---
      // Bigger size for readability
      foods.forEach(f => {
        const cx = (f.x + 0.5) * cellSize;
        const cy = (f.y + 0.5) * cellSize;
        // Increase size: from 0.9 to 1.1 of cell (slight overlap is fine for organic feel)
        const size = cellSize * 1.1; 

        ctx.save();
        
        // Shadow for depth
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        // Bread Shape
        ctx.beginPath();
        // Slightly bigger ellipse
        ctx.ellipse(cx, cy, size * 0.45, size * 0.35, 0, 0, Math.PI * 2);
        
        // Glassy Bread Fill
        // Use a gradient to make it look 3D/Glassy but with bread colors
        const breadGrad = ctx.createRadialGradient(cx - size*0.1, cy - size*0.1, size*0.1, cx, cy, size*0.5);
        breadGrad.addColorStop(0, 'rgba(240, 230, 210, 0.95)'); // Light center
        breadGrad.addColorStop(1, 'rgba(216, 196, 168, 0.9)'); // Darker edge
        ctx.fillStyle = breadGrad;
        ctx.fill();

        // Rim/Stroke
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; // Glassy rim
        ctx.stroke();
        
        // Shine highlight
        ctx.beginPath();
        ctx.ellipse(cx - size*0.15, cy - size*0.15, size * 0.1, size * 0.06, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        ctx.restore(); // Clear shadows

        // Text - BIGGER and Clearer
        ctx.fillStyle = '#3E2723'; // Darker Brown for contrast
        // Increased font size
        const fontSize = Math.floor(cellSize * 0.35); 
        ctx.font = `bold ${fontSize}px "Georgia", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const lines = f.meaning.split(/;|，/);
        let text = lines[0];
        // Only truncate if really long
        if (text.length > 5) {
             // Try to fit it by scaling down slightly if needed, or just truncate
             if (text.length > 8) text = text.substring(0, 6) + '..';
        }
        ctx.fillText(text, cx, cy);
      });

      // --- SNAKE (GLASS STYLE) ---
      // Draw from tail to head
      for (let i = visualSnakeRef.current.length - 1; i >= 0; i--) {
          const segment = visualSnakeRef.current[i];
          const cx = (segment.x + 0.5) * cellSize;
          const cy = (segment.y + 0.5) * cellSize;
          const isHead = i === 0;

          // Snake Segment
          const radius = cellSize * (isHead ? 0.48 : 0.45);
          
          ctx.save();
          
          // Glassy Body Gradient
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

          // Glass Rim
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Highlight (Gloss)
          ctx.beginPath();
          ctx.arc(cx - radius*0.3, cy - radius*0.3, radius * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fill();

          // Head details (Eyes)
          if (isHead && visualSnakeRef.current.length > 1) {
             // Calculate direction from head to second segment for eye positioning
             const second = visualSnakeRef.current[1];
             const dx = segment.x - second.x;
             const dy = segment.y - second.y;
             
             // Normalize vector roughly
             const angle = Math.atan2(dy, dx);
             
             const eyeOffset = radius * 0.5;
             const eyeSpacing = radius * 0.4;
             
             // Left Eye
             const ex1 = cx + Math.cos(angle - 0.5) * eyeOffset;
             const ey1 = cy + Math.sin(angle - 0.5) * eyeOffset;
             // Right Eye
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
    
    return () => {
        cancelAnimationFrame(reqIdRef.current);
    };
  }, [snake, foods, gridSize]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block" 
    />
  );
};

export default GameCanvas;
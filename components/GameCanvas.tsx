import React, { useRef, useEffect } from 'react';
import { Point, Food } from '../types';

interface GameCanvasProps {
  snake: Point[];
  foods: Food[];
  gridSize: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ snake, foods, gridSize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const cellSize = rect.width / gridSize;

    // Clear with transparency
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Optional: Draw a faint grid for guidance
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

    // Draw Foods
    foods.forEach(f => {
      const cx = (f.x + 0.5) * cellSize;
      const cy = (f.y + 0.5) * cellSize;
      
      // Shadow
      ctx.beginPath();
      ctx.ellipse(cx, cy + (cellSize * 0.05), cellSize * 0.45, cellSize * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();

      // Bun (Bigger: 0.45 width)
      ctx.beginPath();
      ctx.ellipse(cx, cy, cellSize * 0.45, cellSize * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#D8C4A8'; // Tan bun
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // Text 
      ctx.fillStyle = '#5A4A42';
      ctx.font = `bold ${cellSize * 0.35}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const lines = f.meaning.split(/;|，/);
      let text = lines[0];
      // Truncate if too long 
      if (text.length > 4) {
          text = text.substring(0, 3) + '..';
      }
      ctx.fillText(text, cx, cy + (cellSize * 0.05));
    });

    // Draw Snake
    snake.forEach((segment, index) => {
      const cx = (segment.x + 0.5) * cellSize;
      const cy = (segment.y + 0.5) * cellSize;
      const isHead = index === 0;

      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * (isHead ? 0.48 : 0.45), 0, Math.PI * 2);
      ctx.fillStyle = isHead ? '#D8A8A8' : 'rgba(168, 183, 165, 0.9)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isHead ? '#fff' : 'rgba(255,255,255,0.6)';
      ctx.stroke();

      // Eyes for head
      if (isHead && snake.length > 1) {
        const dx = segment.x - snake[1].x;
        const dy = segment.y - snake[1].y;
        
        const eyeOffset = cellSize * 0.18;
        const eyeSize = cellSize * 0.12;
        
        ctx.fillStyle = 'white';
        // Simple directional eyes
        let ex1 = cx, ey1 = cy, ex2 = cx, ey2 = cy;
        
        if (dx === 1) { ex1+=eyeOffset; ex2+=eyeOffset; ey1-=eyeOffset; ey2+=eyeOffset; } // Right
        else if (dx === -1) { ex1-=eyeOffset; ex2-=eyeOffset; ey1-=eyeOffset; ey2+=eyeOffset; } // Left
        else if (dy === 1) { ey1+=eyeOffset; ey2+=eyeOffset; ex1-=eyeOffset; ex2+=eyeOffset; } // Down
        else { ey1-=eyeOffset; ey2-=eyeOffset; ex1-=eyeOffset; ex2+=eyeOffset; } // Up

        ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2); ctx.fill();
      }
    });

  }, [snake, foods, gridSize]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full rounded-xl"
    />
  );
};

export default GameCanvas;
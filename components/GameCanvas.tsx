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

    // Background
    ctx.fillStyle = '#F0EDE5'; 
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Grid (Subtle)
    ctx.fillStyle = '#D8C4A8'; 
    const dotRadius = 1.5;
    for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
            ctx.beginPath();
            ctx.arc(i * cellSize, j * cellSize, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw Foods (BREAD)
    foods.forEach(f => {
      const cx = (f.x + 0.5) * cellSize;
      const cy = (f.y + 0.5) * cellSize;
      const size = cellSize * 0.9; 

      // Bread Shape (Ellipse)
      ctx.beginPath();
      // Ellipse logic: x, y, radiusX, radiusY, rotation, startAngle, endAngle
      ctx.ellipse(cx, cy, size * 0.42, size * 0.32, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#D8C4A8'; // Original bread fill
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#C4B6A0'; // Original bread stroke
      ctx.stroke();

      // Text 
      ctx.fillStyle = '#000000'; // Dark ink
      ctx.font = `bold ${cellSize * 0.28}px "Georgia", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const lines = f.meaning.split(/;|，/);
      let text = lines[0];
      if (text.length > 5) {
          text = text.substring(0, 4) + '..';
      }
      ctx.fillText(text, cx, cy);
    });

    // Draw Snake
    snake.forEach((segment, index) => {
      const cx = (segment.x + 0.5) * cellSize;
      const cy = (segment.y + 0.5) * cellSize;
      const isHead = index === 0;

      ctx.beginPath();
      const radius = cellSize * (isHead ? 0.45 : 0.42); 
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      
      if (isHead) {
          ctx.fillStyle = '#D8A8A8'; 
      } else {
          ctx.fillStyle = '#A8B7A5'; 
      }
      
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#8C9D8A';
      ctx.stroke();

      // Eyes
      if (isHead && snake.length > 1) {
        const dx = segment.x - snake[1].x;
        const dy = segment.y - snake[1].y;
        
        const eyeOffset = cellSize * 0.15;
        const eyeSize = cellSize * 0.08;
        
        ctx.fillStyle = 'white';
        let ex1 = cx, ey1 = cy, ex2 = cx, ey2 = cy;
        
        if (dx === 1) { ex1+=eyeOffset; ex2+=eyeOffset; ey1-=eyeOffset; ey2+=eyeOffset; } 
        else if (dx === -1) { ex1-=eyeOffset; ex2-=eyeOffset; ey1-=eyeOffset; ey2+=eyeOffset; } 
        else if (dy === 1) { ey1+=eyeOffset; ey2+=eyeOffset; ex1-=eyeOffset; ex2+=eyeOffset; } 
        else { ey1-=eyeOffset; ey2-=eyeOffset; ex1-=eyeOffset; ex2+=eyeOffset; } 

        ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = '#5A4A42';
        ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize*0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize*0.5, 0, Math.PI * 2); ctx.fill();
      }
    });

  }, [snake, foods, gridSize]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block" 
    />
  );
};

export default GameCanvas;
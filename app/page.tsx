'use client';

import { useEffect } from 'react';
import { initGame, cleanupGame } from './game';

export default function Home() {
  useEffect(() => {
    // Request high performance rendering
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const container = document.getElementById('gameContainer');
    
    if (canvas) {
      // Force hardware acceleration
      canvas.style.transform = 'translateZ(0)';
      canvas.style.willChange = 'transform';
    }
    
    // Small delay to ensure DOM is fully painted
    const timer = setTimeout(() => {
      initGame();
      // Fade in the game after initialization
      if (container) container.classList.add('loaded');
      if (canvas) canvas.classList.add('loaded');
    }, 100);
    
    return () => {
      clearTimeout(timer);
      cleanupGame();
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        body {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          font-family: 'Courier New', monospace;
        }
        
        #gameContainer {
          position: relative;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }
        
        #gameCanvas {
          display: block;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          border: 4px solid #c9a227;
          box-shadow: 0 0 30px rgba(201, 162, 39, 0.3);
        }
        
        #ui {
          position: absolute;
          top: 10px;
          left: 10px;
          color: #f4e4bc;
          font-size: 14px;
          text-shadow: 2px 2px 0 #000;
          pointer-events: none;
        }
        
        #instructions {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          color: #c9a227;
          font-size: 12px;
          text-align: center;
          pointer-events: none;
        }
        
        .pixel-text {
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
        }
      `}</style>
      
      <div id="gameContainer">
        <canvas id="gameCanvas" width="800" height="600"></canvas>
        <div id="ui">
          <div id="blessings"></div>
          <div id="rank"></div>
        </div>
        <div id="instructions" className="pixel-text">
          [←→] Move | [SPACE] Jump | [↓] Interact | [E] Use Item | [ESC] Pause
        </div>
      </div>
    </>
  );
}

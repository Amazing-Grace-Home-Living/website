'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export function VimDefender() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'quiz' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [drones, setDrones] = useState(0);
  const [wave, setWave] = useState(1);
  
  // Game loop variables
  const engineRef = useRef<any>({
    player: { x: 420, y: 450, width: 40, height: 20, speed: 6 },
    bullets: [],
    enemies: [],
    keys: {},
    animationId: 0,
    droneFireTimer: 0
  });

  const quizQuestions = [
    { q: "Which key moves left in Vim?", a: "h", options: ["h", "j", "k", "l"] },
    { q: "Which key moves right in Vim?", a: "l", options: ["h", "j", "k", "l"] },
    { q: "Which key moves down in Vim?", a: "j", options: ["h", "j", "k", "l"] },
    { q: "Which key moves up in Vim?", a: "k", options: ["h", "j", "k", "l"] },
    { q: "How do you enter insert mode?", a: "i", options: ["i", "a", "o", "e"] },
    { q: "How do you undo?", a: "u", options: ["u", "Ctrl+Z", "r", "backspace"] }
  ];
  
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      engineRef.current.keys[e.key] = true;
      // Prevent default scrolling for space and arrows
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
      if (gameState === 'playing') {
        if (e.key === ' ' || e.key === 'Enter') {
          engineRef.current.bullets.push({
            x: engineRef.current.player.x + 18,
            y: engineRef.current.player.y,
            width: 4, height: 10, color: '#00ccff', speed: 8
          });
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current.keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (engineRef.current.animationId) cancelAnimationFrame(engineRef.current.animationId);
    };
  }, [gameState]);

  const startGame = () => {
    engineRef.current.player.x = 420;
    engineRef.current.bullets = [];
    setScore(0);
    setDrones(0);
    setWave(1);
    spawnWave(1);
    setGameState('playing');
  };

  const spawnWave = (waveNum: number) => {
    const enemies = [];
    const rows = Math.min(3 + Math.floor(waveNum / 2), 6);
    for(let r=0; r<rows; r++) {
      for(let c=0; c<8; c++) {
        enemies.push({
          x: 80 + (c * 90),
          y: 50 + (r * 50),
          width: 30, height: 20,
          color: '#ff3333'
        });
      }
    }
    engineRef.current.enemies = enemies;
    engineRef.current.bullets = [];
  };

  useEffect(() => {
    if (gameState === 'playing' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const loop = () => {
        update();
        draw(ctx, canvas);
        engineRef.current.animationId = requestAnimationFrame(loop);
      };
      
      engineRef.current.animationId = requestAnimationFrame(loop);
    }
    return () => {
      if (engineRef.current.animationId) cancelAnimationFrame(engineRef.current.animationId);
    };
  }, [gameState]);

  const update = () => {
    const engine = engineRef.current;
    
    // Player movement (vim keys + arrows)
    if (engine.keys['h'] || engine.keys['ArrowLeft']) {
      engine.player.x -= engine.player.speed;
    }
    if (engine.keys['l'] || engine.keys['ArrowRight']) {
      engine.player.x += engine.player.speed;
    }
    
    engine.player.x = Math.max(0, Math.min(900 - engine.player.width, engine.player.x));

    // Drone auto-fire
    engine.droneFireTimer++;
    if (engine.droneFireTimer > 60 && drones > 0) {
       for(let i=0; i<drones; i++) {
           engine.bullets.push({
               x: (engine.player.x + 20) + (Math.random() * 100 - 50),
               y: engine.player.y,
               width: 3, height: 8, color: '#00ff66', speed: 10
           });
       }
       engine.droneFireTimer = 0;
    }

    // Bullets movement
    engine.bullets.forEach((b: any) => { b.y -= b.speed; });
    engine.bullets = engine.bullets.filter((b: any) => b.y > 0);

    // Collision detection
    let scored = 0;
    engine.bullets.forEach((bullet: any, bi: number) => {
      engine.enemies.forEach((enemy: any, ei: number) => {
        if (
          bullet.x < enemy.x + enemy.width &&
          bullet.x + bullet.width > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + bullet.height > enemy.y
        ) {
          engine.enemies.splice(ei, 1);
          engine.bullets.splice(bi, 1);
          scored += 10;
        }
      });
    });

    if (scored > 0) {
      setScore(s => s + scored);
    }

    if (engine.enemies.length === 0) {
       cancelAnimationFrame(engine.animationId);
       startQuiz();
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const engine = engineRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Player
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(engine.player.x, engine.player.y, engine.player.width, engine.player.height);
    
    // Bullets
    engine.bullets.forEach((b: any) => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.width, b.height);
    });
    
    // Enemies
    ctx.fillStyle = "#ff3333";
    engine.enemies.forEach((enemy: any) => {
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
    
    // Drones visual
    ctx.fillStyle = "#ffd700";
    for(let i=0; i<drones; i++) {
        const dx = engine.player.x + 20 + Math.cos(Date.now()/500 + i) * 40;
        const dy = engine.player.y + Math.sin(Date.now()/500 + i) * 20;
        ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI*2); ctx.fill();
    }
  };

  const startQuiz = () => {
    setGameState('quiz');
    const q = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
    const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
    setCurrentQuiz({ ...q, options: shuffledOptions });
  };

  const handleQuizAnswer = (answer: string) => {
      if (answer === currentQuiz.a) {
          const newCombo = combo + 1;
          setCombo(newCombo);
          setDrones(d => d + 1);
          setScore(s => s + 50 * newCombo);
          // Ask next question immediately if correct
          const q = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
          const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
          setCurrentQuiz({ ...q, options: shuffledOptions });
      } else {
          // Wrong answer ends combo and starts next wave
          setCombo(0);
          setWave(w => w + 1);
          spawnWave(wave + 1);
          setGameState('playing');
      }
  };

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#00ff66', fontFamily: 'monospace', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <Link href="/arcade" style={{ color: '#00ccff', textDecoration: 'none' }}>← Back to Arcade</Link>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>VIM DEFENDER</div>
      </div>
      
      {gameState === 'playing' && (
          <div style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.2rem' }}>
              <span>SCORE: <span style={{ color: '#00ccff' }}>{score}</span></span>
              <span>WAVE: {wave}</span>
              <span>DRONES: <span style={{ color: '#ffd700' }}>{drones}</span></span>
          </div>
      )}

      {gameState === 'menu' && (
          <div style={{ width: '100%', maxWidth: '900px', height: '500px', border: '1px solid #00ccff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050510' }}>
              <h1 style={{ fontSize: '3rem', margin: '0 0 20px 0', textShadow: '0 0 10px #00ff66' }}>VIM DEFENDER</h1>
              <p style={{ color: '#00ccff', marginBottom: '40px', fontSize: '1.2rem' }}>Defend the Spark Network. Learn Vim.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px', color: '#ccc', textAlign: 'left' }}>
                  <div>
                      <h3 style={{ color: '#ffd700' }}>CONTROLS</h3>
                      <ul style={{ listStyleType: 'none', padding: 0 }}>
                          <li><strong>h / ←</strong> : Move Left</li>
                          <li><strong>l / →</strong> : Move Right</li>
                          <li><strong>SPACE</strong> : Fire</li>
                      </ul>
                  </div>
                  <div>
                      <h3 style={{ color: '#ffd700' }}>MECHANICS</h3>
                      <ul style={{ listStyleType: 'none', padding: 0 }}>
                          <li>Clear waves to trigger Quiz Phase</li>
                          <li>Correct answers grant Support Drones</li>
                          <li>Wrong answer ends Quiz and starts next Wave</li>
                      </ul>
                  </div>
              </div>
              <button onClick={startGame} style={{ background: '#00ff66', color: '#000', border: 'none', padding: '15px 40px', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
                  INITIALIZE DEFENSE
              </button>
          </div>
      )}

      {gameState === 'playing' && (
          <canvas 
            ref={canvasRef} 
            width={900} 
            height={500} 
            style={{ border: '1px solid #00ccff', background: '#050610', display: 'block' }}
          />
      )}

      {gameState === 'quiz' && currentQuiz && (
          <div style={{ width: '100%', maxWidth: '900px', height: '500px', border: '1px solid #ffd700', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 215, 0, 0.1)' }}>
              <h2 style={{ color: '#ffd700', fontSize: '2rem', marginBottom: '10px' }}>QUIZ PHASE ACTIVE</h2>
              <div style={{ color: '#00ff66', fontSize: '1.2rem', marginBottom: '30px' }}>Combo: {combo} (Drones +{combo})</div>
              
              <p style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '40px' }}>{currentQuiz.q}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {currentQuiz.options.map((opt: string, i: number) => (
                      <button 
                        key={i}
                        onClick={() => handleQuizAnswer(opt)}
                        style={{ background: '#1e293b', border: '1px solid #00ccff', color: '#fff', padding: '20px', fontSize: '1.2rem', cursor: 'pointer', borderRadius: '8px' }}
                      >
                          {opt}
                      </button>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}

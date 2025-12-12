
import React, { useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { useGameStore } from './store';
import { AmbientAudio } from './components/AmbientAudio';

function App() {
  // Select specific state slices to prevent re-renders on stats/battery changes
  const gameState = useGameStore((state) => state.gameState);
  const tickTime = useGameStore((state) => state.tickTime);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState === 'PLAYING' || gameState === 'STRUGGLE') {
      interval = setInterval(() => {
        tickTime();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, tickTime]);

  return (
    <div className="w-full h-screen bg-black relative">
      <UI />
      <AmbientAudio />
      
      {/* Only render 3D scene when playing or struggling */}
      {(gameState === 'PLAYING' || gameState === 'WIN_LEVEL' || gameState === 'STRUGGLE') && (
        <Canvas shadows className="w-full h-full">
          <Suspense fallback={null}>
            <GameScene />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}

export default App;

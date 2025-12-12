
import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store';
import { CHARACTERS, CHARACTER_TRAITS } from '../types';
import { Battery, Footprints, Clock, Skull, DoorOpen, Zap, Wind, EyeOff, AlertTriangle, Hand, Heart, Key, Target } from 'lucide-react';

export const UI: React.FC = () => {
  const { 
    gameState, 
    selectedCharacter, 
    selectCharacter, 
    setGameState, 
    stats,
    battery,
    health,
    flashlightOn,
    resetLevel,
    advanceLevel,
    gameLogs,
    struggleProgress,
    incrementStruggle,
    failStruggle,
    keysCollected,
    keysNeeded,
    hasWeapon,
    ammo
  } = useGameStore();

  const [blink, setBlink] = useState(true);
  const [glitch, setGlitch] = useState(false);
  
  // Struggle Timer Ref
  const struggleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Blinking REC dot effect
  useEffect(() => {
    const interval = setInterval(() => setBlink(b => !b), 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Struggle Input (Space or Click)
  useEffect(() => {
    const handleInput = (e: KeyboardEvent | MouseEvent) => {
        if (gameState !== 'STRUGGLE') return;
        
        if (e instanceof KeyboardEvent && e.code === 'Space') {
            incrementStruggle();
        } else if (e instanceof MouseEvent) {
            incrementStruggle();
        }
    };

    window.addEventListener('keydown', handleInput);
    window.addEventListener('mousedown', handleInput);
    
    return () => {
        window.removeEventListener('keydown', handleInput);
        window.removeEventListener('mousedown', handleInput);
    }
  }, [gameState, incrementStruggle]);

  // Handle Struggle Timeout/Decay
  useEffect(() => {
    if (gameState === 'STRUGGLE') {
        const timeLimit = Math.max(1500, 3000 - (stats.level * 200));
        struggleTimerRef.current = setTimeout(() => {
            failStruggle();
        }, timeLimit);
    } else {
        if (struggleTimerRef.current) clearTimeout(struggleTimerRef.current);
    }
    return () => {
        if (struggleTimerRef.current) clearTimeout(struggleTimerRef.current);
    };
  }, [gameState, failStruggle, stats.level]);

  // Random glitch effect
  useEffect(() => {
     if(gameState !== 'PLAYING') return;
     const interval = setInterval(() => {
        if(Math.random() > 0.9) {
            setGlitch(true);
            setTimeout(() => setGlitch(false), 200);
        }
     }, 2000);
     return () => clearInterval(interval);
  }, [gameState]);

  // CSS for scanlines overlay
  const scanlineStyle: React.CSSProperties = {
    backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
    backgroundSize: '100% 4px, 6px 100%',
    pointerEvents: 'none',
  };

  if (gameState === 'MENU') {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none" style={scanlineStyle}></div>
        <div className="absolute inset-0 bg-white/5 pointer-events-none animate-pulse"></div>

        <div className="z-10 flex flex-col items-center w-full max-w-6xl p-8 bg-black/80 backdrop-blur-sm overflow-y-auto max-h-screen">
          <h1 className="text-6xl font-black mb-2 text-red-600 tracking-tighter uppercase">BACKROOMS</h1>
          <h2 className="text-3xl font-mono text-yellow-500 mb-8 tracking-widest">// FALAH'S WRATH //</h2>
          
          {/* Instructions Box */}
          <div className="mb-8 text-center bg-gray-900/80 p-6 border-y-2 border-red-600 w-full max-w-3xl shadow-[0_0_20px_rgba(220,38,38,0.3)]">
            <h3 className="text-red-500 font-bold mb-2 text-xl tracking-widest uppercase">Mission Objective</h3>
            <p className="text-white text-lg font-bold leading-relaxed" dir="rtl">
              عليك العثور على <span className="text-yellow-400 mx-1">المفاتيح</span> لفتح المخرج والهروب.
              <br/>
              هنالك <span className="text-red-500 mx-1">سلاح</span> في اللعبة يمكنك استخدامه لقتل الأستاذ فلاح... ولكن كن حذراً!
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {CHARACTERS.map((char) => {
              const traits = CHARACTER_TRAITS[char];
              return (
                <button
                  key={char}
                  onClick={() => {
                    selectCharacter(char);
                    setGameState('PLAYING');
                  }}
                  className="group relative bg-gray-900 border border-gray-700 p-4 hover:bg-red-900/40 hover:border-red-500 transition-all duration-300 text-left flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center w-full border-b border-gray-700 pb-2 mb-1 group-hover:border-red-500">
                    <span className="text-xl font-mono text-gray-200 group-hover:text-white">{char}</span>
                  </div>
                  
                  <div className="text-xs text-gray-400 mb-2 h-8">{traits.description}</div>
                  
                  {/* Stats Bars */}
                  <div className="space-y-1 w-full text-xs font-mono">
                    <div className="flex items-center gap-2">
                        <Wind size={12} className="text-blue-400" /> 
                        <span className="w-12 text-gray-500">سرعة</span>
                        <div className="flex-1 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{width: `${(traits.speed / 1.5) * 100}%`}}></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap size={12} className="text-yellow-400" /> 
                        <span className="w-12 text-gray-500">بطارية</span>
                        <div className="flex-1 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                            {/* Lower battery drain is better, so invert logic for display */}
                            <div className="h-full bg-yellow-500" style={{width: `${(1 / traits.battery) * 80}%`}}></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <EyeOff size={12} className="text-purple-400" /> 
                        <span className="w-12 text-gray-500">تخفي</span>
                        <div className="flex-1 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                             {/* Lower stealth num is better */}
                            <div className="h-full bg-purple-500" style={{width: `${(1 / traits.stealth) * 80}%`}}></div>
                        </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // JUMPSCARE SCREEN
  if (gameState === 'JUMPSCARE') {
      return (
        <div className="absolute inset-0 bg-black z-[100] flex items-center justify-center overflow-hidden">
            {/* Immediate Flash */}
            <div className="absolute inset-0 bg-white animate-[fadeOut_0.2s_ease-out_forwards]"></div>
            
            {/* Red Pulsing Overlay */}
            <div className="absolute inset-0 bg-red-600 mix-blend-multiply animate-pulse"></div>
            
            {/* Scary Face CSS Construction */}
            <div className="relative z-10 w-full h-full flex items-center justify-center animate-[shake_0.1s_infinite]">
                 <div className="w-[120vh] h-[120vh] rounded-full bg-black flex items-center justify-center relative shadow-[0_0_100px_red]">
                    {/* Eyes */}
                    <div className="absolute top-[30%] left-[25%] w-[15%] h-[15%] bg-white rounded-full shadow-[0_0_50px_red] animate-[pulse_0.05s_infinite]">
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 h-3/4 bg-black rounded-full"></div>
                    </div>
                    <div className="absolute top-[30%] right-[25%] w-[15%] h-[15%] bg-white rounded-full shadow-[0_0_50px_red] animate-[pulse_0.05s_infinite]">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 h-3/4 bg-black rounded-full"></div>
                    </div>
                    {/* Mouth */}
                    <div className="absolute bottom-[20%] w-[60%] h-[40%] bg-black border-4 border-red-600 rounded-[40%] overflow-hidden animate-[pulse_0.1s_infinite]">
                        <div className="w-full h-full bg-red-950 flex flex-wrap gap-1 content-center justify-center p-4">
                             {/* Teeth */}
                             {Array.from({length:30}).map((_,i) => <div key={i} className="w-4 h-8 bg-yellow-100 rotate-1 transform skew-x-12"></div>)}
                        </div>
                    </div>
                 </div>
            </div>
            
            {/* Text Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none mix-blend-difference">
                 <h1 className="text-[150px] md:text-[250px] font-black text-red-500 animate-ping opacity-50">RUN</h1>
            </div>

            <style>{`
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `}</style>
        </div>
      )
  }

  if (gameState === 'GAME_OVER') {
    return (
      <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center z-50">
        <div className="absolute inset-0 pointer-events-none" style={scanlineStyle}></div>
        <div className="bg-black/80 p-12 border-4 border-red-600 text-center shadow-[0_0_100px_red] transform rotate-1">
          <Skull size={100} className="mx-auto mb-6 text-red-500 animate-bounce" />
          <h1 className="text-8xl font-black text-white mb-2 uppercase tracking-tighter">FATAL ERROR</h1>
          <h2 className="text-4xl font-mono text-red-500 mb-8">SUBJECT TERMINATED</h2>
          
          <div className="text-left font-mono text-red-200 bg-red-900/30 p-6 rounded border border-red-800 mb-8 space-y-2">
            <p>> LEVEL REACHED: <span className="text-white float-right">{stats.level}</span></p>
            <p>> ESCAPES: <span className="text-white float-right">{stats.escapes}</span></p>
            <p>> SURVIVAL TIME: <span className="text-white float-right">{Math.floor(stats.timeSurvived / 60)}:{String(stats.timeSurvived % 60).padStart(2, '0')}</span></p>
            <p>> CAUSE OF DEATH: <span className="text-white float-right">FALAH</span></p>
          </div>

          <button
            onClick={() => {
              setGameState('MENU');
              resetLevel();
            }}
            className="w-full bg-white text-black font-black text-2xl py-4 hover:bg-red-500 hover:text-white transition-colors uppercase"
          >
            Re-Initialize
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'WIN_LEVEL') {
     return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
        <div className="absolute inset-0 pointer-events-none" style={scanlineStyle}></div>
        <div className="text-green-500 font-mono text-center">
          <DoorOpen size={80} className="mx-auto mb-6 animate-pulse" />
          <h1 className="text-6xl font-bold mb-4 uppercase tracking-widest">Signal Acquired</h1>
          <p className="text-xl mb-8 text-green-300">Transferring to Level {stats.level + 1}...</p>
          <div className="w-64 h-2 bg-gray-800 mx-auto rounded overflow-hidden">
             <div className="h-full bg-green-500 animate-[pulse_2s_infinite]"></div>
          </div>
          <button
            onClick={() => {
              setGameState('PLAYING');
            }}
            className="mt-12 border border-green-500 px-8 py-3 text-xl hover:bg-green-900/50 transition-colors"
          >
            PROCEED
          </button>
        </div>
      </div>
     )
  }

  // HUD (Heads Up Display)
  return (
    <div className={`absolute inset-0 pointer-events-none z-10 font-mono overflow-hidden ${glitch ? 'opacity-80 translate-x-1' : ''}`}>
      {/* Scanlines Overlay */}
      <div className="absolute inset-0 z-0" style={scanlineStyle}></div>
      
      {/* Vignette */}
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,${health < 40 ? '0.9' : '0.8'})_100%)] ${health < 40 ? 'animate-pulse' : ''}`}></div>

      {/* Low Health Warning Overlay */}
      {health < 30 && (
          <div className="absolute inset-0 border-[20px] border-red-900/50 mix-blend-overlay animate-pulse pointer-events-none"></div>
      )}

      {/* STRUGGLE OVERLAY */}
      {gameState === 'STRUGGLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-red-900/30 backdrop-blur-sm">
             <div className="animate-bounce mb-8">
                <Hand size={120} className="text-white" />
             </div>
             <h1 className="text-6xl font-black text-white mb-4 drop-shadow-[0_0_10px_red] animate-pulse">
                إضغط بسرعة!
             </h1>
             <p className="text-xl text-red-200 mb-8 font-bold">
                DIFFICULTY: {Array(stats.level).fill('💀').join('')}
             </p>
             
             {/* Progress Bar */}
             <div className="w-1/2 h-12 bg-black/80 border-4 border-white rounded-full overflow-hidden relative shadow-[0_0_30px_red]">
                <div 
                    className="h-full bg-red-600 transition-all duration-75 ease-linear"
                    style={{width: `${struggleProgress}%`}}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-xl">
                    {Math.round(struggleProgress)}%
                </div>
             </div>
          </div>
      )}

      {/* Top Left: Recording Status */}
      <div className="absolute top-8 left-8 flex flex-col gap-1">
        <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${blink ? 'bg-red-600 shadow-[0_0_10px_red]' : 'bg-red-900'}`}></div>
            <span className="text-white text-2xl font-bold tracking-widest drop-shadow-md">REC</span>
        </div>
        <div className="text-gray-400 text-sm tracking-widest">
            {new Date().toLocaleDateString('en-US', {month:'short', day:'2-digit', year:'numeric'}).toUpperCase()}
        </div>
        <div className="text-gray-400 text-sm tracking-widest">
            {Math.floor(stats.timeSurvived / 60)}:{String(stats.timeSurvived % 60).padStart(2, '0')}
        </div>
        
        {/* Keys HUD */}
        <div className="flex items-center gap-2 mt-4 text-yellow-500 animate-[pulse_5s_infinite]">
            <Key size={20} className={keysCollected >= keysNeeded ? "text-green-500" : "text-yellow-500"} />
            <span className={`text-xl font-bold tracking-widest ${keysCollected >= keysNeeded ? "text-green-500" : "text-yellow-500"}`}>
                KEYS: {keysCollected} / {keysNeeded}
            </span>
        </div>
      </div>

      {/* Top Right: Level Info */}
      <div className="absolute top-8 right-8 text-right flex flex-col items-end">
        <div className="text-yellow-500 text-xl font-bold tracking-widest border-b border-yellow-500/50 pb-1 mb-1">
            LEVEL_0{stats.level}
        </div>
        <div className="text-xs text-yellow-300/70 mb-4">
            LOCATION: UNKNOWN
        </div>

        {/* KILL FEED / LOGS */}
        <div className="flex flex-col gap-1 items-end w-64">
           {gameLogs.map((log) => (
               <div key={log.id} className="bg-red-900/40 border border-red-600/50 px-2 py-1 text-red-200 text-xs animate-[pulse_3s_infinite] flex items-center gap-2">
                   <AlertTriangle size={12} className="text-red-500" />
                   {log.message}
               </div>
           ))}
        </div>
      </div>

      {/* Bottom Left: Character Bio */}
      <div className="absolute bottom-8 left-8">
        <div className="flex items-end gap-3 text-white">
            <div className="bg-white/10 p-2 backdrop-blur-sm border-l-2 border-white">
                <div className="text-xs text-gray-400 uppercase">Subject</div>
                <div className="text-xl font-bold">{selectedCharacter}</div>
            </div>
            {hasWeapon && (
                <div className="bg-red-900/50 p-2 backdrop-blur-sm border-l-2 border-red-500 flex flex-col items-center">
                    <div className="flex items-center gap-1 text-red-300">
                        <Target size={16} />
                        <span className="text-xs font-bold uppercase">Weapon</span>
                    </div>
                    <div className="text-2xl font-black text-white">{ammo} <span className="text-xs text-gray-400">RNDS</span></div>
                </div>
            )}
        </div>
        <div className="mt-2 text-xs text-gray-500">
            [SHIFT] SPRINT | [F] LIGHT {hasWeapon ? '| [LMB] SHOOT' : ''}
        </div>
      </div>

      {/* Bottom Right: Battery & Health HUD */}
      <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4">
         
         {/* Health Bar */}
         <div className="flex flex-col items-end">
             <div className="flex items-center gap-2 mb-1">
                 <span className={`text-sm font-bold ${health < 40 ? 'text-red-600 animate-pulse' : 'text-white'}`}>
                    HEALTH
                 </span>
                 <Heart size={24} className={health < 40 ? 'text-red-600 fill-red-600' : 'text-red-500'} />
             </div>
             <div className="w-48 h-4 bg-black/50 border border-gray-600 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-300 ${health < 30 ? 'bg-red-600' : 'bg-white'}`}
                    style={{width: `${health}%`}}
                ></div>
             </div>
         </div>

         {/* Battery */}
         <div className="flex flex-col items-end">
             <div className="flex items-center gap-2 mb-1">
                 <span className={`text-sm font-bold ${battery < 20 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                    BATTERY
                 </span>
                 <Battery size={24} className={battery < 20 ? 'text-red-500' : 'text-green-500'} />
             </div>
             
             {/* Camcorder Battery Graphic */}
             <div className="flex gap-1">
                {/* Battery Blocks */}
                {[20, 40, 60, 80, 100].map((step, i) => (
                    <div 
                        key={i} 
                        className={`w-6 h-4 border border-gray-600 ${
                            battery >= step 
                            ? (battery < 30 ? 'bg-red-600' : 'bg-green-500') 
                            : 'bg-black/50'
                        }`}
                    ></div>
                ))}
             </div>
         </div>
      </div>
      
      {/* Center Crosshair */}
      <div className={`crosshair border transition-colors duration-200 ${hasWeapon ? 'border-red-500 bg-red-900/20 w-4 h-4 rounded-none' : 'border-white/50 bg-white/20'}`}></div>
    </div>
  );
};

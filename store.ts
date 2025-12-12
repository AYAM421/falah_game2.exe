
import { create } from 'zustand';
import { CharacterName, GameState, GameStats, BossType } from './types';

interface LogMessage {
  id: number;
  message: string;
  timestamp: number;
}

interface StoreState {
  gameState: GameState;
  selectedCharacter: CharacterName | null;
  stats: GameStats;
  flashlightOn: boolean;
  battery: number;
  health: number;
  deadCharacters: string[];
  gameLogs: LogMessage[]; 
  
  // Keys System
  keysNeeded: number;
  keysCollected: number;
  collectedKeyCoords: string[]; 

  // Weapon System
  hasWeapon: boolean;
  ammo: number;
  activeBoss: BossType;
  
  // Struggle & Stun Mechanics
  struggleProgress: number;
  falahStunnedUntil: number;
  falahRageMultiplier: number;

  // Actions
  setGameState: (state: GameState) => void;
  selectCharacter: (char: CharacterName) => void;
  toggleFlashlight: () => void;
  drainBattery: (amount: number) => void;
  resetLevel: () => void;
  advanceLevel: () => void;
  caughtByFalah: () => void;
  killCharacter: (name: string) => void;
  collectKey: (coordKey: string) => void;
  collectWeapon: () => void;
  collectAmmo: () => void;
  shootGun: () => boolean; // Returns true if shot was fired
  hitBoss: () => void;
  tickTime: () => void;
  
  // Struggle Actions
  incrementStruggle: () => void;
  failStruggle: () => void;
  addLog: (msg: string) => void;
}

export const useGameStore = create<StoreState>((set, get) => ({
  gameState: 'MENU',
  selectedCharacter: null,
  stats: {
    level: 1,
    timeSurvived: 0,
    escapes: 0,
  },
  flashlightOn: true,
  battery: 100,
  health: 100,
  deadCharacters: [],
  gameLogs: [],
  struggleProgress: 0,
  falahStunnedUntil: 0,
  falahRageMultiplier: 1.0,
  
  // Keys Init
  keysNeeded: 1,
  keysCollected: 0,
  collectedKeyCoords: [],

  // Weapon Init
  hasWeapon: false,
  ammo: 0,
  activeBoss: 'FALAH',

  setGameState: (state) => set({ gameState: state }),
  
  selectCharacter: (char) => set({ selectedCharacter: char }),
  
  toggleFlashlight: () => set((state) => ({ 
    flashlightOn: !state.flashlightOn && state.battery > 0 
  })),
  
  drainBattery: (amount) => set((state) => {
    const newBattery = Math.max(0, state.battery - amount);
    return { 
      battery: newBattery,
      flashlightOn: newBattery <= 0 ? false : state.flashlightOn
    };
  }),

  resetLevel: () => set((state) => ({
    battery: 100,
    health: 100,
    flashlightOn: true,
    deadCharacters: [],
    gameLogs: [],
    struggleProgress: 0,
    falahStunnedUntil: 0,
    falahRageMultiplier: 1.0,
    keysNeeded: 1,
    keysCollected: 0,
    collectedKeyCoords: [],
    hasWeapon: false,
    ammo: 0,
    activeBoss: 'FALAH'
  })),

  advanceLevel: () => set((state) => {
    const nextLevel = state.stats.level + 1;
    const nextKeysNeeded = nextLevel; 

    return {
      gameState: 'WIN_LEVEL',
      stats: {
        ...state.stats,
        level: nextLevel,
        escapes: state.stats.escapes + 1
      },
      battery: Math.min(100, state.battery + 30),
      health: Math.min(100, state.health + 20),
      deadCharacters: [],
      gameLogs: [],
      falahStunnedUntil: 0,
      keysNeeded: nextKeysNeeded,
      keysCollected: 0,
      collectedKeyCoords: [],
      // Keep weapon if found, but boss resets? Or keep boss progression? 
      // Let's reset boss to Falah for new level, but keep gun.
      activeBoss: 'FALAH',
      // Maybe reduce ammo slightly to keep tension
      ammo: Math.max(0, state.ammo - 1)
    };
  }),

  collectKey: (coordKey) => set((state) => {
    if (state.collectedKeyCoords.includes(coordKey)) return state;

    const newCollected = state.keysCollected + 1;
    const remaining = state.keysNeeded - newCollected;
    
    let msg = `🔑 تم جمع مفتاح! (${newCollected}/${state.keysNeeded})`;
    if (remaining === 0) msg = "🔓 فُتح الباب! ابحث عن المخرج!";

    return {
        keysCollected: newCollected,
        collectedKeyCoords: [...state.collectedKeyCoords, coordKey],
        gameLogs: [{ id: Date.now(), message: msg, timestamp: Date.now() }, ...state.gameLogs].slice(0, 5)
    };
  }),

  collectWeapon: () => set((state) => {
    if (state.hasWeapon) return state; // Already has it
    return {
        hasWeapon: true,
        ammo: state.ammo + 1, // Start with 1 bullet
        gameLogs: [{ id: Date.now(), message: '🔫 وجدت مسدساً! (طلقة واحدة)', timestamp: Date.now() }, ...state.gameLogs].slice(0, 5)
    };
  }),

  collectAmmo: () => set((state) => ({
      ammo: state.ammo + 1,
      gameLogs: [{ id: Date.now(), message: '📦 وجدت رصاصة!', timestamp: Date.now() }, ...state.gameLogs].slice(0, 5)
  })),

  shootGun: () => {
      const state = get();
      if (state.hasWeapon && state.ammo > 0) {
          set({ 
              ammo: state.ammo - 1,
              gameLogs: [{ id: Date.now(), message: '💥 بانغ!', timestamp: Date.now() }, ...state.gameLogs].slice(0, 5)
           });
          return true;
      }
      if (state.hasWeapon && state.ammo <= 0) {
        set({ gameLogs: [{ id: Date.now(), message: '⚠️ نفذت الذخيرة!', timestamp: Date.now() }, ...state.gameLogs].slice(0, 5) });
      }
      return false;
  },

  hitBoss: () => {
      const state = get();
      if (state.activeBoss === 'FALAH') {
          // Trigger Transformation
          set({ 
              activeBoss: 'TRANSFORMING',
              gameLogs: [{ id: Date.now(), message: '💀 سقط فلاح...', timestamp: Date.now() }, ...state.gameLogs].slice(0, 5)
          });

          // After delay, Spawn SAIF
          setTimeout(() => {
              set(s => ({ 
                  activeBoss: 'SAIF',
                  falahRageMultiplier: s.falahRageMultiplier * 1.5, // Saif is much faster
                  gameLogs: [{ id: Date.now(), message: '😈 خرج الأستاذ سيف من الجثة!! اهرب!!', timestamp: Date.now() }, ...s.gameLogs].slice(0, 5)
              }));
          }, 3000);
      } else if (state.activeBoss === 'SAIF') {
          // Saif is tougher, maybe just stun him?
           set({ 
               falahStunnedUntil: Date.now() + 5000,
               gameLogs: [{ id: Date.now(), message: '🛡️ الأستاذ سيف لا يموت! لكنه توقف قليلاً', timestamp: Date.now() }, ...state.gameLogs].slice(0, 5)
           });
      }
  },

  addLog: (msg) => set((state) => ({
     gameLogs: [{ id: Date.now(), message: msg, timestamp: Date.now() }, ...state.gameLogs].slice(0, 5)
  })),

  caughtByFalah: () => {
    const state = get();
    if (state.gameState !== 'PLAYING') return;
    if (Date.now() < state.falahStunnedUntil) return;
    if (state.activeBoss === 'TRANSFORMING') return; // Can't catch while dead

    set({ 
        gameState: 'STRUGGLE', 
        struggleProgress: state.activeBoss === 'SAIF' ? 5 : 10 // Harder to struggle against Saif
    });
  },

  incrementStruggle: () => {
    const state = get();
    if (state.gameState !== 'STRUGGLE') return;

    let difficultyPenalty = state.stats.level; 
    if (state.activeBoss === 'SAIF') difficultyPenalty += 3; // Saif is harder

    const incrementAmount = Math.max(2, 10 - difficultyPenalty);

    const newProgress = state.struggleProgress + incrementAmount; 
    
    if (newProgress >= 100) {
        const newHealth = state.health - (state.activeBoss === 'SAIF' ? 40 : 25); 
        const newRage = state.falahRageMultiplier + 0.1; 

        if (newHealth <= 0) {
             set({ 
                gameState: 'JUMPSCARE',
                health: 0 
             });
             setTimeout(() => {
                 set({ gameState: 'GAME_OVER' });
             }, 1500);
        } else {
            set({
                gameState: 'PLAYING',
                struggleProgress: 0,
                health: newHealth,
                falahRageMultiplier: newRage,
                falahStunnedUntil: Date.now() + 4000, 
                gameLogs: [
                    { id: Date.now(), message: '⚡ هربت!', timestamp: Date.now() }, 
                    ...state.gameLogs
                ].slice(0, 5)
            });
        }
    } else {
        set({ struggleProgress: newProgress });
    }
  },

  failStruggle: () => {
    set({ gameState: 'JUMPSCARE', health: 0 });
    setTimeout(() => {
        set({ gameState: 'GAME_OVER' });
    }, 1500);
  },

  killCharacter: (name) => set((state) => {
    if (state.deadCharacters.includes(name)) return state;
    
    const newLog: LogMessage = {
        id: Date.now(),
        message: `⚠️ تم القضاء على ${name}`,
        timestamp: Date.now()
    };

    return { 
        deadCharacters: [...state.deadCharacters, name],
        gameLogs: [newLog, ...state.gameLogs].slice(0, 5)
    };
  }),

  tickTime: () => set((state) => ({
    stats: {
      ...state.stats,
      timeSurvived: state.stats.timeSurvived + 1
    }
  }))
}));

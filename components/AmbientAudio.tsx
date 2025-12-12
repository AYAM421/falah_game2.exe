
import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store';

export const AmbientAudio: React.FC = () => {
  const { gameState } = useGameStore();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const humOscRef = useRef<OscillatorNode | null>(null);
  const nextEventTimeoutRef = useRef<number | undefined>(undefined);

  // Initialize Audio Engine
  useEffect(() => {
    // We allow audio init in PLAYING or JUMPSCARE to ensure context exists
    if (gameState !== 'PLAYING' && gameState !== 'JUMPSCARE') return;

    const initAudio = async () => {
      if (audioCtxRef.current) return; // Already initialized

      try {
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new CtxClass();
        audioCtxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.5; // Master volume
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;

        // --- 1. The Backrooms Hum (Constant Background) ---
        // Fluorescent lights hum usually around 50Hz or 60Hz + harmonics
        const humOsc = ctx.createOscillator();
        humOsc.type = 'sawtooth';
        humOsc.frequency.value = 50; // Mains hum frequency

        // Filter to remove harshness
        const humFilter = ctx.createBiquadFilter();
        humFilter.type = 'lowpass';
        humFilter.frequency.value = 120;

        // Low volume for background
        const humGain = ctx.createGain();
        humGain.gain.value = 0.05;

        humOsc.connect(humFilter);
        humFilter.connect(humGain);
        humGain.connect(masterGain);
        humOsc.start();
        humOscRef.current = humOsc;

        scheduleNextRandomSound();

      } catch (e) {
        console.error("Audio init failed", e);
      }
    };

    initAudio();

    return () => {
      // Cleanup is tricky because we might want sound to persist into Game Over briefly, 
      // but for React lifecycle we usually clean up. 
      // We'll trust the component mount/unmount cycle.
    };
  }, [gameState]);

  // Handle Jumpscare Trigger
  useEffect(() => {
    if (gameState === 'JUMPSCARE' && audioCtxRef.current && masterGainRef.current) {
        playJumpscareSound(audioCtxRef.current, masterGainRef.current);
    }
  }, [gameState]);

  const scheduleNextRandomSound = () => {
    if (gameState !== 'PLAYING') return;

    // Random interval between 5 and 15 seconds
    const delay = (Math.random() * 10000) + 5000;

    nextEventTimeoutRef.current = window.setTimeout(() => {
      triggerRandomSound();
      scheduleNextRandomSound();
    }, delay);
  };

  const triggerRandomSound = () => {
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master || gameState !== 'PLAYING') return;

    const r = Math.random();

    if (r < 0.4) {
      playCreak(ctx, master);
    } else if (r < 0.7) {
      playGhostlyBreath(ctx, master);
    } else {
      playDistantBang(ctx, master);
    }
  };

  // --- Sound Generation Functions ---

  const playJumpscareSound = (ctx: AudioContext, output: AudioNode) => {
    // 1. Scream (High Pitch Sawtooth)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1); // Screech up
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3); // Wobble
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1.2); // Die down

    // 2. Impact Noise
    const bufferSize = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter noise
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(3000, ctx.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1.0);

    // Gains
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, ctx.currentTime);
    oscGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.02); // BANG
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

    // Connections
    osc.connect(oscGain);
    oscGain.connect(output);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(output);

    osc.start();
    noise.start();
    
    osc.stop(ctx.currentTime + 1.3);
    noise.stop(ctx.currentTime + 1.3);
  };

  // 1. Creaking Floor/Metal
  const playCreak = (ctx: AudioContext, output: AudioNode) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    // Random pitch between 100Hz and 300Hz
    const freq = 100 + Math.random() * 200;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    // Pitch bend down slightly
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + 1.5);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(output);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  };

  // 2. Ghostly Breath / Whisper (Filtered Noise)
  const playGhostlyBreath = (ctx: AudioContext, output: AudioNode) => {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate White Noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1;
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    // Sweep filter to sound like wind passing
    filter.frequency.linearRampToValueAtTime(800, ctx.currentTime + 1);
    filter.frequency.linearRampToValueAtTime(400, ctx.currentTime + 2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    noise.start();
  };

  // 3. Distant Bang / Thud
  const playDistantBang = (ctx: AudioContext, output: AudioNode) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.value = 40;

    filter.type = 'lowpass';
    filter.frequency.value = 100; // Very muffled

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  return null; // Logic only component
};

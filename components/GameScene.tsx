
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Player } from './Player';
import { generateMaze, CELL_SIZE } from './MazeGenerator';
import { useGameStore } from '../store';
import { Falah } from './Falah';
import { NPC } from './NPC';
import { CHARACTERS } from '../types';
import { Text } from '@react-three/drei';
import { Vector3, CanvasTexture, RepeatWrapping, Group } from 'three';

// Key Component
const KeyObject: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const meshRef = useRef<Group>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.02;
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        }
    });
    return (
        <group ref={meshRef} position={new Vector3(...position)}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
                <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.3} emissive="#AA6600" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0.2, 0, 0]} rotation={[0, Math.PI/2, 0]}>
                <torusGeometry args={[0.15, 0.05, 8, 16]} />
                <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.3} />
            </mesh>
             <mesh position={[-0.2, -0.1, 0]}>
                <boxGeometry args={[0.1, 0.15, 0.02]} />
                <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.3} />
            </mesh>
             <pointLight distance={3} color="orange" intensity={2} />
        </group>
    );
};

// Weapon Component
const WeaponObject: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const meshRef = useRef<Group>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.01;
        }
    });
    return (
        <group ref={meshRef} position={new Vector3(...position)}>
            {/* Handle */}
            <mesh position={[0, -0.1, 0]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.1, 0.25, 0.08]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            {/* Barrel */}
            <mesh position={[0, 0.05, 0.1]}>
                <boxGeometry args={[0.08, 0.1, 0.4]} />
                <meshStandardMaterial color="#555" metalness={0.8} />
            </mesh>
             <Text position={[0, 0.4, 0]} fontSize={0.3} color="white">مسدس</Text>
             <pointLight distance={3} color="blue" intensity={1} />
        </group>
    );
};

// Ammo Component
const AmmoObject: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const meshRef = useRef<Group>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.05;
        }
    });
    return (
        <group ref={meshRef} position={new Vector3(...position)}>
            <mesh>
                <boxGeometry args={[0.15, 0.1, 0.15]} />
                <meshStandardMaterial color="green" />
            </mesh>
            <Text position={[0, 0.3, 0]} fontSize={0.2} color="green">رصاص</Text>
        </group>
    );
};

const generateHorrorTexture = (type: 'wall' | 'floor') => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new CanvasTexture(canvas);

  ctx.fillStyle = type === 'wall' ? '#c2b280' : '#2a2a2a'; 
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  if (type === 'wall') {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      const startX = Math.random() * 512;
      const startY = Math.random() * 512;
      ctx.moveTo(startX, startY);
      for (let j = 0; j < 10; j++) {
        ctx.lineTo(startX + Math.random() * 100 - 50, startY + Math.random() * 100 - 50);
      }
      ctx.stroke();
    }
  }

  const bloodCount = type === 'wall' ? 5 : 15; 
  for (let i = 0; i < bloodCount; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 40 + 10;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(100, 0, 0, 0.8)'); 
    gradient.addColorStop(0.7, 'rgba(80, 0, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(50, 0, 0, 0)'); 

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (type === 'wall') {
       ctx.fillStyle = 'rgba(80, 0, 0, 0.6)';
       ctx.fillRect(x, y, Math.random() * 4 + 1, Math.random() * 100 + 20);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
};

export const GameScene: React.FC = () => {
  const level = useGameStore((state) => state.stats.level);
  const selectedCharacter = useGameStore((state) => state.selectedCharacter);
  const collectedKeyCoords = useGameStore((state) => state.collectedKeyCoords);
  const keysNeeded = useGameStore((state) => state.keysNeeded);
  const keysCollected = useGameStore((state) => state.keysCollected);
  const hasWeapon = useGameStore((state) => state.hasWeapon);
  
  const { grid, size } = useMemo(() => generateMaze(level), [level]);
  const startPos = useMemo(() => [1, 1] as [number, number], []);
  const wallTexture = useMemo(() => generateHorrorTexture('wall'), []);
  const floorTexture = useMemo(() => generateHorrorTexture('floor'), []);
  
  const falahStartPos = useMemo(() => {
      let attempts = 0;
      while (attempts < 100) {
          const x = Math.floor(Math.random() * (size - 2)) + 1;
          const z = Math.floor(Math.random() * (size - 2)) + 1;
          
          if (grid[z][x] !== 1 && (Math.abs(x - 1) + Math.abs(z - 1) > 10)) {
              return [x, z] as [number, number];
          }
          attempts++;
      }
      return [size-2, size-2] as [number, number]; 
  }, [grid, size]);

  const falahPositionRef = useRef(new Vector3(0, -100, 0));

  const npcs = useMemo(() => {
    return CHARACTERS.filter(c => c !== selectedCharacter).map(name => ({
      name,
      id: Math.random() 
    }));
  }, [selectedCharacter]);

  const exitLocked = keysCollected < keysNeeded;
  // We use a set for removed items to avoid re-renders of the whole scene when collecting ammo
  // But for now, we rely on the grid logic or specific stores. 
  // NOTE: Simple way: Weapon is unique, check `hasWeapon`. Ammo is not unique, we need to track ammo pickup locations?
  // To keep it simple in this iteration: If you pick up ammo, we remove it from grid in state? 
  // Store doesn't track grid. We'll use a simple "coords" check similar to keys for ALL items.
  // We will re-use `collectedKeyCoords` but rename it or just add ammo coords to it.
  
  return (
    <>
      <ambientLight intensity={0.15} />
      
      {Array.from({ length: 6 }).map((_, i) => (
         <pointLight 
            key={i}
            position={[Math.random() * size * CELL_SIZE, 3.5, Math.random() * size * CELL_SIZE]} 
            intensity={0.8} 
            color="#ffcc88"
            distance={15}
            decay={1.5}
         />
      ))}

      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[size*CELL_SIZE/2, 0, size*CELL_SIZE/2]}>
            <planeGeometry args={[size * CELL_SIZE, size * CELL_SIZE]} />
            <meshStandardMaterial map={floorTexture} roughness={0.9} color="#888" />
        </mesh>
        
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[size*CELL_SIZE/2, 4, size*CELL_SIZE/2]}>
            <planeGeometry args={[size * CELL_SIZE, size * CELL_SIZE]} />
            <meshStandardMaterial color="#1a1a1a" roughness={1} />
        </mesh>

        {grid.map((row, z) => 
          row.map((cell, x) => {
            const coordKey = `${x}-${z}`;
            
            if (cell === 1) {
              return (
                <mesh key={`wall-${x}-${z}`} position={[x * CELL_SIZE, 2, z * CELL_SIZE]}>
                  <boxGeometry args={[CELL_SIZE, 4, CELL_SIZE]} />
                  <meshStandardMaterial map={wallTexture} roughness={0.8} />
                </mesh>
              );
            }
            if (cell === 3) {
              return (
                <group key={`exit-${x}-${z}`} position={[x * CELL_SIZE, 1.5, z * CELL_SIZE]}>
                  <mesh>
                    <boxGeometry args={[3, 4, 0.2]} />
                    <meshStandardMaterial 
                        color={exitLocked ? "#ff0000" : "#00ff00"} 
                        emissive={exitLocked ? "#440000" : "#004400"} 
                        emissiveIntensity={0.5} 
                    />
                  </mesh>
                  <Text 
                    position={[0, 1, 0.2]} 
                    fontSize={1.5} 
                    color={exitLocked ? "red" : "white"}
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.1}
                    outlineColor="black"
                  >
                    {exitLocked ? "LOCKED" : "مخرج"}
                  </Text>
                  {exitLocked && (
                      <Text position={[0, -0.5, 0.2]} fontSize={0.6} color="red">
                          NEED KEYS
                      </Text>
                  )}
                  <pointLight distance={6} color={exitLocked ? "red" : "#00ff00"} intensity={1} />
                </group>
              )
            }
            // Key
            if (cell === 4 && !collectedKeyCoords.includes(coordKey)) {
                return <KeyObject key={`key-${x}-${z}`} position={[x * CELL_SIZE, 1.5, z * CELL_SIZE]} />
            }
            // Weapon
            if (cell === 5 && !hasWeapon) {
                 return <WeaponObject key={`wep-${x}-${z}`} position={[x * CELL_SIZE, 0.5, z * CELL_SIZE]} />
            }
            // Ammo
            if (cell === 6 && !collectedKeyCoords.includes(coordKey)) {
                 return <AmmoObject key={`ammo-${x}-${z}`} position={[x * CELL_SIZE, 0.5, z * CELL_SIZE]} />
            }
            return null;
          })
        )}
      </group>

      <group key={level}>
        <Player grid={grid} startPos={startPos} falahPositionRef={falahPositionRef} />
        <Falah grid={grid} playerPos={null as any} startNode={falahStartPos} falahPositionRef={falahPositionRef} />
        {npcs.map(npc => (
          <NPC key={npc.id} name={npc.name} grid={grid} falahPositionRef={falahPositionRef} />
        ))}
      </group>
      
      <fog attach="fog" args={['#050500', 2, 18]} />
    </>
  );
};

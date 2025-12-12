import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Group } from 'three';
import { CELL_SIZE } from './MazeGenerator';
import { Html } from '@react-three/drei';
import { useGameStore } from '../store';

interface NPCProps {
  name: string;
  grid: number[][];
  falahPositionRef: React.MutableRefObject<Vector3>;
}

export const NPC: React.FC<NPCProps> = ({ name, grid, falahPositionRef }) => {
  const groupRef = useRef<Group>(null);
  const [message, setMessage] = useState<string>('');
  const { camera } = useThree();
  const { killCharacter, deadCharacters } = useGameStore();
  
  const isDead = useMemo(() => deadCharacters.includes(name), [deadCharacters, name]);

  // Spawn in random valid location
  const [position] = useState(() => {
    let x, z;
    // Retry limit to prevent infinite loops
    for(let i=0; i<50; i++) {
      x = Math.floor(Math.random() * grid[0].length);
      z = Math.floor(Math.random() * grid.length);
      if(grid[z][x] === 0) break;
    }
    return new Vector3(x * CELL_SIZE, 0, z * CELL_SIZE);
  });

  const [target, setTarget] = useState<Vector3 | null>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // If dead, lie down and stop moving
    if (isDead) {
        groupRef.current.rotation.x = -Math.PI / 2;
        groupRef.current.position.y = 0.3;
        return;
    }

    // Check distance to Falah (Death Check)
    if (falahPositionRef.current.distanceTo(groupRef.current.position) < 1.5) {
        killCharacter(name);
        setMessage("آاااه!!!");
        return;
    }
    
    // Wander Logic
    if (!target) {
        // Pick random nearby point
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 5;
        const tx = groupRef.current.position.x + Math.cos(angle) * dist;
        const tz = groupRef.current.position.z + Math.sin(angle) * dist;
        
        // Simple bounds/wall check before setting target would be better, 
        // but for now we let them bump into walls or just walk through slightly as ghost/AI 
        // (NPCs walking through walls is acceptable for non-hostile AI in simple games, or we can add collision)
        setTarget(new Vector3(tx, 0, tz));
    } else {
        const dir = new Vector3().subVectors(target, groupRef.current.position);
        if (dir.length() < 0.2) {
            setTarget(null); // Reached
        } else {
            dir.normalize();
            // Move
            groupRef.current.position.add(dir.multiplyScalar(1.5 * delta));
            groupRef.current.lookAt(target.x, 0, target.z);
        }
    }

    // Interaction with Player
    const distToPlayer = groupRef.current.position.distanceTo(camera.position);
    if (distToPlayer < 3) {
      if (distToPlayer < 1.5 && message === '') {
        const helpful = Math.random() > 0.5;
        setMessage(helpful ? "الطريق من هناك!" : "هو خلفي!! أهرب!!");
        setTimeout(() => setMessage(''), 3000);
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.3, 1.8]} />
        <meshStandardMaterial color={isDead ? "#800000" : "#444"} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.25]} />
        <meshStandardMaterial color={isDead ? "#800000" : "#dcb"} />
      </mesh>
      
      {!isDead && (
        <Html position={[0, 2.2, 0]} center distanceFactor={10}>
          <div className="bg-black/50 text-white px-2 py-1 text-xs rounded whitespace-nowrap">
            {name}
          </div>
          {message && (
            <div className="text-yellow-400 font-bold text-sm mt-1 animate-bounce text-center">
              {message}
            </div>
          )}
        </Html>
      )}
    </group>
  );
};
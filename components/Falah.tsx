
import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Group, Quaternion, Matrix4 } from 'three';
import { useGameStore } from '../store';
import { CELL_SIZE } from './MazeGenerator';
import { Text, Billboard } from '@react-three/drei';

interface FalahProps {
  playerPos: Vector3; 
  grid: number[][];
  startNode: [number, number];
  falahPositionRef: React.MutableRefObject<Vector3>;
}

// A* Node structure
interface Node {
  x: number;
  z: number;
  f: number;
  g: number;
  h: number;
  parent: Node | null;
}

export const Falah: React.FC<FalahProps> = ({ grid, startNode, falahPositionRef }) => {
  const groupRef = useRef<Group>(null);
  
  // Limbs Refs for animation
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);

  const { camera } = useThree();
  const { caughtByFalah, stats, gameState, falahStunnedUntil, falahRageMultiplier, activeBoss } = useGameStore();
  
  // Speed Calculation
  const baseSpeed = activeBoss === 'SAIF' ? 5.5 : 4.2; 
  const levelSpeed = baseSpeed + (stats.level * 0.7);
  const speed = levelSpeed * falahRageMultiplier;
  
  const [position] = useState(() => new Vector3(startNode[0] * CELL_SIZE, 1, startNode[1] * CELL_SIZE));
  
  // Pathfinding state
  const pathRef = useRef<Vector3[]>([]);
  const lastPathUpdateTime = useRef(0);
  const currentTargetIndex = useRef(0);
  const isMoving = useRef(false);

  const shoutTimer = useRef(5.0); 

  // Speech
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const scream = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const text = activeBoss === 'SAIF' ? "أنا كابوسك!!" : "محد يغيب!!";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA'; 
    utterance.pitch = activeBoss === 'SAIF' ? 0.01 : 0.2; 
    utterance.rate = activeBoss === 'SAIF' ? 1.2 : 0.8; 
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.includes('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;

    window.speechSynthesis.speak(utterance);
  };

  const findPath = (start: {x: number, z: number}, target: {x: number, z: number}) => {
    // Basic A* (Simplified)
    const openList: Node[] = [];
    const closedList: boolean[][] = Array(grid.length).fill(false).map(() => Array(grid[0].length).fill(false));
    const startNode: Node = { x: start.x, z: start.z, f: 0, g: 0, h: 0, parent: null };
    openList.push(startNode);

    while (openList.length > 0) {
      let lowestIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[lowestIndex].f) lowestIndex = i;
      }
      const currentNode = openList[lowestIndex];

      if (currentNode.x === target.x && currentNode.z === target.z) {
        const path: Vector3[] = [];
        let curr: Node | null = currentNode;
        while (curr) {
          path.push(new Vector3(curr.x * CELL_SIZE, 1, curr.z * CELL_SIZE));
          curr = curr.parent;
        }
        return path.reverse();
      }

      openList.splice(lowestIndex, 1);
      closedList[currentNode.z][currentNode.x] = true;

      const neighbors = [{ x: 0, z: 1 }, { x: 0, z: -1 }, { x: 1, z: 0 }, { x: -1, z: 0 }];
      for (const offset of neighbors) {
        const neighborX = currentNode.x + offset.x;
        const neighborZ = currentNode.z + offset.z;
        if (neighborX >= 0 && neighborX < grid[0].length && neighborZ >= 0 && neighborZ < grid.length && grid[neighborZ][neighborX] !== 1 && !closedList[neighborZ][neighborX]) {
          const gScore = currentNode.g + 1;
          let neighborNode = openList.find(n => n.x === neighborX && n.z === neighborZ);
          if (!neighborNode) {
            neighborNode = { x: neighborX, z: neighborZ, f: 0, g: gScore, h: Math.abs(neighborX - target.x) + Math.abs(neighborZ - target.z), parent: currentNode };
            neighborNode.f = neighborNode.g + neighborNode.h;
            openList.push(neighborNode);
          } else if (gScore < neighborNode.g) {
            neighborNode.g = gScore;
            neighborNode.f = neighborNode.g + neighborNode.h;
            neighborNode.parent = currentNode;
          }
        }
      }
    }
    return []; 
  };

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // --- ANIMATION LOGIC (Walk Cycle) ---
    const t = state.clock.elapsedTime * (activeBoss === 'SAIF' ? 15 : 10); // Run speed
    if (isMoving.current && activeBoss !== 'TRANSFORMING' && Date.now() > falahStunnedUntil) {
        // Swing Arms
        if(leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t) * 0.6;
        if(rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t) * 0.6;
        
        // Swing Legs
        if(leftLegRef.current) leftLegRef.current.rotation.x = -Math.sin(t) * 0.6;
        if(rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t) * 0.6;

        // Head bob
        if(headRef.current) headRef.current.position.y = 1.6 + Math.abs(Math.sin(t*2)) * 0.05;
    } else {
        // Reset pose
        if(leftArmRef.current) leftArmRef.current.rotation.x = 0;
        if(rightArmRef.current) rightArmRef.current.rotation.x = 0;
        if(leftLegRef.current) leftLegRef.current.rotation.x = 0;
        if(rightLegRef.current) rightLegRef.current.rotation.x = 0;
    }

    // --- TRANSFORMATION STATE (Falah Dead) ---
    if (activeBoss === 'TRANSFORMING') {
        // Fall over logic
        const targetRotX = -Math.PI / 2;
        if (groupRef.current.rotation.x > targetRotX) {
            groupRef.current.rotation.x -= 3 * delta;
        }
        groupRef.current.position.y = Math.max(0.5, groupRef.current.position.y - 2 * delta);
        
        // Shake
        groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 50) * 0.1;
        return;
    }

    // --- STUNNED STATE ---
    if (Date.now() < falahStunnedUntil) {
        groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.2;
        return;
    }

    // --- STRUGGLE STATE ---
    if (gameState === 'STRUGGLE') {
        const camPos = camera.position.clone();
        const camDir = new Vector3();
        camera.getWorldDirection(camDir);
        
        const holdPos = camPos.add(camDir.multiplyScalar(1.2));
        holdPos.y = 0.5; // Adjusted height for model

        groupRef.current.position.copy(holdPos);
        groupRef.current.lookAt(camera.position.x, 0.5, camera.position.z);
        groupRef.current.position.x += (Math.random() - 0.5) * 0.1;
        groupRef.current.position.y += (Math.random() - 0.5) * 0.1;
        
        // Arms up in struggle
        if(leftArmRef.current) leftArmRef.current.rotation.x = -1.5;
        if(rightArmRef.current) rightArmRef.current.rotation.x = -1.5;
        return;
    }

    const currentPos = groupRef.current.position;
    const playerPos = camera.position;
    const dist = currentPos.distanceTo(playerPos);

    falahPositionRef.current.copy(currentPos);

    if (dist < 15) {
        shoutTimer.current -= delta;
        if (shoutTimer.current <= 0) {
            scream();
            shoutTimer.current = Math.random() * 8 + 5; 
        }
    }

    if (dist < 1.5 && gameState === 'PLAYING') {
      if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const catchPhrase = new SpeechSynthesisUtterance("ممنوع الغياب بدون تأخير");
          catchPhrase.lang = 'ar-SA';
          catchPhrase.pitch = activeBoss === 'SAIF' ? 0.1 : 0.2;
          catchPhrase.rate = 0.8;
          const voices = window.speechSynthesis.getVoices();
          const arabicVoice = voices.find(v => v.lang.includes('ar'));
          if (arabicVoice) catchPhrase.voice = arabicVoice;
          window.speechSynthesis.speak(catchPhrase);
      }
      caughtByFalah();
      return;
    }

    if (activeBoss !== 'TRANSFORMING' && activeBoss !== 'SAIF' && Date.now() > falahStunnedUntil) {
         groupRef.current.rotation.z = 0;
         groupRef.current.rotation.x = 0;
    }
    
    if (activeBoss === 'SAIF' && groupRef.current.rotation.x !== 0) {
        groupRef.current.rotation.x = 0;
        groupRef.current.position.y = 0; // Model pivot is at feet
    }

    // Pathfinding
    if (state.clock.elapsedTime - lastPathUpdateTime.current > 0.5) {
      lastPathUpdateTime.current = state.clock.elapsedTime;
      const startGrid = { x: Math.round(currentPos.x / CELL_SIZE), z: Math.round(currentPos.z / CELL_SIZE) };
      const targetGrid = { x: Math.round(playerPos.x / CELL_SIZE), z: Math.round(playerPos.z / CELL_SIZE) };
      const newPath = findPath(startGrid, targetGrid);
      if (newPath.length > 0) {
        pathRef.current = newPath;
        currentTargetIndex.current = 1; 
      }
    }

    isMoving.current = false;
    // Movement
    if (pathRef.current.length > currentTargetIndex.current) {
      const targetPoint = pathRef.current[currentTargetIndex.current];
      const direction = new Vector3().subVectors(targetPoint, currentPos);
      
      if (direction.length() > 0.1) {
        direction.normalize();
        
        const targetLook = pathRef.current[Math.min(currentTargetIndex.current + 1, pathRef.current.length - 1)];
        const dummyMatrix = new Matrix4();
        dummyMatrix.lookAt(currentPos, new Vector3(targetLook.x, currentPos.y, targetLook.z), new Vector3(0, 1, 0));
        const targetQuaternion = new Quaternion();
        targetQuaternion.setFromRotationMatrix(dummyMatrix);
        
        groupRef.current.quaternion.slerp(targetQuaternion, 5 * delta);
        currentPos.add(direction.multiplyScalar(speed * delta));
        isMoving.current = true;
      } else {
        currentTargetIndex.current++;
      }
    } else {
       const direction = new Vector3().subVectors(playerPos, currentPos).normalize();
       const nextPos = currentPos.clone().add(direction.multiplyScalar(speed * delta));
       const x = Math.floor((nextPos.x + CELL_SIZE/2) / CELL_SIZE);
       const z = Math.floor((nextPos.z + CELL_SIZE/2) / CELL_SIZE);
       
       if (grid[z]?.[x] !== 1) {
         currentPos.copy(nextPos);
         const dummyMatrix = new Matrix4();
         dummyMatrix.lookAt(currentPos, new Vector3(playerPos.x, currentPos.y, playerPos.z), new Vector3(0, 1, 0));
         const targetQuaternion = new Quaternion();
         targetQuaternion.setFromRotationMatrix(dummyMatrix);
         groupRef.current.quaternion.slerp(targetQuaternion, 5 * delta);
         isMoving.current = true;
       }
    }
  });

  const isSaif = activeBoss === 'SAIF';
  const shirtColor = isSaif ? "#111" : "#800000"; // Red for Falah, Black for Saif
  const pantsColor = isSaif ? "#000" : "#222";
  const skinColor = isSaif ? "#333" : "#dcb";
  const eyeColor = isSaif ? "#00FF00" : (Date.now() < falahStunnedUntil ? "yellow" : "red");

  // If transforming, we still render the humanoid but falling over in the loop above.
  // Visual construction of the Humanoid
  return (
    <group ref={groupRef} position={position}>
      {/* 
         Humanoid Structure 
         Height ~1.8m
         Pivot is at center bottom (feet) usually, but we'll adjust y positions relative to 0
      */}

      {/* Torso */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.5, 0.6, 0.25]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>

      {/* Head Group */}
      <group ref={headRef} position={[0, 1.6, 0]}>
         {/* Head Mesh */}
         <mesh position={[0, 0, 0]}>
             <boxGeometry args={[0.3, 0.35, 0.3]} />
             <meshStandardMaterial color={skinColor} />
         </mesh>
         {/* Eyes */}
         <mesh position={[0.08, 0.05, 0.155]}>
             <boxGeometry args={[0.05, 0.05, 0.01]} />
             <meshBasicMaterial color={eyeColor} />
         </mesh>
         <mesh position={[-0.08, 0.05, 0.155]}>
             <boxGeometry args={[0.05, 0.05, 0.01]} />
             <meshBasicMaterial color={eyeColor} />
         </mesh>
         {/* Hair/Hat */}
         <mesh position={[0, 0.18, 0]}>
             <boxGeometry args={[0.32, 0.05, 0.32]} />
             <meshStandardMaterial color="#111" />
         </mesh>
      </group>

      {/* Left Arm Pivot (Shoulder) */}
      <group ref={leftArmRef} position={[0.35, 1.35, 0]}>
         <mesh position={[0, -0.35, 0]}>
            <boxGeometry args={[0.15, 0.7, 0.15]} />
            <meshStandardMaterial color={shirtColor} />
         </mesh>
         {/* Hand */}
         <mesh position={[0, -0.75, 0]}>
             <boxGeometry args={[0.12, 0.15, 0.12]} />
             <meshStandardMaterial color={skinColor} />
         </mesh>
      </group>

      {/* Right Arm Pivot (Shoulder) */}
      <group ref={rightArmRef} position={[-0.35, 1.35, 0]}>
         <mesh position={[0, -0.35, 0]}>
            <boxGeometry args={[0.15, 0.7, 0.15]} />
            <meshStandardMaterial color={shirtColor} />
         </mesh>
         {/* Hand */}
         <mesh position={[0, -0.75, 0]}>
             <boxGeometry args={[0.12, 0.15, 0.12]} />
             <meshStandardMaterial color={skinColor} />
         </mesh>
      </group>

      {/* Left Leg Pivot (Hip) */}
      <group ref={leftLegRef} position={[0.15, 0.8, 0]}>
         <mesh position={[0, -0.4, 0]}>
             <boxGeometry args={[0.18, 0.8, 0.18]} />
             <meshStandardMaterial color={pantsColor} />
         </mesh>
      </group>

      {/* Right Leg Pivot (Hip) */}
      <group ref={rightLegRef} position={[-0.15, 0.8, 0]}>
         <mesh position={[0, -0.4, 0]}>
             <boxGeometry args={[0.18, 0.8, 0.18]} />
             <meshStandardMaterial color={pantsColor} />
         </mesh>
      </group>
      
      {/* Aura */}
      <pointLight position={[0, 1.5, 0]} distance={6} decay={2} color={isSaif ? "purple" : "red"} intensity={2} />

      {/* Tag */}
      <Billboard position={[0, 2.2, 0]}>
        <Text
          fontSize={0.4}
          color={isSaif ? "#00FF00" : "#ff0000"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="black"
        >
          {Date.now() < falahStunnedUntil ? "..." : (isSaif ? "الأستاذ سيف" : "أستاذ فلاح")}
        </Text>
      </Billboard>
    </group>
  );
};

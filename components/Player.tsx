
import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Object3D, Raycaster } from 'three';
import { PointerLockControls, PerspectiveCamera } from '@react-three/drei';
import { useGameStore } from '../store';
import { CELL_SIZE } from './MazeGenerator';
import { CHARACTER_TRAITS } from '../types';

interface PlayerProps {
  grid: number[][];
  startPos: [number, number];
  falahPositionRef?: React.MutableRefObject<Vector3>; // Optional for shooting checks
}

export const Player: React.FC<PlayerProps> = ({ grid, startPos, falahPositionRef }) => {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const isSprinting = useRef(false);
  const batteryTimeAccumulator = useRef(0);
  
  const { 
    flashlightOn, 
    drainBattery, 
    advanceLevel, 
    battery, 
    selectedCharacter, 
    gameState,
    collectKey,
    collectWeapon,
    collectAmmo,
    shootGun,
    hitBoss,
    collectedKeyCoords,
    keysCollected,
    keysNeeded,
    addLog,
    hasWeapon
  } = useGameStore();
  
  const traits = selectedCharacter ? CHARACTER_TRAITS[selectedCharacter] : CHARACTER_TRAITS['عبدالله']; 

  const [lightTarget] = useState(() => {
    const obj = new Object3D();
    obj.position.set(0, 0, -10); 
    return obj;
  });

  // Gun visual Ref
  const gunRef = useRef<Object3D>(null);
  const recoilAnim = useRef(0);

  useLayoutEffect(() => {
    camera.position.set(startPos[0] * CELL_SIZE, 1.5, startPos[1] * CELL_SIZE);
    camera.rotation.set(0, 0, 0);
  }, [startPos, camera]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (useGameStore.getState().gameState === 'STRUGGLE') return;

      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward.current = true; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft.current = true; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward.current = true; break;
        case 'ArrowRight':
        case 'KeyD': moveRight.current = true; break;
        case 'ShiftLeft': isSprinting.current = true; break;
        case 'KeyF': useGameStore.getState().toggleFlashlight(); break;
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward.current = false; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft.current = false; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward.current = false; break;
        case 'ArrowRight':
        case 'KeyD': moveRight.current = false; break;
        case 'ShiftLeft': isSprinting.current = false; break;
      }
    };
    const handleMouseDown = (event: MouseEvent) => {
         if (useGameStore.getState().gameState !== 'PLAYING') return;
         if (event.button === 0) { // Left Click
             const didShoot = shootGun();
             if (didShoot) {
                 recoilAnim.current = 0.2; // Trigger recoil
                 
                 // Raycast Logic
                 if (falahPositionRef) {
                     const raycaster = new Raycaster();
                     raycaster.setFromCamera({ x: 0, y: 0 }, camera);
                     
                     // We manually check distance to Falah sphere instead of full mesh raycast for performance
                     // Ray direction
                     const rayDir = new Vector3();
                     raycaster.ray.direction.clone(rayDir);
                     
                     // Vector from camera to Falah
                     const toFalah = new Vector3().subVectors(falahPositionRef.current, camera.position);
                     const dist = toFalah.length();
                     
                     // Project toFalah onto camera direction
                     const dot = toFalah.dot(camera.getWorldDirection(new Vector3()));
                     
                     // If boss is in front (dot > 0) and angle is small enough
                     // Simplified: Check if falah is close to the ray line
                     // Distance from point to line formula-ish
                     // Or just check angle
                     const angle = toFalah.angleTo(camera.getWorldDirection(new Vector3()));
                     
                     // If within 15 degrees and visible distance
                     if (dist < 20 && Math.abs(angle) < 0.3) {
                         hitBoss();
                     }
                 }
             }
         }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [shootGun, hitBoss, camera, falahPositionRef]);

  const checkCollision = (nextPos: Vector3) => {
    const checkX = Math.floor((nextPos.x + CELL_SIZE/2) / CELL_SIZE);
    const checkZ = Math.floor((nextPos.z + CELL_SIZE/2) / CELL_SIZE);
    
    if (checkZ < 0 || checkX < 0 || checkZ >= grid.length || checkX >= grid[0].length) return true;

    const cell = grid[checkZ][checkX];

    // Wall
    if (cell === 1) return true;

    // Collectibles logic
    const coordKey = `${checkX}-${checkZ}`;
    
    // Key (4)
    if (cell === 4) {
        if (!collectedKeyCoords.includes(coordKey)) {
            collectKey(coordKey);
        }
    }
    // Weapon (5)
    if (cell === 5) {
        collectWeapon();
    }
    // Ammo (6)
    if (cell === 6) {
        if (!collectedKeyCoords.includes(coordKey)) {
            collectKey(coordKey); // Reuse logic to mark as collected in the array
            collectAmmo();
        }
    }

    // Exit (3)
    if (cell === 3) {
      if (keysCollected >= keysNeeded) {
          advanceLevel();
          return true; 
      } else {
          if (Math.random() > 0.95) { 
              addLog(`🔒 مغلق! تحتاج ${keysNeeded - keysCollected} مفاتيح إضافية`);
          }
          return true; 
      }
    }

    return false;
  };

  useFrame((state, delta) => {
    if (gameState === 'STRUGGLE') {
        moveForward.current = false;
        moveBackward.current = false;
        moveLeft.current = false;
        moveRight.current = false;
        return;
    }

    // Gun Recoil Animation
    if (gunRef.current) {
        if (recoilAnim.current > 0) {
            gunRef.current.rotation.x = -recoilAnim.current;
            gunRef.current.position.z = 0.1;
            recoilAnim.current = Math.max(0, recoilAnim.current - delta * 2);
        } else {
             // Sway
             gunRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.05;
             gunRef.current.position.z = 0;
        }
    }

    if (flashlightOn) {
      batteryTimeAccumulator.current += delta;
      if (batteryTimeAccumulator.current >= 1) {
        drainBattery(2 * traits.battery); 
        batteryTimeAccumulator.current = 0;
      }
    }

    const baseWalkSpeed = 3.5 * traits.speed;
    const baseSprintSpeed = 6.0 * traits.speed;
    const speed = isSprinting.current ? baseSprintSpeed : baseWalkSpeed;
    
    const velocity = new Vector3();
    const direction = new Vector3();

    const frontVector = new Vector3(0, 0, 0);
    const sideVector = new Vector3(0, 0, 0);
    
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    if (moveForward.current) frontVector.add(direction);
    if (moveBackward.current) frontVector.add(direction.clone().negate());
    
    const sideDirection = new Vector3(-direction.z, 0, direction.x);
    
    if (moveRight.current) sideVector.add(sideDirection);
    if (moveLeft.current) sideVector.add(sideDirection.clone().negate());

    if (frontVector.length() > 0 || sideVector.length() > 0) {
      velocity.add(frontVector).add(sideVector);
      velocity.normalize().multiplyScalar(speed * delta);

      const nextPosX = camera.position.clone().add(new Vector3(velocity.x, 0, 0));
      if (!checkCollision(nextPosX)) {
        camera.position.x = nextPosX.x;
      }
      
      const nextPosZ = camera.position.clone().add(new Vector3(0, 0, velocity.z));
      if (!checkCollision(nextPosZ)) {
        camera.position.z = nextPosZ.z;
      }
    }
  });

  return (
    <>
      <PointerLockControls />
      <PerspectiveCamera makeDefault near={0.1} far={50} fov={75}>
        <primitive object={lightTarget} />
        {flashlightOn && (
          <spotLight
            position={[0.2, -0.3, 0]} 
            target={lightTarget}
            angle={0.5}
            penumbra={0.3}
            intensity={battery > 20 ? 5 : (Math.random() > 0.8 ? 0 : 0.8)}
            castShadow
            distance={40}
            color="#ffeedd"
            decay={1.5}
          />
        )}
        
        {/* Render Weapon in Hand */}
        {hasWeapon && (
            <group position={[0.4, -0.5, -0.8]} rotation={[0, -0.2, 0]} ref={gunRef}>
                <mesh>
                    <boxGeometry args={[0.1, 0.2, 0.6]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
                <mesh position={[0, 0.1, 0]}>
                    <boxGeometry args={[0.08, 0.05, 0.61]} />
                    <meshStandardMaterial color="#666" metalness={0.8} />
                </mesh>
            </group>
        )}
      </PerspectiveCamera>
    </>
  );
};

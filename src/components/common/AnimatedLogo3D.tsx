'use client';

import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 3D Animated DNA Helix Logo
 * Represents growth, learning, and transformation
 */
function DNAHelix() {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(0);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Rotate the entire helix
      groupRef.current.rotation.y += delta * 0.5;
      time.current += delta;
      
      // Animate individual spheres in a wave pattern
      groupRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) {
          child.position.y = Math.sin(time.current * 2 + index * 0.5) * 0.1;
        }
      });
    }
  });

  // Create DNA helix structure
  const spheres: Array<{ x: number; y: number; z: number; color: string }> = [];
  const helixRadius = 0.5;
  const helixHeight = 2;
  const segments = 20;

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 4; // 2 full rotations
    const y = (i / segments) * helixHeight - helixHeight / 2;
    
    // First strand
    const x1 = Math.cos(angle) * helixRadius;
    const z1 = Math.sin(angle) * helixRadius;
    
    // Second strand (opposite side)
    const x2 = Math.cos(angle + Math.PI) * helixRadius;
    const z2 = Math.sin(angle + Math.PI) * helixRadius;
    
    spheres.push({ x: x1, y, z: z1, color: '#8b5cf6' }); // Purple
    spheres.push({ x: x2, y, z: z2, color: '#3b82f6' }); // Blue
  }

  return (
    <group ref={groupRef}>
      {spheres.map((sphere, index) => (
        <mesh key={index} position={[sphere.x, sphere.y, sphere.z]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial 
            color={sphere.color} 
            emissive={sphere.color}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
      
      {/* Connecting lines */}
      {spheres.map((sphere, index) => {
        if (index % 2 === 0 && index + 1 < spheres.length) {
          const nextSphere = spheres[index + 1];
          return (
            <mesh key={`line-${index}`}>
              <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
              <meshStandardMaterial color="#6366f1" />
            </mesh>
          );
        }
        return null;
      })}
    </group>
  );
}

/**
 * 3D Nurse Cap (Alternative design)
 */
function NurseCap() {
  const capRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (capRef.current) {
      capRef.current.rotation.y += delta * 0.5;
      capRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={capRef}>
      {/* Base of the cap */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.8, 0.6, 0.2, 32]} />
        <meshStandardMaterial 
          color="#ffffff" 
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {/* Top of the cap */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.1, 32]} />
        <meshStandardMaterial 
          color="#ffffff"
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {/* Red cross */}
      <mesh position={[0, 0.25, 0.001]}>
        <boxGeometry args={[0.3, 0.1, 0.05]} />
        <meshStandardMaterial 
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 0.25, 0.001]}>
        <boxGeometry args={[0.1, 0.3, 0.05]} />
        <meshStandardMaterial 
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

/**
 * Spinning Book (Knowledge symbol)
 */
function SpinningBook() {
  const bookRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (bookRef.current) {
      bookRef.current.rotation.y += delta * 0.8;
      bookRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={bookRef}>
      {/* Book cover */}
      <mesh>
        <boxGeometry args={[1, 1.4, 0.2]} />
        <meshStandardMaterial 
          color="#6366f1"
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      
      {/* Book pages */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[0.95, 1.35, 0.15]} />
        <meshStandardMaterial 
          color="#f3f4f6"
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      
      {/* Medical cross on cover */}
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[0.3, 0.1, 0.02]} />
        <meshStandardMaterial 
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[0.1, 0.3, 0.02]} />
        <meshStandardMaterial 
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

interface AnimatedLogo3DProps {
  type?: 'dna' | 'cap' | 'book';
  width?: number;
  height?: number;
  autoRotate?: boolean;
}

export default function AnimatedLogo3D({
  type = 'dna',
  width = 300,
  height = 300,
  autoRotate = true,
}: AnimatedLogo3DProps) {
  return (
    <div style={{ width, height }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
        <spotLight 
          position={[0, 5, 0]} 
          intensity={0.8} 
          angle={0.6}
          penumbra={1}
          castShadow
        />
        
        {/* 3D Model */}
        <Suspense fallback={null}>
          {type === 'dna' && <DNAHelix />}
          {type === 'cap' && <NurseCap />}
          {type === 'book' && <SpinningBook />}
        </Suspense>
        
        {/* Camera controls */}
        {autoRotate && (
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={2}
          />
        )}
      </Canvas>
    </div>
  );
}

/**
 * Fallback component for non-WebGL browsers
 */
export function AnimatedLogo2D({ type = 'dna' }: { type?: 'dna' | 'cap' | 'book' }) {
  const getIcon = () => {
    switch (type) {
      case 'dna':
        return '🧬';
      case 'cap':
        return '👨‍⚕️';
      case 'book':
        return '📚';
      default:
        return '🎓';
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
      <div className="text-6xl animate-bounce">{getIcon()}</div>
    </div>
  );
}


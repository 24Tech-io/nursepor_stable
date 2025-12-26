'use client';

// Temporarily disabled due to missing dependencies
// TODO: Install @react-three/fiber @react-three/drei three or remove this component
// The original component required 3D libraries that aren't installed

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
    <div
      style={{ width, height }}
      className="flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg"
    >
      <div className="text-6xl animate-bounce">{getIcon()}</div>
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

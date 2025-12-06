import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  variant?: 'default' | 'compact' | 'icon-only';
  showText?: boolean;
  className?: string;
  href?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({
  variant = 'default',
  showText = true,
  className = '',
  href,
  size = 'md',
}: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  // Check if className indicates dark background (contains 'text-white' or similar dark indicators)
  const isDarkBackground = 
    className.includes('text-white') || 
    className.includes('dark') ||
    (className.includes('bg-') && (className.includes('slate-900') || className.includes('gray-900')));

  // Text color: white on dark backgrounds, gradient on light backgrounds
  const textColorClass = isDarkBackground
    ? 'text-white'
    : 'bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 bg-clip-text text-transparent';

  const logoContent = (
    <div className={`flex items-center ${className}`}>
      {/* Logo Image */}
      <div className={`${sizeClasses[size]} flex-shrink-0 relative`}>
        <Image
          src="/logo.png"
          alt="Nurse Pro Academy"
          width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
          height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {/* Text with appropriate color */}
      {showText && variant !== 'icon-only' && (
        <span
          className={`ml-3 font-bold ${textSizeClasses[size]} ${textColorClass}`}
        >
          Nurse Pro Academy
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}


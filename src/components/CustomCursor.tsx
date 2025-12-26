'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip on touch devices
    if ('ontouchstart' in window) return;

    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    let mouseX = -100;
    let mouseY = -100;
    let outerX = -100;
    let outerY = -100;

    // Smooth animation loop for outer ring (slight delay for effect)
    const animate = () => {
      outerX += (mouseX - outerX) * 0.15;
      outerY += (mouseY - outerY) * 0.15;
      outer.style.left = `${outerX}px`;
      outer.style.top = `${outerY}px`;
      requestAnimationFrame(animate);
    };
    animate();

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Inner dot follows instantly
      inner.style.left = `${e.clientX}px`;
      inner.style.top = `${e.clientY}px`;

      // Check if hovering over clickable
      const target = e.target as HTMLElement;
      const isClickable = 
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.getAttribute('role') === 'button';
      
      if (isClickable) {
        outer.style.width = '40px';
        outer.style.height = '40px';
        outer.style.background = 'rgba(227, 28, 37, 0.1)';
        inner.style.boxShadow = '0 0 10px rgba(227, 28, 37, 0.8)';
      } else {
        outer.style.width = '30px';
        outer.style.height = '30px';
        outer.style.background = 'transparent';
        inner.style.boxShadow = 'none';
      }
    };

    const handleMouseDown = () => {
      outer.style.transform = 'translate(-50%, -50%) scale(0.8)';
      inner.style.width = '8px';
      inner.style.height = '8px';
    };

    const handleMouseUp = () => {
      outer.style.transform = 'translate(-50%, -50%) scale(1)';
      inner.style.width = '6px';
      inner.style.height = '6px';
    };

    const handleMouseLeave = () => {
      mouseX = -100;
      mouseY = -100;
      inner.style.left = '-100px';
      inner.style.top = '-100px';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Hide on touch devices
  if (typeof window !== 'undefined' && 'ontouchstart' in window) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        * { cursor: none !important; }
      `}</style>

      {/* Outer ring - smooth follow */}
      <div
        ref={outerRef}
        className="pointer-events-none fixed z-[9999] rounded-full"
        style={{
          width: 30,
          height: 30,
          border: '2px solid rgba(227, 28, 37, 0.6)',
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.15s, height 0.15s, background 0.15s, transform 0.1s',
          left: -100,
          top: -100,
        }}
      />

      {/* Inner dot - instant */}
      <div
        ref={innerRef}
        className="pointer-events-none fixed z-[10000] rounded-full"
        style={{
          width: 6,
          height: 6,
          background: '#E31C25',
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.1s, height 0.1s, box-shadow 0.15s',
          left: -100,
          top: -100,
        }}
      />
    </>
  );
}










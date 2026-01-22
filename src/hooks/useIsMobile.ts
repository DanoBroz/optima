import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768; // matches Tailwind's md: breakpoint

/**
 * Returns true when viewport is below the mobile breakpoint (768px).
 * Matches Tailwind's md: responsive behavior for consistent UX.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

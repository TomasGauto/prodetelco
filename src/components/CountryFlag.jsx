import { useState } from 'react';

const SIZE = {
  xs: { wrap: 'h-6 w-6',   img: '24px'  },
  sm: { wrap: 'h-8 w-8',   img: '32px'  },
  md: { wrap: 'h-10 w-10', img: '40px'  },
  lg: { wrap: 'h-12 w-12', img: '48px'  },
  xl: { wrap: 'h-16 w-16', img: '64px'  },
};

/**
 * CountryFlag — Renderiza bandera de país con múltiples fallbacks.
 * 
 * Fallback order:
 * 1. Twemoji CDN (PNG 72x72)
 * 2. Flag Icons CSS (SVG via CDN)
 * 3. Unicode emoji flag (universal)
 * 
 * Props:
 *   - countryCode: ISO2 string (e.g. 'AR', 'US', 'ES')
 *   - size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default: 'sm')
 *   - showCode: boolean — mostrar código después de la bandera (default: false)
 */
const CountryFlag = ({ countryCode, size = 'sm', showCode = false }) => {
  const [fallback, setFallback] = useState(0); // 0: Twemoji, 1: Flag Icons, 2: Unicode

  if (!countryCode || typeof countryCode !== 'string') {
    return null;
  }

  const cc = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) {
    return null;
  }

  const s = SIZE[size] || SIZE.sm;

  // Convert ISO2 to Unicode flag emoji
  const toUnicodeFlag = (code) => {
    const first = 0x1F1E6 + (code.charCodeAt(0) - 65);
    const second = 0x1F1E6 + (code.charCodeAt(1) - 65);
    return String.fromCodePoint(first, second);
  };

  // Convert ISO2 to Twemoji CDN URL
  const toTwemojiUrl = (code) => {
    const first = 0x1F1E6 + (code.charCodeAt(0) - 65);
    const second = 0x1F1E6 + (code.charCodeAt(1) - 65);
    const hex = [first, second].map(n => n.toString(16)).join('-');
    return `https://twemoji.maxcdn.com/v/latest/72x72/${hex}.png`;
  };

  // Convert ISO2 to Flag Icons CSS CDN URL (SVG)
  const toFlagIconsUrl = (code) => {
    return `https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/${code.toLowerCase()}.svg`;
  };

  const handleTwemojiError = () => setFallback(1);
  const handleFlagIconsError = () => setFallback(2);

  if (fallback === 0) {
    // Try Twemoji
    return (
      <div
        className={`${s.wrap} flex items-center justify-center shrink-0 inline-flex`}
        title={cc}
      >
        <img
          src={toTwemojiUrl(cc)}
          alt={cc}
          onError={handleTwemojiError}
          style={{ width: s.img, height: s.img, borderRadius: '4px' }}
        />
      </div>
    );
  }

  if (fallback === 1) {
    // Try Flag Icons CSS
    return (
      <div
        className={`${s.wrap} flex items-center justify-center shrink-0 inline-flex`}
        title={cc}
      >
        <img
          src={toFlagIconsUrl(cc)}
          alt={cc}
          onError={handleFlagIconsError}
          style={{ width: s.img, height: s.img, borderRadius: '4px' }}
        />
      </div>
    );
  }

  // Fallback 2: Unicode emoji
  const flag = toUnicodeFlag(cc);
  return (
    <span
      title={cc}
      style={{ fontSize: s.img, lineHeight: 1, display: 'inline-block' }}
    >
      {flag}
    </span>
  );
};

export default CountryFlag;

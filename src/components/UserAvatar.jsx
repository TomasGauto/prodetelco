import CountryFlag from './CountryFlag';

const SIZE = {
  xs: { wrap: 'h-6 w-6',   text: 'text-xs' },
  sm: { wrap: 'h-8 w-8',   text: 'text-sm' },
  md: { wrap: 'h-10 w-10', text: 'text-base' },
  lg: { wrap: 'h-12 w-12', text: 'text-lg' },
  xl: { wrap: 'h-16 w-16', text: 'text-2xl' },
};

const UserAvatar = ({ user, userData, size = 'sm' }) => {
  const s = SIZE[size] || SIZE.sm;

  // Priority 1: Custom emoji avatar
  if (userData?.avatarEmoji) {
    return (
      <div
        className={`${s.wrap} rounded-full flex items-center justify-center shrink-0`}
        style={{ backgroundColor: userData.avatarColor || '#6366f1', lineHeight: 1 }}
      >
        <span style={{ fontSize: '1em' }}>{userData.avatarEmoji}</span>
      </div>
    );
  }

  // Priority 2: Country flag
  const country = userData?.country || user?.country;
  if (country) {
    return (
      <div className={`${s.wrap} rounded-full flex items-center justify-center shrink-0`}>
        <CountryFlag countryCode={country} size={size} />
      </div>
    );
  }

  // Fallback: Initial letter from nickname
  const initial = (userData?.nickname || '?')[0].toUpperCase();
  return (
    <div className={`${s.wrap} rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white shrink-0 ${s.text}`}>
      {initial}
    </div>
  );
};

export default UserAvatar;

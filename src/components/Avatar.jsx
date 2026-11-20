export default function Avatar({ name, url, size = 'w-10 h-10', className = '' }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ? `Avatar ${name}` : 'Avatar'}
        className={`${size} rounded-full object-cover border-2 border-gold ${className}`}
      />
    );
  }
  return (
    <div className={`${size} bg-gold rounded-full flex items-center justify-center text-obsidian font-bold ${className}`}>
      {name?.[0]?.toUpperCase() || 'U'}
    </div>
  );
}

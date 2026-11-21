import { CHESS_SKINS } from '../lib/chessSkins';

function toHex(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function Cross({ fill }) {
  return (
    <g fill={fill}>
      <rect x="46" y="10" width="8" height="26" />
      <rect x="37" y="18" width="26" height="8" />
    </g>
  );
}

function Crown({ fill, dark }) {
  return (
    <g>
      <path d="M29 35V19l11 8 10-14 10 14 11-8v16H29Z" fill={fill} stroke={dark} strokeWidth="3" />
      <rect x="29" y="34" width="42" height="8" fill={dark} />
      <rect x="35" y="27" width="8" height="8" fill={dark} />
      <rect x="57" y="27" width="8" height="8" fill={dark} />
    </g>
  );
}

function PieceMark({ type, fill, dark }) {
  if (type === 'k') return <Cross fill={fill} />;
  if (type === 'q') return <Crown fill={fill} dark={dark} />;
  if (type === 'r') {
    return (
      <g fill={fill} stroke={dark} strokeWidth="3">
        <path d="M28 18h10v10h8V18h12v10h8V18h8v22H28Z" />
        <rect x="34" y="39" width="32" height="7" />
      </g>
    );
  }
  if (type === 'b') {
    return (
      <g>
        <path d="M50 11c-12 8-18 18-14 29 3 7 8 10 14 12 6-2 11-5 14-12 4-11-2-21-14-29Z" fill={fill} stroke={dark} strokeWidth="3" />
        <path d="m43 18 14 27" stroke={dark} strokeWidth="5" />
      </g>
    );
  }
  if (type === 'n') {
    return (
      <g fill={fill} stroke={dark} strokeWidth="3" strokeLinejoin="miter">
        <path d="M31 44V31l8-6-4-10 13 4 9-7 8 10 9 6-7 6-3 10Z" />
        <rect x="54" y="20" width="6" height="6" fill={dark} stroke="none" />
        <path d="M39 29h17" fill="none" />
      </g>
    );
  }
  return <circle cx="50" cy="27" r="13" fill={fill} stroke={dark} strokeWidth="3" />;
}

function SkinDetail({ skin, fill, dark }) {
  if (skin === 'block') {
    return <g fill={fill}><rect x="32" y="66" width="8" height="8" /><rect x="60" y="66" width="8" height="8" /></g>;
  }
  if (skin === 'voxel') {
    return <path d="m42 70 8-7 8 7-8 7Z" fill={fill} stroke={dark} strokeWidth="2" />;
  }
  if (skin === 'neon') {
    return <g fill="none" stroke={fill} strokeWidth="3"><path d="M31 70h38" /><path d="M36 76h28" /></g>;
  }
  if (skin === 'anime') {
    return <g fill="none" stroke={fill} strokeWidth="2"><path d="M29 61h14l5-5h8l5 5h10" /><path d="M35 73h8l5-5h8l8 5" /><circle cx="50" cy="67" r="3" fill={fill} stroke="none" /></g>;
  }
  return null;
}

export default function ChessPiece2D({ type, color, skin = 'holy' }) {
  const skinSet = CHESS_SKINS[skin] || CHESS_SKINS.holy;
  const rawPalette = color === 'w' ? skinSet.white : skinSet.black;
  const palette = Object.fromEntries(Object.entries(rawPalette).map(([key, value]) => [key, toHex(value)]));
  const label = `${skinSet.label} ${color === 'w' ? 'light' : 'dark'} ${type}`;
  return (
    <svg
      viewBox="0 0 100 120"
      className={`h-[82%] w-[82%] drop-shadow-[0_3px_2px_rgba(0,0,0,.55)] sm:h-[86%] sm:w-[86%] ${skin === 'anime' && (type === 'k' || type === 'q') ? 'drop-shadow-[0_0_7px_rgba(103,232,249,.9)]' : ''}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <path d="M21 103h58v9H21z" fill={palette.edge} />
      <path d="M14 96h72v9H14z" fill={palette.shade} stroke={palette.edge} strokeWidth="3" />
      <path d="M25 86h50l8 10H17l8-10Z" fill={palette.body} stroke={palette.edge} strokeWidth="3" />
      <path d="M33 43h34l8 43H25l8-43Z" fill={palette.body} stroke={palette.edge} strokeWidth="3" />
      <path d="M37 47h10v32H37z" fill={palette.light} opacity=".55" />
      <rect x="27" y="81" width="46" height="9" fill={palette.accent} stroke={palette.accentDark} strokeWidth="3" />
      <SkinDetail skin={skin} fill={palette.accent} dark={palette.accentDark} />
      <PieceMark type={type} fill={palette.accent} dark={palette.accentDark} />
      <path d="M22 91h56v5H22z" fill={palette.shade} opacity=".75" />
    </svg>
  );
}

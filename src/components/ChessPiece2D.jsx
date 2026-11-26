import { resolveChessSkin } from '../lib/chessSkins';

function toHex(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

/** Lighten a hex colour by mixing with white */
function lighten(hex, t = 0.35) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * t);
  const lg = Math.round(g + (255 - g) * t);
  const lb = Math.round(b + (255 - b) * t);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

/** Darken a hex colour */
function darken(hex, t = 0.35) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - t));
  const dg = Math.round(g * (1 - t));
  const db = Math.round(b * (1 - t));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/* ─── Piece-top marks (highly detailed) ──────────────────────────────────── */

function King({ fill, edge, light }) {
  return (
    <g>
      {/* Cross shaft */}
      <rect x="45" y="6" width="10" height="28" rx="2" fill={fill} stroke={edge} strokeWidth="2" />
      <rect x="34" y="14" width="32" height="10" rx="2" fill={fill} stroke={edge} strokeWidth="2" />
      {/* Orb at centre of cross */}
      <circle cx="50" cy="20" r="5" fill={light} opacity="0.6" />
    </g>
  );
}

function Queen({ fill, edge, light }) {
  return (
    <g>
      {/* Crown band */}
      <path
        d="M28 42 L33 22 L40 34 L50 14 L60 34 L67 22 L72 42 Z"
        fill={fill}
        stroke={edge}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Jewels on crown tips */}
      <circle cx="50" cy="14" r="4.5" fill={light} stroke={edge} strokeWidth="1.5" />
      <circle cx="33" cy="22" r="3.5" fill={light} stroke={edge} strokeWidth="1.5" />
      <circle cx="67" cy="22" r="3.5" fill={light} stroke={edge} strokeWidth="1.5" />
      {/* Band highlight */}
      <rect x="28" y="40" width="44" height="6" rx="1" fill={darken(fill, 0.15)} stroke={edge} strokeWidth="1.5" />
    </g>
  );
}

function Rook({ fill, edge, light }) {
  return (
    <g>
      {/* Merlons (battlements) */}
      <rect x="27" y="12" width="12" height="18" rx="1.5" fill={fill} stroke={edge} strokeWidth="2" />
      <rect x="44" y="12" width="12" height="18" rx="1.5" fill={fill} stroke={edge} strokeWidth="2" />
      <rect x="61" y="12" width="12" height="18" rx="1.5" fill={fill} stroke={edge} strokeWidth="2" />
      {/* Tower body */}
      <rect x="27" y="28" width="46" height="18" rx="1" fill={fill} stroke={edge} strokeWidth="2" />
      {/* Arrow slit detail */}
      <rect x="47" y="32" width="6" height="10" rx="1" fill={darken(fill, 0.3)} />
      {/* Light glint on left merlon */}
      <rect x="29" y="14" width="4" height="10" rx="1" fill={light} opacity="0.5" />
    </g>
  );
}

function Bishop({ fill, edge, light }) {
  return (
    <g>
      {/* Mitre body */}
      <path
        d="M50 8 C38 14 30 24 32 36 C34 42 40 45 50 46 C60 45 66 42 68 36 C70 24 62 14 50 8 Z"
        fill={fill}
        stroke={edge}
        strokeWidth="2.5"
      />
      {/* Mitre cut line */}
      <line x1="40" y1="17" x2="62" y2="40" stroke={edge} strokeWidth="4" strokeLinecap="round" opacity="0.65" />
      {/* Top orb / ball */}
      <circle cx="50" cy="8" r="5" fill={fill} stroke={edge} strokeWidth="2" />
      <circle cx="50" cy="8" r="2.5" fill={light} opacity="0.7" />
      {/* Collar band */}
      <ellipse cx="50" cy="45" rx="17" ry="4" fill={darken(fill, 0.2)} stroke={edge} strokeWidth="1.5" />
    </g>
  );
}

function Knight({ fill, edge, light }) {
  return (
    <g>
      {/* Horse head – detailed silhouette */}
      <path
        d="M31 48 C31 36 36 26 44 20 C46 16 48 10 50 8
           C53 10 59 12 63 16 C67 20 68 26 65 30
           C70 32 70 38 67 42 C65 46 60 48 55 48 Z"
        fill={fill}
        stroke={edge}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Mane strands */}
      <path
        d="M50 8 C48 14 44 18 42 24"
        fill="none"
        stroke={darken(fill, 0.25)}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M53 10 C52 16 50 20 49 26"
        fill="none"
        stroke={darken(fill, 0.2)}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Eye */}
      <circle cx="61" cy="22" r="4" fill={darken(fill, 0.5)} stroke={edge} strokeWidth="1.5" />
      <circle cx="62" cy="21" r="1.5" fill={light} />
      {/* Nostril */}
      <ellipse cx="66" cy="30" rx="2.5" ry="1.5" fill={darken(fill, 0.4)} />
      {/* Neck highlight */}
      <path
        d="M35 44 C37 36 42 30 46 28"
        fill="none"
        stroke={light}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
    </g>
  );
}

function Pawn({ fill, edge, light }) {
  return (
    <g>
      {/* Head */}
      <circle cx="50" cy="22" r="14" fill={fill} stroke={edge} strokeWidth="2.5" />
      {/* Highlight on head */}
      <circle cx="45" cy="17" r="5" fill={light} opacity="0.5" />
      {/* Collar ridge */}
      <ellipse cx="50" cy="36" rx="12" ry="3.5" fill={darken(fill, 0.2)} stroke={edge} strokeWidth="1.5" />
    </g>
  );
}

/* ─── Base (shared for all pieces) ───────────────────────────────────────── */

function PieceBase({ body, shade, edge, light, accent, accentDark, uid }) {
  const gradId = `bG-${uid}`;
  const shineId = `sG-${uid}`;
  return (
    <g>
      {/* Base platform */}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={body} />
          <stop offset="100%" stopColor={shade} />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={light} stopOpacity="0.6" />
          <stop offset="40%" stopColor={light} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Bottom rim shadow */}
      <ellipse cx="50" cy="114" rx="30" ry="5" fill={darken(edge, 0.2)} opacity="0.45" />

      {/* Foot – widest slab */}
      <path
        d="M18 109 Q50 103 82 109 L78 116 Q50 118 22 116 Z"
        fill={`url(#${gradId})`}
        stroke={edge}
        strokeWidth="2"
      />

      {/* Base collar */}
      <path
        d="M22 100 Q50 94 78 100 L82 109 Q50 103 18 109 Z"
        fill={accent}
        stroke={accentDark}
        strokeWidth="1.8"
      />
      {/* Collar shine */}
      <path
        d="M22 100 Q50 94 78 100 L82 109 Q50 103 18 109 Z"
        fill={`url(#${shineId})`}
      />

      {/* Stem lower taper */}
      <path
        d="M32 90 Q50 85 68 90 L72 100 Q50 94 28 100 Z"
        fill={`url(#${gradId})`}
        stroke={edge}
        strokeWidth="1.8"
      />

      {/* Stem upper taper / waist */}
      <path
        d="M36 56 Q50 50 64 56 L68 90 Q50 85 32 90 Z"
        fill={`url(#${gradId})`}
        stroke={edge}
        strokeWidth="1.8"
      />

      {/* Stem highlight */}
      <path
        d="M37 58 Q42 53 48 55 L52 90 Q46 86 36 90 Z"
        fill={light}
        opacity="0.28"
      />
    </g>
  );
}

/* ─── Skin-specific base ornaments ───────────────────────────────────────── */

function SkinDetail({ skin, fill, dark }) {
  if (skin === 'block') {
    return (
      <g fill={fill} stroke={dark} strokeWidth="1">
        <rect x="31" y="68" width="10" height="10" rx="2" />
        <rect x="59" y="68" width="10" height="10" rx="2" />
      </g>
    );
  }
  if (skin === 'voxel') {
    return (
      <g>
        <path d="m42 73 8-8 8 8-8 8Z" fill={fill} stroke={dark} strokeWidth="1.5" />
        <path d="m42 73 8-8 8 8" fill={lighten(fill, 0.3)} />
      </g>
    );
  }
  if (skin === 'neon') {
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M28 72h44" stroke={fill} strokeWidth="3" opacity="0.9" />
        <path d="M34 78h32" stroke={fill} strokeWidth="2" opacity="0.6" />
        <path d="M28 72h44" stroke={lighten(fill, 0.6)} strokeWidth="1" opacity="0.8" />
      </g>
    );
  }
  if (skin === 'anime') {
    return (
      <g strokeLinecap="round" fill="none">
        <path d="M28 63h14l5-6h8l5 6h12" stroke={fill} strokeWidth="2.5" />
        <path d="M34 75h8l5-6h8l9 6" stroke={fill} strokeWidth="2" opacity="0.8" />
        <circle cx="50" cy="69" r="3.5" fill={fill} />
        <circle cx="50" cy="68" r="1.5" fill={lighten(fill, 0.6)} />
      </g>
    );
  }
  if (skin === 'marble') {
    return (
      <g fill="none" stroke={lighten(fill, 0.28)} strokeLinecap="round" opacity="0.58">
        <path d="M30 76 C39 70 43 82 51 75 S64 70 70 77" strokeWidth="1.8" />
        <path d="M36 84 C43 80 48 88 56 82 S65 80 67 85" stroke={dark} strokeWidth="1" opacity="0.7" />
      </g>
    );
  }
  if (skin === 'wooden') {
    return (
      <g fill="none" stroke={dark} strokeLinecap="round" opacity="0.52">
        <path d="M29 70 C39 66 44 74 51 70 S63 67 71 72" strokeWidth="1.6" />
        <path d="M33 80 C43 76 51 84 61 78" strokeWidth="1.1" />
        <path d="M38 88 C46 84 54 91 65 85" strokeWidth="0.9" />
      </g>
    );
  }
  if (skin === 'crystal') {
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M31 76 L42 68 L50 78 L60 67 L70 76" stroke={lighten(fill, 0.5)} strokeWidth="1.8" opacity="0.8" />
        <path d="M39 86 L47 77 L56 87 L64 78" stroke={dark} strokeWidth="1.1" opacity="0.7" />
      </g>
    );
  }
  return null;
}

/* ─── Main component ──────────────────────────────────────────────────────── */

let _uid = 0;

export default function ChessPiece2D({ type, color, skin = 'classic', customization }) {
  const skinSet = resolveChessSkin(skin, customization);
  const rawPalette = color === 'w' ? skinSet.white : skinSet.black;
  const p = Object.fromEntries(
    Object.entries(rawPalette).map(([key, value]) => [key, toHex(value)])
  );
  // Computed highlight / shadow colours from palette
  const lightHighlight = lighten(p.light, 0.45);
  const edgeDark       = darken(p.edge, 0.2);
  const label = `${skinSet.label} ${color === 'w' ? 'light' : 'dark'} ${type}`;

  // Stable uid per mount for gradient ids
  // biome-ignore lint/suspicious/noAssignInExpressions: intentional stable uid
  const uid = (ChessPiece2D._uid ??= ++_uid);

  const isAuraActive =
    skin === 'anime' && (type === 'k' || type === 'q');

  const PieceMark = () => {
    switch (type) {
      case 'k': return <King  fill={p.accent} edge={p.accentDark} light={lightHighlight} />;
      case 'q': return <Queen fill={p.accent} edge={p.accentDark} light={lightHighlight} />;
      case 'r': return <Rook  fill={p.accent} edge={p.accentDark} light={lightHighlight} />;
      case 'b': return <Bishop fill={p.accent} edge={p.accentDark} light={lightHighlight} />;
      case 'n': return <Knight fill={p.accent} edge={p.accentDark} light={lightHighlight} />;
      default:  return <Pawn  fill={p.accent} edge={p.accentDark} light={lightHighlight} />;
    }
  };

  return (
    <svg
      viewBox="0 0 100 120"
      className={`h-[85%] w-[85%] drop-shadow-[0_4px_3px_rgba(0,0,0,.65)] sm:h-[88%] sm:w-[88%] ${
        isAuraActive ? 'drop-shadow-[0_0_9px_rgba(103,232,249,.95)]' : ''
      }`}
      role="img"
      aria-label={label}
      shapeRendering="geometricPrecision"
      style={{ imageRendering: 'auto' }}
    >
      {/* Background gradient defs scoped per piece type+color to avoid collisions */}
      <defs>
        <radialGradient id={`hd-${type}-${color}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={lightHighlight} stopOpacity="0.55" />
          <stop offset="100%" stopColor={p.shade} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Base (stem + foot + collar) ── */}
      <PieceBase
        body={p.body}
        shade={p.shade}
        edge={edgeDark}
        light={lightHighlight}
        accent={p.accent}
        accentDark={p.accentDark}
        uid={`${type}-${color}`}
      />

      {/* ── Skin ornament on the stem ── */}
      <SkinDetail skin={skin} fill={p.accent} dark={p.accentDark} />

      {/* ── Piece-type mark (top symbol) ── */}
      <PieceMark />

      {/* ── Global spherical sheen overlay ── */}
      <ellipse cx="38" cy="30" rx="22" ry="18"
        fill={`url(#hd-${type}-${color})`}
        style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}
      />
    </svg>
  );
}

const SKIN = {
  w: {
    body: '#fff4d6',
    light: '#fffdf2',
    shade: '#d9c39a',
    edge: '#3a2a17',
    accent: '#f2c53d',
    accentDark: '#a96d12',
  },
  b: {
    body: '#2b2b31',
    light: '#45454d',
    shade: '#141419',
    edge: '#09090b',
    accent: '#d52f43',
    accentDark: '#781827',
  },
};

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

export default function ChessPiece2D({ type, color }) {
  const palette = SKIN[color] || SKIN.w;
  const label = `${color === 'w' ? 'Holy' : 'Anarchy'} ${type}`;
  return (
    <svg
      viewBox="0 0 100 120"
      className="h-[82%] w-[82%] drop-shadow-[0_3px_2px_rgba(0,0,0,.55)] sm:h-[86%] sm:w-[86%]"
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
      <PieceMark type={type} fill={palette.accent} dark={palette.accentDark} />
      <path d="M22 91h56v5H22z" fill={palette.shade} opacity=".75" />
    </svg>
  );
}

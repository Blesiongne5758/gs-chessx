export const CHESS_SKINS = {
  classic: {
    id: 'classic',
    label: 'Classic',
    shortLabel: 'Classic',
    description: 'Pure black & white pieces on a crisp black & white board — the timeless look',
    board: { light: 0xffffff, dark: 0x1a1a1a, frame: 0x2a2a2a, rim: 0x111111 },
    white: { body: 0xffffff, light: 0xffffff, shade: 0xcccccc, edge: 0x888888, accent: 0xdddddd, accentDark: 0x999999 },
    black: { body: 0x111111, light: 0x333333, shade: 0x080808, edge: 0x000000, accent: 0x444444, accentDark: 0x222222 },
  },
  holy: {
    id: 'holy',
    label: 'Holy vs Anarchy',
    shortLabel: 'Holy',
    description: 'Ivory, gold, charcoal, and crimson faction pieces',
    board: { light: 0xd9bf8b, dark: 0x59402e, frame: 0x563820, rim: 0x302014 },
    white: { body: 0xf4e7c4, light: 0xfff8dd, shade: 0xcab887, edge: 0x3a2a17, accent: 0xf2bf2f, accentDark: 0xa96d12 },
    black: { body: 0x2d2d33, light: 0x494951, shade: 0x121217, edge: 0x09090b, accent: 0xd52f43, accentDark: 0x781827 },
  },
  block: {
    id: 'block',
    label: 'Block Avatar',
    shortLabel: 'Block Avatar',
    description: 'Clean toy-block heroes with bright team colors',
    board: { light: 0xb9d7ef, dark: 0x41607d, frame: 0x1e3854, rim: 0x102337 },
    white: { body: 0xf4f6fb, light: 0xffffff, shade: 0xa9b7ce, edge: 0x263247, accent: 0x3b82f6, accentDark: 0x1d4ed8 },
    black: { body: 0x333b4d, light: 0x596780, shade: 0x172033, edge: 0x0d1424, accent: 0xf59e0b, accentDark: 0xb45309 },
  },
  voxel: {
    id: 'voxel',
    label: 'Voxel Miner',
    shortLabel: 'Voxel Miner',
    description: 'Mining-world colors with emerald and diamond accents',
    board: { light: 0xc8a878, dark: 0x5b432f, frame: 0x37291d, rim: 0x1a1410 },
    white: { body: 0xd8c29c, light: 0xf1dfb7, shade: 0x805e3d, edge: 0x342517, accent: 0x41d7c5, accentDark: 0x168b85 },
    black: { body: 0x3c4547, light: 0x5c6867, shade: 0x1b2524, edge: 0x0c1616, accent: 0x70c84a, accentDark: 0x2c7a35 },
  },
  neon: {
    id: 'neon',
    label: 'Neon Heroes',
    shortLabel: 'Neon Heroes',
    description: 'Smooth sci-fi pieces with luminous cyan and magenta trims',
    board: { light: 0x37456e, dark: 0x15152b, frame: 0x241342, rim: 0x0a0715 },
    white: { body: 0xdbeafe, light: 0xffffff, shade: 0x637da5, edge: 0x13223a, accent: 0x22d3ee, accentDark: 0x0e7490 },
    black: { body: 0x24243b, light: 0x4b4b78, shade: 0x0e0e1d, edge: 0x080812, accent: 0xf472b6, accentDark: 0xbe185d },
  },
  anime: {
    id: 'anime',
    label: 'Anime Cyberpunk',
    shortLabel: 'Anime Cyberpunk',
    description: 'Electric cyan, violet, and pink with an energy aura for king and queen',
    board: { light: 0x4b5790, dark: 0x1a1738, frame: 0x281451, rim: 0x090616 },
    white: { body: 0xe9f7ff, light: 0xffffff, shade: 0x6f83b8, edge: 0x172042, accent: 0x67e8f9, accentDark: 0x2563eb },
    black: { body: 0x25213d, light: 0x514878, shade: 0x0d0a1e, edge: 0x090718, accent: 0xf0abfc, accentDark: 0xa21caf },
  },
  fancy: {
    id: 'fancy',
    label: 'Fancy Royale',
    shortLabel: 'Fancy Royale',
    description: 'Velvet, champagne, and sapphire for a polished royal table',
    board: { light: 0xd8b879, dark: 0x5a3150, frame: 0x2b1530, rim: 0x120915 },
    white: { body: 0xfff3d0, light: 0xffffff, shade: 0xcaa45a, edge: 0x3b1d2c, accent: 0xffd166, accentDark: 0xb7791f },
    black: { body: 0x31213d, light: 0x624a72, shade: 0x130b1c, edge: 0x08050d, accent: 0x6ea8fe, accentDark: 0x3157a4 },
  },
  historical: {
    id: 'historical',
    label: 'Historical Wood',
    shortLabel: 'Historical Wood',
    description: 'Antique walnut, parchment, and brass inspired by classic salons',
    board: { light: 0xd7b98a, dark: 0x76543b, frame: 0x4a2d1a, rim: 0x24150c },
    white: { body: 0xe9d8b4, light: 0xfff1cf, shade: 0xa98258, edge: 0x3b2718, accent: 0xb98942, accentDark: 0x6f451f },
    black: { body: 0x322b28, light: 0x584b43, shade: 0x15110f, edge: 0x080706, accent: 0xc16b42, accentDark: 0x71341f },
  },
  superhero: {
    id: 'superhero',
    label: 'Superhero Arena',
    shortLabel: 'Superhero Arena',
    description: 'Comic-book blue, red, and solar gold with bold contrast',
    board: { light: 0x3c78bd, dark: 0x182d68, frame: 0x0e1b42, rim: 0x070d20 },
    white: { body: 0xf7fbff, light: 0xffffff, shade: 0x9bbde6, edge: 0x102b5c, accent: 0xfacc15, accentDark: 0xb45309 },
    black: { body: 0x202c58, light: 0x3f5c9d, shade: 0x0b122e, edge: 0x050817, accent: 0xef4444, accentDark: 0x991b1b },
  },
  custom: {
    id: 'custom',
    label: 'Custom Neon',
    shortLabel: 'Custom Neon',
    description: 'Live neon colors and particle controls',
    board: { light: 0x37456e, dark: 0x15152b, frame: 0x241342, rim: 0x0a0715 },
    white: { body: 0xe9f7ff, light: 0xffffff, shade: 0x6f83b8, edge: 0x172042, accent: 0x67e8f9, accentDark: 0x2563eb },
    black: { body: 0x25213d, light: 0x514878, shade: 0x0d0a1e, edge: 0x090718, accent: 0xf0abfc, accentDark: 0xa21caf },
  },
};

export const CHESS_SKIN_LIST = Object.values(CHESS_SKINS);

function hexToNumber(hex) {
  return Number.parseInt(hex.replace('#', ''), 16);
}

export function resolveChessSkin(id, customization) {
  const source = CHESS_SKINS[id] || CHESS_SKINS.classic;
  if (id !== 'custom' || !customization) return source;
  return {
    ...source,
    white: { ...source.white, accent: hexToNumber(customization.primary), accentDark: hexToNumber(customization.primaryDark) },
    black: { ...source.black, accent: hexToNumber(customization.secondary), accentDark: hexToNumber(customization.secondaryDark) },
  };
}

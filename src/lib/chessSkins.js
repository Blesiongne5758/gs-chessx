export const CHESS_SKINS = {
  holy: {
    id: 'holy',
    label: 'Holy vs Anarchy',
    shortLabel: 'Holy',
    description: 'Ivory, gold, charcoal, and crimson faction pieces',
    white: { body: 0xf4e7c4, light: 0xfff8dd, shade: 0xcab887, edge: 0x3a2a17, accent: 0xf2bf2f, accentDark: 0xa96d12 },
    black: { body: 0x2d2d33, light: 0x494951, shade: 0x121217, edge: 0x09090b, accent: 0xd52f43, accentDark: 0x781827 },
  },
  block: {
    id: 'block',
    label: 'Block Avatar',
    shortLabel: 'Block Avatar',
    description: 'Clean toy-block heroes with bright team colors',
    white: { body: 0xf4f6fb, light: 0xffffff, shade: 0xa9b7ce, edge: 0x263247, accent: 0x3b82f6, accentDark: 0x1d4ed8 },
    black: { body: 0x333b4d, light: 0x596780, shade: 0x172033, edge: 0x0d1424, accent: 0xf59e0b, accentDark: 0xb45309 },
  },
  voxel: {
    id: 'voxel',
    label: 'Voxel Miner',
    shortLabel: 'Voxel Miner',
    description: 'Mining-world colors with emerald and diamond accents',
    white: { body: 0xd8c29c, light: 0xf1dfb7, shade: 0x805e3d, edge: 0x342517, accent: 0x41d7c5, accentDark: 0x168b85 },
    black: { body: 0x3c4547, light: 0x5c6867, shade: 0x1b2524, edge: 0x0c1616, accent: 0x70c84a, accentDark: 0x2c7a35 },
  },
  neon: {
    id: 'neon',
    label: 'Neon Heroes',
    shortLabel: 'Neon Heroes',
    description: 'Smooth sci-fi pieces with luminous cyan and magenta trims',
    white: { body: 0xdbeafe, light: 0xffffff, shade: 0x637da5, edge: 0x13223a, accent: 0x22d3ee, accentDark: 0x0e7490 },
    black: { body: 0x24243b, light: 0x4b4b78, shade: 0x0e0e1d, edge: 0x080812, accent: 0xf472b6, accentDark: 0xbe185d },
  },
};

export const CHESS_SKIN_LIST = Object.values(CHESS_SKINS);

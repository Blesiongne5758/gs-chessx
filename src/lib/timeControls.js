/**
 * Time Control definitions and helpers for GS-ChessX
 * Supported categories: Rapid, Blitz, Bullet, Classic (English)
 */

export const TIME_CONTROL_CATEGORIES = [
  {
    id: 'rapid',
    name: 'Rapid',
    icon: '⏱️',
    description: 'Strategic play · 10 min clock',
    defaultPreset: '10+0',
  },
  {
    id: 'blitz',
    name: 'Blitz',
    icon: '🔥',
    description: 'Fast & tactical · 3 min clock',
    defaultPreset: '3+2',
  },
  {
    id: 'bullet',
    name: 'Bullet',
    icon: '⚡',
    description: 'Hyper speed · 1 min clock',
    defaultPreset: '1+0',
  },
  {
    id: 'classic',
    name: 'Classic',
    icon: '🎯',
    description: 'Deep thinking · 30 min clock',
    defaultPreset: '30+0',
  },
];

export const TIME_CONTROL_PRESETS = [
  // Rapid
  {
    id: 'rapid-10-0',
    category: 'rapid',
    categoryName: 'Rapid',
    name: '10+0',
    label: 'Rapid (10+0)',
    base: 600,
    inc: 0,
    desc: '10 min · Strategic play',
    icon: '⏱️',
    isDefault: true,
  },
  {
    id: 'rapid-15-10',
    category: 'rapid',
    categoryName: 'Rapid',
    name: '15+10',
    label: 'Rapid (15+10)',
    base: 900,
    inc: 10,
    desc: '15 min + 10s · Classical rapid',
    icon: '⏱️',
    isDefault: false,
  },

  // Blitz
  {
    id: 'blitz-3-2',
    category: 'blitz',
    categoryName: 'Blitz',
    name: '3+2',
    label: 'Blitz (3+2)',
    base: 180,
    inc: 2,
    desc: '3 min + 2s · Most popular',
    icon: '🔥',
    isDefault: true,
  },
  {
    id: 'blitz-5-0',
    category: 'blitz',
    categoryName: 'Blitz',
    name: '5+0',
    label: 'Blitz (5+0)',
    base: 300,
    inc: 0,
    desc: '5 min · Standard blitz',
    icon: '🔥',
    isDefault: false,
  },
  {
    id: 'blitz-5-3',
    category: 'blitz',
    categoryName: 'Blitz',
    name: '5+3',
    label: 'Blitz (5+3)',
    base: 300,
    inc: 3,
    desc: '5 min + 3s · Increment blitz',
    icon: '🔥',
    isDefault: false,
  },

  // Bullet
  {
    id: 'bullet-1-0',
    category: 'bullet',
    categoryName: 'Bullet',
    name: '1+0',
    label: 'Bullet (1+0)',
    base: 60,
    inc: 0,
    desc: '1 min · Fast & furious',
    icon: '⚡',
    isDefault: true,
  },
  {
    id: 'bullet-2-1',
    category: 'bullet',
    categoryName: 'Bullet',
    name: '2+1',
    label: 'Bullet (2+1)',
    base: 120,
    inc: 1,
    desc: '2 min + 1s · Bullet increment',
    icon: '⚡',
    isDefault: false,
  },

  // Classic (Classical)
  {
    id: 'classic-30-0',
    category: 'classic',
    categoryName: 'Classic',
    name: '30+0',
    label: 'Classic (30+0)',
    base: 1800,
    inc: 0,
    desc: '30 min · Deep thinking',
    icon: '🎯',
    isDefault: true,
  },
  {
    id: 'classic-60-0',
    category: 'classic',
    categoryName: 'Classic',
    name: '60+0',
    label: 'Classic (60+0)',
    base: 3600,
    inc: 0,
    desc: '60 min · Classical tournament pace',
    icon: '🎯',
    isDefault: false,
  },
];

export const DEFAULT_TIME_CONTROL = TIME_CONTROL_PRESETS[0]; // Rapid (10+0)

/**
 * Get all presets belonging to a specific category (rapid, blitz, bullet, classic)
 */
export function getCategoryPresets(category) {
  return TIME_CONTROL_PRESETS.filter((p) => p.category === category);
}

/**
 * Get default preset for a category
 */
export function getDefaultCategoryPreset(category) {
  const match = TIME_CONTROL_PRESETS.find((p) => p.category === category && p.isDefault);
  return match || TIME_CONTROL_PRESETS.find((p) => p.category === category) || DEFAULT_TIME_CONTROL;
}

/**
 * Normalize any time control input (string or object) to a structured time control object
 */
export function normalizeTimeControl(tc) {
  if (!tc) return DEFAULT_TIME_CONTROL;

  if (typeof tc === 'string') {
    const clean = tc.toLowerCase();
    // Direct match with label
    const exact = TIME_CONTROL_PRESETS.find((p) => p.label.toLowerCase() === clean);
    if (exact) return exact;

    // Partial label match
    const found = TIME_CONTROL_PRESETS.find(
      (p) =>
        clean.includes(p.label.toLowerCase()) ||
        clean.includes(p.name.toLowerCase()) ||
        (clean.includes('classic') && p.category === 'classic') ||
        (clean.includes('bullet') && p.category === 'bullet') ||
        (clean.includes('blitz') && p.category === 'blitz') ||
        (clean.includes('rapid') && p.category === 'rapid')
    );
    if (found) return found;

    return {
      id: 'custom',
      category: 'rapid',
      categoryName: 'Rapid',
      name: tc,
      label: tc,
      base: 600,
      inc: 0,
      desc: tc,
      icon: '⏱️',
    };
  }

  if (typeof tc === 'object') {
    if (tc.base !== undefined && tc.label) {
      const found = TIME_CONTROL_PRESETS.find(
        (p) => p.label.toLowerCase() === tc.label.toLowerCase() || (p.base === tc.base && p.inc === (tc.inc || 0))
      );
      if (found) return { ...found, ...tc };

      return {
        id: tc.id || 'custom',
        category: tc.category || 'rapid',
        categoryName: tc.categoryName || (tc.category ? tc.category.charAt(0).toUpperCase() + tc.category.slice(1) : 'Rapid'),
        name: tc.name || tc.label,
        label: tc.label,
        base: tc.base,
        inc: tc.inc || 0,
        desc: tc.desc || `${Math.floor(tc.base / 60)} min`,
        icon: tc.icon || '⏱️',
      };
    }

    if (tc.label) {
      return normalizeTimeControl(tc.label);
    }
  }

  return DEFAULT_TIME_CONTROL;
}

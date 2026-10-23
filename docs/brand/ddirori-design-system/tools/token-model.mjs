// @ aliases refer to the palette; $ aliases refer to the UI source.
// Keep arrays and fractional values intact. Broken aliases must fail generation.
export function resolveTokens(source, palette) {
  function visit(value, trail = []) {
    if (typeof value === 'string' && /^[\$@]/.test(value)) {
      if (trail.includes(value)) throw Error(`Cyclic token: ${[...trail, value].join(' → ')}`);
      let target = value[0] === '$' ? source : palette;
      for (const key of value.slice(1).split('.')) {
        if (!target || !Object.hasOwn(target, key)) throw Error(`Unresolved token: ${value}`);
        target = target[key];
      }
      return visit(target, [...trail, value]);
    }
    if (Array.isArray(value)) return value.map(item => visit(item, trail));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, trail)]));
    if (typeof value === 'number' && !Number.isFinite(value)) throw Error('Non-finite token');
    return value;
  }
  return visit(source);
}

export function validateTokens(data) {
  for (const [role, style] of Object.entries(data.textStyles)) {
    if (!(style.size > 0 && style.lineHeight >= 1 && style.weight >= 100 && style.weight <= 900 && style.weight % 100 === 0 && Number.isFinite(style.tracking))) throw Error(`Invalid text style: ${role}`);
  }
  for (const [name, curve] of Object.entries(data.easing)) {
    if (!Array.isArray(curve) || curve.length !== 4 || curve.some(v => !Number.isFinite(v)) || curve[0] < 0 || curve[0] > 1 || curve[2] < 0 || curve[2] > 1) throw Error(`Invalid easing: ${name}`);
  }
  for (const group of ['spacing', 'radius', 'control', 'layout', 'breakpoints', 'layer', 'elevation', 'icon', 'motion']) {
    for (const [name, value] of Object.entries(data[group])) if (typeof value !== 'number' || value < 0 || !Number.isFinite(value)) throw Error(`Invalid ${group}.${name}`);
  }
  for (const [mode, colors] of Object.entries(data.themes)) for (const [role, value] of Object.entries(colors)) if (!/^#[\da-f]{6}$/i.test(value)) throw Error(`Invalid color ${mode}.${role}`);
}

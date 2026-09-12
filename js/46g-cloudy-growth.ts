// Cloudy growth zones: surviving accepted layers mapped to nested display shells.
// Shell geometry and scattering weights are representative, not reconstructed
// face velocities or a new inclusion model. No RNG or scientific-record writes.
const CLOUDY_GROWTH_MINERALS = new Set(['quartz', 'topaz', 'apatite', 'aragonite', 'barite']);

function cloudyGrowthHistory(crystal: any, replayStep: number | null = null): any {
  const layers: any[] = [];
  for (const z of crystal.zones || []) {
    if (replayStep != null && (!Number.isFinite(z.step) || z.step > replayStep)) continue;
    const thickness = Number(z.thickness_um);
    if (!Number.isFinite(thickness) || thickness === 0) continue;
    if (thickness < 0) {
      let loss = -thickness;
      while (loss > 0 && layers.length) {
        const last = layers[layers.length - 1], removed = Math.min(loss, last.thickness);
        last.thickness -= removed; loss -= removed;
        if (last.thickness <= 1e-9) layers.pop();
      }
    } else {
      const density = z.fluid_inclusion ? 0.95 : 0.12;
      const last = layers[layers.length - 1];
      if (last && last.density === density) last.thickness += thickness;
      else layers.push({ thickness, density });
    }
  }
  const total = layers.reduce((s, l) => s + l.thickness, 0);
  let cumulative = 0;
  const intervals = layers.map(l => {
    const start = cumulative / total; cumulative += l.thickness;
    return { start, end: cumulative / total, density: l.density };
  });
  // Fixed-size uniform budget. Area-average all surviving intervals into bins;
  // never discard the oldest history or invent a newest clear layer.
  const bins = Array.from({ length: 16 }, (_, i) => {
    if (!total) return 0.12;
    const lo = i / 16, hi = (i + 1) / 16;
    return intervals.reduce((s, l) => s + Math.max(0, Math.min(hi, l.end) - Math.max(lo, l.start)) * l.density * 16, 0);
  });
  return { schema: 'cloudy-growth-shells-v1', bins, total_um: total,
    phase: (Math.abs(Number(crystal.crystal_id) || 0) % 29) * 0.37,
    inclusion_fraction: total ? layers.reduce((s, l) => s + (l.density > 0.5 ? l.thickness : 0), 0) / total : 0,
    mapping: 'surviving-axial-thickness-to-homothetic-display-shells' };
}

function cloudyGrowthSignature(crystal: any, replayStep: number | null = null): string {
  if (!CLOUDY_GROWTH_MINERALS.has(crystal.mineral)) return '';
  const h = cloudyGrowthHistory(crystal, replayStep);
  return ':cloud:' + h.total_um + ':' + h.bins.map((v: number) => v.toFixed(5)).join(',');
}

// Reuses the actual convex exit planes from the volume trace. Clouds follow the
// prism/termination envelope and remain anchored to the body under camera motion.
const CLOUDY_GROWTH_GLSL = `
  uniform float growthCloudBins[16];
  uniform float growthCloudPhase;
  float topazCloudDensity(vec3 position) {
    vec3 p = 2.0 * (position - topazCloudCenter) / topazCloudSize;
    float shell = 0.0;
    for (int i = 0; i < GROWTH_PLANE_COUNT; i++) {
      vec4 plane = topazExitPlanes[i];
      shell = max(shell, dot(plane.xyz, position - topazCloudCenter) /
        max(0.00001, plane.w - dot(plane.xyz, topazCloudCenter)));
    }
    float index = clamp(shell * 16.0 - 0.5, 0.0, 15.0);
    float density = 0.12;
    for (int i = 0; i < 16; i++) {
      float weight = max(0.0, 1.0 - abs(index - float(i)));
      density += weight * (growthCloudBins[i] - 0.12);
    }
    // A modest specimen core remains an explicit appearance convention when
    // no trapped-fluid population was recorded. It is not labelled an inclusion.
    float core = 1.0 - smoothstep(0.32, 0.80, shell);
    float veil = 0.75 + 0.25 * sin(p.x * 5.0 + growthCloudPhase) * sin(p.y * 3.1 - p.z * 4.2);
    vec2 w = p.xy - vec2(-0.25 + 0.08*sin(growthCloudPhase), 0.18);
    float windowA = exp(-dot(w/vec2(0.25,0.34), w/vec2(0.25,0.34)));
    w = p.xy - vec2(0.32,-0.22);
    float windowB = exp(-dot(w/vec2(0.19,0.25), w/vec2(0.19,0.25)));
    return (0.10 + 0.30*core + density*1.05) * veil *
      (1.0 - 0.55*max(windowA,windowB)) * (1.0 - 0.65*smoothstep(0.90,1.0,shell));
  }
`;

// R7d: ordered, surviving accepted matter. Dissolution removes outside-in;
// no consumer may average removed layers or borrow layers from a later cursor.
function survivingGrowthLayers(crystal: any, step: number | null = null): any[] {
  const layers: any[] = [];
  for (const z of Array.isArray(crystal?.zones) ? crystal.zones : []) {
    if (step != null && (!Number.isFinite(z.step) || z.step > step)) continue;
    if (!Number.isFinite(z.thickness_um) || z.thickness_um === 0) continue;
    if (z.thickness_um > 0) layers.push({ zone: z, thickness: z.thickness_um });
    else {
      let loss = -z.thickness_um;
      while (loss > 0 && layers.length) {
        const last = layers[layers.length - 1], removed = Math.min(loss, last.thickness);
        last.thickness -= removed; loss -= removed;
        if (last.thickness <= 1e-9) layers.pop();
      }
    }
  }
  return layers;
}

function colourCrystalAtStep(crystal: any, step: number | null = null): any {
  return { ...crystal,
    zones: survivingGrowthLayers(crystal, step).map(l => ({ ...l.zone, thickness_um: l.thickness })),
    // Only the current damage scalar is recorded. It is not a dose chronology.
    radiation_damage: step == null ? crystal?.radiation_damage || 0 : 0 };
}

// Qualitative palette, NOT optical calibration or a mineral-variety boundary.
// Fe darkening is observed at wt% scale (S1001074219309799; https://pubmed.ncbi.nlm.nih.gov/31892388/).
// GrowthZone traces are ppm: 10,000 ppm = 1 wt%. Never treat 40 ppm as 40%.
function sphaleriteIronColour(fePpm: number | null): string | null {
  if (fePpm == null || !Number.isFinite(fePpm) || fePpm < 0) return null;
  const wtPercent = fePpm / 10000;
  if (wtPercent <= .235) return COLOUR_LEXICON.pale_yellow;
  const t = Math.min(1, (wtPercent - .235) / (14.826 - .235));
  const a = [0xe8, 0xc9, 0x60], b = [0x2b, 0x20, 0x18];
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function currentSurfaceFilm(crystal: any, step: number | null = null): any {
  if (step != null || !crystal?._film) return null;
  const f = crystal._film;
  if (!(f.phi_term > 0 || f.phi_prism > 0)) return null;
  const operations = _filmOperations(f);
  // Only particulate families with an explicit film palette have a supported
  // matte/opaque display. Unknown or clear-mineral contributors cannot be
  // silently converted to buff dust. Mixed unsupported coverage is withheld
  // because overlapping operations do not record separate exposed patches.
  const supported = new Set(['hematite','goethite','limonite','chlorite','pyrolusite','manganese_oxide','mica','clay','kaolinite','illite']);
  if (operations.some(op => (op.phi_term > 0 || op.phi_prism > 0) && !supported.has(op.mineral))) return null;
  if (!operations.length) return null;
  const mixture = (field: string) => {
    const rgb = [0,0,0]; let weight = 0;
    for (const op of operations) {
      const w = Math.max(0, Number(op[field]) || 0); if (!w) continue;
      const colour = filmBandRGB(op.mineral || 'film');
      for (let i=0;i<3;i++) rgb[i] += colour[i] * w;
      weight += w;
    }
    return weight ? rgb.map(v => v/weight) : filmBandRGB('film');
  };
  return { minerals: [...new Set(operations.map(op => op.mineral || 'film'))],
    termColour: mixture('phi_term'), prismColour: mixture('phi_prism'),
    term: Math.max(0, Math.min(1, f.phi_term || 0)), prism: Math.max(0, Math.min(1, f.phi_prism || 0)) };
}

// The simulation records face-class coverage, not patch coordinates. A uniform
// face-class mixture (normalized nominal operation colours where films overlap)
// is a display approximation: no invented iron base or age gradient.
function applyRecordedSurfaceFilm(mat: any, crystal: any, step: number | null = null): void {
  const film = currentSurfaceFilm(crystal, step);
  if (!film) return;

  mat.userData.surfaceFilm = { ...film, mapping: 'face-class-coverage-and-nominal-operation-colour-mixture', chronology: 'current-only' };
  const prior = mat.onBeforeCompile, key = mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile = function(shader: any, renderer: any) {
    prior?.call(this, shader, renderer);
    shader.uniforms.r7FilmTermColour = { value: new THREE.Color(...film.termColour) };
    shader.uniforms.r7FilmPrismColour = { value: new THREE.Color(...film.prismColour) };
    shader.uniforms.r7FilmCoverage = { value: new THREE.Vector2(film.prism, film.term) };
    shader.vertexShader = 'varying float r7FilmTerminal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>',
      '#include <beginnormal_vertex>\nr7FilmTerminal = smoothstep(0.25, 0.75, abs(normal.y));');
    shader.fragmentShader = 'varying float r7FilmTerminal; uniform vec3 r7FilmTermColour; uniform vec3 r7FilmPrismColour; uniform vec2 r7FilmCoverage;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\nfloat r7FilmAmount = mix(r7FilmCoverage.x,r7FilmCoverage.y,r7FilmTerminal);\ndiffuseColor.rgb = mix(diffuseColor.rgb,mix(r7FilmPrismColour,r7FilmTermColour,r7FilmTerminal),r7FilmAmount);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor,0.92,r7FilmAmount);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_fragment>',
      THREE.ShaderChunk.transmission_fragment.replace('material.transmission = transmission;', 'material.transmission = transmission * (1.0-r7FilmAmount);'));
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphamap_fragment>',
      '#include <alphamap_fragment>\ndiffuseColor.a = mix(diffuseColor.a,1.0,r7FilmAmount);');
  };
  mat.customProgramCacheKey = () => (key?.() || '') + ':recorded-film-v1';
}

function colourHistorySignature(crystal: any, step: number | null = null): string {
  const view = colourCrystalAtStep(crystal, step);
  return JSON.stringify([['Fe','Mn','Al','Ti'].map(f=>_bodyFieldVal(view,f)),
    view.radiation_damage, chemistryAbsorptionHistory(crystal,step), currentSurfaceFilm(crystal,step)]);
}

function chemistryAbsorptionHistory(crystal: any, step: number | null = null): any {
  if (crystal?.mineral !== 'sphalerite') return null;
  const layers = survivingGrowthLayers(crystal,step);
  const total = layers.reduce((sum,l)=>sum+l.thickness,0);
  if (!total || !layers.some(l=>Number.isFinite(l.zone.trace_Fe))) return null;
  let depth=0;
  const intervals=layers.map(l=>{
    const start=depth/total; depth+=l.thickness;
    const rgb = new THREE.Color(sphaleriteIronColour(l.zone.trace_Fe) || COLOUR_LEXICON.pale_yellow).toArray();
    return {start,end:depth/total,coeff:rgb.map((v:number)=>-Math.log(Math.max(.03,v)))};
  });
  const bins=Array.from({length:16},(_,i)=>{
    const value=[0,0,0];
    for(const l of intervals) {
      const w=Math.max(0,Math.min((i+1)/16,l.end)-Math.max(i/16,l.start))*16;
      for(let c=0;c<3;c++) value[c]+=w*l.coeff[c];
    }
    return value.map(v=>+v.toFixed(6));
  });
  return {bins,known_fraction:layers.reduce((s,l)=>s+(Number.isFinite(l.zone.trace_Fe)?l.thickness:0),0)/total,
    mapping:'surviving-axial-history-to-similar-absorption-volumes',
    calibration:'qualitative-Fe-wt-percent-palette; not measured spectra'};
}

const HISTORY_ABSORPTION_GLSL = `
  uniform vec3 historyAbsorptionBins[16];
  uniform float historyAbsorptionDistance;
  vec3 historyAbsorptionAt(vec3 position) {
    float shell=0.0;
    for(int i=0;i<HISTORY_PLANE_COUNT;i++) {
      vec4 plane=topazExitPlanes[i];
      shell=max(shell,dot(plane.xyz,position-topazCloudCenter)/max(0.00001,plane.w-dot(plane.xyz,topazCloudCenter)));
    }
    float index=clamp(shell*16.0-0.5,0.0,15.0);
    vec3 result=vec3(0.0);
    for(int i=0;i<16;i++) result+=max(0.0,1.0-abs(index-float(i)))*historyAbsorptionBins[i];
    return result;
  }
`;

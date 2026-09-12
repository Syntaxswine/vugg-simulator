// R7a: descriptors for representative display members, never simulation births.
// Real crystal dimensions and nucleation axes remain authoritative. These bounded
// log-space sizes are an appearance distribution, not a reconstructed natural CSD.
function populationDisplayMember(id: number, index: number, pattern: any): any {
  const rand = _clusterRand(Math.imul(id | 0, 0x9e3779b9) ^ Math.imul(index + 1, 0x85ebca6b));
  const sizeU = rand(), radiusU = rand(), angleU = rand();
  const lo = Math.max(0.12, pattern.scaleMin * 0.55), hi = pattern.scaleMax;
  const scale = lo * Math.pow(hi / lo, sizeU * sizeU);
  return {
    index,
    scale,
    // Place smaller representatives nearer the parent footprint. This is local
    // druse packing, not an inferred common nucleus or independent attachment.
    radiusInParentWidths: .5 * (1 + scale) * (.72 + .30 * radiusU),
    azimuth: angleU * Math.PI * 2,
    tilt: (rand() - 0.5) * pattern.tiltMax * 0.7,
    tiltAzimuth: rand() * Math.PI * 2,
    yawOffset: (rand() - 0.5) * 0.7,
  };
}

function populationHistorySignature(crystal: any, replayStep: number | null = null): string {
  const tilt = crystal._nucTilt;
  return ':population:' + JSON.stringify([
    crystal.nucleation_step ?? null, replayStep == null ? crystal.a_width_mm ?? null
      : _topoHistoricalCrystalSize(crystal, replayStep)?.a_width_mm ?? null,
    tilt ? [tilt.theta, tilt.azim] : null,
    maskedHorizonBands(crystal, replayStep),
  ]);
}

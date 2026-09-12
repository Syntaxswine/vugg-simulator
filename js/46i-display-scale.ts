// R7b: one scale policy for bodies and the contact pre-pass. World units are mm.
// The overview exaggerates tiny specimens; at 400% and in replay the recorded
// lengths win. Two regimes keep orbit/pan/redraw cached rather than rebuilding
// every frame. Form-specific width conventions remain the R4 display model.
function crystalScaleMode(zoom: number, replayStep?: number | null): string {
  return replayStep != null || zoom >= 4 ? 'recorded' : 'overview';
}

function crystalDisplayDimensions(c: number, a: number, ratio: number,
  mode: string, inclusion = false): { cLen: number; aWid: number; wasFloored: boolean } {
  const cFloor = mode === 'recorded' ? 0 : inclusion ? .4 : 2;
  const aFloor = mode === 'recorded' ? 0 : inclusion ? .4 : 1.5;
  let cLen = Math.max(cFloor, c), aWid = Math.max(aFloor, a);
  const wasFloored = c < cFloor || a < aFloor;
  if (wasFloored && !inclusion) {
    if (ratio >= 1) aWid = Math.max(aWid, cLen * ratio);
    else cLen = Math.max(cLen, aWid / ratio);
  }
  return { cLen, aWid, wasFloored };
}

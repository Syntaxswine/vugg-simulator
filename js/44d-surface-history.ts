// Dated observations of the existing O5 model, not a new coating mass/kinetic
// law. Coverage is face-class coverage; exact patch positions and the fate of
// foreign grains after host retreat remain unrecorded. No shared RNG is used.
const SURFACE_HISTORY_SCHEMA = 'surface-history-v1';
const SURFACE_HISTORY_MAX_EVENTS = 20_000;

function _surfaceCopy(value: any): any { return value == null ? null : JSON.parse(JSON.stringify(value)); }
function _surfaceNear(a: number, b: number): boolean {
  return Math.abs(a-b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
}
function _surfaceDepths(zones: any[]): number[] | null {
  if (!Array.isArray(zones)) return null;
  const depths = [0];
  let previousStep=0;
  for (const z of zones) {
    if (!z || !Number.isFinite(z.thickness_um) || !Number.isSafeInteger(z.step) || z.step < previousStep) return null;
    previousStep=z.step;
    depths.push(Math.max(0, depths[depths.length-1] + z.thickness_um));
    if (!Number.isFinite(depths[depths.length-1])) return null;
  }
  return depths;
}
function _surfaceValidOperation(op: any): boolean {
  return !!op && !Array.isArray(op) && ['dust-max','enclosure-add'].includes(op.kind)
    && typeof op.source_id === 'string' && op.source_id.length > 0 && op.source_id.length <= 256
    && typeof op.mineral === 'string' && op.mineral.length > 0 && op.mineral.length <= 128
    && Number.isSafeInteger(op.step) && op.step >= 0
    && ['phi_term','phi_prism'].every(k=>Number.isFinite(op[k]) && op[k]>=0 && op[k]<=1)
    && Object.keys(op).every(k=>['kind','source_id','mineral','step','phi_term','phi_prism'].includes(k));
}
function _surfaceValidFilm(film: any): boolean {
  if (film === null) return true;
  if (!film || Array.isArray(film) || typeof film.mineral !== 'string' || film.mineral.length > 128) return false;
  if (!['phi_term','phi_prism'].every(k=>Number.isFinite(film[k]) && film[k]>=0 && film[k]<=1)) return false;
  if (film.step != null && (!Number.isSafeInteger(film.step) || film.step<0)) return false;
  if (Object.keys(film).some(k=>!['mineral','phi_term','phi_prism','step','operations'].includes(k))) return false;
  return film.operations === undefined || (Array.isArray(film.operations)
    && film.operations.length<=SURFACE_HISTORY_MAX_EVENTS && film.operations.every(_surfaceValidOperation));
}
function _surfaceEquivalentFilm(a: any,b: any): boolean {
  const aa=_filmOperations(a), bb=_filmOperations(b);
  return (a?.mineral??null)===(b?.mineral??null) && (a?.step??null)===(b?.step??null)
    && aa.length===bb.length && ['phi_term','phi_prism'].every(k=>_surfaceNear(a?.[k]||0,b?.[k]||0))
    && aa.every((op,i)=>['kind','source_id','mineral','step','phi_term','phi_prism'].every(k=>op[k]===bb[i][k]));
}

// Validate against the accepted zone array as well as the event syntax. A
// deleted retreat event must not resurrect its buried horizon after regrowth.
function _surfaceHistoryProjection(history: any, zones: any[], step: number | null): any {
  const depths = _surfaceDepths(zones), initial = history?.initial;
  if (!depths || history?.schema !== SURFACE_HISTORY_SCHEMA || !initial
      || (step!=null && (!Number.isSafeInteger(step) || step<0))
      || Object.keys(history).some(k=>!['schema','initial','events','unavailable'].includes(k))
      || !Array.isArray(history.events) || history.events.length>SURFACE_HISTORY_MAX_EVENTS
      || !Number.isSafeInteger(initial.step) || initial.step<0
      || !Number.isSafeInteger(initial.zone_count) || initial.zone_count<0 || initial.zone_count>zones.length
      || !Number.isFinite(initial.surface_um) || initial.surface_um<0
      || !_surfaceNear(initial.surface_um,depths[initial.zone_count]) || !_surfaceValidFilm(initial.film)
      || Object.keys(initial).some(k=>!['step','zone_count','surface_um','film'].includes(k))) return null;
  if ((initial.zone_count && zones[initial.zone_count-1].step>initial.step)
    || (zones[initial.zone_count] && zones[initial.zone_count].step<initial.step)) return null;
  if(initial.film && ((initial.film.step!=null && initial.film.step>initial.step)
    || initial.film.operations?.some(op=>op.step>initial.step))) return null;
  if(initial.film?.operations) {
    const folded=_filmFromOperations(initial.film.operations);
    if(!folded || initial.film.mineral!==folded.mineral
      || (initial.film.step!=null && initial.film.step!==folded.step)
      || !['phi_term','phi_prism'].every(k=>_surfaceNear(initial.film[k],folded[k]))) return null;
  }
  const unavailable=history.unavailable;
  if(unavailable!==undefined && (!unavailable || Object.keys(unavailable).some(k=>!['reason','step','zone_count'].includes(k))
    || !['event-limit','observation-gap'].includes(unavailable.reason)
    || !Number.isSafeInteger(unavailable.step) || unavailable.step<initial.step
    || !Number.isSafeInteger(unavailable.zone_count) || unavailable.zone_count<initial.zone_count
    || unavailable.zone_count>zones.length)) return null;
  let film = _surfaceCopy(initial.film), previousStep=initial.step, previousCount=initial.zone_count;
  const horizons: any[] = [], horizonMap=new Map<number,any>(), observed: any[] = [];
  const retreatKeys=new Set<string>(), burialZones=new Set<number>();
  let result: any = null, captured=step!=null && step<initial.step;
  const snapshot=()=>({film:_surfaceCopy(film),horizons:_surfaceCopy(horizons),
    events:_surfaceCopy(observed),available_since_step:initial.step});
  for(let i=0;i<history.events.length;i++) {
    const e=history.events[i];
    if(!e || e.seq!==i+1 || !Number.isSafeInteger(e.step) || e.step<previousStep
      || !Number.isSafeInteger(e.zone_count) || e.zone_count<previousCount || e.zone_count>zones.length
      || !Number.isFinite(e.surface_um) || e.surface_um<0 || !_surfaceNear(e.surface_um,depths[e.zone_count])
      || (e.zone_count && zones[e.zone_count-1].step>e.step)
      || (zones[e.zone_count] && zones[e.zone_count].step<e.step)) return null;
    if(!captured && step!=null && e.step>step) {result=snapshot();captured=true;}
    const allowed=['seq','step','zone_count','surface_um','event'];
    if(e.event==='dusting' || e.event==='front-coating') {
      allowed.push('operation','coverage_change');
      if(!_surfaceValidOperation(e.operation) || e.operation.step!==e.step
        || e.operation.kind!==(e.event==='dusting'?'dust-max':'enclosure-add')) return null;
      // Private fold: append once instead of cloning every accumulated operation
      // on every event. The resulting algebra is exactly the existing O5 law.
      const op=e.operation, oldTerm=film?.phi_term||0, oldPrism=film?.phi_prism||0;
      const nextTerm=op.kind==='dust-max'?Math.max(oldTerm,op.phi_term):Math.min(O5_PHI_MAX,oldTerm+op.phi_term);
      const nextPrism=op.kind==='dust-max'?Math.max(oldPrism,op.phi_prism):Math.min(O5_PHI_MAX,oldPrism+op.phi_prism);
      const delta=e.coverage_change;
      if(!delta || Object.keys(delta).some(k=>!['term','prism'].includes(k))
        || !Number.isFinite(delta.term) || !Number.isFinite(delta.prism)
        || !_surfaceNear(delta.term,nextTerm-oldTerm) || !_surfaceNear(delta.prism,nextPrism-oldPrism)) return null;
      const ops=film?.operations || _filmOperations(film); ops.push(_surfaceCopy(op));
      film=(nextTerm>0 || nextPrism>0)?{mineral:op.mineral,step:op.step||film?.step||0,
        phi_term:nextTerm,phi_prism:nextPrism,operations:ops}:null;
    } else if(e.event==='buried') {
      allowed.push('accepted_zone_index','horizon_um');
      const z=zones[e.accepted_zone_index];
      if(e.accepted_zone_index!==e.zone_count-1 || !z || z.step!==e.step || !(z.thickness_um>0)
        || !z.masked_horizon || !film || !Number.isFinite(e.horizon_um)
        || e.accepted_zone_index<initial.zone_count || burialZones.has(e.accepted_zone_index)
        || previousCount>=e.zone_count || !_surfaceNear(e.horizon_um,depths[e.zone_count-1])) return null;
      if((z.film_mineral!=null && z.film_mineral!==film.mineral)
        || (z.originating_film_step!=null && z.originating_film_step!==film.step)
        || ['term','prism'].some(k=>z['masked_phi_'+k]!=null
          && (!Number.isFinite(z['masked_phi_'+k]) || !_surfaceNear(z['masked_phi_'+k],film['phi_'+k])))) return null;
      burialZones.add(e.accepted_zone_index);
      const horizon={id:e.seq,depth_um:e.horizon_um,buried_step:e.step,zone_index:e.accepted_zone_index,
        film:_surfaceCopy(film),status:'buried'};
      horizons.push(horizon); horizonMap.set(e.seq,horizon);
      film=null;
    } else if(e.event==='liberated') {
      allowed.push('source_id','found','coverage_change');
      if(typeof e.source_id!=='string' || e.source_id.length>256 || typeof e.found!=='boolean') return null;
      const removal=filmWithoutOperation(film,e.source_id), delta=e.coverage_change;
      if(_filmOperations(film).some(op=>op.source_id===e.source_id && op.kind!=='enclosure-add')) return null;
      if(removal.found!==e.found || !delta || Object.keys(delta).some(k=>!['term','prism'].includes(k))
        || !Number.isFinite(delta.term) || !Number.isFinite(delta.prism)
        || !_surfaceNear(delta.term,-removal.removed_phi_term)
        || !_surfaceNear(delta.prism,-removal.removed_phi_prism)) return null;
      film=removal.film;
    } else if(e.event==='boundary-reached' || e.event==='boundary-crossed') {
      allowed.push('accepted_zone_index','horizon_id','from_um');
      const z=zones[e.accepted_zone_index], h=horizonMap.get(e.horizon_id);
      if(e.accepted_zone_index!==e.zone_count-1 || !z || z.step!==e.step || !(z.thickness_um<0)
        || !h || h.status==='no-longer-enclosed' || !Number.isFinite(e.from_um)
        || !_surfaceNear(e.from_um,depths[e.zone_count-1]) || e.from_um<h.depth_um-1e-8) return null;
      const reached=_surfaceNear(e.surface_um,h.depth_um);
      if(e.event==='boundary-reached' ? !reached || h.status!=='buried' : reached || !(e.surface_um<h.depth_um)) return null;
      h.status=reached?'boundary-reached':'no-longer-enclosed';
      h.retreat_step=e.step; h.retreat_zone_index=e.accepted_zone_index;
      h.coating_fate='unrecorded';
      retreatKeys.add(`${e.event}:${h.id}:${e.accepted_zone_index}`);
    } else return null;
    if(Object.keys(e).some(k=>!allowed.includes(k))) return null;
    observed.push(e); previousStep=e.step; previousCount=e.zone_count;
  }
  if(unavailable && (unavailable.step<previousStep || unavailable.zone_count<previousCount)) return null;
  if(!captured) result=snapshot();
  for(let zi=initial.zone_count;zi<(unavailable?previousCount:zones.length);zi++) {
    if(zones[zi].thickness_um>0 && zones[zi].masked_horizon && !burialZones.has(zi)
      && !(unavailable && zi===previousCount-1)) return null;
  }
  // Each first retreat to/past a recorded boundary requires its actual event.
  // Subsequent regrowth cannot undo an unknown fate at an exposed interface.
  for(const h of horizons) {
    let expected='buried';
    // An explicitly incomplete ledger retains its raw prefix for diagnosis but
    // supplies no reconstructed view, including before the gap. It is never a
    // valid-looking truncated chronology at the bounded recording limit.
    const through=unavailable?previousCount:zones.length;
    for(let zi=h.zone_index+1;zi<through;zi++) {
      const z=zones[zi]; if(!(z.thickness_um<0) || expected==='no-longer-enclosed') continue;
      const reached=_surfaceNear(depths[zi+1],h.depth_um);
      if(depths[zi]>=h.depth_um-1e-8 && (reached || depths[zi+1]<h.depth_um)) {
        const kind=reached?'boundary-reached':'boundary-crossed';
        if(reached && expected==='boundary-reached') continue;
        if(!retreatKeys.has(`${kind}:${h.id}:${zi}`)) {
          if(unavailable && zi===previousCount-1) continue;
          return null;
        }
        expected=reached?'boundary-reached':'no-longer-enclosed';
      }
    }
    if(h.status!==expected) return null;
  }
  return {valid:true,view:unavailable?null:result};
}
function validateSurfaceHistory(history: any,zones: any[]): boolean {
  return !!_surfaceHistoryProjection(history,zones,null);
}
function surfaceHistoryAtStep(crystal: any,step: number | null=null): any {
  return _surfaceHistoryProjection(crystal?._surfaceHistory,crystal?.zones,step)?.view || null;
}

function _surfaceStart(crystal: any,step: number,beforeFilm: any,zoneCount=crystal.zones?.length): any {
  const depths=_surfaceDepths(crystal.zones);
  if(!depths || !Number.isSafeInteger(step) || step<0 || !Number.isSafeInteger(zoneCount)
    || zoneCount<0 || zoneCount>=depths.length) return null;
  if(!_surfaceValidFilm(beforeFilm)) {_surfaceInvalidate(crystal,step,zoneCount);return null;}
  if(!crystal._surfaceHistory) crystal._surfaceHistory={schema:SURFACE_HISTORY_SCHEMA,
    initial:{step,zone_count:zoneCount,surface_um:depths[zoneCount],film:_surfaceCopy(beforeFilm)},events:[]};
  const h=crystal._surfaceHistory;
  if(h.unavailable) return null;
  if(h.schema!==SURFACE_HISTORY_SCHEMA || !Array.isArray(h.events)) return null;
  if(h.events.length>=SURFACE_HISTORY_MAX_EVENTS) {
    _surfaceInvalidate(crystal,step,zoneCount,'event-limit'); return null;
  }
  return h;
}
function _surfaceInvalidate(crystal: any,step: number,zoneCount: number,reason='observation-gap'): void {
  if(crystal._surfaceHistory && !crystal._surfaceHistory.unavailable)
    crystal._surfaceHistory.unavailable={reason,step,zone_count:zoneCount};
}
function _surfaceCheckBefore(crystal: any,step: number,before: any,zoneCount=crystal.zones?.length): boolean {
  if(!_surfaceStart(crystal,step,before,zoneCount)) return false;
  const prior=_surfaceHistoryProjection(crystal._surfaceHistory,crystal.zones.slice(0,zoneCount),null)?.view;
  if(!prior || !_surfaceEquivalentFilm(prior.film,before)) {
    _surfaceInvalidate(crystal,step,zoneCount); return false;
  }
  return true;
}
function _surfaceAppend(crystal: any,step: number,event: any,beforeFilm: any,zoneCount=crystal.zones?.length): void {
  const h=_surfaceStart(crystal,step,beforeFilm,zoneCount), depths=_surfaceDepths(crystal.zones);
  if(!h || !depths) return;
  h.events.push({seq:h.events.length+1,step,zone_count:zoneCount,surface_um:depths[zoneCount],..._surfaceCopy(event)});
}
function recordSurfaceFilmOperation(crystal: any,operation: any,before: any): void {
  if(!_surfaceCheckBefore(crystal,operation.step,before)) return;
  const after=crystal._film;
  _surfaceAppend(crystal,operation.step,{event:operation.kind==='dust-max'?'dusting':'front-coating',operation,
    coverage_change:{term:(after?.phi_term||0)-(before?.phi_term||0),prism:(after?.phi_prism||0)-(before?.phi_prism||0)}},before);
}
function recordSurfaceFilmLiberation(crystal: any,step: number,sourceId: string,before: any,removal: any): void {
  if(!_surfaceCheckBefore(crystal,step,before)) return;
  _surfaceAppend(crystal,step,{event:'liberated',source_id:sourceId,found:removal.found,
    coverage_change:{term:-removal.removed_phi_term,prism:-removal.removed_phi_prism}},before);
}
function recordAcceptedSurfaceZone(crystal: any,zone: any): void {
  const pending=zone._surfaceBurialPending;
  delete zone._surfaceBurialPending; // never changes legacy full-zone fingerprints
  if(!pending && (!(zone.thickness_um<0) || !crystal._surfaceHistory)) return;
  const count=crystal.zones.length, depths=_surfaceDepths(crystal.zones);
  if(!depths || !count) return;
  if(pending && zone.thickness_um>0 && zone.masked_horizon) {
    // Initial observation belongs to the pre-growth surface; append only after
    // add_zone accepted the final thickness and exposed its permanent index.
    if(!_surfaceCheckBefore(crystal,zone.step,pending,count-1)) return;
    _surfaceAppend(crystal,zone.step,{event:'buried',accepted_zone_index:count-1,horizon_um:depths[count-1]},pending,count);
  }
  if(!(zone.thickness_um<0) || !crystal._surfaceHistory) return;
  // Project the prior accepted prefix: this zone's crossings have not yet been
  // appended, so validating against the new negative zone would reject it.
  const prior=_surfaceHistoryProjection(crystal._surfaceHistory,crystal.zones.slice(0,-1),null)?.view;
  if(!prior) {_surfaceInvalidate(crystal,zone.step,count);return;}
  for(const h of prior.horizons) {
    if(h.status==='no-longer-enclosed' || depths[count-1]<h.depth_um-1e-8) continue;
    const reached=_surfaceNear(depths[count],h.depth_um);
    if((reached && h.status==='buried') || (!reached && depths[count]<h.depth_um)) {
      _surfaceAppend(crystal,zone.step,{event:reached?'boundary-reached':'boundary-crossed',accepted_zone_index:count-1,
        horizon_id:h.id,from_um:depths[count-1]},crystal._film,count);
    }
  }
}

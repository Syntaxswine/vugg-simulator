#!/usr/bin/env python3
"""
🪨 Vugg Simulator — A text-based crystal growth engine

Simulates mineral crystallization inside a vug (cavity) under
evolving hydrothermal conditions. Text output describes what grows,
how it grows, and why.

Usage:
  python3 vugg.py                          # default scenario
  python3 vugg.py --scenario cooling       # simple cooling scenario  
  python3 vugg.py --scenario pulse         # fluid pulse event
  python3 vugg.py --scenario mvt           # Mississippi Valley-type deposit
  python3 vugg.py --steps 200             # more time steps
  python3 vugg.py --interactive           # manual control mode

The engine is modular — minerals are plugins, events are injectable,
and the output format is extensible.
"""

import argparse
import json
import math
import random
import sys
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple


# ============================================================
# PHYSICAL CONSTANTS AND MODELS
# ============================================================

@dataclass
class FluidChemistry:
    """Hydrothermal fluid composition."""
    SiO2: float = 500.0       # ppm — silica concentration
    Ca: float = 200.0          # ppm — calcium
    CO3: float = 150.0         # ppm — carbonate
    F: float = 10.0            # ppm — fluorine
    Zn: float = 0.0            # ppm — zinc
    S: float = 0.0             # ppm — sulfur
    Fe: float = 5.0            # ppm — iron (trace in quartz, major in sphalerite)
    Mn: float = 2.0            # ppm — manganese (fluorescence activator)
    Al: float = 3.0            # ppm — aluminum (smoky quartz)
    Ti: float = 0.5            # ppm — titanium (TitaniQ geothermometer)
    Pb: float = 0.0            # ppm — lead (sensitizer)
    pH: float = 6.5
    salinity: float = 5.0      # wt% NaCl equivalent

    def describe(self) -> str:
        """Human-readable fluid description."""
        parts = []
        if self.SiO2 > 300:
            parts.append(f"silica-rich ({self.SiO2:.0f} ppm SiO₂)")
        if self.Ca > 100:
            parts.append(f"Ca²⁺ {self.Ca:.0f} ppm")
        if self.Fe > 20:
            parts.append(f"Fe-bearing ({self.Fe:.0f} ppm)")
        if self.Mn > 5:
            parts.append(f"Mn-bearing ({self.Mn:.0f} ppm)")
        if self.Zn > 50:
            parts.append(f"Zn-rich ({self.Zn:.0f} ppm)")
        if self.S > 50:
            parts.append(f"sulfur-bearing ({self.S:.0f} ppm)")
        if self.F > 20:
            parts.append(f"fluorine-rich ({self.F:.0f} ppm)")
        if self.pH < 5:
            parts.append(f"acidic (pH {self.pH:.1f})")
        elif self.pH > 8:
            parts.append(f"alkaline (pH {self.pH:.1f})")
        return ", ".join(parts) if parts else "dilute"


@dataclass 
class VugConditions:
    """Current physical/chemical conditions in the vug."""
    temperature: float = 350.0    # °C
    pressure: float = 1.5         # kbar
    fluid: FluidChemistry = field(default_factory=FluidChemistry)
    flow_rate: float = 1.0        # relative (0 = stagnant, 1 = normal, 5 = flood)
    
    def supersaturation_quartz(self) -> float:
        """Calculate quartz supersaturation (simplified).
        
        Based on the solubility curve: SiO2 solubility increases with T.
        At equilibrium, higher T = more SiO2 dissolved.
        Supersaturation occurs when fluid cools below the T where its
        SiO2 concentration would be in equilibrium.
        
        Simplified model: solubility ≈ 50 * exp(0.008 * T) ppm
        """
        equilibrium_SiO2 = 50.0 * math.exp(0.008 * self.temperature)
        if equilibrium_SiO2 <= 0:
            return 0
        return self.fluid.SiO2 / equilibrium_SiO2
    
    def supersaturation_calcite(self) -> float:
        """Calcite supersaturation (simplified).
        
        Calcite has RETROGRADE solubility — less soluble at higher T.
        So heating causes precipitation (opposite of quartz).
        Simplified: solubility ≈ 300 * exp(-0.005 * T)
        """
        equilibrium_Ca = 300.0 * math.exp(-0.005 * self.temperature)
        if equilibrium_Ca <= 0:
            return 0
        ca_co3_product = min(self.fluid.Ca, self.fluid.CO3)
        return ca_co3_product / equilibrium_Ca
    
    def supersaturation_fluorite(self) -> float:
        """Fluorite (CaF2) supersaturation. Precipitates when Ca and F meet."""
        if self.fluid.Ca < 10 or self.fluid.F < 5:
            return 0
        # Simple product model
        product = (self.fluid.Ca / 200.0) * (self.fluid.F / 20.0)
        return product * math.exp(-0.003 * self.temperature)
    
    def supersaturation_sphalerite(self) -> float:
        """Sphalerite (ZnS) supersaturation. Needs Zn + S."""
        if self.fluid.Zn < 10 or self.fluid.S < 10:
            return 0
        product = (self.fluid.Zn / 100.0) * (self.fluid.S / 100.0)
        return product * 2.0 * math.exp(-0.004 * self.temperature)


# ============================================================
# CRYSTAL MODELS
# ============================================================

@dataclass
class GrowthZone:
    """A single growth zone — one layer of the crystal's history."""
    step: int
    temperature: float
    thickness_um: float          # micrometers
    growth_rate: float           # µm per step
    trace_Fe: float = 0.0       # ppm incorporated
    trace_Mn: float = 0.0
    trace_Al: float = 0.0
    trace_Ti: float = 0.0
    fluid_inclusion: bool = False
    inclusion_type: str = ""     # "2-phase", "3-phase", "vapor-rich"
    note: str = ""


@dataclass
class Crystal:
    """A growing crystal in the vug."""
    mineral: str
    crystal_id: int
    nucleation_step: int
    nucleation_temp: float
    position: str                  # "vug wall", "on sphalerite", etc.
    
    # Dimensions (simplified — c-axis and a-axis for hexagonal/trigonal)
    c_length_mm: float = 0.0      # length along c-axis
    a_width_mm: float = 0.0       # width perpendicular to c
    
    # Morphology
    habit: str = "prismatic"       # prismatic, tabular, acicular, massive, rhombohedral, etc.
    dominant_forms: List[str] = field(default_factory=list)
    twinned: bool = False
    twin_law: str = ""
    
    # Growth history
    zones: List[GrowthZone] = field(default_factory=list)
    total_growth_um: float = 0.0
    
    # State
    active: bool = True            # still growing?
    dissolved: bool = False        # partially dissolved?
    
    def add_zone(self, zone: GrowthZone):
        self.zones.append(zone)
        self.total_growth_um += zone.thickness_um
        self.c_length_mm = self.total_growth_um / 1000.0
        # Width grows slower than length for prismatic habit
        if self.habit == "prismatic":
            self.a_width_mm = self.c_length_mm * 0.4
        elif self.habit == "tabular":
            self.a_width_mm = self.c_length_mm * 1.5
        elif self.habit == "acicular":
            self.a_width_mm = self.c_length_mm * 0.15
        elif self.habit == "rhombohedral":
            self.a_width_mm = self.c_length_mm * 0.8
        else:
            self.a_width_mm = self.c_length_mm * 0.5
    
    def describe_morphology(self) -> str:
        forms = ", ".join(self.dominant_forms) if self.dominant_forms else self.habit
        twin_str = f", {self.twin_law} twin" if self.twinned else ""
        size = f"{self.c_length_mm:.1f} × {self.a_width_mm:.1f} mm"
        return f"{self.habit} [{forms}]{twin_str}, {size}"
    
    def describe_latest_zone(self) -> str:
        if not self.zones:
            return "no growth"
        z = self.zones[-1]
        parts = [f"+{z.thickness_um:.1f} µm"]
        traces = []
        if z.trace_Fe > 1:
            traces.append(f"Fe {z.trace_Fe:.1f}")
        if z.trace_Mn > 0.5:
            traces.append(f"Mn {z.trace_Mn:.1f}")
        if z.trace_Ti > 0.1:
            traces.append(f"Ti {z.trace_Ti:.2f}")
        if z.trace_Al > 1:
            traces.append(f"Al {z.trace_Al:.1f}")
        if traces:
            parts.append(f"traces: {', '.join(traces)} ppm")
        if z.fluid_inclusion:
            parts.append(f"fluid inclusion ({z.inclusion_type})")
        if z.note:
            parts.append(z.note)
        return "; ".join(parts)
    
    def predict_fluorescence(self) -> str:
        """Predict UV fluorescence based on trace element history."""
        avg_Mn = sum(z.trace_Mn for z in self.zones) / max(len(self.zones), 1)
        avg_Fe = sum(z.trace_Fe for z in self.zones) / max(len(self.zones), 1)
        
        if self.mineral == "calcite":
            if avg_Mn > 2 and avg_Fe < 10:
                return "orange-red (Mn²⁺ activated)"
            elif avg_Mn > 2 and avg_Fe > 10:
                return "weak/quenched (Fe²⁺ quenching Mn²⁺ emission)"
            else:
                return "non-fluorescent"
        elif self.mineral == "fluorite":
            return "blue-violet (REE/defect centers)"
        elif self.mineral == "quartz":
            avg_Al = sum(z.trace_Al for z in self.zones) / max(len(self.zones), 1)
            if avg_Al > 5:
                return "weak blue (Al-related defects)"
            return "non-fluorescent"
        return "unknown"


# ============================================================
# MINERAL GROWTH ENGINES (plugins)
# ============================================================

def grow_quartz(crystal: Crystal, conditions: VugConditions, step: int) -> Optional[GrowthZone]:
    """Quartz growth model."""
    sigma = conditions.supersaturation_quartz()
    
    if sigma < 1.0:
        # Undersaturated — dissolution
        if crystal.total_growth_um > 10:
            crystal.dissolved = True
            return GrowthZone(
                step=step, temperature=conditions.temperature,
                thickness_um=-5.0, growth_rate=-5.0,
                note="dissolution — etching on prism faces"
            )
        return None
    
    # Growth rate: BCF spiral growth simplified
    # rate ∝ (σ - 1)² for spiral growth at low supersaturation
    # rate ∝ (σ - 1) for 2D nucleation at high supersaturation
    excess = sigma - 1.0
    if excess < 0.5:
        rate = 8.0 * excess * excess  # slow, orderly spiral growth
    else:
        rate = 4.0 * excess           # faster, may produce growth hillocks
    
    # Temperature effect on rate
    rate *= math.exp(-3000.0 / (conditions.temperature + 273.15)) * 50.0
    
    # Add some natural variation
    rate *= random.uniform(0.7, 1.3)
    
    if rate < 0.1:
        return None  # negligible growth
    
    # Trace element incorporation
    # Ti incorporation increases with T (TitaniQ)
    Ti_partition = 0.01 * math.exp(0.005 * conditions.temperature)
    trace_Ti = conditions.fluid.Ti * Ti_partition
    
    # Al incorporation (smoky quartz potential)  
    Al_partition = 0.02 * (1 + 0.5 * excess)
    trace_Al = conditions.fluid.Al * Al_partition
    
    # Fe — very low partition into quartz
    trace_Fe = conditions.fluid.Fe * 0.005
    
    # Mn — trace
    trace_Mn = conditions.fluid.Mn * 0.003
    
    # Fluid inclusions — more likely at growth zone boundaries, fast growth
    fi = False
    fi_type = ""
    if rate > 15 and random.random() < 0.3:
        fi = True
        if conditions.temperature > 300:
            fi_type = "2-phase (liquid + vapor)"
        elif conditions.temperature > 200:
            fi_type = "2-phase (liquid-dominant)"
        else:
            fi_type = "single-phase liquid"
    
    # Morphology updates
    if conditions.temperature > 400:
        crystal.habit = "prismatic"
        crystal.dominant_forms = ["m{100} prism", "r{101} rhombohedron"]
    elif conditions.temperature > 250:
        crystal.habit = "prismatic"  
        crystal.dominant_forms = ["m{100} prism", "r{101}", "z{011}"]
    elif conditions.temperature > 150:
        crystal.dominant_forms = ["m{100}", "r{101}", "z{011} dominant"]
        if excess > 1.0:
            crystal.habit = "scepter overgrowth possible"
    else:
        crystal.dominant_forms = ["m{100}", "r{101}", "z{011}"]
        if excess > 1.5:
            crystal.habit = "skeletal/fenster"
    
    # Twinning — Dauphiné twin from thermal shock
    if not crystal.twinned and len(crystal.zones) > 5:
        if len(crystal.zones) >= 2:
            prev_T = crystal.zones[-1].temperature
            delta_T = abs(conditions.temperature - prev_T)
            if delta_T > 30 and random.random() < 0.4:
                crystal.twinned = True
                crystal.twin_law = "Dauphiné"
    
    note = ""
    if excess > 1.5:
        note = "rapid growth — growth hillocks developing on prism faces"
    elif excess > 1.0:
        note = "moderate supersaturation — clean layer growth"
    elif excess < 0.2:
        note = "near-equilibrium — very slow, high-quality growth"
    
    return GrowthZone(
        step=step, temperature=conditions.temperature,
        thickness_um=rate, growth_rate=rate,
        trace_Fe=trace_Fe, trace_Mn=trace_Mn,
        trace_Al=trace_Al, trace_Ti=trace_Ti,
        fluid_inclusion=fi, inclusion_type=fi_type,
        note=note
    )


def grow_calcite(crystal: Crystal, conditions: VugConditions, step: int) -> Optional[GrowthZone]:
    """Calcite growth model — retrograde solubility."""
    sigma = conditions.supersaturation_calcite()
    
    if sigma < 1.0:
        return None  # undersaturated for calcite
    
    excess = sigma - 1.0
    rate = 5.0 * excess * random.uniform(0.8, 1.2)
    
    # Mn incorporation — THE fluorescence activator
    Mn_partition = 0.1 * (1 + excess * 0.5)
    trace_Mn = conditions.fluid.Mn * Mn_partition
    
    # Fe incorporation — THE fluorescence QUENCHER
    Fe_partition = 0.08
    trace_Fe = conditions.fluid.Fe * Fe_partition
    
    # Morphology
    if conditions.temperature > 200:
        crystal.habit = "scalenohedral"
        crystal.dominant_forms = ["v{211} scalenohedron", "dog-tooth"]
    elif conditions.temperature > 100:
        crystal.habit = "rhombohedral"
        crystal.dominant_forms = ["e{104} rhombohedron"]
    else:
        crystal.habit = "rhombohedral"
        crystal.dominant_forms = ["e{104}", "possibly nail-head"]
    
    # Calcite twins easily
    if not crystal.twinned and random.random() < 0.1:
        crystal.twinned = True
        crystal.twin_law = "c-twin {001}"
    
    note = ""
    if trace_Mn > 1.0 and trace_Fe < 2.0:
        note = "Mn-rich zone — will fluoresce orange under UV"
    elif trace_Mn > 1.0 and trace_Fe > 2.0:
        note = "Fe quenching Mn fluorescence — dark CL zone"
    
    fi = False
    fi_type = ""
    if rate > 8 and random.random() < 0.2:
        fi = True
        fi_type = "2-phase" if conditions.temperature > 150 else "single-phase"
    
    return GrowthZone(
        step=step, temperature=conditions.temperature,
        thickness_um=rate, growth_rate=rate,
        trace_Fe=trace_Fe, trace_Mn=trace_Mn,
        fluid_inclusion=fi, inclusion_type=fi_type,
        note=note
    )


def grow_sphalerite(crystal: Crystal, conditions: VugConditions, step: int) -> Optional[GrowthZone]:
    """Sphalerite (ZnS) growth model."""
    sigma = conditions.supersaturation_sphalerite()
    
    if sigma < 1.0:
        return None
    
    excess = sigma - 1.0
    rate = 6.0 * excess * random.uniform(0.7, 1.3)
    
    # Fe substitution — determines color and is a geothermometer
    # More Fe at higher T
    Fe_mol_percent = min(conditions.fluid.Fe * 0.1 * (conditions.temperature / 300.0), 30.0)
    trace_Fe = Fe_mol_percent * 10  # rough ppm equivalent for display
    
    crystal.habit = "tetrahedral"
    crystal.dominant_forms = ["{111} tetrahedron"]
    
    # Color from Fe content
    if Fe_mol_percent > 15:
        color_note = "black (marmatite — high Fe)"
    elif Fe_mol_percent > 8:
        color_note = "dark brown"
    elif Fe_mol_percent > 3:
        color_note = "honey/amber"
    else:
        color_note = "pale yellow (cleiophane — gem quality)"
    
    # Twinning common in sphalerite
    if not crystal.twinned and random.random() < 0.15:
        crystal.twinned = True
        crystal.twin_law = "spinel-law {111}"
    
    return GrowthZone(
        step=step, temperature=conditions.temperature,
        thickness_um=rate, growth_rate=rate,
        trace_Fe=trace_Fe,
        note=f"color: {color_note}, Fe: {Fe_mol_percent:.1f} mol%"
    )


def grow_fluorite(crystal: Crystal, conditions: VugConditions, step: int) -> Optional[GrowthZone]:
    """Fluorite (CaF2) growth model."""
    sigma = conditions.supersaturation_fluorite()
    
    if sigma < 1.0:
        return None
    
    excess = sigma - 1.0
    rate = 7.0 * excess * random.uniform(0.8, 1.2)
    
    crystal.habit = "cubic"
    crystal.dominant_forms = ["{100} cube"]
    
    # Color zoning — fluorite is famous for it
    if conditions.fluid.Fe > 10:
        color = "green"
    elif conditions.fluid.Mn > 5:
        color = "purple"
    elif conditions.temperature > 200:
        color = "colorless"
    else:
        color = "blue-violet"
    
    if not crystal.twinned and random.random() < 0.08:
        crystal.twinned = True
        crystal.twin_law = "penetration twin {111}"
    
    return GrowthZone(
        step=step, temperature=conditions.temperature,
        thickness_um=rate, growth_rate=rate,
        trace_Fe=conditions.fluid.Fe * 0.02,
        trace_Mn=conditions.fluid.Mn * 0.05,
        note=f"color zone: {color}"
    )


# Mineral registry
MINERAL_ENGINES = {
    "quartz": grow_quartz,
    "calcite": grow_calcite,
    "sphalerite": grow_sphalerite,
    "fluorite": grow_fluorite,
}


# ============================================================
# EVENT SYSTEM
# ============================================================

@dataclass
class Event:
    """A geological event that modifies vug conditions."""
    step: int
    name: str
    description: str
    apply_fn: object  # callable(VugConditions) -> str


def event_fluid_pulse(conditions: VugConditions) -> str:
    """New fluid floods the vug — chemistry changes sharply."""
    conditions.fluid.SiO2 *= 1.8
    conditions.fluid.Fe *= 3.0
    conditions.fluid.Mn *= 2.5
    conditions.fluid.pH -= 0.5
    conditions.flow_rate = 5.0
    return "Fresh hydrothermal fluid floods the vug. Silica and metals spike."


def event_cooling_pulse(conditions: VugConditions) -> str:
    """Rapid cooling event — maybe meteoric water mixing."""
    conditions.temperature -= 50
    conditions.fluid.SiO2 *= 0.6  # some silica precipitates out
    conditions.flow_rate = 3.0
    return f"Meteoric water incursion. Temperature drops to {conditions.temperature:.0f}°C."


def event_tectonic_shock(conditions: VugConditions) -> str:
    """Pressure spike — fracturing, twinning trigger."""
    conditions.pressure += 0.5
    conditions.temperature += 15  # adiabatic compression
    return "Tectonic event. Pressure spike. Crystals may twin."


def event_fluid_mixing(conditions: VugConditions) -> str:
    """Two fluids meet — classic MVT mechanism."""
    conditions.fluid.Zn = 150.0
    conditions.fluid.S = 120.0
    conditions.fluid.Ca += 100.0
    conditions.fluid.F += 15.0
    conditions.fluid.Fe += 30.0
    conditions.temperature -= 20
    return "Fluid mixing event. Metal-bearing brine meets sulfur-bearing groundwater. Sphalerite and fluorite become possible."


# ============================================================
# SCENARIOS
# ============================================================

def scenario_cooling() -> Tuple[VugConditions, List[Event], int]:
    """Simple cooling scenario — hot fluid cools slowly in a vug."""
    conditions = VugConditions(
        temperature=380.0,
        pressure=1.5,
        fluid=FluidChemistry(SiO2=600, Ca=150, CO3=100, Fe=8, Mn=3, Ti=0.8, Al=4)
    )
    events = []
    return conditions, events, 100


def scenario_pulse() -> Tuple[VugConditions, List[Event], int]:
    """Cooling with a fluid pulse event mid-growth."""
    conditions = VugConditions(
        temperature=350.0,
        pressure=1.2,
        fluid=FluidChemistry(SiO2=500, Ca=200, CO3=120, Fe=5, Mn=2, Ti=0.5, Al=3)
    )
    events = [
        Event(40, "Fluid Pulse", "Fresh hydrothermal fluid", event_fluid_pulse),
        Event(70, "Cooling Pulse", "Meteoric water mixing", event_cooling_pulse),
    ]
    return conditions, events, 100


def scenario_mvt() -> Tuple[VugConditions, List[Event], int]:
    """Mississippi Valley-type deposit — fluid mixing produces sphalerite + calcite + fluorite."""
    conditions = VugConditions(
        temperature=180.0,
        pressure=0.3,
        fluid=FluidChemistry(
            SiO2=100, Ca=300, CO3=250, Fe=15, Mn=8,
            Zn=0, S=0, F=5, pH=7.2, salinity=15.0
        )
    )
    events = [
        Event(20, "Fluid Mixing", "Brine meets groundwater", event_fluid_mixing),
        Event(60, "Second Pulse", "Another mixing event", event_fluid_pulse),
        Event(80, "Tectonic", "Minor seismic event", event_tectonic_shock),
    ]
    return conditions, events, 120


SCENARIOS = {
    "cooling": scenario_cooling,
    "pulse": scenario_pulse,
    "mvt": scenario_mvt,
}


# ============================================================
# SIMULATION ENGINE
# ============================================================

class VugSimulator:
    """The main simulation engine."""
    
    def __init__(self, conditions: VugConditions, events: List[Event] = None):
        self.conditions = conditions
        self.events = sorted(events or [], key=lambda e: e.step)
        self.crystals: List[Crystal] = []
        self.crystal_counter = 0
        self.step = 0
        self.log: List[str] = []
    
    def nucleate(self, mineral: str, position: str = "vug wall") -> Crystal:
        """Nucleate a new crystal."""
        self.crystal_counter += 1
        crystal = Crystal(
            mineral=mineral,
            crystal_id=self.crystal_counter,
            nucleation_step=self.step,
            nucleation_temp=self.conditions.temperature,
            position=position
        )
        if mineral == "quartz":
            crystal.habit = "prismatic"
            crystal.dominant_forms = ["m{100} prism", "r{101} rhombohedron"]
        elif mineral == "calcite":
            crystal.habit = "rhombohedral"
            crystal.dominant_forms = ["e{104} rhombohedron"]
        elif mineral == "sphalerite":
            crystal.habit = "tetrahedral"
            crystal.dominant_forms = ["{111} tetrahedron"]
        elif mineral == "fluorite":
            crystal.habit = "cubic"
            crystal.dominant_forms = ["{100} cube"]
        self.crystals.append(crystal)
        return crystal
    
    def check_nucleation(self):
        """Check if new crystals should nucleate."""
        # Quartz nucleation
        sigma_q = self.conditions.supersaturation_quartz()
        existing_quartz = [c for c in self.crystals if c.mineral == "quartz" and c.active]
        if sigma_q > 1.2 and len(existing_quartz) < 3:
            if not existing_quartz or (sigma_q > 2.0 and random.random() < 0.3):
                c = self.nucleate("quartz")
                self.log.append(f"  ✦ NUCLEATION: Quartz #{c.crystal_id} on {c.position} "
                              f"(T={self.conditions.temperature:.0f}°C, σ={sigma_q:.2f})")
        
        # Calcite nucleation  
        sigma_c = self.conditions.supersaturation_calcite()
        existing_calcite = [c for c in self.crystals if c.mineral == "calcite" and c.active]
        if sigma_c > 1.3 and not existing_calcite:
            c = self.nucleate("calcite")
            self.log.append(f"  ✦ NUCLEATION: Calcite #{c.crystal_id} on {c.position} "
                          f"(T={self.conditions.temperature:.0f}°C, σ={sigma_c:.2f})")
        
        # Sphalerite nucleation
        sigma_s = self.conditions.supersaturation_sphalerite()
        existing_sph = [c for c in self.crystals if c.mineral == "sphalerite" and c.active]
        if sigma_s > 1.0 and not existing_sph:
            c = self.nucleate("sphalerite", position="vug wall")
            self.log.append(f"  ✦ NUCLEATION: Sphalerite #{c.crystal_id} on {c.position} "
                          f"(T={self.conditions.temperature:.0f}°C, σ={sigma_s:.2f})")
        
        # Fluorite nucleation
        sigma_f = self.conditions.supersaturation_fluorite()
        existing_fl = [c for c in self.crystals if c.mineral == "fluorite" and c.active]
        if sigma_f > 1.2 and not existing_fl:
            c = self.nucleate("fluorite", position="vug wall")
            self.log.append(f"  ✦ NUCLEATION: Fluorite #{c.crystal_id} on {c.position}")
    
    def apply_events(self):
        """Apply any events scheduled for this step."""
        for event in self.events:
            if event.step == self.step:
                result = event.apply_fn(self.conditions)
                self.log.append(f"\n  ⚡ EVENT: {event.name}")
                self.log.append(f"     {result}")
                self.log.append("")
    
    def ambient_cooling(self, rate: float = 1.5):
        """Default ambient cooling per step."""
        self.conditions.temperature -= rate * random.uniform(0.8, 1.2)
        self.conditions.temperature = max(self.conditions.temperature, 25)
        
        # Flow rate decays toward normal
        if self.conditions.flow_rate > 1.0:
            self.conditions.flow_rate *= 0.9
        
        # Slight fluid evolution — silica depletes as quartz grows
        active_quartz = [c for c in self.crystals if c.mineral == "quartz" and c.active]
        if active_quartz:
            depletion = sum(c.zones[-1].thickness_um if c.zones else 0 for c in active_quartz) * 0.1
            self.conditions.fluid.SiO2 = max(self.conditions.fluid.SiO2 - depletion, 10)
    
    def run_step(self) -> List[str]:
        """Execute one time step."""
        self.log = []
        self.step += 1
        
        # Apply events first
        self.apply_events()
        
        # Check for new nucleation
        self.check_nucleation()
        
        # Grow existing crystals
        for crystal in self.crystals:
            if not crystal.active:
                continue
            
            engine = MINERAL_ENGINES.get(crystal.mineral)
            if not engine:
                continue
            
            zone = engine(crystal, self.conditions, self.step)
            if zone:
                crystal.add_zone(zone)
                if zone.thickness_um < 0:
                    self.log.append(f"  ⬇ {crystal.mineral.capitalize()} #{crystal.crystal_id}: "
                                  f"DISSOLUTION {zone.note}")
                elif abs(zone.thickness_um) > 0.5:
                    self.log.append(f"  ▲ {crystal.mineral.capitalize()} #{crystal.crystal_id}: "
                                  f"{crystal.describe_latest_zone()}")
        
        # Ambient cooling
        self.ambient_cooling()
        
        return self.log
    
    def format_header(self) -> str:
        """Format the step header."""
        c = self.conditions
        sigma_q = c.supersaturation_quartz()
        sigma_c = c.supersaturation_calcite()
        header = (f"═══ Step {self.step:3d} │ "
                 f"T={c.temperature:6.1f}°C │ "
                 f"P={c.pressure:.2f} kbar │ "
                 f"pH={c.fluid.pH:.1f} │ "
                 f"σ(Qz)={sigma_q:.2f} σ(Cal)={sigma_c:.2f} │ "
                 f"Fluid: {c.fluid.describe()}")
        return header
    
    def format_summary(self) -> str:
        """Final summary of all crystals."""
        lines = ["\n" + "═" * 70]
        lines.append("FINAL VUG INVENTORY")
        lines.append("═" * 70)
        
        for c in self.crystals:
            lines.append(f"\n{c.mineral.upper()} #{c.crystal_id}")
            lines.append(f"  Nucleated: step {c.nucleation_step} at {c.nucleation_temp:.0f}°C")
            lines.append(f"  Position: {c.position}")
            lines.append(f"  Morphology: {c.describe_morphology()}")
            lines.append(f"  Growth zones: {len(c.zones)}")
            lines.append(f"  Total growth: {c.total_growth_um:.0f} µm ({c.c_length_mm:.1f} mm)")
            
            # Fluid inclusions
            fi_count = sum(1 for z in c.zones if z.fluid_inclusion)
            if fi_count:
                fi_types = set(z.inclusion_type for z in c.zones if z.fluid_inclusion)
                lines.append(f"  Fluid inclusions: {fi_count} ({', '.join(fi_types)})")
            
            if c.twinned:
                lines.append(f"  Twinning: {c.twin_law}")
            
            if c.dissolved:
                lines.append(f"  Note: partially dissolved (late-stage undersaturation)")
            
            # Fluorescence prediction
            fl = c.predict_fluorescence()
            if fl != "non-fluorescent":
                lines.append(f"  Predicted UV fluorescence: {fl}")
            
            # Temperature range from zones
            if c.zones:
                temps = [z.temperature for z in c.zones]
                lines.append(f"  Growth temperature range: {min(temps):.0f}–{max(temps):.0f}°C")
                
                # Ti-in-quartz geothermometer
                if c.mineral == "quartz":
                    ti_vals = [z.trace_Ti for z in c.zones if z.trace_Ti > 0]
                    if ti_vals:
                        avg_ti = sum(ti_vals) / len(ti_vals)
                        lines.append(f"  Avg Ti-in-quartz: {avg_ti:.3f} ppm "
                                   f"(TitaniQ range: {min(temps):.0f}–{max(temps):.0f}°C)")
        
        lines.append("\n" + "═" * 70)
        
        # Add narrative summary
        narrative = self.narrate()
        if narrative:
            lines.append("\nGEOLOGICAL HISTORY")
            lines.append("─" * 70)
            lines.append(narrative)
            lines.append("═" * 70)
        
        return "\n".join(lines)
    
    def narrate(self) -> str:
        """Generate a legends-mode narrative of the vug's history."""
        if not self.crystals:
            return "The vug remained empty. No minerals precipitated under these conditions."
        
        paragraphs = []
        
        # Opening — what kind of vug is this?
        first_crystal = self.crystals[0]
        start_T = first_crystal.nucleation_temp
        mineral_names = list(set(c.mineral for c in self.crystals))
        
        if start_T > 300:
            setting = "deep hydrothermal"
        elif start_T > 150:
            setting = "moderate-temperature hydrothermal"
        else:
            setting = "low-temperature"
        
        paragraphs.append(
            f"This vug records a {setting} crystallization history beginning at "
            f"{start_T:.0f}°C. {len(self.crystals)} crystals grew across "
            f"{self.step} time steps, producing an assemblage of "
            f"{', '.join(mineral_names)}."
        )
        
        # Tell the story phase by phase
        # Phase 1: first mineral(s) to nucleate
        first_step = min(c.nucleation_step for c in self.crystals)
        first_minerals = [c for c in self.crystals if c.nucleation_step == first_step]
        
        for c in first_minerals:
            if c.mineral == "calcite":
                paragraphs.append(
                    f"Calcite was the first mineral to crystallize, nucleating on the "
                    f"vug wall at {c.nucleation_temp:.0f}°C. "
                    + self._narrate_calcite(c)
                )
            elif c.mineral == "quartz":
                paragraphs.append(
                    f"Quartz nucleated first at {c.nucleation_temp:.0f}°C on the vug wall. "
                    + self._narrate_quartz(c)
                )
            else:
                paragraphs.append(
                    f"{c.mineral.capitalize()} nucleated at {c.nucleation_temp:.0f}°C.")
        
        # Subsequent minerals — what triggered them?
        later_crystals = [c for c in self.crystals if c.nucleation_step > first_step]
        if later_crystals:
            # Group by nucleation step
            nuc_steps = sorted(set(c.nucleation_step for c in later_crystals))
            for ns in nuc_steps:
                batch = [c for c in later_crystals if c.nucleation_step == ns]
                batch_names = [c.mineral for c in batch]
                
                # Check if an event triggered this
                triggering_event = None
                for e in self.events:
                    if abs(e.step - ns) <= 2:
                        triggering_event = e
                        break
                
                if triggering_event:
                    if "mixing" in triggering_event.name.lower():
                        paragraphs.append(
                            f"A fluid mixing event at step {triggering_event.step} transformed "
                            f"the vug's chemistry. "
                            + self._narrate_mixing_event(batch, triggering_event)
                        )
                    elif "pulse" in triggering_event.name.lower():
                        paragraphs.append(
                            f"A fresh pulse of hydrothermal fluid at step {triggering_event.step} "
                            f"introduced new chemistry. {', '.join(c.capitalize() for c in set(batch_names))} "
                            f"nucleated in response."
                        )
                    elif "tectonic" in triggering_event.name.lower():
                        paragraphs.append(
                            f"A tectonic event at step {triggering_event.step} produced a "
                            f"pressure spike." + self._narrate_tectonic(batch)
                        )
                else:
                    paragraphs.append(
                        f"As temperature continued to fall, "
                        f"{' and '.join(set(batch_names))} nucleated at step {ns} "
                        f"({batch[0].nucleation_temp:.0f}°C)."
                    )
        
        # Narrate individual crystal stories for the larger ones
        significant = [c for c in self.crystals if c.total_growth_um > 100]
        for c in significant:
            if c.mineral == "quartz":
                story = self._narrate_quartz(c)
            elif c.mineral == "calcite":
                story = self._narrate_calcite(c)
            elif c.mineral == "sphalerite":
                story = self._narrate_sphalerite(c)
            elif c.mineral == "fluorite":
                story = self._narrate_fluorite(c)
            else:
                story = ""
            if story and c not in first_minerals:
                paragraphs.append(story)
        
        # Closing — what would a collector see?
        paragraphs.append(self._narrate_collectors_view())
        
        return "\n\n".join(paragraphs)
    
    def _narrate_calcite(self, c: Crystal) -> str:
        """Narrate a calcite crystal's story."""
        parts = []
        if c.zones:
            # Check for fluorescence zoning
            mn_zones = [z for z in c.zones if z.trace_Mn > 1.0 and z.trace_Fe < 2.0]
            fe_zones = [z for z in c.zones if z.trace_Fe > 3.0]
            
            if mn_zones and fe_zones:
                mn_end = mn_zones[-1].step
                fe_start = fe_zones[0].step
                if fe_start > mn_end - 5:
                    parts.append(
                        f"Early growth zones are manganese-rich and would fluoresce "
                        f"orange under UV light. After step {fe_start}, iron flooded "
                        f"the system and quenched the fluorescence — later zones would "
                        f"appear dark under cathodoluminescence. The boundary between "
                        f"glowing and dark records the moment the fluid chemistry changed."
                    )
            elif mn_zones:
                parts.append(
                    f"The crystal incorporated manganese throughout growth and would "
                    f"fluoresce orange under shortwave UV — a classic Mn²⁺-activated "
                    f"calcite."
                )
        
        if c.twinned:
            parts.append(
                f"The crystal is twinned on {c.twin_law}, a common deformation twin "
                f"in calcite that can form during growth or post-crystallization stress."
            )
        
        size_desc = "microscopic" if c.c_length_mm < 0.5 else "small" if c.c_length_mm < 2 else "well-developed"
        parts.append(f"Final size: {size_desc} ({c.c_length_mm:.1f} mm), {c.habit} habit.")
        
        return " ".join(parts)
    
    def _narrate_quartz(self, c: Crystal) -> str:
        """Narrate a quartz crystal's story."""
        parts = []
        
        if not c.zones:
            return f"Quartz #{c.crystal_id} nucleated but failed to develop — growth kinetics were too slow at {c.nucleation_temp:.0f}°C."
        
        # Check for Ti variation (geothermometer)
        if c.zones:
            ti_vals = [z.trace_Ti for z in c.zones if z.trace_Ti > 0]
            if ti_vals and max(ti_vals) > 0.01:
                parts.append(
                    f"Titanium incorporation decreases through the growth zones from "
                    f"{max(ti_vals):.3f} to {min(ti_vals):.3f} ppm, recording the cooling "
                    f"history via the TitaniQ geothermometer."
                )
        
        # Fluid inclusions
        fi_zones = [z for z in c.zones if z.fluid_inclusion]
        if fi_zones:
            fi_types = set(z.inclusion_type for z in fi_zones)
            parts.append(
                f"The crystal trapped {len(fi_zones)} fluid inclusions ({', '.join(fi_types)}), "
                f"preserving samples of the parent fluid at the moment of entrapment."
            )
        
        # Twinning
        if c.twinned:
            parts.append(
                f"A {c.twin_law} twin formed during growth — likely triggered by a "
                f"thermal shock event that introduced a rotational domain boundary."
            )
        
        # Growth character
        fast_zones = [z for z in c.zones if z.growth_rate > 15]
        slow_zones = [z for z in c.zones if 0 < z.growth_rate < 2]
        if fast_zones and slow_zones:
            parts.append(
                f"Growth alternated between rapid pulses (up to {max(z.growth_rate for z in fast_zones):.0f} µm/step, "
                f"producing growth hillocks) and slow, high-quality periods near equilibrium. "
                f"This oscillation would be visible as alternating clear and milky zones."
            )
        
        size_desc = "microscopic" if c.c_length_mm < 0.5 else "thumbnail" if c.c_length_mm < 5 else "cabinet-sized"
        parts.append(f"Final size: {size_desc} ({c.c_length_mm:.1f} × {c.a_width_mm:.1f} mm).")
        
        return " ".join(parts)
    
    def _narrate_sphalerite(self, c: Crystal) -> str:
        """Narrate a sphalerite crystal's story."""
        parts = [f"Sphalerite #{c.crystal_id} grew to {c.c_length_mm:.1f} mm."]
        
        if c.zones:
            fe_vals = [z.trace_Fe for z in c.zones if z.trace_Fe > 0]
            if fe_vals:
                max_fe = max(fe_vals)
                min_fe = min(fe_vals)
                if max_fe > min_fe * 1.5:
                    # Find the color story
                    early_fe = sum(z.trace_Fe for z in c.zones[:len(c.zones)//3]) / max(len(c.zones)//3, 1)
                    late_fe = sum(z.trace_Fe for z in c.zones[-len(c.zones)//3:]) / max(len(c.zones)//3, 1)
                    
                    if early_fe < late_fe:
                        parts.append(
                            f"Iron content increased through growth — early zones are pale "
                            f"(low Fe, cleiophane variety) grading to darker amber or brown "
                            f"as the fluid became more iron-rich. This color zoning would be "
                            f"visible in a polished cross-section."
                        )
                    else:
                        parts.append(
                            f"Iron content decreased through growth — the crystal darkened "
                            f"early (higher Fe, approaching marmatite) then cleared as iron "
                            f"was depleted from the fluid."
                        )
        
        if c.twinned:
            parts.append(
                f"Twinned on the {c.twin_law} — a common growth twin in sphalerite "
                f"that creates triangular re-entrant faces."
            )
        
        return " ".join(parts)
    
    def _narrate_fluorite(self, c: Crystal) -> str:
        """Narrate a fluorite crystal's story."""
        parts = [f"Fluorite #{c.crystal_id} grew as {c.habit} crystals to {c.c_length_mm:.1f} mm."]
        
        # Color zones
        if c.zones:
            colors = set()
            for z in c.zones:
                if z.note and "color zone:" in z.note:
                    color = z.note.split("color zone:")[1].strip()
                    colors.add(color)
            if len(colors) > 1:
                parts.append(
                    f"Color zoning present: {', '.join(colors)} zones reflecting "
                    f"changing trace element chemistry during growth."
                )
            elif colors:
                parts.append(f"Uniformly {list(colors)[0]}.")
        
        if c.twinned:
            parts.append(f"Shows {c.twin_law} twinning — two interpenetrating cubes.")
        
        fl = c.predict_fluorescence()
        if fl != "non-fluorescent":
            parts.append(f"Would show {fl} under UV excitation.")
        
        return " ".join(parts)
    
    def _narrate_mixing_event(self, batch: List[Crystal], event: Event) -> str:
        """Narrate what happened after a fluid mixing event."""
        mineral_names = set(c.mineral for c in batch)
        parts = []
        
        if "sphalerite" in mineral_names and "fluorite" in mineral_names:
            parts.append(
                "When metal-bearing brine met sulfur-bearing groundwater, "
                "sphalerite (ZnS) and fluorite (CaF₂) nucleated simultaneously — "
                "a classic Mississippi Valley-type precipitation event. "
                "The zinc and sulfur couldn't coexist in solution; they combined "
                "on contact and the minerals fell out of the fluid like rain."
            )
        elif "sphalerite" in mineral_names:
            parts.append(
                "Sphalerite nucleated as zinc-bearing brine mixed with sulfur-rich "
                "groundwater. The two fluids were stable apart; together, ZnS "
                "became insoluble."
            )
        
        return " ".join(parts)
    
    def _narrate_tectonic(self, batch: List[Crystal]) -> str:
        """Narrate tectonic event effects."""
        twinned = [c for c in self.crystals if c.twinned]
        if twinned:
            names = [f"{c.mineral} #{c.crystal_id}" for c in twinned]
            return (
                f" The stress may have induced twinning in {', '.join(names)}. "
                f"Twin planes formed as the crystal lattice accommodated the "
                f"sudden strain — a record of the event frozen in the structure."
            )
        return " No visible twinning resulted, but the pressure change altered subsequent growth conditions."
    
    def _narrate_collectors_view(self) -> str:
        """What would a collector see picking up this specimen?"""
        parts = ["A collector examining this specimen would find:"]
        
        for c in self.crystals:
            if c.total_growth_um < 10 and not c.zones:
                continue
            
            if c.mineral == "quartz":
                if c.c_length_mm > 2:
                    desc = f"a {c.c_length_mm:.1f}mm quartz crystal"
                    if c.twinned:
                        desc += f" ({c.twin_law} twinned)"
                    fi_count = sum(1 for z in c.zones if z.fluid_inclusion)
                    if fi_count > 3:
                        desc += f" with visible fluid inclusions"
                    parts.append(f"  • {desc}")
                elif c.c_length_mm > 0.1:
                    parts.append(f"  • tiny quartz crystals on the vug wall")
            
            elif c.mineral == "calcite":
                fl = c.predict_fluorescence()
                desc = f"a {c.c_length_mm:.1f}mm {c.habit} calcite"
                if c.twinned:
                    desc += f" (twinned)"
                if "orange" in fl:
                    desc += f" — glows orange under UV"
                elif "quenched" in fl:
                    desc += f" — patchy UV response (Mn zones glow, Fe zones dark)"
                parts.append(f"  • {desc}")
            
            elif c.mineral == "sphalerite":
                desc = f"a {c.c_length_mm:.1f}mm sphalerite"
                if c.twinned:
                    desc += f" ({c.twin_law})"
                # Get dominant color from late zones
                if c.zones:
                    last_note = c.zones[-1].note
                    if "color:" in last_note:
                        color = last_note.split("color:")[1].split(",")[0].strip()
                        desc += f", {color}"
                parts.append(f"  • {desc}")
            
            elif c.mineral == "fluorite":
                desc = f"a {c.c_length_mm:.1f}mm fluorite cube"
                if c.twinned:
                    desc += f" (penetration twin)"
                fl = c.predict_fluorescence()
                if fl != "non-fluorescent":
                    desc += f" — fluoresces {fl.split('(')[0].strip()}"
                parts.append(f"  • {desc}")
        
        if len(parts) == 1:
            return "The vug produced only microscopic crystals — a thin crust on the cavity wall."
        
        return "\n".join(parts)


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(description='🪨 Vugg Simulator — crystal growth engine')
    parser.add_argument('--scenario', choices=list(SCENARIOS.keys()), default='cooling',
                        help='Growth scenario (default: cooling)')
    parser.add_argument('--steps', type=int, default=None,
                        help='Override number of steps')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Show every step (default: show every 5th + events)')
    parser.add_argument('--summary-only', action='store_true',
                        help='Only show final summary')
    parser.add_argument('--seed', type=int, default=None,
                        help='Random seed for reproducibility')
    parser.add_argument('--json', action='store_true',
                        help='Output final state as JSON')
    parser.add_argument('--interactive', '-i', action='store_true',
                        help='Interactive mode — pause between steps')
    
    args = parser.parse_args()
    
    if args.seed is not None:
        random.seed(args.seed)
    
    # Load scenario
    scenario_fn = SCENARIOS[args.scenario]
    conditions, events, default_steps = scenario_fn()
    total_steps = args.steps or default_steps
    
    print(f"🪨 Vugg Simulator — {args.scenario} scenario")
    print(f"   {total_steps} time steps, starting at {conditions.temperature:.0f}°C, {conditions.pressure:.1f} kbar")
    print(f"   Initial fluid: {conditions.fluid.describe()}")
    print(f"   Events: {len(events)}")
    for e in events:
        print(f"     Step {e.step}: {e.name}")
    print("═" * 70)
    
    sim = VugSimulator(conditions, events)
    
    for step in range(total_steps):
        log = sim.run_step()
        
        if args.summary_only:
            continue
        
        # Print logic: show every 5th step, or any step with events/nucleation/significant growth
        show = args.verbose or (step % 5 == 0) or any("EVENT" in l or "NUCLEATION" in l for l in log)
        
        if show and log:
            print(sim.format_header())
            for line in log:
                print(line)
        
        if args.interactive:
            try:
                cmd = input("\n[Enter=continue, q=quit, s=summary] > ").strip().lower()
                if cmd == 'q':
                    break
                elif cmd == 's':
                    print(sim.format_summary())
            except (EOFError, KeyboardInterrupt):
                break
    
    # Final summary
    if args.json:
        # JSON output for future frontends
        state = {
            "scenario": args.scenario,
            "steps": sim.step,
            "final_temperature": conditions.temperature,
            "crystals": []
        }
        for c in sim.crystals:
            state["crystals"].append({
                "mineral": c.mineral,
                "id": c.crystal_id,
                "habit": c.habit,
                "forms": c.dominant_forms,
                "c_mm": round(c.c_length_mm, 2),
                "a_mm": round(c.a_width_mm, 2),
                "zones": len(c.zones),
                "twinned": c.twinned,
                "twin_law": c.twin_law,
                "fluorescence": c.predict_fluorescence(),
            })
        print(json.dumps(state, indent=2))
    else:
        print(sim.format_summary())


if __name__ == '__main__':
    main()

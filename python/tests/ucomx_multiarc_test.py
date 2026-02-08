"""Test UCoMx multi-arc splitting for AAV/MCS computation."""
import pydicom
import numpy as np

ds = pydicom.dcmread(r'C:\Users\teoir\OneDrive\Desktop\rt-complexity-lens\testdata\reference_dataset_v1.1\Linac\Monaco\RTPLAN_MO_PT_01.dcm')
beam = ds.BeamSequence[0]
n_pairs = 80

for bld in beam.BeamLimitingDeviceSequence:
    if bld.RTBeamLimitingDeviceType == 'MLCX':
        bounds = np.array(bld.LeafPositionBoundaries)

# Parse all CPs
cp_data = []
prev_mlc = None
prev_y = None
all_gaps = []
for i, cp in enumerate(beam.ControlPointSequence):
    mlc = None
    y = prev_y
    if hasattr(cp, 'BeamLimitingDevicePositionSequence'):
        for bldp in cp.BeamLimitingDevicePositionSequence:
            if bldp.RTBeamLimitingDeviceType == 'MLCX':
                pos = np.array(bldp.LeafJawPositions, dtype=float)
                half = len(pos) // 2
                mlc = (pos[:half], pos[half:])
            elif bldp.RTBeamLimitingDeviceType == 'ASYMY':
                y = np.array(bldp.LeafJawPositions, dtype=float)
    if mlc is None:
        mlc = prev_mlc
    if y is None:
        y = prev_y
    
    bankA, bankB = mlc
    gaps = bankB - bankA
    all_gaps.extend(gaps.tolist())
    
    ga = float(cp.GantryAngle) if hasattr(cp, 'GantryAngle') else None
    w = float(cp.CumulativeMetersetWeight) if hasattr(cp, 'CumulativeMetersetWeight') else 0
    
    cp_data.append({
        'a': bankA.copy(), 'b': bankB.copy(),
        'gaps': gaps.copy(), 'y': y.copy(), 'w': w,
        'ga': ga
    })
    prev_mlc = mlc
    prev_y = y

n_cp = len(cp_data)
min_gap = min(all_gaps)
print(f"Min gap: {min_gap:.4f} mm, CPs: {n_cp}")

# Detect arc boundaries (gantry wrap-arounds)
# Fill in gantry angles (only first CP and direction-change CPs have them)
gantry_angles = []
prev_ga = None
for i, cp in enumerate(cp_data):
    if cp['ga'] is not None:
        prev_ga = cp['ga']
    gantry_angles.append(prev_ga)

# Find wrap-around points (large gantry angle jumps indicating rotation change)
arc_boundaries = [0]  # start of first arc
for i in range(1, len(gantry_angles)):
    diff = abs(gantry_angles[i] - gantry_angles[i - 1])
    if diff > 180:
        diff = 360 - diff
    # Wrap-around = angle jumps backwards indicating new rotation
    # More specifically: if the gantry was increasing and suddenly decreases 
    # (or vice versa), that's a wrap
    if i >= 2:
        d1 = gantry_angles[i - 1] - gantry_angles[i - 2]
        d2 = gantry_angles[i] - gantry_angles[i - 1]
        if d1 > 0 and d2 < -300:  # wrap from ~360 back to ~0
            arc_boundaries.append(i)
        elif d1 < 0 and d2 > 300:  # wrap from ~0 to ~360
            arc_boundaries.append(i)
arc_boundaries.append(n_cp)

print(f"Detected arc boundaries (CP indices): {arc_boundaries}")
print(f"Number of arcs: {len(arc_boundaries) - 1}")

# For each arc, compute metrics independently
def lsv_bank(positions, active_mask):
    idx = np.where(active_mask)[0]
    if len(idx) < 2:
        return 1.0
    diffs = np.abs(np.diff(positions[idx]))
    max_diff = np.max(diffs)
    if max_diff == 0:
        return 1.0
    return np.mean(1.0 - diffs / max_diff)


arc_lsv_values = []
arc_aav_values = []
arc_mcs_values = []
arc_mu_values = []

for arc_idx in range(len(arc_boundaries) - 1):
    cp_start = arc_boundaries[arc_idx]
    cp_end = arc_boundaries[arc_idx + 1]
    arc_cps = cp_data[cp_start:cp_end]
    n_arc_ca = len(arc_cps) - 1
    
    if n_arc_ca == 0:
        continue
    
    arc_mu = arc_cps[-1]['w'] - arc_cps[0]['w']
    
    # Build CAs for this arc
    arc_cas = []
    for j in range(n_arc_ca):
        cp1, cp2 = arc_cps[j], arc_cps[j + 1]
        ca_a = (cp1['a'] + cp2['a']) / 2
        ca_b = (cp1['b'] + cp2['b']) / 2
        ca_gaps = ca_b - ca_a
        ca_y = (cp1['y'] + cp2['y']) / 2
        ca_dmu = cp2['w'] - cp1['w']
        
        active = np.zeros(n_pairs, dtype=bool)
        for k in range(n_pairs):
            if bounds[k + 1] > ca_y[0] and bounds[k] < ca_y[1] and ca_gaps[k] > min_gap:
                active[k] = True
        
        arc_cas.append({
            'a': ca_a, 'b': ca_b, 'gaps': ca_gaps,
            'active': active, 'dmu': ca_dmu
        })
    
    # Compute areas for this arc
    arc_areas = []
    for ca in arc_cas:
        area = 0
        for k in range(n_pairs):
            if ca['active'][k]:
                area += ca['gaps'][k] * (bounds[k + 1] - bounds[k])
        arc_areas.append(area)
    arc_areas = np.array(arc_areas)
    arc_a_max = np.max(arc_areas) if len(arc_areas) > 0 else 1
    
    # LSV per CA
    arc_lsv_ca = []
    for ca in arc_cas:
        la = lsv_bank(ca['a'], ca['active'])
        lb = lsv_bank(ca['b'], ca['active'])
        arc_lsv_ca.append((la + lb) / 2)
    arc_lsv_ca = np.array(arc_lsv_ca)
    
    # AAV per CA
    arc_aav_ca = arc_areas / arc_a_max
    
    # MCS per CA
    arc_mcs_ca = arc_lsv_ca * arc_aav_ca
    
    # MU weights for this arc
    arc_mu_weights = np.array([ca['dmu'] for ca in arc_cas])
    arc_total_mu = np.sum(arc_mu_weights)
    
    # Arc-level MU-weighted averages
    if arc_total_mu > 0:
        arc_lsv = np.sum(arc_lsv_ca * arc_mu_weights) / arc_total_mu
        arc_aav = np.sum(arc_aav_ca * arc_mu_weights) / arc_total_mu
        arc_mcs = np.sum(arc_mcs_ca * arc_mu_weights) / arc_total_mu
    else:
        arc_lsv = np.mean(arc_lsv_ca)
        arc_aav = np.mean(arc_aav_ca)
        arc_mcs = np.mean(arc_mcs_ca)
    
    arc_lsv_values.append(arc_lsv)
    arc_aav_values.append(arc_aav)
    arc_mcs_values.append(arc_mcs)
    arc_mu_values.append(arc_total_mu)
    
    print(f"\n  Arc {arc_idx + 1}: CPs {cp_start}-{cp_end-1} ({n_arc_ca} CAs), MU frac: {arc_total_mu:.4f}")
    print(f"    A_max: {arc_a_max:.1f} mm², LSV: {arc_lsv:.6f}, AAV: {arc_aav:.6f}, MCS: {arc_mcs:.6f}")

# Plan-level: average over arcs (equation 1)
plan_lsv_eq1 = np.mean(arc_lsv_values)
plan_aav_eq1 = np.mean(arc_aav_values)
plan_mcs_eq1 = np.mean(arc_mcs_values)

# Plan-level: MU-weighted over arcs (equation 2)
total_mu_plan = sum(arc_mu_values)
plan_lsv_eq2 = sum(l * m for l, m in zip(arc_lsv_values, arc_mu_values)) / total_mu_plan
plan_aav_eq2 = sum(a * m for a, m in zip(arc_aav_values, arc_mu_values)) / total_mu_plan
plan_mcs_eq2 = sum(c * m for c, m in zip(arc_mcs_values, arc_mu_values)) / total_mu_plan

print(f"\n=== Plan-level (multi-arc aware) ===")
print(f"  LSV eq1: {plan_lsv_eq1:.6f}, eq2: {plan_lsv_eq2:.6f}, UCoMx: 0.678803")
print(f"  AAV eq1: {plan_aav_eq1:.6f}, eq2: {plan_aav_eq2:.6f}, UCoMx: 0.359305")
print(f"  MCS eq1: {plan_mcs_eq1:.6f}, eq2: {plan_mcs_eq2:.6f}, UCoMx: 0.245808")

# Also try: what if we use equation 2 WITHIN each arc but equation 1 BETWEEN arcs?
# UCoMx paper equation (1): plan_value = (1/NA) × Σ_i [(1/NCA_i) × Σ_j metric_ij]
# Let's try per-arc unweighted, then plan unweighted:
print(f"\n=== Per-arc unweighted (eq1 within, eq1 between) ===")
arc_lsv_unw = []
arc_aav_unw = []
arc_mcs_unw = []
for arc_idx in range(len(arc_boundaries) - 1):
    cp_start = arc_boundaries[arc_idx]
    cp_end = arc_boundaries[arc_idx + 1]
    arc_cps = cp_data[cp_start:cp_end]
    n_arc_ca = len(arc_cps) - 1
    if n_arc_ca == 0:
        continue
    
    arc_cas_local = []
    for j in range(n_arc_ca):
        cp1, cp2 = arc_cps[j], arc_cps[j + 1]
        ca_a = (cp1['a'] + cp2['a']) / 2
        ca_b = (cp1['b'] + cp2['b']) / 2
        ca_gaps = ca_b - ca_a
        ca_y = (cp1['y'] + cp2['y']) / 2
        
        active = np.zeros(n_pairs, dtype=bool)
        for k in range(n_pairs):
            if bounds[k + 1] > ca_y[0] and bounds[k] < ca_y[1] and ca_gaps[k] > min_gap:
                active[k] = True
        arc_cas_local.append({'a': ca_a, 'b': ca_b, 'gaps': ca_gaps, 'active': active})
    
    arc_areas_l = []
    for ca in arc_cas_local:
        area = sum(ca['gaps'][k] * (bounds[k + 1] - bounds[k]) 
                   for k in range(n_pairs) if ca['active'][k])
        arc_areas_l.append(area)
    arc_areas_l = np.array(arc_areas_l)
    arc_amax = np.max(arc_areas_l) if len(arc_areas_l) > 0 else 1
    
    lsvs = [(lsv_bank(ca['a'], ca['active']) + lsv_bank(ca['b'], ca['active'])) / 2 
            for ca in arc_cas_local]
    aavs = arc_areas_l / arc_amax
    mcss = np.array(lsvs) * aavs
    
    arc_lsv_unw.append(np.mean(lsvs))
    arc_aav_unw.append(np.mean(aavs))
    arc_mcs_unw.append(np.mean(mcss))

print(f"  LSV: {np.mean(arc_lsv_unw):.6f}, UCoMx: 0.678803")
print(f"  AAV: {np.mean(arc_aav_unw):.6f}, UCoMx: 0.359305")
print(f"  MCS: {np.mean(arc_mcs_unw):.6f}, UCoMx: 0.245808")

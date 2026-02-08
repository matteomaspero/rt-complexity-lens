"""Test UCoMx metric formulas against reference dataset."""
import pydicom
import numpy as np
import sys

ds = pydicom.dcmread(r'C:\Users\teoir\OneDrive\Desktop\rt-complexity-lens\testdata\reference_dataset_v1.1\Linac\Monaco\RTPLAN_MO_PT_01.dcm')
beam = ds.BeamSequence[0]
n_pairs = 80

for bld in beam.BeamLimitingDeviceSequence:
    if bld.RTBeamLimitingDeviceType == 'MLCX':
        bounds = np.array(bld.LeafPositionBoundaries)

# Parse all CPs
cps = []
prev_mlc = None
prev_y = None
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

    active = np.zeros(n_pairs, dtype=bool)
    for j in range(n_pairs):
        if bounds[j + 1] > y[0] and bounds[j] < y[1]:
            active[j] = True

    w = float(cp.CumulativeMetersetWeight) if hasattr(cp, 'CumulativeMetersetWeight') else 0
    cps.append({
        'a': mlc[0], 'b': mlc[1],
        'gaps': mlc[1] - mlc[0],
        'active': active, 'y': y, 'w': w
    })
    prev_mlc = mlc
    prev_y = y

n_trans = len(cps) - 1


# ========== LSV: Masi 2008 position-based per-bank ==========
def lsv_masi_bank(positions, active_mask):
    """Masi 2008 per-bank:  pos_max = max |L_{n+1}-L_n|, LSV = mean(1 - |diff|/pos_max)"""
    idx = np.where(active_mask)[0]
    if len(idx) < 2:
        return 1.0
    diffs = np.abs(np.diff(positions[idx]))
    pos_max = np.max(diffs) if np.max(diffs) > 0 else 1.0
    return np.mean(1.0 - diffs / pos_max)


# MU-weighted
lsv_masi_active_sum = 0
lsv_masi_all_sum = 0
mu_sum = 0
for i in range(n_trans):
    active = cps[i]['active']
    dmu = cps[i + 1]['w'] - cps[i]['w']

    lsv_a = lsv_masi_bank(cps[i]['a'], active)
    lsv_b = lsv_masi_bank(cps[i]['b'], active)
    lsv_masi_active_sum += ((lsv_a + lsv_b) / 2) * dmu

    all_mask = np.ones(n_pairs, dtype=bool)
    lsv_a2 = lsv_masi_bank(cps[i]['a'], all_mask)
    lsv_b2 = lsv_masi_bank(cps[i]['b'], all_mask)
    lsv_masi_all_sum += ((lsv_a2 + lsv_b2) / 2) * dmu

    mu_sum += dmu

print("=== LSV (Masi 2008 position-based, per-bank, MU-weighted) ===")
print(f"  All leaves:    {lsv_masi_all_sum / mu_sum:.6f}")
print(f"  Active leaves: {lsv_masi_active_sum / mu_sum:.6f}")
print(f"  UCoMx:         0.678803")

# Unweighted
lsv_unw_active = 0
for i in range(n_trans):
    active = cps[i]['active']
    lsv_a = lsv_masi_bank(cps[i]['a'], active)
    lsv_b = lsv_masi_bank(cps[i]['b'], active)
    lsv_unw_active += (lsv_a + lsv_b) / 2
print(f"  Active, unweighted: {lsv_unw_active / n_trans:.6f}")


# ========== LSV: Opening-based (min/max of gaps) ==========
def lsv_opening(gaps, active_mask):
    idx = np.where(active_mask)[0]
    g = gaps[idx]
    n = len(g)
    if n < 2:
        return 1.0
    s = 0
    c = 0
    for j in range(n - 1):
        if g[j] > 0 and g[j + 1] > 0:
            s += min(g[j], g[j + 1]) / max(g[j], g[j + 1])
            c += 1
    return s / max(c, 1)


lsv_open_active_sum = 0
for i in range(n_trans):
    dmu = cps[i + 1]['w'] - cps[i]['w']
    lsv_open_active_sum += lsv_opening(cps[i]['gaps'], cps[i]['active']) * dmu
print(f"  Opening-based active MU-wt: {lsv_open_active_sum / mu_sum:.6f}")
print()


# ========== Areas ==========
areas = []
for i in range(len(cps)):
    active = cps[i]['active']
    gaps = cps[i]['gaps']
    area = 0
    for j in range(n_pairs):
        if active[j] and gaps[j] > 0:
            lw = bounds[j + 1] - bounds[j]
            area += gaps[j] * lw
    areas.append(area)
areas = np.array(areas)
a_max = np.max(areas)

print("=== AAV variants ===")
# Masi 2013: AAV = 1 - mean(|dA|) / A_max
aav_masi = 1 - np.mean(np.abs(np.diff(areas))) / a_max if a_max > 0 else 0
print(f"  Masi 2013 (active): {aav_masi:.6f}")

# McNiven per-CP: AAV_cp = A_cp / A_max, then average
aav_mcn_wt = sum(
    (areas[i] / a_max) * (cps[i + 1]['w'] - cps[i]['w'])
    for i in range(n_trans)
) / mu_sum
print(f"  McNiven per-CP MU-wt (active): {aav_mcn_wt:.6f}")

# Min/max ratio (like LSV but for areas)
aav_minmax = 0
aav_cnt = 0
for i in range(len(areas) - 1):
    if areas[i] > 0 and areas[i + 1] > 0:
        aav_minmax += min(areas[i], areas[i + 1]) / max(areas[i], areas[i + 1])
        aav_cnt += 1
aav_minmax /= max(aav_cnt, 1)
print(f"  Min/max ratio: {aav_minmax:.6f}")
print(f"  UCoMx:         0.359305")
print()


# ========== MCS ========== 
print("=== MCS (LSV * AAV per-CP, MU-weighted) ===")
# McNiven: MCS = sum(LSV_cp * AAV_cp * dMU) / sum(dMU)
# Try all combinations of LSV formula × AAV formula

for lsv_name, lsv_fn in [("Masi-pos", lambda i: (lsv_masi_bank(cps[i]['a'], cps[i]['active']) + lsv_masi_bank(cps[i]['b'], cps[i]['active'])) / 2),
                           ("Opening", lambda i: lsv_opening(cps[i]['gaps'], cps[i]['active']))]:
    for aav_name, aav_fn in [("A/Amax", lambda i: areas[i] / a_max if a_max > 0 else 0)]:
        mcs = sum(
            lsv_fn(i) * aav_fn(i) * (cps[i + 1]['w'] - cps[i]['w'])
            for i in range(n_trans)
        ) / mu_sum
        print(f"  {lsv_name} × {aav_name}: {mcs:.6f}")

print(f"  UCoMx: 0.245808")
print()


# ========== Check if UCoMx uses CLOSED leaf filtering differently ==========
# What if they include leaves with gap=0 in the LSV calculation?
def lsv_masi_bank_include_closed(positions, active_mask):
    """Include all active positions (even closed leaves) in LSV"""
    idx = np.where(active_mask)[0]
    if len(idx) < 2:
        return 1.0
    diffs = np.abs(np.diff(positions[idx]))
    pos_max = np.max(diffs) if np.max(diffs) > 0 else 1.0
    return np.mean(1.0 - diffs / pos_max)


# This is actually the same as before since we didn't filter by open/closed
# Let's try: what if active = ONLY leaves with gap > 0 AND within Y-jaw?
def lsv_masi_bank_open_only(positions, gaps, active_mask):
    mask = active_mask & (gaps > 0)
    idx = np.where(mask)[0]
    if len(idx) < 2:
        return 1.0
    diffs = np.abs(np.diff(positions[idx]))
    pos_max = np.max(diffs) if np.max(diffs) > 0 else 1.0
    return np.mean(1.0 - diffs / pos_max)


print("=== LSV with gap>0 filter ===")
lsv_open_filter_sum = 0
for i in range(n_trans):
    dmu = cps[i + 1]['w'] - cps[i]['w']
    active = cps[i]['active']
    gaps = cps[i]['gaps']
    la = lsv_masi_bank_open_only(cps[i]['a'], gaps, active)
    lb = lsv_masi_bank_open_only(cps[i]['b'], gaps, active)
    lsv_open_filter_sum += ((la + lb) / 2) * dmu
print(f"  Masi-pos active+open MU-wt: {lsv_open_filter_sum / mu_sum:.6f}")
print(f"  UCoMx:                       0.678803")
print()


# ========== What if UCoMx normalizes differently? ==========
# What if LSV is computed per SEGMENT and MCS is computed per SEGMENT * MU?
# In Monaco VMAT, each CP pair forms a segment. Let's check if MCS is:
# MCS = (1/n_seg) * sum(LSV_i * AAV_i)  [unweighted]
mcs_unw = sum(
    (lsv_masi_bank(cps[i]['a'], cps[i]['active']) + lsv_masi_bank(cps[i]['b'], cps[i]['active'])) / 2
    * (areas[i] / a_max if a_max > 0 else 0)
    for i in range(n_trans)
) / n_trans
print(f"MCS unweighted: {mcs_unw:.6f}")

# What if areas should include ALL active leaves (not just gap>0)?
# Include gap=0 leaves area contribution = 0, so no difference

# Let me check the number of open active leaves per CP
n_open_active = []
for i in range(n_trans):
    active = cps[i]['active']
    gaps = cps[i]['gaps']
    n_open_active.append(np.sum((gaps > 0) & active))
print(f"\nOpen active leaves per CP: min={min(n_open_active)}, max={max(n_open_active)}, mean={np.mean(n_open_active):.1f}")

# What if area should use ALL 80 leaf pairs (no jaw clipping)?
areas_noclip = []
for i in range(len(cps)):
    gaps = cps[i]['gaps']
    area = 0
    for j in range(n_pairs):
        if gaps[j] > 0:
            lw = bounds[j + 1] - bounds[j]
            area += gaps[j] * lw
    areas_noclip.append(area)
areas_noclip = np.array(areas_noclip)
a_max_nc = np.max(areas_noclip)
print(f"\nMax area (active): {a_max:.1f} mm²")
print(f"Max area (no clip): {a_max_nc:.1f} mm²")
print(f"Same? {np.allclose(areas, areas_noclip)}")
# For Monaco, if all open leaves are within jaw, these should be the same

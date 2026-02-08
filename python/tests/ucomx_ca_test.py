"""Test UCoMx formulas with control-arc midpoint interpolation and active leaf filtering."""
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
all_gaps = []  # collect all gaps to find min_gap
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

    w = float(cp.CumulativeMetersetWeight) if hasattr(cp, 'CumulativeMetersetWeight') else 0

    cp_data.append({
        'a': bankA.copy(), 'b': bankB.copy(),
        'gaps': gaps.copy(), 'y': y.copy(), 'w': w
    })
    prev_mlc = mlc
    prev_y = y

n_cp = len(cp_data)
n_ca = n_cp - 1  # number of control arcs

# min_gap: minimum gap across entire plan (used for active leaf filtering)
min_gap = min(all_gaps)
print(f"Min gap in plan: {min_gap:.4f} mm")
print(f"Number of CPs: {n_cp}, Number of CAs: {n_ca}")


# Build control arc (CA) midpoint data by averaging adjacent CPs
ca_data = []
for j in range(n_ca):
    cp1, cp2 = cp_data[j], cp_data[j + 1]
    # Interpolate MLC to midpoint
    ca_a = (cp1['a'] + cp2['a']) / 2
    ca_b = (cp1['b'] + cp2['b']) / 2
    ca_gaps = ca_b - ca_a
    # Interpolate Y-jaw to midpoint
    ca_y = (cp1['y'] + cp2['y']) / 2
    # MU for this CA
    ca_mu = cp2['w'] - cp1['w']

    # Active leaf mask: gap > min_gap AND within Y-jaw
    active = np.zeros(n_pairs, dtype=bool)
    for k in range(n_pairs):
        leaf_top = bounds[k + 1]
        leaf_bot = bounds[k]
        within_jaw = (leaf_top > ca_y[0]) and (leaf_bot < ca_y[1])
        gap_open = ca_gaps[k] > min_gap
        if within_jaw and gap_open:
            active[k] = True

    ca_data.append({
        'a': ca_a, 'b': ca_b, 'gaps': ca_gaps,
        'y': ca_y, 'mu': ca_mu, 'active': active
    })

total_mu = sum(ca['mu'] for ca in ca_data)

# Compute areas per CA (active leaves only)
areas = []
for ca in ca_data:
    area = 0
    for k in range(n_pairs):
        if ca['active'][k]:
            lw = bounds[k + 1] - bounds[k]
            area += ca['gaps'][k] * lw  # gap already > 0 due to active filter
    areas.append(area)
areas = np.array(areas)
a_max = np.max(areas)

print(f"Max area: {a_max:.1f} mm²")
print(f"Mean area: {np.mean(areas):.1f} mm²")
print(f"Active leaves per CA: min={min(ca['active'].sum() for ca in ca_data)}, "
      f"max={max(ca['active'].sum() for ca in ca_data)}, "
      f"mean={np.mean([ca['active'].sum() for ca in ca_data]):.1f}")
print()


# ========== LSV per CA (Masi/McNiven position-based per-bank) ==========
def lsv_bank(positions, active_mask):
    """LSV for one bank = mean(1 - |diff| / max_diff) over active adjacent pairs."""
    idx = np.where(active_mask)[0]
    if len(idx) < 2:
        return 1.0
    diffs = np.abs(np.diff(positions[idx]))
    max_diff = np.max(diffs)
    if max_diff == 0:
        return 1.0
    return np.mean(1.0 - diffs / max_diff)


lsv_per_ca = []
for ca in ca_data:
    lsv_a = lsv_bank(ca['a'], ca['active'])
    lsv_b = lsv_bank(ca['b'], ca['active'])
    lsv_per_ca.append((lsv_a + lsv_b) / 2)
lsv_per_ca = np.array(lsv_per_ca)

# AAV per CA  
aav_per_ca = areas / a_max  # McNiven: A_ca / A_max

# MCS per CA
mcs_per_ca = lsv_per_ca * aav_per_ca

# Plan values using equation (1): unweighted average
lsv_eq1 = np.mean(lsv_per_ca)
aav_eq1 = np.mean(aav_per_ca)
mcs_eq1 = np.mean(mcs_per_ca)

# Plan values using equation (2): MU-weighted
mu_weights = np.array([ca['mu'] for ca in ca_data])
lsv_eq2 = np.sum(lsv_per_ca * mu_weights) / total_mu if total_mu > 0 else 0
aav_eq2 = np.sum(aav_per_ca * mu_weights) / total_mu if total_mu > 0 else 0
mcs_eq2 = np.sum(mcs_per_ca * mu_weights) / total_mu if total_mu > 0 else 0

print("=== Plan values (with CA midpoint interpolation & active filter) ===")
print(f"  LSV eq1 (unweighted):  {lsv_eq1:.6f}")
print(f"  LSV eq2 (MU-weighted): {lsv_eq2:.6f}")
print(f"  UCoMx LSV:             0.678803")
print()
print(f"  AAV eq1 (unweighted):  {aav_eq1:.6f}")
print(f"  AAV eq2 (MU-weighted): {aav_eq2:.6f}")
print(f"  UCoMx AAV:             0.359305")
print()
print(f"  MCS eq1 (unweighted):  {mcs_eq1:.6f}")
print(f"  MCS eq2 (MU-weighted): {mcs_eq2:.6f}")
print(f"  UCoMx MCSv:            0.245808")
print()

# What if MCS = beam_level_LSV × beam_level_AAV?
print(f"  LSV_eq2 × AAV_eq2 = {lsv_eq2 * aav_eq2:.6f}")
print(f"  LSV_eq1 × AAV_eq1 = {lsv_eq1 * aav_eq1:.6f}")
print()

# ========== Leaf Travel (LT) ==========
lt_active = 0
lt_total = 0
for j in range(n_ca):
    cp1, cp2 = cp_data[j], cp_data[j + 1]
    ca = ca_data[j]
    for k in range(n_pairs):
        travel = abs(cp2['a'][k] - cp1['a'][k]) + abs(cp2['b'][k] - cp1['b'][k])
        lt_total += travel
        if ca['active'][k]:
            lt_active += travel

lt_per_ca = lt_active / n_ca
print(f"=== Leaf Travel ===")
print(f"  LT total (all):    {lt_total:.1f} mm")
print(f"  LT total (active): {lt_active:.1f} mm")
print(f"  LT per CA:         {lt_per_ca:.4f}")
print(f"  UCoMx LT:          76.583744")
print()

# Average NL (number of active leaves × 2 for both banks as individual leaves)
nl_sum = sum(ca['active'].sum() * 2 for ca in ca_data)  # both banks
nl_avg = nl_sum / n_ca
print(f"  NL (avg active × 2): {nl_avg:.2f}")
print(f"  UCoMx NL:            32.10")
print()

# ========== Try: LT = average across CAs of (per-CA active leaf travel) ==========
# UCoMx might compute LT as: for each CA, sum of active leaf travel for both banks, then average over CAs
lt_per_ca_values = []
for j in range(n_ca):
    cp1, cp2 = cp_data[j], cp_data[j + 1]
    ca = ca_data[j]
    ca_lt = 0
    for k in range(n_pairs):
        if ca['active'][k]:
            ca_lt += abs(cp2['a'][k] - cp1['a'][k]) + abs(cp2['b'][k] - cp1['b'][k])
    lt_per_ca_values.append(ca_lt)

lt_avg_ca = np.mean(lt_per_ca_values)
lt_mu_ca = np.sum(np.array(lt_per_ca_values) * mu_weights) / total_mu if total_mu > 0 else 0
print(f"  LT avg per CA (active): {lt_avg_ca:.4f}")
print(f"  LT MU-wt per CA:       {lt_mu_ca:.4f}")
print(f"  UCoMx LT:              76.583744")
print()

# ========== LTMU = total_LT / MU ==========
beam_mu = float(beam.ControlPointSequence[0].BeamMeterset) if hasattr(beam.ControlPointSequence[0], 'BeamMeterset') else None
if beam_mu is None:
    # Get from FractionGroupSequence
    for fg in ds.FractionGroupSequence:
        for rb in fg.ReferencedBeamSequence:
            beam_mu = float(rb.BeamMeterset)
            break
        break
print(f"  Beam MU: {beam_mu:.2f}")
print(f"  LTMU = total_LT / MU: {lt_total / beam_mu:.4f}")
print(f"  UCoMx LTMU:            23.566")
print(f"  LTMU = active_LT / MU: {lt_active / beam_mu:.4f}")
print()

# ========== Other metrics ===========================
# JA (Jaw Area): check if it's Y_size × max_X_opening
y_size = cp_data[0]['y'][1] - cp_data[0]['y'][0]
print(f"=== Jaw Area ===")
print(f"  Y-jaw size: {y_size:.1f} mm")
# No ASYMX in this plan, so jaw area might be based on field size
# Check max X opening across all CPs
max_x = 0
for cp in cp_data:
    for k in range(n_pairs):
        if cp['gaps'][k] > 0:
            x_min = min(cp['a'][k], cp['b'][k])
            x_max = max(cp['a'][k], cp['b'][k])
            if x_max > max_x:
                max_x = x_max
            if -x_min > max_x:
                max_x = -x_min

# Find max extents of open MLC
x_lefts = []
x_rights = []
for cp in cp_data:
    for k in range(n_pairs):
        if cp['gaps'][k] > min_gap:
            x_lefts.append(cp['a'][k])
            x_rights.append(cp['b'][k])
if x_lefts:
    x_min_all = min(x_lefts)
    x_max_all = max(x_rights)
    x_range = x_max_all - x_min_all
    ja_est = x_range * y_size
    print(f"  X range: [{x_min_all:.1f}, {x_max_all:.1f}] = {x_range:.1f} mm")
    print(f"  JA estimate (X_range × Y): {ja_est:.0f} mm²")
    print(f"  UCoMx JA: 25103.7 mm²")

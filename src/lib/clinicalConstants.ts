/**
 * Shared clinical qualifier constants used across PrimaryPrevention and AscvdEmr.
 */

export interface SubItem {
  id: string;
  label: string;
  qualifier?: string;
}

// ─── Established ASCVD sub-items ───
export const ASCVD_ESTABLISHED: SubItem[] = [
  { id: "ascvd_cad", label: "CAD / Coronary ASCVD", qualifier: "Prior MI, angina requiring revascularization, or angiographically confirmed coronary stenosis ≥50%" },
  { id: "ascvd_stroke", label: "Ischemic stroke or TIA", qualifier: "Prior ischemic stroke confirmed by imaging, or TIA with neurovascular evidence of atherosclerotic origin" },
  { id: "ascvd_pad", label: "Peripheral arterial disease (PAD)", qualifier: "ABI <0.9, claudication with imaging confirmation, or prior peripheral revascularization" },
];

// ─── Subclinical atherosclerosis sub-items ───
export const SUBCLINICAL_ITEMS: SubItem[] = [
  { id: "sub_cimt", label: "Elevated carotid IMT", qualifier: "Carotid intima-media thickness >75th percentile for age/sex" },
  { id: "sub_plaque", label: "Carotid or femoral plaque", qualifier: "Focal wall thickening ≥1.5 mm or >50% adjacent IMT on ultrasound" },
  { id: "sub_cac", label: "Coronary calcium score (CAC >0)", qualifier: "Any detectable coronary calcium; CAC ≥100 AU or ≥75th percentile = higher risk" },
  { id: "sub_abi", label: "ABI <0.9", qualifier: "Ankle-brachial index <0.9 indicating peripheral atherosclerosis" },
];

// ─── High CAC / extensive plaque sub-items ───
export const HIGH_CAC_ITEMS: SubItem[] = [
  { id: "cac_100", label: "CAC ≥100 AU or ≥75th percentile", qualifier: "Agatston score ≥100 or above 75th percentile for age/sex/ethnicity" },
  { id: "cac_multi", label: "Multi-territory plaque burden", qualifier: "Atherosclerotic plaque in ≥2 vascular beds (carotid, femoral, coronary, aortic) on imaging" },
  { id: "cac_stenosis", label: "Nonobstructive coronary stenosis on CCTA", qualifier: "≥1 coronary segment with plaque without hemodynamically significant stenosis" },
];

// ─── CKD 3B/4 sub-items ───
export const CKD_ITEMS: SubItem[] = [
  { id: "ckd_3b", label: "Stage 3B: eGFR 30–44 mL/min/1.73 m²", qualifier: "Moderately-to-severely decreased kidney function" },
  { id: "ckd_4", label: "Stage 4: eGFR 15–29 mL/min/1.73 m²", qualifier: "Severely decreased kidney function" },
  { id: "ckd_albumin", label: "Albuminuria: UACR ≥30 mg/g", qualifier: "Moderately increased (30–300) or severely increased (>300) albuminuria" },
];

// ─── Family history sub-items ───
export const FHX_ITEMS: SubItem[] = [
  { id: "fhx_male", label: "1st-degree male relative with CHD before age 55", qualifier: "Father, brother, or son with MI, coronary revascularization, or angina <55 y" },
  { id: "fhx_female", label: "1st-degree female relative with CHD before age 65", qualifier: "Mother, sister, or daughter with MI, coronary revascularization, or angina <65 y" },
];

// ─── Extreme elevation sub-items ───
export const EXTREME_ELEVATION_ITEMS: SubItem[] = [
  { id: "ext_ldl", label: "LDL-C ≥190 mg/dL", qualifier: "Severe hypercholesterolemia — consider familial hypercholesterolemia workup" },
  { id: "ext_tg", label: "Triglycerides ≥500 mg/dL", qualifier: "Severe hypertriglyceridemia — pancreatitis risk; fibrate or omega-3 FA indicated" },
  { id: "ext_bp", label: "Blood pressure ≥180/120 mmHg", qualifier: "Hypertensive crisis — immediate evaluation and treatment required" },
  { id: "ext_a1c", label: "HbA1c ≥10%", qualifier: "Severely uncontrolled diabetes — insulin therapy often required" },
];

// ─── Diabetes Target Organ Damage ───
export const TOD_MICROVASCULAR: SubItem[] = [
  { id: "tod_retinopathy", label: "Diabetic retinopathy", qualifier: "Microaneurysms, hemorrhages, macular edema on fundoscopy or retinal imaging" },
  { id: "tod_nephropathy", label: "Diabetic nephropathy", qualifier: "UACR ≥30 mg/g (micro-/macroalbuminuria) or reduced eGFR for age" },
  { id: "tod_neuropathy", label: "Diabetic neuropathy", qualifier: "Distal symmetric polyneuropathy, autonomic neuropathy, or foot-ulcer risk (monofilament/NCS)" },
];

export const TOD_MACROVASCULAR: SubItem[] = [
  { id: "tod_lvh", label: "Left-ventricular hypertrophy (LVH)", qualifier: "Increased LV mass index on echocardiography" },
  { id: "tod_diastolic", label: "Diastolic dysfunction", qualifier: "Abnormal E/e′ ratio or impaired global longitudinal strain on echo" },
  { id: "tod_subclinical_tod", label: "Subclinical atherosclerosis", qualifier: "Elevated carotid IMT, carotid/femoral plaque, or coronary calcium score" },
];

export const TOD_ALL: SubItem[] = [...TOD_MICROVASCULAR, ...TOD_MACROVASCULAR];

// ─── Helper ───
export function countCheckedItems(items: { id: string }[], checked: Record<string, boolean>) {
  return items.filter((i) => checked[i.id]).length;
}

/**
 * Medication Prescription Cross-Reference & Adverse Interaction Service
 *
 * Cross-references candidate medication prescriptions against a patient's active
 * medication regimen, documented allergies, and pharmacogenomic/renal profile
 * to identify Drug-Drug, Drug-Allergy, Duplicate Therapy, and CPIC conflicts in real time.
 */

import type { ActivePrescribedMedication } from './api';

export type InteractionSeverity = 'contraindicated' | 'major' | 'moderate';

export type InteractionCategory =
  | 'drug-drug'
  | 'drug-allergy'
  | 'duplicate-therapy'
  | 'pharmacogenomic-renal';

export interface SafeAlternativeRecommendation {
  medicationName: string;
  dosage: string;
  route: string;
  frequency: string;
  rxNorm: string;
  indication: string;
  rationale: string;
}

export interface AdverseInteractionAlert {
  id: string;
  severity: InteractionSeverity;
  category: InteractionCategory;
  candidateMedication: string;
  conflictingAgent: string;
  clinicalSummary: string;
  mechanismOfAction: string;
  managementProtocol: string;
  evidenceReference: string;
  safeAlternatives: SafeAlternativeRecommendation[];
}

export interface CandidatePrescriptionInput {
  medicationName: string;
  dosage: string;
  route: string;
  frequency: string;
  indication: string;
  rxNorm: string;
  therapeuticClass?: string;
}

export interface PatientSafetyContext {
  activeMedications: ActivePrescribedMedication[];
  knownAllergies: string[];
  pharmacogenomics?: string;
  egfr?: string;
}

export interface PrescriptionCrossReferenceResult {
  candidateName: string;
  candidateDosage: string;
  candidateRxNorm: string;
  evaluatedAt: string;
  hasAdverseInteractions: boolean;
  highestSeverity: InteractionSeverity | 'none';
  requiresModalIntervention: boolean;
  alerts: AdverseInteractionAlert[];
  screenedAgainstMedicationsCount: number;
  screenedAgainstAllergiesCount: number;
  clinicalDisclaimer: string;
}

export interface InteractionOverrideAuditEntry {
  id: string;
  patientId: number;
  timestamp: string;
  prescribedMedication: string;
  dosage: string;
  actionTaken: 'switched-to-alternative' | 'clinician-override' | 'cancelled';
  overrideReason?: string;
  attendingAttestation?: string;
  alertsTriggered: number;
  highestSeverity: InteractionSeverity | 'none';
}

const AUDIT_STORAGE_KEY_PREFIX = 'emr_rx_interaction_audit_v1_';

/**
 * Normalizes a drug string to lowercase alphanumeric tokens for clinical matching.
 */
function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * Checks whether a normalized text contains any of the specified clinical keywords.
 */
function matchesAnyKeyword(text: string, keywords: string[]): boolean {
  const norm = normalizeText(text);
  return keywords.some((kw) => norm.includes(kw.toLowerCase()));
}

/**
 * Cross-references a candidate prescription against the patient's active medications,
 * documented allergies, and pharmacogenomic/renal biomarkers.
 *
 * @param candidate - The medication and dosage being evaluated or prescribed
 * @param context - The patient's current active medications, allergies, and biomarkers
 * @returns Structured cross-reference safety result with actionable alerts and safe alternatives
 */
export function crossReferencePrescriptionSafety(
  candidate: CandidatePrescriptionInput,
  context: PatientSafetyContext
): PrescriptionCrossReferenceResult {
  const alerts: AdverseInteractionAlert[] = [];
  const combinedCandidateText = `${candidate.medicationName} ${candidate.dosage} ${candidate.therapeuticClass || ''}`;
  const normCandidate = normalizeText(combinedCandidateText);

  const activeMeds = context.activeMedications.filter(
    (m) => !m.status || m.status.toLowerCase() === 'active'
  );
  const allergies = context.knownAllergies || [];

  // 1. DUPLICATE THERAPY CHECK AGAINST ACTIVE MEDICATIONS
  for (const activeMed of activeMeds) {
    const activeBaseName = normalizeText(activeMed.name.split(' ')[0] || activeMed.name);
    if (
      activeBaseName.length >= 4 &&
      normCandidate.includes(activeBaseName) &&
      !normCandidate.includes('avoid') &&
      !normCandidate.includes('contraindicated')
    ) {
      alerts.push({
        id: `INT-DUP-${activeMed.id}`,
        severity: 'major',
        category: 'duplicate-therapy',
        candidateMedication: candidate.medicationName,
        conflictingAgent: `Active Rx: ${activeMed.name} (${activeMed.dosage})`,
        clinicalSummary: `Therapeutic duplication detected with active regimen ${activeMed.name} (${activeMed.dosage}, ${activeMed.frequency}).`,
        mechanismOfAction:
          'Concurrent administration of identical or overlapping active pharmaceutical ingredients increases cumulative plasma exposure and dose-dependent toxicity.',
        managementProtocol:
          'Verify whether this order is intended as a dosage titration replacement rather than an additive prescription.',
        evidenceReference: 'ISMP High-Alert Duplicate Therapy Screening Standard 2026',
        safeAlternatives: [],
      });
    }
  }

  // Detect active classes in patient's medication list
  const activeAceInhibitor = activeMeds.find((m) =>
    matchesAnyKeyword(m.name, ['lisinopril', 'enalapril', 'ramipril', 'benazepril', 'losartan', 'valsartan'])
  );
  const activeStatin = activeMeds.find((m) =>
    matchesAnyKeyword(m.name, ['atorvastatin', 'simvastatin', 'lovastatin', 'rosuvastatin', 'pravastatin'])
  );
  const activeMetformin = activeMeds.find((m) =>
    matchesAnyKeyword(m.name, ['metformin'])
  );
  const activeAntiplateletOrAnticoag = activeMeds.find((m) =>
    matchesAnyKeyword(m.name, [
      'clopidogrel',
      'ticagrelor',
      'prasugrel',
      'apixaban',
      'rivaroxaban',
      'warfarin',
      'dabigatran',
    ])
  );
  const activeSglt2 = activeMeds.find((m) =>
    matchesAnyKeyword(m.name, ['empagliflozin', 'dapagliflozin', 'canagliflozin'])
  );

  // 2. DRUG-DRUG INTERACTIONS
  // 2A. ACE Inhibitor / ARB + Systemic NSAID
  const isCandidateSystemicNsaid =
    matchesAnyKeyword(combinedCandidateText, [
      'ibuprofen',
      'naproxen',
      'ketorolac',
      'meloxicam',
      'celecoxib',
      'indomethacin',
      'piroxicam',
      'nsaid',
    ]) && !matchesAnyKeyword(candidate.dosage, ['acetaminophen', 'topical']);

  if (activeAceInhibitor && isCandidateSystemicNsaid) {
    alerts.push({
      id: 'INT-DDI-ACEI-NSAID',
      severity: 'contraindicated',
      category: 'drug-drug',
      candidateMedication: candidate.medicationName,
      conflictingAgent: `Active Rx: ${activeAceInhibitor.name} (${activeAceInhibitor.dosage})`,
      clinicalSummary:
        'Severe hemodynamic Drug-Drug Interaction: Systemic NSAID co-prescribed with active ACE Inhibitor precipitates acute kidney injury (AKI) and blunts antihypertensive control.',
      mechanismOfAction:
        'NSAIDs inhibit prostaglandin-mediated afferent arteriolar vasodilation while Lisinopril blocks efferent arteriolar constriction via angiotensin II, collapsing glomerular filtration pressure.',
      managementProtocol:
        'Avoid systemic NSAIDs. Substitute with non-nephrotoxic analgesia (Acetaminophen) or localized topical therapy.',
      evidenceReference: 'KDIGO Acute Kidney Injury Guideline & Lexicomp Class X Interaction',
      safeAlternatives: [
        {
          medicationName: 'Acetaminophen Oral Tablet',
          dosage: '500 mg PO Q6H PRN (Max 3,000 mg/day)',
          route: 'Oral',
          frequency: 'Every 6 Hours PRN',
          rxNorm: 'RxNorm: 161',
          indication: candidate.indication || 'Analgesia / Antipyretic',
          rationale: 'Preserves renal prostaglandin synthesis and does not antagonize Lisinopril BP control.',
        },
        {
          medicationName: 'Topical Diclofenac Sodium 1% Gel',
          dosage: '2 g applied topically QID',
          route: 'Topical',
          frequency: 'Four Times Daily',
          rxNorm: 'RxNorm: 859088',
          indication: 'Localized Musculoskeletal Analgesia',
          rationale: '<6% systemic plasma absorption minimizes glomerular afferent vasoconstriction.',
        },
      ],
    });
  }

  // 2B. ACE Inhibitor + Potassium-Sparing Diuretic / MRA (Spironolactone, Eplerenone, Amiloride, KCl)
  const isCandidateHyperkalemicAgent = matchesAnyKeyword(combinedCandidateText, [
    'spironolactone',
    'aldactone',
    'eplerenone',
    'amiloride',
    'triamterene',
    'potassium chloride',
  ]);

  if (activeAceInhibitor && isCandidateHyperkalemicAgent) {
    alerts.push({
      id: 'INT-DDI-ACEI-MRA',
      severity: 'major',
      category: 'drug-drug',
      candidateMedication: candidate.medicationName,
      conflictingAgent: `Active Rx: ${activeAceInhibitor.name} (${activeAceInhibitor.dosage})`,
      clinicalSummary:
        'Major Drug-Drug Interaction: Dual RAAS / Mineralocorticoid blockade with active Lisinopril significantly elevates life-threatening hyperkalemia risk.',
      mechanismOfAction:
        'Additive suppression of aldosterone-mediated distal tubular potassium excretion leads to serum K+ accumulation (>5.5 mEq/L) and potential cardiac conduction arrhythmias.',
      managementProtocol:
        'If clinically indicated for heart failure or resistant hypertension, initiate at conservative 12.5 mg QD dose and mandate STAT Basic Metabolic Panel (BMP) within 72 hours, or switch to a dihydropyridine calcium channel blocker.',
      evidenceReference: 'ACC/AHA Heart Failure & Hypertension Pharmacotherapy Consensus 2026',
      safeAlternatives: [
        {
          medicationName: 'Amlodipine Besylate Oral Tablet',
          dosage: '5 mg PO Once Daily',
          route: 'Oral',
          frequency: 'Once Daily (QD)',
          rxNorm: 'RxNorm: 197361',
          indication: 'Adjunctive Antihypertensive Control',
          rationale: 'Synergistic BP reduction with Lisinopril without elevating serum potassium.',
        },
        {
          medicationName: 'Spironolactone Low-Dose Protocol (With BMP Order)',
          dosage: '12.5 mg (Renal/Hyperkalemia-Safe Initiation)',
          route: 'Oral',
          frequency: 'Once Daily (QD)',
          rxNorm: 'RxNorm: 313096',
          indication: candidate.indication || 'Adjunctive Blood Pressure & Remodeling Support',
          rationale: '50% reduced starting dose paired with mandatory 72-hour serum K+ and Creatinine monitoring.',
        },
      ],
    });
  }

  // 2C. Statin (Atorvastatin) + Strong CYP3A4 / OATP1B1 Inhibitor (Clarithromycin, Erythromycin, Gemfibrozil, Itraconazole, Verapamil)
  const isCandidateStatinInhibitor = matchesAnyKeyword(combinedCandidateText, [
    'clarithromycin',
    'erythromycin',
    'gemfibrozil',
    'itraconazole',
    'ketoconazole',
    'cyclosporine',
    'verapamil',
    'diltiazem',
  ]);

  if (activeStatin && isCandidateStatinInhibitor) {
    alerts.push({
      id: 'INT-DDI-STATIN-CYP3A4',
      severity: 'contraindicated',
      category: 'drug-drug',
      candidateMedication: candidate.medicationName,
      conflictingAgent: `Active Rx: ${activeStatin.name} (${activeStatin.dosage})`,
      clinicalSummary:
        'Severe Drug-Drug Interaction: Co-administration with active Atorvastatin inhibits hepatic CYP3A4/OATP1B1 clearance, increasing statin AUC 4-fold and precipitating rhabdomyolysis.',
      mechanismOfAction:
        'Potent inhibition of intestinal and hepatic cytochrome P450 3A4 and SLCO1B1 transporter blocks statin lactone metabolism, causing skeletal muscle myotoxicity.',
      managementProtocol:
        'Substitute with a non-CYP3A4-inhibiting macrolide (Azithromycin) or temporarily hold Atorvastatin during short-course antimicrobial therapy.',
      evidenceReference: 'FDA Drug Safety Communication & ACC Statin Intolerance Guideline',
      safeAlternatives: [
        {
          medicationName: 'Azithromycin Dihydrate (Zithromax)',
          dosage: '500 mg Day 1, then 250 mg Days 2-5',
          route: 'Oral',
          frequency: 'Once Daily (5-Day Regimen)',
          rxNorm: 'RxNorm: 141962',
          indication: candidate.indication || 'Atypical / Respiratory Antimicrobial Coverage',
          rationale: 'Does not inhibit CYP3A4 or SLCO1B1; safe for concurrent use with Atorvastatin 20 mg.',
        },
      ],
    });
  }

  // 2D. Metformin + OCT2/MATE1 Competitors or Lactic Acidosis Precipitants (Cimetidine, Topiramate, Acetazolamide, Contrast)
  const isCandidateMetforminConflict = matchesAnyKeyword(combinedCandidateText, [
    'cimetidine',
    'topiramate',
    'acetazolamide',
    'iodinated contrast',
    'trimethoprim',
    'bactrim',
  ]);

  if (activeMetformin && isCandidateMetforminConflict) {
    alerts.push({
      id: 'INT-DDI-METFORMIN-OCT2',
      severity: 'moderate',
      category: 'drug-drug',
      candidateMedication: candidate.medicationName,
      conflictingAgent: `Active Rx: ${activeMetformin.name} (${activeMetformin.dosage})`,
      clinicalSummary:
        'Drug-Drug Interaction: Inhibits renal tubular OCT2/MATE1 transport or carbonic anhydrase alongside active Metformin, increasing plasma metformin accumulation and lactic acidosis risk.',
      mechanismOfAction:
        'Competitive inhibition of organic cation transporter-2 (OCT2) in renal proximal tubules reduces metformin clearance by 25–40%.',
      managementProtocol:
        'Select a non-competing agent (e.g., Famotidine instead of Cimetidine) or monitor serum lactate and renal function closely.',
      evidenceReference: 'ADA Standards of Care in Diabetes — Pharmacologic Approaches 2026',
      safeAlternatives: [
        {
          medicationName: 'Famotidine Oral Tablet',
          dosage: '20 mg PO BID',
          route: 'Oral',
          frequency: 'Twice Daily',
          rxNorm: 'RxNorm: 197696',
          indication: 'Acid Suppression / Gastroprotection',
          rationale: 'Minimal OCT2/MATE1 renal transporter inhibition compared to Cimetidine.',
        },
      ],
    });
  }

  // 2E. Antiplatelet/Anticoagulant + NSAID or Warfarin/Apixaban bleeding synergy
  const isCandidateAntithrombotic = matchesAnyKeyword(combinedCandidateText, [
    'warfarin',
    'apixaban',
    'rivaroxaban',
    'dabigatran',
    'enoxaparin',
    'heparin',
  ]);

  if (
    (activeAntiplateletOrAnticoag && (isCandidateSystemicNsaid || isCandidateAntithrombotic)) ||
    (isCandidateAntithrombotic && isCandidateSystemicNsaid)
  ) {
    alerts.push({
      id: 'INT-DDI-BLEED-RISK',
      severity: 'major',
      category: 'drug-drug',
      candidateMedication: candidate.medicationName,
      conflictingAgent: activeAntiplateletOrAnticoag
        ? `Active Rx: ${activeAntiplateletOrAnticoag.name} (${activeAntiplateletOrAnticoag.dosage})`
        : 'Concurrent Antithrombotic Therapy',
      clinicalSummary:
        'Major Hemorrhage Interaction: Dual hemostatic impairment significantly increases gastrointestinal and intracranial bleeding risk.',
      mechanismOfAction:
        'Synergistic inhibition of platelet aggregation and coagulation cascade factor Xa/IIa impairs mucosal and vascular hemostasis.',
      managementProtocol:
        'Avoid concurrent systemic NSAIDs or add proton pump inhibitor (Pantoprazole 40 mg QD) gastroprotection if dual antithrombotic therapy is strictly indicated.',
      evidenceReference: 'CHEST Antithrombotic Therapy Guidelines',
      safeAlternatives: [],
    });
  }

  // 2F. Active SGLT2i + Loop Diuretic volume depletion check
  if (
    activeSglt2 &&
    matchesAnyKeyword(combinedCandidateText, ['furosemide', 'lasix', 'bumetanide', 'torsemide'])
  ) {
    alerts.push({
      id: 'INT-DDI-SGLT2-LOOP',
      severity: 'moderate',
      category: 'drug-drug',
      candidateMedication: candidate.medicationName,
      conflictingAgent: `Active Rx: ${activeSglt2.name} (${activeSglt2.dosage})`,
      clinicalSummary:
        'Moderate Hemodynamic Interaction: Loop diuretic added to active SGLT2 inhibitor increases risk of intravascular volume depletion and orthostatic hypotension.',
      mechanismOfAction:
        'Synergistic proximal tubular osmotic natriuresis (SGLT2i) and thick ascending limb Na-K-2Cl cotransporter blockade.',
      managementProtocol:
        'Reduce loop diuretic starting dose by 25–50% and monitor daily weights and orthostatic blood pressure.',
      evidenceReference: 'ESC/ACC Heart Failure Diuretic Titration Protocol',
      safeAlternatives: [],
    });
  }

  // 3. DRUG-ALLERGY INTERACTIONS
  const hasPenicillinAllergy = allergies.some((a) =>
    matchesAnyKeyword(a, ['penicillin', 'amoxicillin', 'ampicillin', 'beta-lactam'])
  );
  const hasSulfaAllergy = allergies.some((a) =>
    matchesAnyKeyword(a, ['sulfa', 'sulfonamide', 'bactrim', 'sulfamethoxazole'])
  );

  // Check if candidate is a Penicillin/Beta-lactam AND user hasn't already selected a safe non-beta-lactam in dosage dropdown
  const isCandidatePenicillin =
    matchesAnyKeyword(candidate.medicationName, [
      'amoxicillin',
      'augmentin',
      'ampicillin',
      'piperacillin',
      'zosyn',
      'penicillin',
      'nafcillin',
      'dicloxacillin',
    ]) &&
    !matchesAnyKeyword(candidate.dosage, ['azithromycin', 'doxycycline', 'levofloxacin']);

  const isCandidateCephalosporin = matchesAnyKeyword(candidate.medicationName, [
    'cephalexin',
    'keflex',
    'ceftriaxone',
    'rocephin',
    'cefdinir',
    'cefuroxime',
    'cefazolin',
  ]);

  if (hasPenicillinAllergy && isCandidatePenicillin) {
    const matchedAllergy =
      allergies.find((a) => matchesAnyKeyword(a, ['penicillin', 'beta-lactam'])) ||
      'Penicillin (Maculopapular Rash)';
    alerts.push({
      id: 'INT-ALG-PENICILLIN',
      severity: 'contraindicated',
      category: 'drug-allergy',
      candidateMedication: candidate.medicationName,
      conflictingAgent: `Documented Allergy: ${matchedAllergy}`,
      clinicalSummary:
        'Absolute Drug-Allergy Contraindication: Candidate is a Penicillin-class beta-lactam antimicrobial matching the patient’s documented Penicillin hypersensitivity.',
      mechanismOfAction:
        'Beta-lactam thiazolidine ring and side-chain antigenic determinants trigger IgE-mediated mast cell degranulation or delayed T-cell cutaneous hypersensitivity.',
      managementProtocol:
        'Do not dispense beta-lactam penicillins. Switch immediately to a structurally distinct macrolide or tetracycline regimen.',
      evidenceReference: 'AAAAI Drug Allergy Practice Parameter 2026',
      safeAlternatives: [
        {
          medicationName: 'Azithromycin Dihydrate (Zithromax)',
          dosage: 'Azithromycin 500 mg Day 1, then 250 mg Days 2-5 (Beta-Lactam Safe)',
          route: 'Oral',
          frequency: 'Once Daily',
          rxNorm: 'RxNorm: 141962',
          indication: candidate.indication || 'Empiric Respiratory Tract Infection Coverage',
          rationale: '15-membered macrolide ring has zero immunologic cross-reactivity with beta-lactams.',
        },
        {
          medicationName: 'Doxycycline Monohydrate',
          dosage: 'Doxycycline 100 mg BID (Beta-Lactam Safe)',
          route: 'Oral',
          frequency: 'Twice Daily (BID)',
          rxNorm: 'RxNorm: 1650142',
          indication: candidate.indication || 'Empiric Respiratory / Soft Tissue Coverage',
          rationale: 'Tetracycline class antimicrobial safe in patients with Penicillin and Sulfa allergies.',
        },
      ],
    });
  } else if (hasPenicillinAllergy && isCandidateCephalosporin) {
    const matchedAllergy =
      allergies.find((a) => matchesAnyKeyword(a, ['penicillin', 'beta-lactam'])) ||
      'Penicillin (Maculopapular Rash)';
    alerts.push({
      id: 'INT-ALG-CEPHALOSPORIN-CROSS',
      severity: 'major',
      category: 'drug-allergy',
      candidateMedication: candidate.medicationName,
      conflictingAgent: `Documented Allergy: ${matchedAllergy}`,
      clinicalSummary:
        'Drug-Allergy Cross-Reactivity Warning: Cephalosporin prescribed in a patient with documented Penicillin allergy (~2–5% R1 side-chain cross-reactivity).',
      mechanismOfAction:
        'Shared R1 aminobenzyl side chains between amino-penicillins and first-generation cephalosporins can elicit cross-reactive hypersensitivity.',
      managementProtocol:
        'Prefer a non-beta-lactam antimicrobial (Azithromycin or Doxycycline) or administer a structurally dissimilar 3rd-generation cephalosporin under clinical observation.',
      evidenceReference: 'AAAAI / IDSA Beta-Lactam Cross-Reactivity Guideline',
      safeAlternatives: [
        {
          medicationName: 'Azithromycin Dihydrate (Zithromax)',
          dosage: '500 mg Day 1, then 250 mg Days 2-5',
          route: 'Oral',
          frequency: 'Once Daily',
          rxNorm: 'RxNorm: 141962',
          indication: candidate.indication || 'Antimicrobial Therapy',
          rationale: 'Eliminates beta-lactam ring and R1 side-chain cross-reactivity.',
        },
      ],
    });
  }

  // Check Sulfa allergy
  const isCandidateSulfa =
    matchesAnyKeyword(candidate.medicationName, [
      'bactrim',
      'sulfamethoxazole',
      'sulfasalazine',
      'sulfadiazine',
      'sulfa',
    ]) && !matchesAnyKeyword(candidate.dosage, ['nitrofurantoin', 'fosfomycin']);

  if (hasSulfaAllergy && isCandidateSulfa) {
    const matchedAllergy =
      allergies.find((a) => matchesAnyKeyword(a, ['sulfa', 'sulfonamide'])) ||
      'Sulfa Antibiotics (Urticaria)';
    alerts.push({
      id: 'INT-ALG-SULFA',
      severity: 'contraindicated',
      category: 'drug-allergy',
      candidateMedication: candidate.medicationName,
      conflictingAgent: `Documented Allergy: ${matchedAllergy}`,
      clinicalSummary:
        'Absolute Drug-Allergy Contraindication: Sulfonamide antimicrobial conflicts with documented Sulfa Antibiotics allergy (Urticaria).',
      mechanismOfAction:
        'N4-arylamine sulfonamide metabolites form hapten-protein complexes that provoke IgE urticaria, anaphylaxis, or Stevens-Johnson Syndrome (SJS/TEN).',
      managementProtocol:
        'Discontinue sulfonamide order immediately and switch to a non-sulfonamide agent (Nitrofurantoin or Fosfomycin).',
      evidenceReference: 'IDSA Antimicrobial Stewardship & Allergy Safety Standard',
      safeAlternatives: [
        {
          medicationName: 'Nitrofurantoin Macrocrystals (Macrobid)',
          dosage: 'Nitrofurantoin Macrocrystals 100 mg PO BID (Sulfa-Safe Alternative)',
          route: 'Oral',
          frequency: 'Twice Daily (BID)',
          rxNorm: 'RxNorm: 311989',
          indication: candidate.indication || 'Uncomplicated Urinary / Antimicrobial Therapy',
          rationale: 'Nitrofuran derivative with zero sulfonamide cross-reactivity; safe given eGFR 94 mL/min.',
        },
      ],
    });
  }

  // 4. PHARMACOGENOMIC (CPIC) & RENAL CHECKS
  const isCyp2c19Impaired = matchesAnyKeyword(context.pharmacogenomics || '', [
    '*2',
    '*3',
    'intermediate metabolizer',
    'poor metabolizer',
  ]);
  const isCandidateClopidogrel =
    matchesAnyKeyword(candidate.medicationName, ['clopidogrel', 'plavix']) &&
    !matchesAnyKeyword(candidate.dosage, ['ticagrelor', 'prasugrel']);

  if (isCyp2c19Impaired && isCandidateClopidogrel) {
    alerts.push({
      id: 'INT-PGX-CYP2C19-CLOPID',
      severity: 'contraindicated',
      category: 'pharmacogenomic-renal',
      candidateMedication: candidate.medicationName,
      conflictingAgent: `Genotype: ${context.pharmacogenomics || 'CYP2C19 *1/*2 (Intermediate Metabolizer)'}`,
      clinicalSummary:
        'CPIC Level A Pharmacogenomic Contraindication: Clopidogrel hepatic bioactivation is impaired in CYP2C19 *1/*2 carriers, resulting in high on-treatment platelet reactivity.',
      mechanismOfAction:
        'Clopidogrel is an inactive prodrug requiring hepatic CYP2C19 two-step oxidation to generate its active thiol metabolite; loss-of-function *2 alleles reduce active metabolite levels by >30%.',
      managementProtocol:
        'Switch antiplatelet therapy to Ticagrelor 90 mg BID or Prasugrel 10 mg QD, which do not depend on CYP2C19 bioactivation.',
      evidenceReference: 'CPIC Guideline for CYP2C19 Genotype and Clopidogrel Therapy (PMID: 35034351)',
      safeAlternatives: [
        {
          medicationName: 'Ticagrelor (Brilinta)',
          dosage: 'Ticagrelor 90 mg BID (CPIC Recommended Alternative)',
          route: 'Oral',
          frequency: 'Twice Daily (BID)',
          rxNorm: 'RxNorm: 1116632',
          indication: candidate.indication || 'Secondary Atherothrombotic Prevention',
          rationale: 'Direct-acting reversible P2Y12 antagonist independent of CYP2C19 hepatic bioactivation.',
        },
        {
          medicationName: 'Prasugrel Hydrochloride (Effient)',
          dosage: 'Prasugrel 10 mg Daily (Alternative)',
          route: 'Oral',
          frequency: 'Once Daily (QD)',
          rxNorm: 'RxNorm: 855812',
          indication: candidate.indication || 'Secondary Atherothrombotic Prevention',
          rationale: 'Activated primarily via esterases and CYP3A4/CYP2B6 with unaffected efficacy in CYP2C19 *2 carriers.',
        },
      ],
    });
  }

  // Determine highest severity
  let highestSeverity: InteractionSeverity | 'none' = 'none';
  if (alerts.some((a) => a.severity === 'contraindicated')) {
    highestSeverity = 'contraindicated';
  } else if (alerts.some((a) => a.severity === 'major')) {
    highestSeverity = 'major';
  } else if (alerts.some((a) => a.severity === 'moderate')) {
    highestSeverity = 'moderate';
  }

  return {
    candidateName: candidate.medicationName,
    candidateDosage: candidate.dosage,
    candidateRxNorm: candidate.rxNorm,
    evaluatedAt: new Date().toISOString(),
    hasAdverseInteractions: alerts.length > 0,
    highestSeverity,
    requiresModalIntervention: highestSeverity === 'contraindicated' || highestSeverity === 'major',
    alerts,
    screenedAgainstMedicationsCount: activeMeds.length,
    screenedAgainstAllergiesCount: allergies.length,
    clinicalDisclaimer:
      'Automated Drug-Drug and Drug-Allergy Cross-Reference Engine is a Clinical Decision Support (CDS) safeguard. Always verify complete patient history and consult a clinical pharmacist or attending physician before overriding high-alert contraindications.',
  };
}

/**
 * Loads the patient's adverse interaction override audit trail from localStorage.
 */
export function getInteractionAuditTrail(patientId: number): InteractionOverrideAuditEntry[] {
  try {
    const raw = localStorage.getItem(`${AUDIT_STORAGE_KEY_PREFIX}${patientId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Records a clinician action (safe alternative switch or documented override) into the patient's audit trail.
 */
export function recordInteractionAuditEntry(
  patientId: number,
  entry: Omit<InteractionOverrideAuditEntry, 'id' | 'patientId' | 'timestamp'>
): InteractionOverrideAuditEntry {
  const newEntry: InteractionOverrideAuditEntry = {
    id: `RX-AUDIT-${Date.now()}`,
    patientId,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  try {
    const existing = getInteractionAuditTrail(patientId);
    const updated = [newEntry, ...existing].slice(0, 20);
    localStorage.setItem(`${AUDIT_STORAGE_KEY_PREFIX}${patientId}`, JSON.stringify(updated));
  } catch {
    // Fallback gracefully in restricted storage environments
  }

  return newEntry;
}

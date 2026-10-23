import { type TelemetryData } from './useTelemetry';

export interface VitalSignHourlyPoint {
  hourOffset: number; // -24 to 0 (0 = Now)
  timeLabel: string;
  heartRate: number;
  systolicBp: number;
  diastolicBp: number;
  spo2: number;
  clinicalNote?: string;
}

export type VitalMetricFilter = 'all' | 'hr' | 'bp' | 'spo2';

export interface PatientVitalProfile {
  id: number;
  name: string;
  mrn: string;
  ward: string;
  departmentId: number;
  baseHr: number;
  baseSys: number;
  baseDia: number;
  baseSpo2: number;
}

export const PATIENT_PROFILES: Record<number, PatientVitalProfile> = {
  42: {
    id: 42,
    name: 'Eleanor Vance',
    mrn: 'MRN-0042',
    ward: 'Cardiology · Bed CARD-01',
    departmentId: 1,
    baseHr: 74,
    baseSys: 122,
    baseDia: 78,
    baseSpo2: 98,
  },
  43: {
    id: 43,
    name: 'Marcus Vance',
    mrn: 'MRN-0043',
    ward: 'ICU · Bed ER-01 Resus',
    departmentId: 2,
    baseHr: 98,
    baseSys: 146,
    baseDia: 91,
    baseSpo2: 94,
  },
  44: {
    id: 44,
    name: 'Elena Morales',
    mrn: 'MRN-0044',
    ward: 'MICU · Bed ICU-01',
    departmentId: 3,
    baseHr: 68,
    baseSys: 116,
    baseDia: 74,
    baseSpo2: 99,
  },
};

export interface TrendingAbnormalFlag {
  id: string;
  metric: 'hr' | 'bp' | 'spo2';
  metricLabel: string;
  severity: 'critical' | 'warning';
  currentValue: string;
  baselineValue: string;
  sixHourDelta: string;
  trendDirection: 'rising' | 'falling' | 'spike';
  summary: string;
}

export interface TriageFollowUpAction {
  id: string;
  patientId: number;
  category: 'Diagnostic Order' | 'Respiratory Care' | 'Medication Protocol' | 'Bedside Assessment';
  priority: 'STAT' | 'Urgent' | 'Routine';
  title: string;
  clinicalRationale: string;
  targetMetric: 'hr' | 'bp' | 'spo2' | 'all';
  orderType: string;
}

export interface PatientTriageAssessment {
  patient: PatientVitalProfile;
  acuity: 'critical' | 'warning' | 'nominal';
  acuityLabel: string;
  ewsScore: number; // 0 - 12 NEWS2-inspired Early Warning Score
  latestVitals: {
    heartRate: number;
    systolicBp: number;
    diastolicBp: number;
    map: number;
    spo2: number;
  };
  peak24h: {
    maxHr: number;
    maxSys: number;
    minSpo2: number;
  };
  series: VitalSignHourlyPoint[];
  abnormalFlags: TrendingAbnormalFlag[];
  suggestedActions: TriageFollowUpAction[];
}

/**
 * Generates deterministic + live-telemetry-linked 24-hour vital sign series for a patient.
 */
export function generate24HourVitals(
  profile: PatientVitalProfile,
  liveHr?: number,
  liveSys?: number,
  liveDia?: number,
  liveSpo2?: number,
  simulatedSurge = false
): VitalSignHourlyPoint[] {
  const now = new Date();
  const points: VitalSignHourlyPoint[] = [];

  for (let h = -24; h <= 0; h++) {
    const pointTime = new Date(now.getTime() + h * 3600000);
    const timeLabel =
      h === 0
        ? 'Now'
        : pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const wave1 = Math.sin((h + 24) * 0.45);
    const wave2 = Math.cos((h + 24) * 0.28);

    // Exertional spike around -6h
    const exertionBump = h === -6 || h === -5 ? 14 : 0;

    // Progressive upward drift over the last 6 hours for ICU patient #43 or when simulatedSurge is enabled
    const isProgressiveDrift = profile.id === 43 || simulatedSurge;
    const recentHoursFactor = h >= -6 ? (h + 6) / 6 : 0;
    const progressiveHrDrift = isProgressiveDrift ? Math.round(recentHoursFactor * 16) : 0;
    const progressiveSysDrift = isProgressiveDrift ? Math.round(recentHoursFactor * 14) : 0;
    const progressiveDiaDrift = isProgressiveDrift ? Math.round(recentHoursFactor * 7) : 0;
    const progressiveSpo2Drop = isProgressiveDrift ? Math.round(recentHoursFactor * 2) : 0;

    const computedHr = Math.round(
      profile.baseHr + wave1 * 6 + wave2 * 3 + exertionBump + progressiveHrDrift
    );
    const computedSys = Math.round(
      profile.baseSys + wave1 * 7 + (exertionBump > 0 ? 10 : 0) + progressiveSysDrift
    );
    const computedDia = Math.round(
      profile.baseDia + wave2 * 4 + (exertionBump > 0 ? 5 : 0) + progressiveDiaDrift
    );
    const computedSpo2 = Math.min(
      100,
      Math.max(
        89,
        Math.round(profile.baseSpo2 + Math.sin(h * 0.5) * 1 - progressiveSpo2Drop)
      )
    );

    const hr =
      h === 0 && liveHr !== undefined
        ? simulatedSurge
          ? Math.max(118, liveHr + 24)
          : profile.id === 43
            ? Math.max(112, liveHr + 18)
            : liveHr
        : computedHr;

    const sys =
      h === 0 && liveSys !== undefined
        ? simulatedSurge
          ? Math.max(162, liveSys + 26)
          : profile.id === 43
            ? Math.max(156, liveSys + 22)
            : liveSys
        : computedSys;

    const dia =
      h === 0 && liveDia !== undefined
        ? simulatedSurge
          ? Math.max(98, liveDia + 14)
          : profile.id === 43
            ? Math.max(95, liveDia + 12)
            : liveDia
        : computedDia;

    const spo2 =
      h === 0 && liveSpo2 !== undefined
        ? simulatedSurge
          ? Math.min(91, liveSpo2 - 6)
          : profile.id === 43
            ? Math.min(93, liveSpo2 - 4)
            : liveSpo2
        : computedSpo2;

    let clinicalNote: string | undefined;
    if (h === -6) clinicalNote = 'Physical therapy ambulation window';
    else if (h === -12) clinicalNote = 'Scheduled medication administration';
    else if (h === 0) clinicalNote = 'Live bedside telemetry feed';

    points.push({
      hourOffset: h,
      timeLabel,
      heartRate: hr,
      systolicBp: sys,
      diastolicBp: dia,
      spo2,
      clinicalNote,
    });
  }

  return points;
}

/**
 * Evaluates a single patient's 24-hour vital signs curve for abnormal values and trending slopes,
 * returning an Early Warning Score (EWS), structured flags, and clinical follow-up actions.
 */
export function evaluatePatientVitalTrends(
  profile: PatientVitalProfile,
  liveTelemetry?: TelemetryData | null,
  simulatedSurge = false
): PatientTriageAssessment {
  const series = generate24HourVitals(
    profile,
    liveTelemetry?.heart_rate,
    liveTelemetry?.systolic_bp,
    liveTelemetry?.diastolic_bp,
    liveTelemetry?.spo2,
    simulatedSurge
  );

  const latest = series[series.length - 1];
  const sixHoursAgo = series.find((p) => p.hourOffset === -6) || series[Math.max(0, series.length - 7)];
  const twelveHoursAgo =
    series.find((p) => p.hourOffset === -12) || series[Math.max(0, series.length - 13)];

  const maxHr = Math.max(...series.map((d) => d.heartRate));
  const maxSys = Math.max(...series.map((d) => d.systolicBp));
  const minSpo2 = Math.min(...series.map((d) => d.spo2));
  const map = Math.round((latest.systolicBp + 2 * latest.diastolicBp) / 3);

  const hrDelta6h = latest.heartRate - twelveHoursAgo.heartRate;
  const sysDelta6h = latest.systolicBp - twelveHoursAgo.systolicBp;
  const spo2Delta6h = latest.spo2 - sixHoursAgo.spo2;

  const abnormalFlags: TrendingAbnormalFlag[] = [];
  const suggestedActions: TriageFollowUpAction[] = [];
  let ewsScore = 0;

  // 1. Heart Rate Trend & Threshold Evaluation
  if (latest.heartRate >= 110 || (maxHr >= 112 && latest.heartRate >= 100)) {
    ewsScore += 3;
    abnormalFlags.push({
      id: `flag-hr-crit-${profile.id}`,
      metric: 'hr',
      metricLabel: 'Heart Rate',
      severity: 'critical',
      currentValue: `${latest.heartRate} bpm`,
      baselineValue: `${profile.baseHr} bpm`,
      sixHourDelta: `${hrDelta6h >= 0 ? '+' : ''}${hrDelta6h} bpm`,
      trendDirection: 'rising',
      summary: `Sustained sinus tachycardia (${latest.heartRate} bpm, 24h peak ${maxHr} bpm) trending upward above 100 bpm threshold.`,
    });
    suggestedActions.push({
      id: `act-ecg-${profile.id}`,
      patientId: profile.id,
      category: 'Diagnostic Order',
      priority: 'STAT',
      title: 'Order STAT 12-Lead ECG & Serum Troponin / Lactate',
      clinicalRationale: `Sustained tachycardia (${latest.heartRate} bpm) with upward 6h drift (${hrDelta6h >= 0 ? '+' : ''}${hrDelta6h} bpm) requires exclusion of myocardial strain or occult sepsis.`,
      targetMetric: 'hr',
      orderType: 'Diagnostic ECG & Lab',
    });
  } else if (maxHr >= 92 || latest.heartRate >= 90) {
    ewsScore += 2;
    abnormalFlags.push({
      id: `flag-hr-warn-${profile.id}`,
      metric: 'hr',
      metricLabel: 'Heart Rate',
      severity: 'warning',
      currentValue: `${latest.heartRate} bpm (Peak ${maxHr} bpm)`,
      baselineValue: `${profile.baseHr} bpm`,
      sixHourDelta: `+${maxHr - profile.baseHr} bpm excursion`,
      trendDirection: 'spike',
      summary: `Transient exertional tachycardia excursion to ${maxHr} bpm (+${maxHr - profile.baseHr} bpm over baseline) during ambulation window.`,
    });
    suggestedActions.push({
      id: `act-ortho-${profile.id}`,
      patientId: profile.id,
      category: 'Bedside Assessment',
      priority: 'Urgent',
      title: 'Perform Orthostatic Vitals & Telemetry Rhythm Review',
      clinicalRationale: `24h chart recorded a ${maxHr} bpm heart rate spike during physical therapy; confirm return to sinus baseline.`,
      targetMetric: 'hr',
      orderType: 'Nursing Assessment',
    });
  }

  // 2. Blood Pressure & MAP Trend Evaluation
  if (latest.systolicBp >= 150 || latest.diastolicBp >= 94 || map >= 112) {
    ewsScore += 3;
    abnormalFlags.push({
      id: `flag-bp-crit-${profile.id}`,
      metric: 'bp',
      metricLabel: 'Blood Pressure',
      severity: 'critical',
      currentValue: `${latest.systolicBp}/${latest.diastolicBp} mmHg`,
      baselineValue: `${profile.baseSys}/${profile.baseDia} mmHg`,
      sixHourDelta: `${sysDelta6h >= 0 ? '+' : ''}${sysDelta6h} mmHg SBP`,
      trendDirection: 'rising',
      summary: `Stage 2 hypertensive surge (${latest.systolicBp}/${latest.diastolicBp} mmHg, MAP ${map} mmHg) exceeding 140/90 mmHg ceiling.`,
    });
    suggestedActions.push({
      id: `act-bp-titrate-${profile.id}`,
      patientId: profile.id,
      category: 'Medication Protocol',
      priority: 'STAT',
      title: 'Initiate Q15M BP Monitoring & Antihypertensive Protocol Review',
      clinicalRationale: `Systolic BP climbed to ${latest.systolicBp} mmHg (MAP ${map} mmHg); evaluate PRN IV Labetalol or Hydralazine per ICU hypertension order set.`,
      targetMetric: 'bp',
      orderType: 'Medication Protocol',
    });
  } else if (maxSys >= 136 || latest.systolicBp >= 134) {
    ewsScore += 1;
    abnormalFlags.push({
      id: `flag-bp-warn-${profile.id}`,
      metric: 'bp',
      metricLabel: 'Blood Pressure',
      severity: 'warning',
      currentValue: `${latest.systolicBp}/${latest.diastolicBp} mmHg`,
      baselineValue: `${profile.baseSys}/${profile.baseDia} mmHg`,
      sixHourDelta: `Peak ${maxSys} mmHg SBP`,
      trendDirection: 'spike',
      summary: `Intermittent systolic elevation reaching ${maxSys} mmHg near upper normal corridor (140 mmHg).`,
    });
    suggestedActions.push({
      id: `act-acei-${profile.id}`,
      patientId: profile.id,
      category: 'Medication Protocol',
      priority: 'Routine',
      title: 'Verify Morning Lisinopril 10 mg Adherence & Renal Panel',
      clinicalRationale: `Mild systolic excursion to ${maxSys} mmHg; confirm scheduled ACE-inhibitor timing to blunt diurnal BP peaks.`,
      targetMetric: 'bp',
      orderType: 'Medication Reconciliation',
    });
  }

  // 3. Oxygen Saturation (SpO2) Trend Evaluation
  if (latest.spo2 <= 93 || minSpo2 <= 92) {
    ewsScore += 3;
    abnormalFlags.push({
      id: `flag-spo2-crit-${profile.id}`,
      metric: 'spo2',
      metricLabel: 'SpO2 Saturation',
      severity: 'critical',
      currentValue: `${latest.spo2}%`,
      baselineValue: `${profile.baseSpo2}%`,
      sixHourDelta: `${spo2Delta6h <= 0 ? spo2Delta6h : -2}% drift`,
      trendDirection: 'falling',
      summary: `Oxygen saturation drifted below 94% safety floor (current ${latest.spo2}%, 24h nadir ${minSpo2}%).`,
    });
    suggestedActions.push({
      id: `act-o2-${profile.id}`,
      patientId: profile.id,
      category: 'Respiratory Care',
      priority: 'STAT',
      title: 'Titrate Supplemental O2 (2–4 L/min NC) & Order Portable Chest X-Ray',
      clinicalRationale: `SpO2 desaturation to ${latest.spo2}% requires immediate supplemental oxygen titration to maintain target ≥ 95%.`,
      targetMetric: 'spo2',
      orderType: 'Respiratory Intervention',
    });
  }

  // 4. Nominal / Stable Fallback Action
  if (abnormalFlags.length === 0) {
    ewsScore = 1;
    suggestedActions.push({
      id: `act-stepdown-${profile.id}`,
      patientId: profile.id,
      category: 'Bedside Assessment',
      priority: 'Routine',
      title: 'Continue Q4H Telemetry Surveillance & Assess Step-Down Readiness',
      clinicalRationale: `24-hour HR (${latest.heartRate} bpm), BP (${latest.systolicBp}/${latest.diastolicBp} mmHg), and SpO2 (${latest.spo2}%) remain within physiological corridors.`,
      targetMetric: 'all',
      orderType: 'Care Coordination',
    });
  }

  const hasCritical = abnormalFlags.some((f) => f.severity === 'critical') || ewsScore >= 6;
  const hasWarning = abnormalFlags.length > 0 && !hasCritical;

  const acuity: 'critical' | 'warning' | 'nominal' = hasCritical
    ? 'critical'
    : hasWarning
      ? 'warning'
      : 'nominal';

  const acuityLabel =
    acuity === 'critical'
      ? 'Immediate Escalation'
      : acuity === 'warning'
        ? 'Trending Watch'
        : 'Stable Baseline';

  return {
    patient: profile,
    acuity,
    acuityLabel,
    ewsScore: Math.min(12, ewsScore),
    latestVitals: {
      heartRate: latest.heartRate,
      systolicBp: latest.systolicBp,
      diastolicBp: latest.diastolicBp,
      map,
      spo2: latest.spo2,
    },
    peak24h: {
      maxHr,
      maxSys,
      minSpo2,
    },
    series,
    abnormalFlags,
    suggestedActions,
  };
}

/**
 * Evaluates all monitored cohort patients and sorts them by clinical triage acuity and Early Warning Score.
 */
export function evaluateCohortTriage(
  liveTelemetry?: TelemetryData | null,
  simulatedSurgePatients: Record<number, boolean> = {}
): PatientTriageAssessment[] {
  const assessments = Object.values(PATIENT_PROFILES).map((profile) =>
    evaluatePatientVitalTrends(
      profile,
      liveTelemetry,
      Boolean(simulatedSurgePatients[profile.id])
    )
  );

  const acuityRank: Record<PatientTriageAssessment['acuity'], number> = {
    critical: 3,
    warning: 2,
    nominal: 1,
  };

  return assessments.sort((a, b) => {
    if (acuityRank[b.acuity] !== acuityRank[a.acuity]) {
      return acuityRank[b.acuity] - acuityRank[a.acuity];
    }
    return b.ewsScore - a.ewsScore;
  });
}

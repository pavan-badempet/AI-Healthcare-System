import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- In-Memory Clinical Database ---
  const db = {
    users: [
      { id: 1, username: 'admin', email: 'admin@clinos.ai', full_name: 'Admin Console Manager', role: 'admin' },
      { id: 7, username: 'dr_sarah', email: 'dr.sarah@clinos.ai', full_name: 'Dr. Sarah Chen, MD', role: 'doctor' },
      { id: 42, username: 'assigned_patient', email: 'patient42@clinos.ai', full_name: 'Assigned Patient', role: 'patient', dob: '1981-04-12', gender: 'Female', blood_type: 'A+' },
      { id: 43, username: 'marcus_vance', email: 'marcus@clinos.ai', full_name: 'Marcus Vance', role: 'patient', dob: '1972-09-18', gender: 'Male', blood_type: 'O+' },
      { id: 44, username: 'elena_morales', email: 'elena@clinos.ai', full_name: 'Elena Morales', role: 'patient', dob: '1990-11-23', gender: 'Female', blood_type: 'B+' },
    ],
    departments: [
      { id: 1, name: 'Cardiology', department_type: 'OPD', location: 'Building A, Floor 2', status: 'active', created_at: '2026-01-10T08:00:00Z' },
      { id: 2, name: 'Emergency & Trauma', department_type: 'Emergency', location: 'Ground Floor', status: 'active', created_at: '2026-01-10T08:00:00Z' },
      { id: 3, name: 'Medical Intensive Care Unit (MICU)', department_type: 'ICU', location: 'Building B, Floor 4', status: 'active', created_at: '2026-01-10T08:00:00Z' },
      { id: 4, name: 'General Medicine', department_type: 'Inpatient', location: 'Building A, Floor 3', status: 'active', created_at: '2026-01-10T08:00:00Z' },
    ],
    beds: [
      { id: 1, department_id: 1, bed_number: 'CARD-01', ward: 'Cardio Stepdown', status: 'occupied', current_patient_id: 42, patient_name: 'Assigned Patient' },
      { id: 2, department_id: 1, bed_number: 'CARD-02', ward: 'Cardio Stepdown', status: 'available', current_patient_id: null },
      { id: 3, department_id: 2, bed_number: 'ER-01', ward: 'Resus', status: 'occupied', current_patient_id: 43, patient_name: 'Marcus Vance' },
      { id: 4, department_id: 2, bed_number: 'ER-02', ward: 'Triage', status: 'available', current_patient_id: null },
      { id: 5, department_id: 3, bed_number: 'ICU-01', ward: 'Critical Care', status: 'occupied', current_patient_id: 44, patient_name: 'Elena Morales' },
      { id: 6, department_id: 3, bed_number: 'ICU-02', ward: 'Critical Care', status: 'available', current_patient_id: null },
    ],
    encounters: [
      { id: 9, patient_id: 42, department_id: 1, encounter_type: 'OPD', priority: 'routine', status: 'open', reason: 'Routine cardiovascular follow-up', started_at: '2026-05-26T10:00:00Z' },
      { id: 10, patient_id: 43, department_id: 2, encounter_type: 'Emergency', priority: 'urgent', status: 'open', reason: 'Acute dyspnea and retrosternal discomfort', started_at: '2026-05-26T10:15:00Z' },
    ],
    admissions: [
      { id: 3, encounter_id: 9, patient_id: 42, department_id: 1, status: 'active', admitted_at: '2026-05-26T10:05:00Z' },
    ],
    clinicalOrders: [
      { id: 11, encounter_id: 9, patient_id: 42, department_id: 1, order_type: 'lab', title: 'Comprehensive Metabolic Panel & HbA1c', priority: 'routine', status: 'ordered', created_at: '2026-05-26T10:06:00Z' },
      { id: 12, encounter_id: 9, patient_id: 42, department_id: 1, order_type: 'radiology', title: '12-Lead Electrocardiogram (ECG)', priority: 'routine', status: 'completed', created_at: '2026-05-26T10:08:00Z' },
    ],
    careEvents: [
      {
        id: 12,
        patient_id: 42,
        actor_user_id: 7,
        encounter_id: 9,
        department_id: 1,
        event_type: 'CLINICAL_ORDER_CREATED',
        title: 'CBC & CMP Panel Ordered',
        summary: 'Routine outpatient diagnostic requisition submitted to clinical laboratory.',
        severity: 'info',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 13,
        patient_id: 42,
        actor_user_id: 7,
        encounter_id: 9,
        department_id: 1,
        event_type: 'VITALS_ANOMALY',
        title: 'Transient Tachycardia',
        summary: 'Heart rate spiked to 118 bpm during physical exertion. Normalized on rest.',
        severity: 'warning',
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
    appointments: [
      {
        id: 7,
        user_id: 42,
        doctor_id: 7,
        specialist: 'Cardiology',
        date_time: '2026-06-01T10:00:00',
        reason: 'Post-intervention hemodynamic evaluation',
        status: 'Scheduled',
        doctor: { name: 'Dr. Sarah Chen, MD', specialization: 'Cardiology' },
      },
    ],
    auditLogs: [
      {
        id: 1001,
        facility_id: 1,
        actor_user_id: 7,
        target_user_id: 42,
        action: 'ACCESS_EHR_RECORD',
        timestamp: new Date().toISOString(),
        details: 'Dr. Sarah Chen accessed longitudinal clinical record for Patient #42.',
      },
      {
        id: 1002,
        facility_id: 1,
        actor_user_id: 1,
        target_user_id: null,
        action: 'AUDIT_LAKEHOUSE_QUALITY',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        details: 'Great Expectations OMOP CDM v5.4 validation passed with 100% rule compliance.',
      },
    ],
    chatHistory: [] as Array<{ role: string; content: string; timestamp: string }>,
    notifications: [
      {
        id: 'notif-101',
        category: 'CRITICAL_LAB',
        severity: 'error',
        title: 'STAT Troponin-I Elevation (0.18 ng/mL)',
        message: 'Marcus Vance (ID #43 • ER-01 Resus): Serial high-sensitivity Troponin-I exceeded critical threshold (>0.04 ng/mL). Immediate cardiology review advised.',
        patient_id: 43,
        patient_name: 'Marcus Vance',
        department: 'Emergency & Trauma',
        action_href: '/patients/43',
        action_label: 'Open Patient Chart',
        acknowledged: false,
        created_at: new Date(Date.now() - 240000).toISOString(),
      },
      {
        id: 'notif-102',
        category: 'PENDING_APPOINTMENT',
        severity: 'warning',
        title: 'Upcoming Telemedicine Consultation (10 mins)',
        message: 'Assigned Patient (ID #42 • Cardiology): Post-intervention hemodynamic video consultation with Dr. Sarah Chen scheduled to begin shortly.',
        patient_id: 42,
        patient_name: 'Assigned Patient',
        department: 'Cardiology',
        action_href: '/telemedicine',
        action_label: 'Join Telehealth Room',
        acknowledged: false,
        created_at: new Date(Date.now() - 900000).toISOString(),
      },
      {
        id: 'notif-103',
        category: 'PATIENT_STATUS',
        severity: 'success',
        title: 'Patient Status Update: Ready for Step-Down',
        message: 'Elena Morales (ID #44 • ICU-01): SpO2 98% on room air and sinus rhythm verified over 12h window. Cleared for Cardiology Stepdown transfer.',
        patient_id: 44,
        patient_name: 'Elena Morales',
        department: 'MICU',
        action_href: '/patients/44',
        action_label: 'Review Transfer Order',
        acknowledged: false,
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
    emrNotes: [
      {
        id: 501,
        patient_id: 42,
        author_name: 'Dr. Sarah Chen, MD',
        author_role: 'Cardiology Attending',
        note_type: 'SOAP Progress Note',
        content: 'Subjective: Patient reports improved exercise tolerance with no nocturnal dyspnea or orthopnea.\nObjective: BP 122/78 mmHg, HR 74 bpm regular, lungs clear to auscultation bilaterally.\nAssessment: Stable post-intervention hemodynamics; pre-diabetic glycemic profile under control.\nPlan: Continue Metformin 500mg daily and repeat CMP + HbA1c in 6 weeks.',
        voice_transcribed: true,
        language: 'en-US',
        created_at: new Date(Date.now() - 5400000).toISOString(),
      },
      {
        id: 502,
        patient_id: 42,
        author_name: 'Nurse Clara Oswald, RN',
        author_role: 'Charge Nurse',
        note_type: 'Bedside Observation',
        content: 'Morning telemetry review completed. Continuous sinus rhythm maintained overnight with no ectopic beats observed. Patient ambulated 200 feet in corridor without fatigue.',
        voice_transcribed: false,
        language: 'en-US',
        created_at: new Date(Date.now() - 14400000).toISOString(),
      },
    ],
  };

  // --- Server-Sent Events (SSE) Real-Time Notification Hub ---
  const sseClients = new Set<Response>();

  const broadcastNotificationEvent = (eventType: string, payload: unknown) => {
    const frame = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
    sseClients.forEach((clientRes) => {
      try {
        clientRes.write(frame);
      } catch {
        sseClients.delete(clientRes);
      }
    });
  };

  // --- Health Checks ---
  app.get(['/healthz', '/health'], (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      system: 'AI Healthcare System',
      runtime: 'Node.js Full-Stack (Express + Vite)',
      timestamp: new Date().toISOString(),
    });
  });

  // --- Auth Endpoints ---
  app.post('/token', (req: Request, res: Response) => {
    const { username } = req.body;
    res.json({
      access_token: `token_${username || 'user'}_${Date.now()}`,
      token_type: 'bearer',
    });
  });

  app.get('/profile', (req: Request, res: Response) => {
    res.json(db.users[1]);
  });

  app.put('/profile', (req: Request, res: Response) => {
    Object.assign(db.users[1], req.body);
    res.json(db.users[1]);
  });

  app.post('/signup', (req: Request, res: Response) => {
    const newUser = {
      id: db.users.length + 1,
      username: req.body.username || `user_${Date.now()}`,
      email: req.body.email,
      full_name: req.body.full_name || req.body.username,
      role: 'clinician',
    };
    db.users.push(newUser);
    res.status(201).json({ username: newUser.username });
  });

  app.post('/forgot-password', (req: Request, res: Response) => {
    res.json({ status: 'success', message: 'Password reset link sent.' });
  });

  // --- Clinical Chat & Copilot ---
  app.post('/chat', (req: Request, res: Response) => {
    const { message, model } = req.body;
    const reply = `[TabICLv2 Clinical AI (${model || 'Standard'})]: Based on validated ADA/ACC 2026 protocols, the specified clinical criteria indicate stable hemodynamics. Note: Assistive CDS only; clinician verification required.`;
    db.chatHistory.push(
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() }
    );
    res.json({ reply });
  });

  app.get('/chat/history', (_req: Request, res: Response) => {
    res.json(db.chatHistory);
  });

  app.delete('/chat/history', (_req: Request, res: Response) => {
    db.chatHistory = [];
    res.status(204).end();
  });

  app.get('/chat/suggestions', (_req: Request, res: Response) => {
    res.json({
      suggestions: [
        'Review cardiac risk for Patient #42',
        'Check CPIC guidelines for Clopidogrel CYP2C19',
        'Explain eGFR decline vs ACEi titration',
        'Summarize 10-year BioTwin ODE projection',
      ],
    });
  });

  // --- TabICL Disease Predictions ---
  app.post('/v1/predict/diabetes', (req: Request, res: Response) => {
    const bmi = Number(req.body.bmi) || 26;
    const glucose = Number(req.body.glucose) || 100;
    const risk = bmi > 30 || glucose > 125 ? 'High' : bmi > 25 || glucose > 100 ? 'Moderate' : 'Low';
    res.json({
      prediction: risk === 'High' ? 'Type 2 Diabetes High Probability' : risk === 'Moderate' ? 'Pre-Diabetes Elevated Risk' : 'Normal Glycemic Profile',
      confidence: 91.5,
      risk_level: risk,
      probabilities: { 'Healthy': 0.12, 'Pre-Diabetes': 0.58, 'Type 2 Diabetes': 0.30 },
      conformal_bounds: {
        confidence_level: 0.95,
        prediction_set: ['Pre-Diabetes', 'Type 2 Diabetes'],
        lower_p_value: 0.03,
        upper_p_value: 0.97,
      },
    });
  });

  app.post('/v1/predict/heart', (req: Request, res: Response) => {
    const chol = Number(req.body.chol) || 190;
    const bp = Number(req.body.bp || req.body.trestbps) || 120;
    const risk = chol > 240 || bp > 140 ? 'High' : chol > 200 || bp > 130 ? 'Moderate' : 'Low';
    res.json({
      prediction: risk === 'High' ? 'Elevated ASCVD Risk' : risk === 'Moderate' ? 'Borderline Coronary Risk' : 'Low Atherosclerotic Risk',
      confidence: 89.2,
      risk_level: risk,
      conformal_bounds: {
        confidence_level: 0.95,
        prediction_set: [risk === 'Low' ? 'Low Risk' : 'Moderate/High Risk'],
        lower_p_value: 0.02,
        upper_p_value: 0.98,
      },
    });
  });

  app.post('/v1/predict/kidney', (req: Request, res: Response) => {
    res.json({
      prediction: 'Normal Glomerular Filtration',
      confidence: 94.0,
      risk_level: 'Low',
      conformal_bounds: { confidence_level: 0.95, prediction_set: ['Stage 1 / Normal'], lower_p_value: 0.04, upper_p_value: 0.96 },
    });
  });

  app.post('/v1/predict/liver', (req: Request, res: Response) => {
    res.json({
      prediction: 'Low Fibrosis (F0-F1)',
      confidence: 88.4,
      risk_level: 'Low',
      conformal_bounds: { confidence_level: 0.95, prediction_set: ['F0-F1'], lower_p_value: 0.03, upper_p_value: 0.97 },
    });
  });

  app.post('/v1/predict/lungs', (req: Request, res: Response) => {
    res.json({
      prediction: 'Mild Airway Obstruction',
      confidence: 82.1,
      risk_level: 'Moderate',
      conformal_bounds: { confidence_level: 0.95, prediction_set: ['Normal', 'GOLD Stage 1'], lower_p_value: 0.05, upper_p_value: 0.95 },
    });
  });

  app.get('/v1/predict/organ-health/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id) || 42;
    res.json({
      patient_id: id,
      patient_name: `Patient #${id}`,
      age: 54,
      gender: 'Female',
      vitals_source: 'live_telemetry_stream',
      overall_score: 84,
      risks: {
        diabetes: { score: 38, risk_level: 'Moderate', conformal_bound: '95% CI [31% - 46%]', primary_driver: 'HbA1c 6.4%, BMI 28.2', key_metrics: { 'HbA1c': '6.4%', 'Fasting Glucose': '118 mg/dL' } },
        heart: { score: 22, risk_level: 'Low', conformal_bound: '95% CI [18% - 27%]', primary_driver: 'Framingham 10yr Risk 6.8%', key_metrics: { 'BP': '124/82 mmHg', 'Total Chol': '194 mg/dL' } },
        kidney: { score: 18, risk_level: 'Low', conformal_bound: '95% CI [14% - 24%]', primary_driver: 'KDIGO Low Risk', key_metrics: { 'eGFR': '94 mL/min/1.73m²' } },
        liver: { score: 15, risk_level: 'Low', conformal_bound: '95% CI [10% - 20%]', primary_driver: 'FIB-4 Index 1.12', key_metrics: { 'ALT': '28 U/L', 'AST': '24 U/L' } },
        lungs: { score: 28, risk_level: 'Low', conformal_bound: '95% CI [20% - 35%]', primary_driver: 'FEV1/FVC Ratio 78%', key_metrics: { 'FEV1': '84% pred' } },
      },
      recommended_orders: [
        { order_type: 'Lab Test', title: 'Repeat Fasting Glucose & Lipids', priority: 'routine', rationale: 'ADA prediabetes surveillance' },
        { order_type: 'Medication', title: 'Metformin 500mg PO daily', priority: 'routine', rationale: 'Glycemic stabilization' },
      ],
      clinical_disclaimer: 'Calculated using TabICLv2 & KDIGO/ADA guidelines. Physician review required.',
    });
  });

  // --- Hospital Operations Endpoints ---
  app.get('/v1/hospital/departments', (_req: Request, res: Response) => {
    res.json(db.departments);
  });

  app.post('/v1/hospital/departments', (req: Request, res: Response) => {
    const dept = {
      id: db.departments.length + 1,
      name: req.body.name,
      department_type: req.body.department_type,
      location: req.body.location || 'Building A',
      status: 'active',
      created_at: new Date().toISOString(),
    };
    db.departments.push(dept);
    res.status(201).json(dept);
  });

  app.get('/v1/hospital/beds', (req: Request, res: Response) => {
    const deptId = req.query.department_id ? Number(req.query.department_id) : null;
    const list = deptId ? db.beds.filter((b) => b.department_id === deptId) : db.beds;
    res.json(list);
  });

  app.get('/v1/hospital/capacity/forecast-24h', (_req: Request, res: Response) => {
    const hours = Array.from({ length: 25 }, (_, i) => i);
    const buildCurve = (basePct: number, peakPct: number, peakHour: number) =>
      hours.map((h) => {
        const dist = Math.abs(h - peakHour);
        const surge = Math.max(0, 1 - dist / 10) * (peakPct - basePct);
        const pct = Math.min(100, Math.round(basePct + surge));
        return {
          hourOffset: h,
          label: h === 0 ? 'Now' : `+${h}h`,
          occupancyPct: pct,
          historicalBaselinePct: Math.max(55, pct - 8),
        };
      });

    res.json({
      generatedAt: new Date().toISOString(),
      modelNote: '30-Day Historical Admission/Discharge Time-Series & Seasonal Surge Forecaster',
      criticalThresholdPct: 90,
      departments: [
        {
          id: 2,
          name: 'Emergency & Trauma',
          totalBeds: 18,
          currentOccupied: 15,
          currentOccupancyPct: 83,
          predictedPeakPct: 96,
          hoursUntilShortage: 6,
          predictedBedDeficit: 2,
          riskLevel: 'critical',
          trendDriver: 'Evening trauma & EMS arrival surge (+28% vs 30-day rolling baseline)',
          recommendedAction: 'Pre-activate 3 observation overflow bays & expedite 2 stable step-down transfers.',
          hourlyForecast: buildCurve(83, 96, 8),
        },
        {
          id: 3,
          name: 'Medical Intensive Care Unit (MICU)',
          totalBeds: 12,
          currentOccupied: 10,
          currentOccupancyPct: 83,
          predictedPeakPct: 92,
          hoursUntilShortage: 11,
          predictedBedDeficit: 1,
          riskLevel: 'warning',
          trendDriver: 'Post-operative high-acuity transfers & prolonged ventilator weaning window',
          recommendedAction: 'Clear Patient #44 (Elena Morales) for Cardiology Stepdown transfer before +8h mark.',
          hourlyForecast: buildCurve(83, 92, 13),
        },
        {
          id: 1,
          name: 'Cardiology Telemetry',
          totalBeds: 16,
          currentOccupied: 12,
          currentOccupancyPct: 75,
          predictedPeakPct: 84,
          hoursUntilShortage: null,
          predictedBedDeficit: 0,
          riskLevel: 'stable',
          trendDriver: 'Scheduled morning catheterization discharges balance afternoon admissions',
          recommendedAction: 'Maintain standard telemetry bed turnover; 2 beds reserved for MICU step-down.',
          hourlyForecast: buildCurve(75, 84, 14),
        },
        {
          id: 4,
          name: 'General Inpatient Medicine',
          totalBeds: 24,
          currentOccupied: 17,
          currentOccupancyPct: 71,
          predictedPeakPct: 79,
          hoursUntilShortage: null,
          predictedBedDeficit: 0,
          riskLevel: 'stable',
          trendDriver: 'Consistent 11:00 AM discharge velocity across 30-day historical trend',
          recommendedAction: 'Available to absorb 3 low-acuity Emergency Department boarding patients.',
          hourlyForecast: buildCurve(71, 79, 16),
        },
      ],
    });
  });

  app.post('/v1/hospital/beds', (req: Request, res: Response) => {
    const bed = {
      id: db.beds.length + 1,
      department_id: Number(req.body.department_id) || 1,
      bed_number: req.body.bed_number,
      ward: req.body.ward || 'General',
      status: req.body.status || 'available',
      current_patient_id: req.body.current_patient_id || null,
      patient_name: null,
    };
    db.beds.push(bed);
    res.status(201).json(bed);
  });

  app.patch('/v1/hospital/beds/:id/status', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const bed = db.beds.find((b) => b.id === id);
    if (bed) {
      bed.status = req.body.status || bed.status;
      if (typeof req.body.current_patient_id !== 'undefined') {
        bed.current_patient_id = req.body.current_patient_id;
      }
      return res.json(bed);
    }
    res.status(404).json({ detail: 'Bed not found' });
  });

  app.post('/v1/hospital/encounters', (req: Request, res: Response) => {
    const encounter = {
      id: db.encounters.length + 1,
      patient_id: Number(req.body.patient_id),
      department_id: Number(req.body.department_id),
      encounter_type: req.body.encounter_type,
      priority: req.body.priority || 'routine',
      status: 'open',
      reason: req.body.reason,
      started_at: new Date().toISOString(),
    };
    db.encounters.push(encounter);
    res.status(201).json(encounter);
  });

  app.post('/v1/hospital/admissions', (req: Request, res: Response) => {
    const admission = {
      id: db.admissions.length + 1,
      encounter_id: Number(req.body.encounter_id),
      patient_id: Number(req.body.patient_id),
      department_id: Number(req.body.department_id),
      status: 'active',
      admitted_at: new Date().toISOString(),
    };
    db.admissions.push(admission);
    res.status(201).json(admission);
  });

  app.post('/v1/hospital/clinical-orders', (req: Request, res: Response) => {
    const order = {
      id: db.clinicalOrders.length + 1,
      encounter_id: Number(req.body.encounter_id),
      patient_id: Number(req.body.patient_id),
      department_id: Number(req.body.department_id),
      order_type: req.body.order_type,
      title: req.body.title,
      priority: req.body.priority,
      status: 'ordered',
      created_at: new Date().toISOString(),
    };
    db.clinicalOrders.push(order);
    res.status(201).json(order);
  });

  app.get('/v1/hospital/patients/:id/emr-notes', (req: Request, res: Response) => {
    const patientId = Number(req.params.id) || 42;
    const notes = db.emrNotes
      .filter((n) => n.patient_id === patientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(notes);
  });

  app.post('/v1/hospital/patients/:id/emr-notes', (req: Request, res: Response) => {
    const patientId = Number(req.params.id) || Number(req.body.patient_id) || 42;
    const newNote = {
      id: Date.now(),
      patient_id: patientId,
      author_name: req.body.author_name || 'Dr. Sarah Chen, MD',
      author_role: req.body.author_role || 'Attending Physician',
      note_type: req.body.note_type || 'Clinical Observation',
      content: String(req.body.content || '').trim(),
      voice_transcribed: Boolean(req.body.voice_transcribed),
      language: req.body.language || 'en-US',
      created_at: new Date().toISOString(),
    };
    db.emrNotes.unshift(newNote);

    db.careEvents.unshift({
      id: db.careEvents.length + 100,
      patient_id: patientId,
      actor_user_id: 7,
      encounter_id: 9,
      department_id: 1,
      event_type: newNote.voice_transcribed ? 'VOICE_EMR_NOTE_RECORDED' : 'EMR_NOTE_CREATED',
      title: `${newNote.note_type}${newNote.voice_transcribed ? ' (Voice Dictated)' : ''}`,
      summary: newNote.content.slice(0, 180) + (newNote.content.length > 180 ? '...' : ''),
      severity: 'info',
      created_at: newNote.created_at,
    });

    res.status(201).json(newNote);
  });

  app.post('/v1/hospital/patients', (req: Request, res: Response) => {
    const existingIds = db.users.map((u) => Number(u.id) || 0);
    const nextId = Math.max(46, ...existingIds) + 1;
    const fullName = String(req.body.full_name || 'New Patient').trim();
    const rawUsername =
      String(req.body.username || '').trim() ||
      fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') ||
      `patient_${nextId}`;
    const department = String(req.body.department || 'OPD').trim();
    const status = String(req.body.status || 'active').trim().toLowerCase();
    const email =
      String(req.body.email || '').trim() || `${rawUsername}@example.com`;
    const initialNote = String(req.body.initial_note || '').trim();

    const newPatientUser = {
      id: nextId,
      username: rawUsername,
      email,
      full_name: fullName,
      role: 'patient',
      department,
      encounter_type: department,
      status,
      open_orders: 0,
    };
    db.users.push(newPatientUser);

    const newEncounter = {
      id: db.encounters.length + 1,
      patient_id: nextId,
      department_id: 1,
      encounter_type: department,
      priority: status === 'critical' ? 'stat' : status === 'triage' ? 'urgent' : 'routine',
      status,
      reason: initialNote || 'Direct clinical registry admission',
      started_at: new Date().toISOString(),
    };
    db.encounters.push(newEncounter);

    if (initialNote) {
      db.emrNotes.unshift({
        id: Date.now(),
        patient_id: nextId,
        author_name: req.body.author_name || 'Dr. Sarah Chen, MD',
        author_role: req.body.author_role || 'Attending Physician',
        note_type: 'Admission & Intake Note',
        content: initialNote,
        voice_transcribed: false,
        language: 'en-US',
        created_at: new Date().toISOString(),
      });
    }

    db.careEvents.unshift({
      id: db.careEvents.length + 300,
      patient_id: nextId,
      actor_user_id: 7,
      encounter_id: newEncounter.id,
      department_id: 1,
      event_type: 'PATIENT_REGISTERED',
      title: `New Patient Registered (${department})`,
      summary: `${fullName} (MRN-${String(nextId).padStart(4, '0')}) added to ${department} registry with ${status.toUpperCase()} acuity.`,
      severity: status === 'critical' ? 'critical' : 'info',
      created_at: new Date().toISOString(),
    });

    res.status(201).json({
      id: nextId,
      mrn: `MRN-${String(nextId).padStart(4, '0')}`,
      username: rawUsername,
      full_name: fullName,
      email,
      department,
      encounter_type: department,
      status,
      open_orders: 0,
    });
  });

  const activePatientPrescriptions: Record<number, any[]> = {
    42: [
      {
        id: 'MED-1',
        name: 'Lisinopril Oral Tablet',
        dosage: '10 mg',
        route: 'Oral',
        frequency: 'Once Daily (QAM)',
        indication: 'Essential Hypertension',
        rxNorm: 'RxNorm: 314076',
        status: 'active',
        started_at: '2025-11-10',
      },
      {
        id: 'MED-2',
        name: 'Metformin Hydrochloride Extended-Release',
        dosage: '500 mg',
        route: 'Oral',
        frequency: 'Twice Daily with Meals (BID)',
        indication: 'Type 2 Diabetes Mellitus',
        rxNorm: 'RxNorm: 860975',
        status: 'active',
        started_at: '2026-01-15',
      },
      {
        id: 'MED-3',
        name: 'Atorvastatin Calcium Oral Tablet',
        dosage: '20 mg',
        route: 'Oral',
        frequency: 'Nightly (QHS)',
        indication: 'Hyperlipidemia / Primary Cardiovascular Prevention',
        rxNorm: 'RxNorm: 259255',
        status: 'active',
        started_at: '2026-02-01',
      },
    ],
  };

  app.get('/v1/hospital/patients/:id/smart-prescriptions', (req: Request, res: Response) => {
    const patientId = Number(req.params.id) || 42;
    const isCriticalIcu = patientId === 43;
    const activeMedications = activePatientPrescriptions[patientId] || activePatientPrescriptions[42];

    res.json({
      patientId,
      clinicalContext: {
        egfr: isCriticalIcu ? '52 mL/min/1.73m² (Stage 3a CKD)' : '94 mL/min/1.73m² (Normal Renal Function)',
        hepaticStatus: 'Normal (ALT 28 U/L, AST 24 U/L • Child-Pugh Class A)',
        glycemicProfile: 'HbA1c 6.4% • Fasting Glucose 118 mg/dL',
        bloodPressure: isCriticalIcu ? '148/92 mmHg' : '122/78 mmHg',
        knownAllergies: ['Penicillin (Maculopapular Rash)', 'Sulfa Antibiotics (Urticaria)'],
        pharmacogenomics: 'CYP2C19 *1/*2 (Intermediate Metabolizer) • SLCO1B1 *1/*1 (Normal)',
      },
      activeMedications,
      suggestions: [
        {
          id: 'SUG-EMPAG',
          medicationName: 'Empagliflozin (Jardiance)',
          rxNorm: 'RxNorm: 1545653',
          therapeuticClass: 'SGLT2 Inhibitor • Cardiorenal & Glycemic Protection',
          recommendedDosage: '10 mg',
          dosageOptions: ['10 mg (Standard Starting Dose)', '25 mg (Max Titrated Dose)'],
          route: 'Oral',
          frequency: 'Once Daily in the Morning (QAM)',
          indication: 'Pre-Diabetes / Type 2 Glycemic Stabilization & Heart Failure Risk Reduction',
          clinicalRationale:
            'Recommended based on HbA1c 6.4%, BMI 28.2, and preserved eGFR (>20 mL/min/1.73m²) per ADA/ACC 2026 guidelines.',
          safetyStatus: 'safe',
          contraindications: [
            {
              severity: 'info',
              factor: 'Concomitant ACE Inhibitor (Lisinopril 10 mg)',
              detail:
                'Safe combination for cardiorenal protection; monitor orthostatic blood pressure and volume status during first 14 days.',
            },
            {
              severity: 'info',
              factor: 'Peri-Operative Protocol',
              detail: 'Hold 3 days prior to any scheduled surgical procedure to prevent euglycemic ketoacidosis.',
            },
          ],
        },
        {
          id: 'SUG-SPIRONO',
          medicationName: 'Spironolactone (Aldactone)',
          rxNorm: 'RxNorm: 313096',
          therapeuticClass: 'Mineralocorticoid Receptor Antagonist (MRA)',
          recommendedDosage: '12.5 mg',
          dosageOptions: [
            '12.5 mg (Renal/Hyperkalemia-Safe Initiation)',
            '25 mg (Standard Maintenance Dose)',
          ],
          route: 'Oral',
          frequency: 'Once Daily (QD)',
          indication: 'Adjunctive Blood Pressure & Ventricular Remodeling Support',
          clinicalRationale:
            'Initiated at low 12.5 mg dose due to concurrent Lisinopril 10 mg therapy.',
          safetyStatus: 'caution',
          contraindications: [
            {
              severity: 'warning',
              factor: 'Drug-Drug Interaction: Active Lisinopril 10 mg (ACE Inhibitor)',
              detail:
                'MODERATE INTERACTION: Dual RAAS blockade elevates serum potassium (hyperkalemia) risk. Check serum K+ and Creatinine within 72 hours of initiation.',
            },
          ],
        },
        {
          id: 'SUG-CLOPID',
          medicationName: 'Clopidogrel Bisulfate (Plavix)',
          rxNorm: 'RxNorm: 309362',
          therapeuticClass: 'P2Y12 Platelet Inhibitor',
          recommendedDosage: '75 mg (Avoid — Switch to Ticagrelor 90 mg BID)',
          dosageOptions: [
            'Ticagrelor 90 mg BID (CPIC Recommended Alternative)',
            'Prasugrel 10 mg Daily (Alternative)',
            'Clopidogrel 75 mg Daily (Not Recommended)',
          ],
          route: 'Oral',
          frequency: 'Twice Daily (Ticagrelor Alternative)',
          indication: 'Secondary Atherothrombotic Prevention',
          clinicalRationale:
            'CPIC Pharmacogenomic Alert triggered by patient CYP2C19 *1/*2 Intermediate Metabolizer status.',
          safetyStatus: 'contraindicated',
          contraindications: [
            {
              severity: 'critical',
              factor: 'CPIC Pharmacogenomic Contraindication: CYP2C19 *1/*2',
              detail:
                'HIGH RISK: Reduced bioactivation of Clopidogrel prodrug increases risk of major adverse cardiovascular events. Use Ticagrelor 90 mg BID instead.',
            },
          ],
        },
        {
          id: 'SUG-AMOX',
          medicationName: 'Amoxicillin-Clavulanate (Augmentin)',
          rxNorm: 'RxNorm: 617296',
          therapeuticClass: 'Beta-Lactam Antibiotic',
          recommendedDosage: 'Contraindicated — Use Azithromycin 500 mg or Levofloxacin',
          dosageOptions: [
            'Azithromycin 500 mg Day 1, then 250 mg Days 2-5 (Beta-Lactam Safe)',
            'Doxycycline 100 mg BID (Beta-Lactam Safe)',
          ],
          route: 'Oral',
          frequency: 'Once Daily',
          indication: 'Empiric Respiratory Tract Infection Coverage',
          clinicalRationale:
            'Direct beta-lactam allergy cross-reactivity detected in patient allergy history.',
          safetyStatus: 'contraindicated',
          contraindications: [
            {
              severity: 'critical',
              factor: 'Documented Patient Allergy: Penicillin (Maculopapular Rash)',
              detail:
                'ABSOLUTE CONTRAINDICATION: Patient has a verified Penicillin allergy on file. Prescribe a macrolide or respiratory fluoroquinolone instead.',
            },
          ],
        },
      ],
      clinicalDisclaimer:
        'Smart Prescription recommendations are for assistive Clinical Decision Support (CDS) only and do not replace physician judgment. Always consult a qualified clinician and verify patient renal/hepatic labs and allergies prior to prescribing.',
    });
  });

  app.post('/v1/hospital/patients/:id/smart-prescriptions', (req: Request, res: Response) => {
    const patientId = Number(req.params.id) || 42;
    if (!activePatientPrescriptions[patientId]) {
      activePatientPrescriptions[patientId] = [...activePatientPrescriptions[42]];
    }

    const newMed = {
      id: `MED-${Date.now()}`,
      name: String(req.body.name || 'Empagliflozin Oral Tablet'),
      dosage: String(req.body.dosage || '10 mg'),
      route: String(req.body.route || 'Oral'),
      frequency: String(req.body.frequency || 'Once Daily'),
      indication: String(req.body.indication || 'Clinical Indication'),
      rxNorm: String(req.body.rxNorm || 'RxNorm: Verified'),
      status: 'active',
      started_at: new Date().toISOString().slice(0, 10),
    };

    activePatientPrescriptions[patientId].unshift(newMed);

    db.careEvents.unshift({
      id: db.careEvents.length + 200,
      patient_id: patientId,
      actor_user_id: 7,
      encounter_id: 9,
      department_id: 1,
      event_type: 'PRESCRIPTION_CREATED',
      title: `Smart Prescription Ordered: ${newMed.name} (${newMed.dosage})`,
      summary: `${newMed.route} • ${newMed.frequency} for ${newMed.indication}. Contraindication & dosage check passed.`,
      severity: 'info',
      created_at: new Date().toISOString(),
    });

    res.status(201).json(newMed);
  });

  app.get('/v1/hospital/doctor/patients', (_req: Request, res: Response) => {
    res.json(
      db.users
        .filter((u) => u.role === 'patient')
        .map((p) => {
          const enc = db.encounters.find((e) => e.patient_id === p.id);
          return {
            patient_id: p.id,
            username: p.username,
            full_name: p.full_name,
            latest_encounter_id: enc?.id || null,
            latest_encounter_type: enc?.encounter_type || 'OPD',
            latest_status: enc?.status || 'open',
            open_orders: db.clinicalOrders.filter((o) => o.patient_id === p.id).length,
            active_admissions: db.admissions.filter((a) => a.patient_id === p.id).length,
          };
        })
    );
  });

  // --- Care Events Feeds ---
  app.get('/v1/events/doctor/patients/:id/feed', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const events = db.careEvents.filter((e) => e.patient_id === id);
    res.json({
      patient_id: id,
      clinical_safety_note: 'Care events are operational records and do not replace clinician review.',
      events,
      next_after_id: null,
    });
  });

  app.get('/v1/events/admin/patients/:id/feed', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    res.json({
      patient_id: id,
      clinical_safety_note: 'Care events are operational records and do not replace clinician review.',
      events: db.careEvents,
      next_after_id: null,
    });
  });

  app.get('/v1/events/patient/feed', (_req: Request, res: Response) => {
    res.json({
      events: db.careEvents,
      next_after_id: null,
    });
  });

  app.post('/v1/events/dispatch', (req: Request, res: Response) => {
    const newEvent = {
      id: db.careEvents.length + 1,
      patient_id: Number(req.body.patient_id) || 42,
      event_type: req.body.event_type || 'MANUAL_DISPATCH',
      title: req.body.title || 'Clinical Alert',
      summary: req.body.summary || 'Dispatched event',
      severity: req.body.severity || 'info',
      created_at: new Date().toISOString(),
    };
    db.careEvents.push(newEvent);

    const targetPatient = db.users.find((u) => u.id === newEvent.patient_id);
    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category:
        newEvent.event_type.includes('LAB')
          ? 'CRITICAL_LAB'
          : newEvent.event_type.includes('APPOINTMENT')
          ? 'PENDING_APPOINTMENT'
          : 'PATIENT_STATUS',
      severity:
        newEvent.severity === 'critical'
          ? 'error'
          : newEvent.severity === 'warning'
          ? 'warning'
          : 'info',
      title: newEvent.title,
      message: newEvent.summary,
      patient_id: newEvent.patient_id,
      patient_name: targetPatient?.full_name || `Patient #${newEvent.patient_id}`,
      department: 'Clinical Operations',
      action_href: `/patients/${newEvent.patient_id}`,
      action_label: 'View Patient Chart',
      acknowledged: false,
      created_at: newEvent.created_at,
    };
    db.notifications.unshift(notif);
    broadcastNotificationEvent('notification:created', notif);

    res.json({
      event_id: newEvent.id,
      status: 'dispatched',
      dispatched_at: newEvent.created_at,
    });
  });

  // --- Real-Time Staff Notifications API & SSE Stream ---
  app.get(['/v1/notifications', '/api/v1/notifications'], (_req: Request, res: Response) => {
    res.json({
      notifications: db.notifications,
      unread_count: db.notifications.filter((n) => !n.acknowledged).length,
    });
  });

  app.get(['/v1/notifications/stream', '/api/v1/notifications/stream'], (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial authoritative state on connect
    res.write(
      `event: init\ndata: ${JSON.stringify({
        notifications: db.notifications,
      })}\n\n`
    );

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.post(['/v1/notifications/dispatch', '/api/v1/notifications/dispatch'], (req: Request, res: Response) => {
    const category = req.body.category || 'PATIENT_STATUS';
    const patientId = Number(req.body.patient_id) || 43;
    const targetPatient = db.users.find((u) => u.id === patientId);
    const defaultSeverity =
      category === 'CRITICAL_LAB'
        ? 'error'
        : category === 'PENDING_APPOINTMENT'
        ? 'warning'
        : 'info';

    const newNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      severity: req.body.severity || defaultSeverity,
      title: req.body.title || 'Clinical Status Notification',
      message:
        req.body.message ||
        'Updated clinical telemetry and patient chart status synchronized.',
      patient_id: patientId,
      patient_name: req.body.patient_name || targetPatient?.full_name || `Patient #${patientId}`,
      department: req.body.department || 'ICU / Telemetry',
      action_href:
        req.body.action_href ||
        (category === 'PENDING_APPOINTMENT' ? '/telemedicine' : `/patients/${patientId}`),
      action_label:
        req.body.action_label ||
        (category === 'PENDING_APPOINTMENT' ? 'Open Telemedicine' : 'Open Patient Chart'),
      acknowledged: false,
      created_at: new Date().toISOString(),
    };

    db.notifications.unshift(newNotification);
    if (db.notifications.length > 50) {
      db.notifications.pop();
    }

    broadcastNotificationEvent('notification:created', newNotification);
    res.status(201).json(newNotification);
  });

  app.patch(
    ['/v1/notifications/:id/acknowledge', '/api/v1/notifications/:id/acknowledge'],
    (req: Request, res: Response) => {
      const { id } = req.params;
      const item = db.notifications.find((n) => n.id === id);
      if (item) {
        item.acknowledged = true;
        broadcastNotificationEvent('notification:acknowledged', { id: item.id });
        return res.json(item);
      }
      res.status(404).json({ detail: 'Notification not found' });
    }
  );

  app.post(
    ['/v1/notifications/acknowledge-all', '/api/v1/notifications/acknowledge-all'],
    (_req: Request, res: Response) => {
      db.notifications.forEach((n) => {
        n.acknowledged = true;
      });
      broadcastNotificationEvent('notification:acknowledged_all', {
        timestamp: new Date().toISOString(),
      });
      res.json({ status: 'ok', unread_count: 0 });
    }
  );

  // --- Telemedicine Appointments ---
  app.get('/v1/appointments/', (_req: Request, res: Response) => {
    res.json(db.appointments);
  });

  app.post('/v1/appointments/', (req: Request, res: Response) => {
    const appt = {
      id: db.appointments.length + 1,
      user_id: 42,
      doctor_id: Number(req.body.doctor_id) || 7,
      specialist: req.body.specialist || 'Cardiology',
      date_time: req.body.appointment_date || `${req.body.date}T${req.body.time || '10:00'}:00`,
      reason: req.body.notes || req.body.reason || 'General Consultation',
      status: 'Scheduled',
      doctor: { name: 'Dr. Sarah Chen, MD', specialization: 'Cardiology' },
    };
    db.appointments.push(appt);

    const apptNotif = {
      id: `notif-${Date.now()}-appt`,
      category: 'PENDING_APPOINTMENT',
      severity: 'warning',
      title: `New ${appt.specialist} Appointment Scheduled`,
      message: `${appt.reason} with ${appt.doctor.name} scheduled for ${appt.date_time}.`,
      patient_id: appt.user_id,
      patient_name: 'Assigned Patient',
      department: appt.specialist,
      action_href: '/telemedicine',
      action_label: 'View Schedule',
      acknowledged: false,
      created_at: new Date().toISOString(),
    };
    db.notifications.unshift(apptNotif);
    broadcastNotificationEvent('notification:created', apptNotif);

    res.status(201).json(appt);
  });

  app.get('/v1/doctors/', (_req: Request, res: Response) => {
    res.json([
      { id: 7, name: 'Dr. Sarah Chen, MD', specialization: 'Cardiology' },
      { id: 8, name: 'Dr. Marcus Vance, MD', specialization: 'Critical Care / ICU' },
      { id: 9, name: 'Dr. Elena Morales, MD', specialization: 'Internal Medicine' },
    ]);
  });

  app.post('/v1/casa/chat', (req: Request, res: Response) => {
    res.json({
      reply: 'CASA Clinical Assistant: Your symptoms have been recorded and synchronized to your attending specialist for the upcoming video session.',
    });
  });

  // --- Lakehouse Data Engineering ---
  app.post('/v1/lakehouse/omop/transform', (_req: Request, res: Response) => {
    res.json({
      status: 'success',
      source_table: 'bronze.raw_patients',
      target_cdm_table: 'gold.omop_person_v5_4',
      records_transformed: 1,
      mapping_version: 'OMOP CDM v5.4 SNOMED/LOINC/RxNorm 2026.02',
      data_quality_passed: true,
    });
  });

  app.get('/v1/lakehouse/quality/audit', (req: Request, res: Response) => {
    res.json({
      suite_name: `GreatExpectations_Delta_${req.query.table || 'OMOP_CDM_v5_4'}`,
      overall_score: 0.998,
      passed_count: 42,
      failed_count: 0,
      total_rules: 42,
      passed_rules: 42,
      failed_rules: 0,
      compliance_score: 100.0,
      anomalies_detected: [],
      timestamp: new Date().toISOString(),
      execution_timestamp: new Date().toISOString(),
      datasets: [
        {
          name: 'omop_person_gold',
          record_count: '253,680',
          lineage: { upstream_modules: ['FHIR Patient Bundle', 'Bronze EHR Stream'] },
          pii_exposed: false,
        },
        {
          name: 'omop_measurement_silver',
          record_count: '1,420,910',
          lineage: { upstream_modules: ['HL7v2 Lab Feed', 'ICU 500Hz Telemetry'] },
          pii_exposed: false,
        },
        {
          name: 'omop_visit_occurrence',
          record_count: '84,320',
          lineage: { upstream_modules: ['ADT Admission Stream', 'Telemedicine Encounters'] },
          pii_exposed: false,
        },
        {
          name: 'omop_drug_exposure',
          record_count: '312,450',
          lineage: { upstream_modules: ['RxNorm Pharmacy Dispense', 'CPIC PGx Gate'] },
          pii_exposed: false,
        },
      ],
      checks: [
        {
          id: 'expect_person_id_not_null',
          description: 'Verifies 100% referential integrity across OMOP person_id primary keys.',
          status: 'passed',
          failed_count: 0,
        },
        {
          id: 'expect_vitals_physiological_bounds',
          description: 'Asserts HR (20-300 bpm), SBP (40-280 mmHg), and SpO2 (50-100%) fall within clinical limits.',
          status: 'passed',
          failed_count: 0,
        },
        {
          id: 'expect_phi_fernet_redaction',
          description: 'Confirms SSN, Aadhaar, email, and raw patient names are stripped from Silver/Gold tables.',
          status: 'passed',
          failed_count: 0,
        },
        {
          id: 'expect_loinc_snomed_concept_mapping',
          description: 'Validates all diagnostic codes map to active SNOMED-CT and LOINC 2026 vocabularies.',
          status: 'passed',
          failed_count: 0,
        },
      ],
      rules: [
        {
          rule_id: 'GE-001',
          name: 'expect_table_columns_to_match_ordered_set',
          table: 'gold.omop_person',
          status: 'passed',
          details: 'All 18 OMOP CDM person attributes match strictly.',
          passed_records: 253680,
          failed_records: 0,
        },
        {
          rule_id: 'GE-002',
          name: 'expect_column_values_to_not_be_null',
          table: 'gold.omop_visit_occurrence',
          column: 'person_id',
          status: 'passed',
          details: 'Zero null keys detected across active inpatient visits.',
          passed_records: 84320,
          failed_records: 0,
        },
      ],
    });
  });

  app.get('/v1/lakehouse/delta/history', (_req: Request, res: Response) => {
    res.json([
      { version: 3, timestamp: new Date(Date.now() - 600000).toISOString(), userId: 'dlt-pipeline', operation: 'MERGE', operationParameters: { mode: 'upsert' }, isolationLevel: 'SnapshotIsolation', isBlindAppend: false },
      { version: 2, timestamp: new Date(Date.now() - 3600000).toISOString(), userId: 'spark-stream', operation: 'STREAMING UPDATE', operationParameters: { batchId: '4928' }, isolationLevel: 'WriteSerializable', isBlindAppend: true },
    ]);
  });

  app.post('/v1/lakehouse/sql/execute', (req: Request, res: Response) => {
    res.json({
      query: req.body.sql || 'SELECT * FROM gold.patient_cohort_aggregates',
      execution_time_ms: 16.2,
      columns: ['cohort', 'patient_count', 'mean_risk_score', 'readmission_rate_30d'],
      rows: [
        { cohort: 'ICU Septic Shock', patient_count: 34, mean_risk_score: 0.82, readmission_rate_30d: 0.18 },
        { cohort: 'Cardiology Heart Failure', patient_count: 87, mean_risk_score: 0.54, readmission_rate_30d: 0.12 },
        { cohort: 'General Medicine Type 2 DM', patient_count: 240, mean_risk_score: 0.38, readmission_rate_30d: 0.05 },
      ],
      delta_table: 'gold.patient_cohort_aggregates',
    });
  });

  // --- Admin Endpoints ---
  app.get('/admin/stats', (_req: Request, res: Response) => {
    res.json({
      total_patients: db.users.filter((u) => u.role === 'patient').length,
      total_beds: db.beds.length,
      occupied_beds: db.beds.filter((b) => b.status === 'occupied').length,
      total_encounters: db.encounters.length,
      active_admissions: db.admissions.length,
      system_uptime: '99.99%',
      database_type: 'postgres',
    });
  });

  app.get('/admin/users', (_req: Request, res: Response) => {
    res.json(db.users);
  });

  app.get('/admin/patients', (_req: Request, res: Response) => {
    res.json(db.users.filter((u) => u.role === 'patient'));
  });

  app.get('/admin/patients/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const patient = db.users.find((u) => u.id === id);
    if (patient) return res.json(patient);
    res.status(404).json({ detail: 'Patient not found' });
  });

  app.get('/admin/audit-logs', (_req: Request, res: Response) => {
    res.json(db.auditLogs);
  });

  app.post('/admin/audit-logs/sync', (req: Request, res: Response) => {
    const incoming = Array.isArray(req.body?.logs) ? req.body.logs : [];
    let syncedCount = 0;

    for (const item of incoming) {
      if (!item || !item.action) continue;
      db.auditLogs.unshift({
        id: Date.now() + Math.floor(Math.random() * 10000),
        facility_id: 1,
        actor_user_id: Number(item.actorUserId) || 7,
        target_user_id: item.targetPatientId ? Number(item.targetPatientId) : null,
        action: String(item.action),
        timestamp: item.timestamp || new Date().toISOString(),
        details: `[INDEXEDDB_OFFLINE_SYNC • ${item.eventType || 'AUDIT'} • ${item.integrityChecksum || 'verified'}] ${item.details || item.resourcePath || ''}`,
      });
      syncedCount++;
    }

    res.status(201).json({
      status: 'synced',
      synced_count: syncedCount,
      server_timestamp: new Date().toISOString(),
    });
  });

  // --- Multi-Level Access Control List (ACL) & Break-Glass Governance ---
  const aclMatrix: Record<string, Record<string, string[]>> = {
    super_admin: {
      patient_emr: ['read', 'write', 'approve', 'export_pdf', 'break_glass'],
      clinical_orders: ['read', 'write', 'approve', 'export_pdf', 'break_glass'],
      organ_ai_models: ['read', 'write', 'approve', 'export_pdf'],
      bed_capacity: ['read', 'write', 'approve'],
      telemedicine: ['read', 'write', 'approve'],
      lakehouse_omop: ['read', 'write', 'approve'],
      rbac_governance: ['read', 'write', 'approve', 'export_pdf', 'break_glass'],
    },
    admin: {
      patient_emr: ['read', 'export_pdf', 'break_glass'],
      clinical_orders: ['read', 'approve'],
      organ_ai_models: ['read', 'export_pdf'],
      bed_capacity: ['read', 'write', 'approve'],
      telemedicine: ['read', 'write'],
      lakehouse_omop: ['read', 'write', 'approve'],
      rbac_governance: ['read', 'write', 'approve', 'export_pdf'],
    },
    doctor: {
      patient_emr: ['read', 'write', 'approve', 'export_pdf', 'break_glass'],
      clinical_orders: ['read', 'write', 'approve', 'export_pdf'],
      organ_ai_models: ['read', 'write', 'approve', 'export_pdf'],
      bed_capacity: ['read', 'write'],
      telemedicine: ['read', 'write', 'approve'],
      lakehouse_omop: ['read'],
      rbac_governance: ['read'],
    },
    nurse: {
      patient_emr: ['read', 'write', 'export_pdf', 'break_glass'],
      clinical_orders: ['read', 'write'],
      organ_ai_models: ['read'],
      bed_capacity: ['read', 'write'],
      telemedicine: ['read', 'write'],
      lakehouse_omop: [],
      rbac_governance: [],
    },
    pharmacist: {
      patient_emr: ['read'],
      clinical_orders: ['read', 'write', 'approve'],
      organ_ai_models: ['read'],
      bed_capacity: ['read'],
      telemedicine: [],
      lakehouse_omop: [],
      rbac_governance: [],
    },
    patient: {
      patient_emr: ['read', 'export_pdf'],
      clinical_orders: ['read'],
      organ_ai_models: ['read'],
      bed_capacity: [],
      telemedicine: ['read', 'write'],
      lakehouse_omop: [],
      rbac_governance: [],
    },
    auditor: {
      patient_emr: [],
      clinical_orders: ['read'],
      organ_ai_models: ['read'],
      bed_capacity: ['read'],
      telemedicine: [],
      lakehouse_omop: ['read', 'export_pdf'],
      rbac_governance: ['read', 'export_pdf'],
    },
  };

  const breakGlassGrants = [
    {
      id: 'bg-901',
      actor_username: 'dr_sarah',
      actor_role: 'doctor',
      target_resource: 'patient_emr',
      patient_id: 43,
      justification:
        'Emergency resuscitation in ER-01 for acute NSTEMI; cross-department chart unsealing required.',
      granted_at: new Date(Date.now() - 1200000).toISOString(),
      expires_at: new Date(Date.now() + 2400000).toISOString(),
      active: true,
    },
  ];

  app.get(['/v1/admin/acl/matrix', '/api/v1/admin/acl/matrix'], (_req: Request, res: Response) => {
    res.json({
      matrix: aclMatrix,
      break_glass_grants: breakGlassGrants,
    });
  });

  app.put(
    ['/v1/admin/acl/roles/:role/permissions', '/api/v1/admin/acl/roles/:role/permissions'],
    (req: Request, res: Response) => {
      const { role } = req.params;
      const { resource, actions } = req.body;
      if (!aclMatrix[role]) aclMatrix[role] = {};
      aclMatrix[role][resource] = Array.isArray(actions) ? actions : [];

      db.auditLogs.unshift({
        id: db.auditLogs.length + 1001,
        facility_id: 1,
        actor_user_id: 1,
        target_user_id: null,
        action: 'UPDATE_ACL_POLICY',
        timestamp: new Date().toISOString(),
        details: `Updated ACL permissions for role '${role}' on resource '${resource}' -> [${(
          actions || []
        ).join(', ')}]`,
      });

      res.json({ role, resource, actions: aclMatrix[role][resource] });
    }
  );

  app.patch(
    ['/v1/admin/users/:id/role', '/api/v1/admin/users/:id/role'],
    (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const user = db.users.find((u) => u.id === id) as any;
      if (user) {
        if (req.body.role) user.role = req.body.role;
        if (req.body.department_scope) user.department_scope = req.body.department_scope;
      }

      db.auditLogs.unshift({
        id: db.auditLogs.length + 1001,
        facility_id: 1,
        actor_user_id: 1,
        target_user_id: id,
        action: 'ASSIGN_USER_CLEARANCE',
        timestamp: new Date().toISOString(),
        details: `Assigned clearance role '${req.body.role || 'unchanged'}' and scope '${
          req.body.department_scope || 'default'
        }' to User #${id}.`,
      });

      res.json({ id, role: req.body.role, department_scope: req.body.department_scope });
    }
  );

  app.post(
    ['/v1/admin/acl/break-glass', '/api/v1/admin/acl/break-glass'],
    (req: Request, res: Response) => {
      const grant = {
        id: `bg-${Date.now()}`,
        actor_username: req.body.actor_username || 'dr_sarah',
        actor_role: req.body.actor_role || 'doctor',
        target_resource: req.body.target_resource || 'patient_emr',
        patient_id: Number(req.body.patient_id) || 43,
        justification:
          req.body.justification || 'Emergency clinical intervention requiring ACL override.',
        granted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        active: true,
      };
      breakGlassGrants.unshift(grant);

      db.auditLogs.unshift({
        id: db.auditLogs.length + 1001,
        facility_id: 1,
        actor_user_id: 7,
        target_user_id: grant.patient_id,
        action: 'BREAK_GLASS_OVERRIDE',
        timestamp: grant.granted_at,
        details: `BREAK-GLASS invoked by @${grant.actor_username} (${grant.actor_role}) on ${grant.target_resource}: ${grant.justification}`,
      });

      const notif = {
        id: `notif-${Date.now()}-bg`,
        category: 'PATIENT_STATUS',
        severity: 'warning',
        title: `Break-Glass Emergency Access Invoked (@${grant.actor_username})`,
        message: `Unsealed ${grant.target_resource} for Patient #${grant.patient_id}. Reason: ${grant.justification}`,
        patient_id: grant.patient_id,
        patient_name: `Patient #${grant.patient_id}`,
        department: 'Security & Governance',
        action_href: '/admin',
        action_label: 'Audit Override',
        acknowledged: false,
        created_at: grant.granted_at,
      };
      db.notifications.unshift(notif);
      broadcastNotificationEvent('notification:created', notif);

      res.status(201).json(grant);
    }
  );

  app.post(
    ['/v1/admin/acl/break-glass/:id/revoke', '/api/v1/admin/acl/break-glass/:id/revoke'],
    (req: Request, res: Response) => {
      const grant = breakGlassGrants.find((g) => g.id === req.params.id);
      if (grant) {
        grant.active = false;
      }
      res.json({ status: 'revoked', id: req.params.id });
    }
  );

  app.get('/admin/audit-logs/export', (_req: Request, res: Response) => {
    const csv = 'id,timestamp,actor_user_id,action,details\n' +
      db.auditLogs.map((a) => `${a.id},${a.timestamp},${a.actor_user_id || ''},${a.action},"${a.details}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
    res.send(csv);
  });

  app.get(['/demo/readiness', '/admin/demo-readiness'], (_req: Request, res: Response) => {
    res.json({
      status: 'demo-ready',
      demo_mode: true,
      environment: 'demo',
      capabilities: ['Local demo mode', 'TabICLv2 Foundation Model', 'Delta Lakehouse OMOP'],
    });
  });

  app.get('/admin/operations-cockpit', (_req: Request, res: Response) => {
    res.json({
      hospital: {
        total_departments: db.departments.length,
        total_beds: db.beds.length,
        occupied_beds: db.beds.filter((b) => b.status === 'occupied').length,
        open_encounters: db.encounters.length,
        active_admissions: db.admissions.length,
      },
      monitoring: { open_signals: 0, total_vital_observations: 142 },
      diagnostics: { pending_review_count: 2 },
      pharmacy: { pending_dispense_count: 1 },
      billing: { unbilled_claims_count: 0 },
    });
  });

  app.get('/admin/analytics/gold-report', (_req: Request, res: Response) => {
    const now = new Date().toISOString();
    res.json({
      generated_at: now,
      report_generated_at: now,
      pipeline_execution: { duration_ms: 1420, duration_seconds: 1.42, status: 'completed' },
      total_records_analyzed: 538375,
      demographics: {
        avg_age: 54.8,
        avg_bmi: 27.6,
        gender_distribution: {
          male_ratio: 51.4,
          female_ratio: 48.6,
        },
      },
      prevalence_rates: {
        diabetes: 21.4,
        heart: 16.8,
        liver: 11.2,
        kidney: 9.5,
        lungs: 13.7,
      },
      model_performance: {
        diabetes: 0.995,
        heart: 0.952,
        kidney: 0.988,
        liver: 0.974,
        lungs: 0.968,
      },
      patient_cohort_count: 361,
      cohort_aggregates: [
        { cohort: 'ICU Septic Shock', patient_count: 34, mean_risk_score: 0.82, readmission_rate_30d: 0.18, los_days_mean: 6.4 },
        { cohort: 'Cardiology Heart Failure', patient_count: 87, mean_risk_score: 0.54, readmission_rate_30d: 0.12, los_days_mean: 4.2 },
        { cohort: 'General Medicine Type 2 DM', patient_count: 240, mean_risk_score: 0.38, readmission_rate_30d: 0.05, los_days_mean: 2.1 },
      ],
      overall_accuracy: 0.975,
      conformal_coverage_rate: 0.954,
    });
  });

  app.get('/admin/analytics/drift-report', (_req: Request, res: Response) => {
    res.json({
      diabetes: {
        sample_count: 1420,
        drift_score: 0.0184,
        status: 'Low Drift (Optimal)',
        baseline_relative_attributions: {
          Glucose: 0.34,
          BMI: 0.24,
          Age: 0.18,
          Systolic_BP: 0.14,
          HbA1c: 0.10,
        },
        production_relative_attributions: {
          Glucose: 0.35,
          BMI: 0.23,
          Age: 0.19,
          Systolic_BP: 0.13,
          HbA1c: 0.10,
        },
      },
      heart: {
        sample_count: 985,
        drift_score: 0.0241,
        status: 'Low Drift (Optimal)',
        baseline_relative_attributions: {
          Chest_Pain_Type: 0.29,
          Max_Heart_Rate: 0.22,
          Cholesterol: 0.19,
          Resting_BP: 0.16,
          ST_Depression: 0.14,
        },
        production_relative_attributions: {
          Chest_Pain_Type: 0.28,
          Max_Heart_Rate: 0.23,
          Cholesterol: 0.20,
          Resting_BP: 0.15,
          ST_Depression: 0.14,
        },
      },
      kidney: {
        sample_count: 612,
        drift_score: 0.0152,
        status: 'Low Drift (Optimal)',
        baseline_relative_attributions: {
          Serum_Creatinine: 0.38,
          eGFR: 0.28,
          Blood_Urea: 0.16,
          Albumin: 0.10,
          Hemoglobin: 0.08,
        },
        production_relative_attributions: {
          Serum_Creatinine: 0.37,
          eGFR: 0.29,
          Blood_Urea: 0.16,
          Albumin: 0.10,
          Hemoglobin: 0.08,
        },
      },
      liver: {
        sample_count: 540,
        drift_score: 0.0219,
        status: 'Low Drift (Optimal)',
        baseline_relative_attributions: {
          Direct_Bilirubin: 0.31,
          ALT_SGPT: 0.25,
          AST_SGOT: 0.22,
          Alkaline_Phosphotase: 0.12,
          Albumin_Ratio: 0.10,
        },
        production_relative_attributions: {
          Direct_Bilirubin: 0.30,
          ALT_SGPT: 0.26,
          AST_SGOT: 0.21,
          Alkaline_Phosphotase: 0.13,
          Albumin_Ratio: 0.10,
        },
      },
    });
  });

  app.get('/admin/analytics/cache-stats', (_req: Request, res: Response) => {
    const statsObj = {
      size: 142,
      hits: 1528,
      misses: 312,
      entries: [
        { query: 'Summarize cardiac risk profile and troponin trajectory for Patient #42', response_length: 842 },
        { query: 'Evaluate CPIC CYP2C19 metabolizer status for Clopidogrel order', response_length: 618 },
        { query: 'Generate SBAR nursing shift handoff for ICU Bed 04', response_length: 924 },
        { query: 'Check KDIGO 2026 eGFR titration threshold for Empagliflozin 10mg', response_length: 512 },
        { query: 'Audit ICD-10 I50.9 and CPT 99223 billing compliance on SOAP note', response_length: 735 },
      ],
    };
    res.json({
      total_requests: 1840,
      cache_hits: 1528,
      cache_misses: 312,
      hits: 1528,
      misses: 312,
      size: 142,
      entries: statsObj.entries,
      stats: statsObj,
      hit_ratio: 0.83,
      avg_latency_saved_ms: 248.5,
      memory_usage_mb: 42.8,
    });
  });

  app.post('/admin/analytics/cache-clear', (_req: Request, res: Response) => {
    res.json({ success: true, cleared: 142 });
  });

  app.get('/admin/ai-functions', (_req: Request, res: Response) => {
    res.json({
      total_functions: 4,
      functions: [
        {
          id: 'fn-tabicl-risk',
          name: 'TabICLv2 Multi-Organ Conformal Classifier',
          version: '2.4.0',
          agent_type: 'Predictive Prognostication',
          risk_category: 'Medium Risk (CDS Review)',
          module: 'backend/prediction.py',
          audience: ['Attending Clinicians', 'ICU Specialists'],
          endpoints: ['/v1/predict/diabetes', '/v1/predict/heart', '/v1/predict/kidney', '/v1/predict/liver', '/v1/predict/lungs'],
          clinical_safety_required: true,
          medical_disclaimer_required: true,
          human_review_required: true,
          uses_ai_provider: false,
          provider_boundary: 'Local On-Premises TabICLv2',
          notes: 'Calibrated with 95% split-conformal prediction intervals (α = 0.05). Non-device CDS under 21st Century Cures Act §3060.',
          input_schema: { type: 'object', properties: { labs: 'object', vitals: 'object' } },
          output_schema: { type: 'object', properties: { conformal_bounds: 'object' } },
          status: 'active',
          safety_checks_passed: true,
        },
        {
          id: 'fn-clinical-copilot',
          name: 'Clinical RAG Copilot & Evidence Synthesizer',
          version: '2.1.0',
          agent_type: 'Conversational CDSS',
          risk_category: 'Medium Risk (CDS Review)',
          module: 'backend/core_ai.py',
          audience: ['Physicians', 'Clinical Pharmacists'],
          endpoints: ['/v1/chat/stream', '/v1/intelligence/consensus/:id'],
          clinical_safety_required: true,
          medical_disclaimer_required: true,
          human_review_required: true,
          uses_ai_provider: true,
          provider_boundary: 'backend/core_ai.py Gateway',
          notes: 'PII is scrubbed before inference; citations grounded in OMOP CDM v5.4 and CPIC guidelines.',
          input_schema: { type: 'object', properties: { message: 'string', rag_scope: 'string' } },
          output_schema: { type: 'object', properties: { response: 'string' } },
          status: 'active',
          safety_checks_passed: true,
        },
        {
          id: 'fn-maf-billing',
          name: 'Multi-Agent Clinical Billing & ICD-10 Auditor',
          version: '1.4.0',
          agent_type: 'Auditing & Compliance',
          risk_category: 'Low Risk (Administrative)',
          module: 'backend/agents/billing_auditor.py',
          audience: ['Revenue Cycle Auditors', 'Medical Coders'],
          endpoints: ['/admin/agents/trigger-billing'],
          clinical_safety_required: false,
          medical_disclaimer_required: true,
          human_review_required: true,
          uses_ai_provider: true,
          provider_boundary: 'backend/core_ai.py Gateway',
          notes: 'Suggests ICD-10-CM and CPT codes from SOAP documentation; requires coder sign-off prior to claim submission.',
          input_schema: { type: 'object', properties: { soap_note: 'string' } },
          output_schema: { type: 'object', properties: { codes: 'array' } },
          status: 'active',
          safety_checks_passed: true,
        },
        {
          id: 'fn-nursing-sbar',
          name: 'Ward Shift SBAR Handoff Coordinator',
          version: '1.6.0',
          agent_type: 'Care Transition',
          risk_category: 'Medium Risk (Clinical Workflow)',
          module: 'backend/agents/nursing_handoff.py',
          audience: ['Registered Nurses', 'Charge Nurses'],
          endpoints: ['/admin/agents/trigger-nursing', '/admin/agents/trigger-discharge'],
          clinical_safety_required: true,
          medical_disclaimer_required: true,
          human_review_required: true,
          uses_ai_provider: true,
          provider_boundary: 'backend/core_ai.py Gateway',
          notes: 'Synthesizes 24-hour vital trends, fall risk scores, and active medication orders into structured SBAR format.',
          input_schema: { type: 'object', properties: { patient_id: 'number' } },
          output_schema: { type: 'object', properties: { sbar: 'object' } },
          status: 'active',
          safety_checks_passed: true,
        },
      ],
    });
  });

  app.get('/admin/model-cards', (_req: Request, res: Response) => {
    res.json({
      privacy_note: 'All model weights are trained exclusively on de-identified public cohorts (CDC BRFSS, Cleveland Heart, ILPD, CKD). Zero production patient PHI is stored in model artifacts.',
      models: [
        {
          model_id: 'tabicl-v2-clinical-foundation',
          name: 'TabICLv2 In-Context Clinical Foundation Model',
          architecture: 'Tabular In-Context Transformer with Conformal Quantile Heads',
          intended_use: 'Multi-organ failure risk assessment and ICU deterioration early warning.',
          limitations: 'Decision support only. Requires physician verification before clinical orders are executed.',
          training_data: 'OMOP CDM v5.4 De-identified Gold Cohorts (2.4M inpatient encounters).',
          evaluation_metrics: { auprc: 0.924, auroc: 0.941, brier_score: 0.082, conformal_coverage: 0.95 },
          last_evaluated: new Date().toISOString(),
        },
      ],
      model_cards: [
        {
          id: 'diabetes_tabicl_v2',
          name: 'Type 2 Diabetes Mellitus Predictor (TabICLv2)',
          model_family: 'TabICLv2 + Platt Calibration',
          clinical_use_category: 'Endocrinology CDSS',
          artifact_exists: true,
          artifact_size_bytes: 14820400,
          dataset_card_id: 'ds_cdc_brfss',
          intended_use: 'Assists clinicians in screening adult patients for Type 2 Diabetes and pre-diabetes glycemic risk using routine metabolic biomarkers.',
          limitations: [
            'Not validated for gestational diabetes or pediatric Type 1 diabetes.',
            'Requires fasting blood glucose and HbA1c confirmation prior to diagnosis.',
          ],
          target_users: ['Endocrinologists', 'Primary Care Physicians'],
          feature_count: 21,
          output: 'Calibrated probability [0.0–1.0] + 95% conformal prediction set',
        },
        {
          id: 'heart_disease_tabicl_v2',
          name: 'Cardiovascular & Coronary Risk Predictor',
          model_family: 'TabICLv2 Quad-Ensemble',
          clinical_use_category: 'Cardiology CDSS',
          artifact_exists: true,
          artifact_size_bytes: 18450200,
          dataset_card_id: 'ds_cleveland_heart',
          intended_use: 'Evaluates 10-year major adverse cardiac event (MACE) and coronary artery stenosis probability alongside Framingham/ASCVD scores.',
          limitations: [
            'Does not replace 12-lead ECG or high-sensitivity troponin serial assays in acute chest pain.',
            'Calibrated on adult inpatient and outpatient cardiology cohorts (ages 25–85).',
          ],
          target_users: ['Cardiologists', 'Emergency Physicians'],
          feature_count: 13,
          output: 'Calibrated probability [0.0–1.0] + SHAP feature attributions',
        },
        {
          id: 'kidney_ckd_tabicl_v2',
          name: 'Chronic Kidney Disease (CKD) KDIGO Classifier',
          model_family: 'TabICLv2 + Isotonic Calibration',
          clinical_use_category: 'Nephrology CDSS',
          artifact_exists: true,
          artifact_size_bytes: 9420800,
          dataset_card_id: 'ds_uci_ckd',
          intended_use: 'Early identification of renal function decline and KDIGO stage progression using serum creatinine, eGFR, and albuminuria.',
          limitations: [
            'Acute kidney injury (AKI) fluctuations require serial 48-hour creatinine monitoring.',
          ],
          target_users: ['Nephrologists', 'Internal Medicine'],
          feature_count: 24,
          output: 'CKD Risk Stage + 95% conformal interval',
        },
      ],
      dataset_cards: [
        {
          id: 'ds_cdc_brfss',
          name: 'CDC Behavioral Risk Factor Surveillance System (BRFSS)',
          source: 'Centers for Disease Control and Prevention (Public Domain)',
          local_artifact: 'data/diabetes_binary_health_indicators.csv',
          contains_production_patient_data: false,
          known_limitations: [
            'Self-reported survey covariates combined with laboratory screening cohorts.',
            'US adult population demographic distribution.',
          ],
        },
        {
          id: 'ds_cleveland_heart',
          name: 'UCI / CDC Conformed Cardiovascular Disease Cohort',
          source: 'Cleveland Clinic Foundation & CDC Heart Indicators',
          local_artifact: 'data/heart_disease_health_indicators.csv',
          contains_production_patient_data: false,
          known_limitations: [
            'Retrospective observational cohort; requires local hospital recalibration.',
          ],
        },
        {
          id: 'ds_uci_ckd',
          name: 'Chronic Kidney Disease Clinical Registry',
          source: 'UCI Machine Learning Repository (De-identified)',
          local_artifact: 'data/kidney_disease.csv',
          contains_production_patient_data: false,
          known_limitations: [
            'Smaller sample size supplemented by synthetic SMOTE conformal calibration.',
          ],
        },
      ],
    });
  });

  app.get('/admin/operational-health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      database_latency_ms: 1.4,
      lakehouse_sync_lag_sec: 0.2,
      active_worker_threads: 8,
      heap_memory_mb: 68.4,
      crdt_sync_peers: 3,
      last_checkpoint: new Date().toISOString(),
      checks: [
        { id: 'chk_db', name: 'Transactional EHR Database', detail: '1.4ms query latency • WAL mode active', status: 'passed' },
        { id: 'chk_delta', name: 'Delta Lakehouse Medallion Sync', detail: '0.2s replication lag • OMOP CDM v5.4', status: 'passed' },
        { id: 'chk_tabicl', name: 'TabICLv2 Conformal Inference Engine', detail: '5/5 organ models calibrated & warm', status: 'passed' },
        { id: 'chk_qdrant', name: 'Vector Semantic RAG Index', detail: 'HNSW cosine index • 142 cached embeddings', status: 'passed' },
        { id: 'chk_hipaa', name: 'Fernet Encryption & PII Scrubber', detail: 'Zero unmasked PHI tokens in audit stream', status: 'passed' },
      ],
    });
  });

  app.post('/admin/maintenance/trigger', (req: Request, res: Response) => {
    res.json({
      success: true,
      action: req.body.action || 'full_vacuum',
      message: `Maintenance operation '${req.body.action || 'full_vacuum'}' executed successfully across all nodes.`,
    });
  });

  app.post('/admin/agents/:agent', (req: Request, res: Response) => {
    const agent = req.params.agent;
    const telemetry = {
      duration: 0.38,
      input_tokens: 245,
      output_tokens: 312,
      estimated_cost: 0.00019,
    };

    if (agent.includes('billing') || agent.includes('handoff')) {
      return res.json({
        status: 'completed',
        telemetry,
        data: {
          agent: 'Clinical Billing & ICD-10 Compliance Auditor',
          audit_status: 'PASSED_WITH_RECOMMENDATIONS',
          extracted_icd10_codes: [
            { code: 'I20.9', description: 'Angina pectoris, unspecified', confidence: 0.96 },
            { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', confidence: 0.99 },
          ],
          recommended_cpt_codes: [
            { code: '99223', description: 'Initial hospital care, high severity (55+ mins)', reimbursement_tier: 'Level 3' },
            { code: '93000', description: 'Electrocardiogram, routine ECG with 12 leads', reimbursement_tier: 'Diagnostic' },
            { code: '84484', description: 'Troponin, quantitative assay', reimbursement_tier: 'Pathology' },
          ],
          denial_risk_score: 'Low (4.2%)',
          compliance_notes: 'SOAP note documents acute chest pain radiating to left arm with underlying T2DM. Medical necessity for serial troponin and cardiology consult is fully substantiated.',
        },
      });
    }

    if (agent.includes('discharge')) {
      return res.json({
        status: 'completed',
        telemetry,
        data: {
          agent: 'Autonomous Discharge & Transition-of-Care Coordinator',
          patient_id: req.body.patient_id || 1,
          readiness_status: 'READY_FOR_STEPDOWN',
          discharge_medications: [
            'Metformin 500mg PO BID with meals',
            'Empagliflozin 10mg PO once daily (morning)',
            'Lisinopril 10mg PO once daily',
            'Atorvastatin 20mg PO at bedtime',
          ],
          red_flag_symptoms: [
            'Recurrent substernal chest pressure or dyspnea at rest',
            'Fasting blood glucose > 240 mg/dL or < 70 mg/dL',
            'Weight gain > 3 lbs in 24 hours or worsening ankle edema',
          ],
          follow_up_plan: 'Outpatient Cardiology & Endocrinology review scheduled within 7 days. Home telemonitoring kit linked.',
        },
      });
    }

    if (agent.includes('nursing')) {
      return res.json({
        status: 'completed',
        telemetry,
        data: {
          agent: 'Ward Shift Nurse SBAR Handoff Coordinator',
          patient_id: req.body.patient_id || 1,
          sbar_summary: {
            situation: 'Patient admitted for acute cardiopulmonary observation; currently hemodynamically stable on telemetry.',
            background: 'History of Type 2 Diabetes Mellitus and essential hypertension.',
            assessment: 'BP 128/78 mmHg, HR 76 bpm sinus rhythm, SpO2 98% on room air. Fall Risk: Moderate (Morse Score 35).',
            recommendation: 'Continue Q4H vital checks, repeat morning BMP and troponin, verify bedtime statin administration.',
          },
          shift_tasks: [
            { time: '22:00', task: 'Administer Atorvastatin 20mg PO', priority: 'Routine' },
            { time: '00:00', task: 'Midnight telemetry strip verification & Q4H vitals', priority: 'High' },
            { time: '06:00', task: 'Draw fasting Basic Metabolic Panel & HbA1c', priority: 'STAT' },
          ],
        },
      });
    }

    if (agent.includes('security-patch') || agent.includes('patch')) {
      return res.json({
        status: 'completed',
        telemetry,
        data: {
          agent: 'DevSecOps Autonomous Virtual Patcher',
          posture_status: 'HARDENED',
          detected_misconfigurations: [
            'Wildcard CORS_ORIGIN=* detected in environment specification',
            'DEBUG=True flag active in runtime profile',
          ],
          applied_virtual_patches: [
            'Enforced strict Content-Security-Policy and HSTS headers at edge proxy',
            'Restricted CORS origins to 127.0.0.1:3000 and verified hospital domains',
            'Rotated ephemeral JWT signing key to 4096-bit RSA vault secret',
          ],
        },
      });
    }

    if (agent.includes('autofix') || agent.includes('fix')) {
      return res.json({
        status: 'completed',
        telemetry,
        data: {
          agent: 'Self-Healing Infrastructure Recoverer',
          diagnosis: 'Connection pool exhaustion and transient WAL lock contention detected.',
          remediation_actions_executed: [
            'Drained idle connection pool handles and recycled zombie worker threads',
            'Executed non-blocking PRAGMA wal_checkpoint(TRUNCATE) on local store',
            'Evicted 48MB of stale vector cache shards to restore memory headroom (CPU dropped from 91% to 18%)',
          ],
          post_recovery_health: 'OPTIMAL (99.99% SLA)',
        },
      });
    }

    res.json({
      status: 'completed',
      telemetry,
      data: {
        agent: 'Emergency Telephony & On-Call Escalation Coordinator',
        dispatch_status: 'ESCALATED_TO_ON_CALL_CARDIOLOGIST',
        contacted_specialist: 'Dr. Sarah Jenkins (Cardiology On-Call, +1-555-0199)',
        synthesized_voice_script: 'URGENT ICU TELEMETRY ALERT: Patient #1 exhibiting sustained ventricular tachycardia (HR 172 bpm, SBP 88 mmHg). Bedside rapid response team activated in Ward A. Press 1 to join live bedside audio bridge immediately.',
        call_latency_ms: 145,
      },
    });
  });

  // --- Vite Integration ---
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

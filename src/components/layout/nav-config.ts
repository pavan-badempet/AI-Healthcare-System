import React from 'react';
import {
  LayoutDashboard, Users, BedDouble, Video,
  Sparkles, BrainCircuit, Stethoscope, Database,
  ShieldCheck, Activity, Dna, GitBranch, Share2,
  HardDrive, Server, Layers, BarChart3, Pill, Box
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  title?: string;
  desc: string;
  longDesc?: string;
  href: string;
  icon: any;
  color: string;
  gradient?: string;
  bg?: string;
  tag?: string;
  category: string;
  highlights?: string[];
  subActions?: Array<{ label?: string; title?: string; href: string }>;
}

export const COMMAND_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Hospital Cockpit',
    desc: 'Real-time census, ICU monitors & clinical alerts',
    href: '/dashboard',
    icon: LayoutDashboard,
    color: 'indigo',
    tag: 'Command',
    category: 'Operations',
  },
  {
    id: 'patients',
    label: 'Patient Directory',
    desc: 'Longitudinal charts, FHIR records & trajectories',
    href: '/patients',
    icon: Users,
    color: 'emerald',
    tag: 'EHR',
    category: 'Clinical',
  },
  {
    id: 'capacity',
    label: 'Bed Capacity & Census',
    desc: 'Ward occupancy, admissions & transfer management',
    href: '/capacity',
    icon: BedDouble,
    color: 'cyan',
    tag: 'Facility',
    category: 'Operations',
  },
  {
    id: 'telemedicine',
    label: 'Telemedicine Encounters',
    desc: 'HD WebRTC clinician video with CASA AI synthesis',
    href: '/telemedicine',
    icon: Video,
    color: 'rose',
    tag: 'WebRTC',
    category: 'Clinical',
  },
  {
    id: 'predict',
    label: 'Disease Prediction Suite',
    desc: 'TabICLv2 multi-organ in-context risk scoring',
    href: '/predict',
    icon: Sparkles,
    color: 'purple',
    tag: 'TabICLv2',
    category: 'Clinical AI',
  },
  {
    id: 'frontier',
    label: 'Autonomous Frontier Studio',
    desc: 'BioTwin ODE, Causal Pearl do-calculus & Delphi consensus',
    href: '/frontier',
    icon: BrainCircuit,
    color: 'amber',
    tag: 'Research',
    category: 'Frontier AI',
  },
  {
    id: 'chat',
    label: 'Clinical AI Copilot',
    desc: 'Evidence-based conversational clinician copilot',
    href: '/chat',
    icon: Stethoscope,
    color: 'indigo',
    tag: 'Agentic',
    category: 'Clinical AI',
  },
  {
    id: 'telemetry',
    label: '500 Hz Waveform Telemetry',
    desc: 'Rayon DSP live biosignal & arrhythmia streams',
    href: '/telemetry',
    icon: Activity,
    color: 'rose',
    tag: '500Hz DSP',
    category: 'Operations',
  },
  {
    id: 'data-engineering',
    label: 'Delta Lakehouse OMOP',
    desc: 'Medallion ETL, Great Expectations & SNOMED CT',
    href: '/data-engineering',
    icon: Database,
    color: 'purple',
    tag: 'Delta Lake',
    category: 'Data Platform',
  },
  {
    id: 'federated',
    label: 'Federated Learning Edge',
    desc: 'Differential privacy & decentralized model rounds',
    href: '/federated',
    icon: GitBranch,
    color: 'cyan',
    tag: 'DP-SGD',
    category: 'Frontier AI',
  },
  {
    id: 'abdm',
    label: 'ABDM & National Health Grid',
    desc: 'ABHA Health ID, Aadhaar OTP & FHIR HIP/HIU bridge',
    href: '/abdm',
    icon: ShieldCheck,
    color: 'emerald',
    tag: 'ABHA M1-3',
    category: 'Interoperability',
  },
  {
    id: 'app-registry',
    label: 'SMART on FHIR Registry',
    desc: 'Third-party clinical apps & sandbox testing',
    href: '/app-registry',
    icon: Box,
    color: 'indigo',
    tag: 'SMART v2',
    category: 'Interoperability',
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure Topology',
    desc: 'Rust Axum gateway, Raft consensus & multi-region failover',
    href: '/infrastructure',
    icon: Server,
    color: 'rose',
    tag: 'Rust FFI',
    category: 'Operations',
  },
  {
    id: 'admin',
    label: 'System Admin Console',
    desc: 'RBAC, immutable audit ledger & AI agent mesh',
    href: '/admin',
    icon: ShieldCheck,
    color: 'indigo',
    tag: 'Governance',
    category: 'Admin',
  },
];

export function colorKeyFromMenuItem(item: MenuItem): string {
  if (item.color.includes('rose')) return 'rose';
  if (item.color.includes('purple')) return 'purple';
  if (item.color.includes('cyan')) return 'cyan';
  if (item.color.includes('emerald')) return 'emerald';
  if (item.color.includes('amber')) return 'amber';
  return 'indigo';
}

export function getIconStyles(colorKey: string) {
  switch (colorKey) {
    case 'rose':
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        glow: 'rgba(244, 63, 94, 0.25)',
      };
    case 'purple':
      return {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        glow: 'rgba(168, 85, 247, 0.25)',
      };
    case 'cyan':
      return {
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30',
        glow: 'rgba(6, 182, 212, 0.25)',
      };
    case 'emerald':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        glow: 'rgba(16, 185, 129, 0.25)',
      };
    case 'amber':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        glow: 'rgba(245, 158, 11, 0.25)',
      };
    default:
      return {
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-400',
        border: 'border-indigo-500/30',
        glow: 'rgba(99, 102, 241, 0.25)',
      };
  }
}

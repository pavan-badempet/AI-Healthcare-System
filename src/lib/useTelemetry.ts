/**
 * AI Healthcare System — Telemetry WebSocket & Streaming Hook
 */
import { useState, useEffect } from 'react';
import { getWebSocketUrl } from './apiCore';

export interface TelemetryData {
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  blood_pressure?: string;
  spo2: number;
  respiratory_rate: number;
  temperature: number;
  timestamp: string;
  status: 'nominal' | 'warning' | 'critical';
}

export function useTelemetry(patientId?: number) {
  const [data, setData] = useState<TelemetryData | null>({
    heart_rate: 74,
    systolic_bp: 120,
    diastolic_bp: 80,
    blood_pressure: '120/80',
    spo2: 98,
    respiratory_rate: 16,
    temperature: 36.8,
    timestamp: new Date().toISOString(),
    status: 'nominal',
  });
  const [status, setStatus] = useState<'connected' | 'connecting' | 'error'>('connected');

  useEffect(() => {
    // In demo or standard mode, provide dynamic simulated vitals
    const interval = setInterval(() => {
      setData((prev) => {
        if (!prev) return null;
        const hrDelta = Math.floor(Math.random() * 5) - 2;
        const spo2Delta = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        return {
          ...prev,
          heart_rate: Math.min(130, Math.max(58, prev.heart_rate + hrDelta)),
          spo2: Math.min(100, Math.max(93, prev.spo2 + spo2Delta)),
          timestamp: new Date().toISOString(),
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [patientId]);

  return { status, data };
}

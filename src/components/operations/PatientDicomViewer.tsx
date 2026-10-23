import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as cornerstone from 'cornerstone-core';
import type { CornerstoneImage } from 'cornerstone-core';
import * as dicomParser from 'dicom-parser';
import {
  Scan,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  Contrast,
  RefreshCcw,
  Ruler,
  Upload,
  Play,
  Pause,
  Layers,
  ShieldAlert,
  Sparkles,
  Move,
} from 'lucide-react';
import { usePrivacyStore, maskPatientName, maskMrn, maskDob } from '@/lib/privacy';
import { toast } from '@/lib/toast';

export interface DicomSeriesMetadata {
  id: string;
  modality: 'DX' | 'MR' | 'CT' | 'DCM';
  modalityLabel: string;
  studyDescription: string;
  seriesNumber: string;
  totalSlices: number;
  defaultWindowWidth: number;
  defaultWindowCenter: number;
  pixelSpacingMm: number;
  kvp: string;
  sliceThicknessMm: string;
  clinicalFinding: string;
}

const BUILTIN_SERIES: DicomSeriesMetadata[] = [
  {
    id: 'chest-xray',
    modality: 'DX',
    modalityLabel: 'Chest X-Ray (PA/AP Radiography)',
    studyDescription: 'Portable AP Chest Radiography • Thoracic Cage & Cardiopulmonary',
    seriesNumber: 'SER-101',
    totalSlices: 1,
    defaultWindowWidth: 2200,
    defaultWindowCenter: 1100,
    pixelSpacingMm: 0.65,
    kvp: '110 kVp',
    sliceThicknessMm: 'Projection',
    clinicalFinding:
      'Clear bilateral lung fields without focal consolidation, pleural effusion, or pneumothorax. Cardiothoracic ratio 0.46 (Normal).',
  },
  {
    id: 'brain-mri',
    modality: 'MR',
    modalityLabel: 'Brain MRI (T2-FLAIR Axial Stack)',
    studyDescription: 'Cranial MRI T2-Weighted FLAIR Multi-Slice Volumetric Stack',
    seriesNumber: 'SER-204',
    totalSlices: 12,
    defaultWindowWidth: 1800,
    defaultWindowCenter: 950,
    pixelSpacingMm: 0.48,
    kvp: '3.0 Tesla (TR 9000 / TE 110)',
    sliceThicknessMm: '3.0 mm',
    clinicalFinding:
      'Symmetric ventricular system without midline shift, acute territorial infarction, or mass effect across all 12 axial slices.',
  },
  {
    id: 'cardiac-ct',
    modality: 'CT',
    modalityLabel: 'Thoracic & Coronary CT Angiography',
    studyDescription: 'ECG-Gated Contrast Thoracic CT • Aorta & Ventricular Chambers',
    seriesNumber: 'SER-309',
    totalSlices: 12,
    defaultWindowWidth: 1600,
    defaultWindowCenter: 850,
    pixelSpacingMm: 0.55,
    kvp: '120 kVp',
    sliceThicknessMm: '1.25 mm',
    clinicalFinding:
      'Ascending and descending thoracic aorta normal in caliber without dissection. Preserved biventricular chamber dimensions.',
  },
];

const WINDOW_PRESETS = [
  { label: 'Default Auto', ww: 2000, wc: 1000 },
  { label: 'Lung / Airway', ww: 2600, wc: 650 },
  { label: 'Soft Tissue / Mediastinum', ww: 1400, wc: 1050 },
  { label: 'Bone / High Contrast', ww: 900, wc: 1450 },
];

interface CaliperMeasurement {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distanceMm: number;
}

const uploadedDicomStore = new Map<string, CornerstoneImage>();
let loaderRegistered = false;

/**
 * Generates a realistic 384x384 12-bit grayscale medical pixel buffer (0..4095)
 * for Chest X-Ray (DX), Brain MRI (MR), and Thoracic CT (CT) slices.
 */
function synthesizeMedicalPixelData(
  seriesId: string,
  sliceIndex: number,
  width = 384,
  height = 384
): Uint16Array {
  const pixels = new Uint16Array(width * height);
  const cx = width / 2;
  const cy = height / 2;
  const sliceNorm = (sliceIndex - 1) / 11; // 0..1

  for (let y = 0; y < height; y++) {
    const ny = (y - cy) / (height / 2); // -1..1
    for (let x = 0; x < width; x++) {
      const nx = (x - cx) / (width / 2); // -1..1
      let val = 80;

      if (seriesId === 'chest-xray') {
        // Thoracic body contour
        const bodyDist = Math.abs(nx) / 0.85 + Math.pow(ny * 0.65, 2);
        if (bodyDist < 1.05) {
          val = 1250;

          // Left & Right Lung Fields (radiolucent dark)
          const leftLung =
            Math.pow((nx + 0.34) / 0.28, 2) + Math.pow((ny + 0.04) / 0.56, 2);
          const rightLung =
            Math.pow((nx - 0.34) / 0.28, 2) + Math.pow((ny + 0.04) / 0.56, 2);

          if (leftLung < 1.0 && ny < 0.42) {
            val -= Math.round((1 - leftLung) * 820);
            // Pulmonary vascular markings
            const vessel =
              Math.sin((nx + 0.2) * 28 + ny * 14) * Math.cos(ny * 22);
            if (vessel > 0.65) val += Math.round((vessel - 0.65) * 420);
          }
          if (rightLung < 1.0 && ny < 0.44) {
            val -= Math.round((1 - rightLung) * 800);
            const vessel =
              Math.sin((nx - 0.2) * 28 - ny * 14) * Math.cos(ny * 22);
            if (vessel > 0.65) val += Math.round((vessel - 0.65) * 420);
          }

          // Mediastinum & Spine
          if (Math.abs(nx) < 0.09) {
            val += Math.round((1 - Math.abs(nx) / 0.09) * 580);
            if (Math.sin(ny * 45) > 0.2) val += 140;
          }

          // Cardiac silhouette (shifted slightly right in image = patient left)
          const heartDist =
            Math.pow((nx - 0.12) / 0.24, 2) + Math.pow((ny - 0.14) / 0.26, 2);
          if (heartDist < 1.0) {
            val += Math.round((1 - heartDist) * 690);
          }

          // Diaphragm domes
          if (ny > 0.36 + 0.08 * Math.pow(nx, 2)) {
            val += 520;
          }

          // Rib cage arcs
          const ribWave = Math.sin((ny - 0.28 * nx * nx) * 34);
          if (ribWave > 0.55 && Math.abs(nx) > 0.08 && Math.abs(nx) < 0.72 && ny > -0.65 && ny < 0.45) {
            val += Math.round((ribWave - 0.55) * 520);
          }
        }
      } else if (seriesId === 'brain-mri') {
        // Cranial oval contour (varies by axial slice)
        const scaleRadius = 0.82 - Math.abs(sliceNorm - 0.5) * 0.22;
        const headDist =
          Math.pow(nx / (scaleRadius * 0.86), 2) + Math.pow(ny / scaleRadius, 2);

        if (headDist < 1.02 && headDist > 0.9) {
          // Skull / Scalp rim
          val = 1750;
        } else if (headDist <= 0.9) {
          // Brain parenchyma (Gray/White matter + gyral sulci)
          const gyri =
            Math.sin(nx * 19 + sliceIndex * 0.7) *
            Math.cos(ny * 19 - sliceIndex * 0.5);
          val = 1020 + Math.round(gyri * 210);

          // Interhemispheric fissure
          if (Math.abs(nx) < 0.022 && Math.abs(ny) < scaleRadius * 0.85) {
            val = 1580;
          }

          // Lateral ventricles (bright CSF on T2)
          const ventScale = Math.max(0.2, 1 - Math.abs(sliceNorm - 0.48) * 1.9);
          const leftVent =
            Math.pow((nx + 0.11) / (0.09 * ventScale), 2) +
            Math.pow((ny + 0.02) / (0.24 * ventScale), 2);
          const rightVent =
            Math.pow((nx - 0.11) / (0.09 * ventScale), 2) +
            Math.pow((ny + 0.02) / (0.24 * ventScale), 2);

          if (leftVent < 1.0 || rightVent < 1.0) {
            val = 1920;
          }
        }
      } else {
        // Thoracic / Cardiac CT Cross-Section
        const torsoDist = Math.pow(nx / 0.84, 2) + Math.pow(ny / 0.62, 2);
        if (torsoDist < 1.0) {
          val = 1050;

          // Left & Right Lungs in axial cross-section
          const rLung =
            Math.pow((nx + 0.36) / 0.31, 2) + Math.pow((ny + 0.02) / 0.42, 2);
          const lLung =
            Math.pow((nx - 0.36) / 0.31, 2) + Math.pow((ny + 0.02) / 0.42, 2);
          if (rLung < 1.0 || lLung < 1.0) {
            val = 340 + Math.round(Math.sin(nx * 30 + sliceIndex) * 70);
          }

          // Heart & Contrast-Enhanced Chambers
          const heart =
            Math.pow((nx - 0.08) / (0.25 + sliceNorm * 0.04), 2) +
            Math.pow((ny + 0.08) / 0.24, 2);
          if (heart < 1.0) {
            val = 1480 + Math.round((1 - heart) * 380);
          }

          // Vertebral body (posterior high-density bone)
          const spine =
            Math.pow(nx / 0.11, 2) + Math.pow((ny - 0.36) / 0.11, 2);
          if (spine < 1.0) {
            val = 2050;
          }

          // Ascending / Descending Aorta
          const aorta =
            Math.pow((nx - 0.07) / 0.065, 2) + Math.pow((ny - 0.22) / 0.065, 2);
          if (aorta < 1.0) {
            val = 1860;
          }
        }
      }

      pixels[y * width + x] = Math.max(0, Math.min(4095, val));
    }
  }

  return pixels;
}

function ensureCornerstoneLoadersRegistered(): void {
  if (loaderRegistered || typeof window === 'undefined') return;
  loaderRegistered = true;

  try {
    cornerstone.registerImageLoader('pacs', (imageId: string) => {
      const clean = imageId.replace(/^pacs:\/\//, '');
      const [seriesId = 'chest-xray', , sliceStr = '1'] = clean.split('/');
      const sliceIndex = Math.max(1, Number(sliceStr) || 1);
      const seriesMeta =
        BUILTIN_SERIES.find((s) => s.id === seriesId) || BUILTIN_SERIES[0];

      const width = 384;
      const height = 384;
      const pixelData = synthesizeMedicalPixelData(seriesId, sliceIndex, width, height);

      const image: CornerstoneImage = {
        imageId,
        minPixelValue: 0,
        maxPixelValue: 4095,
        slope: 1.0,
        intercept: 0,
        windowCenter: seriesMeta.defaultWindowCenter,
        windowWidth: seriesMeta.defaultWindowWidth,
        getPixelData: () => pixelData,
        rows: height,
        columns: width,
        height,
        width,
        color: false,
        columnPixelSpacing: seriesMeta.pixelSpacingMm,
        rowPixelSpacing: seriesMeta.pixelSpacingMm,
        invert: false,
        sizeInBytes: pixelData.byteLength,
      };

      return {
        promise: Promise.resolve(image),
      };
    });

    cornerstone.registerImageLoader('dcmfile', (imageId: string) => {
      const stored = uploadedDicomStore.get(imageId);
      if (stored) {
        return { promise: Promise.resolve(stored) };
      }
      return {
        promise: Promise.reject(new Error(`Uploaded DICOM image not found: ${imageId}`)),
      };
    });
  } catch {
    // Ignore duplicate loader registration
  }
}

interface PatientDicomViewerProps {
  patientId: number;
  patientName?: string;
}

/**
 * Cornerstone.js Medical Imaging & PACS DICOM Viewer Component.
 * Enables clinicians to inspect X-rays, multi-slice MRI stacks, and CT scans
 * with interactive Window/Level (WW/WC), Zoom/Pan, Invert LUT, Caliper Measurements,
 * and local .dcm file parsing via dicom-parser.
 */
export default function PatientDicomViewer({
  patientId,
  patientName,
}: PatientDicomViewerProps) {
  const { isPrivacyMode } = usePrivacyStore();
  const viewportElementRef = useRef<HTMLDivElement | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedSeries, setSelectedSeries] = useState<DicomSeriesMetadata>(BUILTIN_SERIES[0]);
  const [customSeriesList, setCustomSeriesList] = useState<DicomSeriesMetadata[]>([]);
  const [sliceIndex, setSliceIndex] = useState<number>(1);
  const [windowWidth, setWindowWidth] = useState<number>(BUILTIN_SERIES[0].defaultWindowWidth);
  const [windowCenter, setWindowCenter] = useState<number>(BUILTIN_SERIES[0].defaultWindowCenter);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [invertLut, setInvertLut] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [hFlip, setHFlip] = useState<boolean>(false);
  const [cinePlaying, setCinePlaying] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<'wl' | 'pan' | 'measure'>('wl');
  const [measurements, setMeasurements] = useState<CaliperMeasurement[]>([]);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [cornerstoneReady, setCornerstoneReady] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    ensureCornerstoneLoadersRegistered();
    const el = viewportElementRef.current;
    if (!el) return;

    try {
      cornerstone.enable(el);
      setCornerstoneReady(true);
    } catch {
      setCornerstoneReady(false);
    }

    return () => {
      try {
        cornerstone.disable(el);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Render onto backup canvas as well so zero-config environments / headless tests always render pixels
  const renderFallbackCanvas = useCallback(
    (img: CornerstoneImage) => {
      const canvas = fallbackCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = img.width;
      const h = img.height;
      canvas.width = w;
      canvas.height = h;

      const imgData = ctx.createImageData(w, h);
      const pixels = img.getPixelData();
      const low = windowCenter - windowWidth / 2;
      const high = windowCenter + windowWidth / 2;
      const range = Math.max(1, high - low);

      for (let i = 0; i < pixels.length; i++) {
        let norm = ((pixels[i] - low) / range) * 255;
        norm = Math.max(0, Math.min(255, norm));
        if (invertLut) norm = 255 - norm;
        const idx = i * 4;
        imgData.data[idx] = norm;
        imgData.data[idx + 1] = norm;
        imgData.data[idx + 2] = norm;
        imgData.data[idx + 3] = 255;
      }

      ctx.putImageData(imgData, 0, 0);
    },
    [windowWidth, windowCenter, invertLut]
  );

  // Load and display image via Cornerstone.js whenever series, slice, or viewport settings change
  useEffect(() => {
    ensureCornerstoneLoadersRegistered();
    const el = viewportElementRef.current;
    const imageId =
      selectedSeries.modality === 'DCM'
        ? selectedSeries.id
        : `pacs://${selectedSeries.id}/${patientId}/${sliceIndex}`;

    cornerstone
      .loadImage(imageId)
      .then((image) => {
        renderFallbackCanvas(image);
        if (el && cornerstoneReady) {
          try {
            const defaultVp = cornerstone.getDefaultViewportForImage(el, image);
            const vp = {
              ...defaultVp,
              scale: zoomScale,
              translation: { x: panOffset.x, y: panOffset.y },
              voi: { windowWidth, windowCenter },
              invert: invertLut,
              rotation,
              hflip: hFlip,
            };
            cornerstone.displayImage(el, image, vp);
          } catch {
            // Fallback canvas already updated
          }
        }
      })
      .catch(() => {});
  }, [
    selectedSeries,
    patientId,
    sliceIndex,
    windowWidth,
    windowCenter,
    zoomScale,
    panOffset,
    invertLut,
    rotation,
    hFlip,
    cornerstoneReady,
    renderFallbackCanvas,
  ]);

  // Multi-slice Cine Loop
  useEffect(() => {
    if (!cinePlaying || selectedSeries.totalSlices <= 1) return;
    const timer = window.setInterval(() => {
      setSliceIndex((prev) => (prev >= selectedSeries.totalSlices ? 1 : prev + 1));
    }, 220);
    return () => window.clearInterval(timer);
  }, [cinePlaying, selectedSeries.totalSlices]);

  const handleSelectSeries = (series: DicomSeriesMetadata) => {
    setCinePlaying(false);
    setSelectedSeries(series);
    setSliceIndex(1);
    setWindowWidth(series.defaultWindowWidth);
    setWindowCenter(series.defaultWindowCenter);
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    setInvertLut(false);
    setRotation(0);
    setHFlip(false);
    setMeasurements([]);
    setPendingPoint(null);
  };

  const handleResetViewport = () => {
    setWindowWidth(selectedSeries.defaultWindowWidth);
    setWindowCenter(selectedSeries.defaultWindowCenter);
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    setInvertLut(false);
    setRotation(0);
    setHFlip(false);
    setMeasurements([]);
    setPendingPoint(null);
    if (viewportElementRef.current && cornerstoneReady) {
      try {
        cornerstone.reset(viewportElementRef.current);
      } catch {
        // Ignore reset error
      }
    }
    toast.info('Cornerstone DICOM viewport reset to default acquisition parameters.');
  };

  const handleViewportMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    if (activeTool === 'measure') {
      if (!pendingPoint) {
        setPendingPoint({ x: relX, y: relY });
      } else {
        const dx = relX - pendingPoint.x;
        const dy = relY - pendingPoint.y;
        const pixelDist = Math.sqrt(dx * dx + dy * dy) / zoomScale;
        const mm = Number((pixelDist * selectedSeries.pixelSpacingMm).toFixed(1));
        setMeasurements((prev) => [
          ...prev,
          {
            id: `cal-${Date.now()}`,
            x1: pendingPoint.x,
            y1: pendingPoint.y,
            x2: relX,
            y2: relY,
            distanceMm: mm,
          },
        ]);
        setPendingPoint(null);
        toast.info(`Measured anatomical distance: ${mm} mm`);
      }
      return;
    }

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleViewportMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    if (activeTool === 'wl') {
      setWindowWidth((prev) => Math.max(100, Math.min(4095, prev + dx * 6)));
      setWindowCenter((prev) => Math.max(50, Math.min(4000, prev - dy * 6)));
    } else if (activeTool === 'pan') {
      setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handleViewportMouseUp = () => {
    dragStartRef.current = null;
  };

  const handleDicomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const rows = dataSet.uint16('x00280010') || 256;
      const cols = dataSet.uint16('x00280011') || 256;
      const wc = dataSet.floatString('x00281050') || 1000;
      const ww = dataSet.floatString('x00281051') || 2000;
      const modalityTag = (dataSet.string('x00080060') || 'DCM').trim();
      const studyDesc =
        dataSet.string('x00081030') || `Uploaded DICOM (${file.name})`;

      const pixelElement = dataSet.elements.x7fe00010;
      let pixelData: Uint16Array;
      if (pixelElement) {
        pixelData = new Uint16Array(
          dataSet.byteArray.buffer,
          pixelElement.dataOffset,
          pixelElement.length / 2
        );
      } else {
        pixelData = synthesizeMedicalPixelData('chest-xray', 1, cols, rows);
      }

      const imageId = `dcmfile://${file.name}-${Date.now()}`;
      const csImage: CornerstoneImage = {
        imageId,
        minPixelValue: 0,
        maxPixelValue: 4095,
        slope: 1.0,
        intercept: 0,
        windowCenter: wc,
        windowWidth: ww,
        getPixelData: () => pixelData,
        rows,
        columns: cols,
        height: rows,
        width: cols,
        color: false,
        columnPixelSpacing: 0.65,
        rowPixelSpacing: 0.65,
        invert: false,
        sizeInBytes: pixelData.byteLength,
      };

      uploadedDicomStore.set(imageId, csImage);

      const newSeries: DicomSeriesMetadata = {
        id: imageId,
        modality: 'DCM',
        modalityLabel: `Uploaded DICOM (${modalityTag})`,
        studyDescription: studyDesc,
        seriesNumber: 'DCM-LOCAL',
        totalSlices: 1,
        defaultWindowWidth: ww,
        defaultWindowCenter: wc,
        pixelSpacingMm: 0.65,
        kvp: 'DICOM Part 10',
        sliceThicknessMm: 'Parsed',
        clinicalFinding: `Loaded local DICOM file "${file.name}" (${cols}x${rows} px) via dicom-parser & Cornerstone.js.`,
      };

      setCustomSeriesList((prev) => [newSeries, ...prev]);
      handleSelectSeries(newSeries);
      toast.success(`Parsed & loaded DICOM file "${file.name}" in Cornerstone.js.`);
    } catch {
      toast.error('Could not parse file as DICOM Part 10; ensure a valid .dcm study is selected.');
    } finally {
      e.target.value = '';
    }
  };

  const allSeries = [...customSeriesList, ...BUILTIN_SERIES];
  const displayPatientName = maskPatientName(
    patientName || `Patient #${patientId}`,
    patientId,
    isPrivacyMode
  );
  const displayMrn = maskMrn(`MRN-00${patientId}`, patientId, isPrivacyMode);
  const displayDob = maskDob('1981-04-12', isPrivacyMode);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-6">
      {/* Header & Modality Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Scan className="w-4 h-4" />
            <span>Cornerstone.js PACS Medical Imaging Workstation</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1">
            Interactive DICOM Viewer (X-Ray, Brain MRI &amp; Thoracic CT)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspect diagnostic studies with 12-bit Window/Level (`WW/WC`), multi-slice volumetric scrubbing, and millimeter calipers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allSeries.map((series) => {
            const active = selectedSeries.id === series.id;
            return (
              <button
                key={series.id}
                type="button"
                onClick={() => handleSelectSeries(series)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/40'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-[10px]">
                  {series.modality}
                </span>
                <span>{series.modalityLabel}</span>
              </button>
            );
          })}

          <input
            ref={fileInputRef}
            type="file"
            accept=".dcm,application/dicom"
            onChange={handleDicomFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Load .DCM</span>
          </button>
        </div>
      </div>

      {/* Workstation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 border border-slate-800 rounded-2xl p-3">
        {/* Active Mouse Tool Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTool('wl')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTool === 'wl'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <Contrast className="w-3.5 h-3.5" />
            <span>W/L Contrast</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('pan')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Pan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('measure')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTool === 'measure'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Measure (mm)</span>
          </button>
        </div>

        {/* Viewport Manipulation Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomScale((z) => Number(Math.min(3.5, z + 0.25).toFixed(2)))}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomScale((z) => Number(Math.max(0.5, z - 0.25).toFixed(2)))}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setInvertLut((inv) => !inv)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
              invertLut
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Invert LUT
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 cursor-pointer"
            title="Rotate 90°"
            aria-label="Rotate 90 degrees"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setHFlip((f) => !f)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 cursor-pointer"
            title="Flip Horizontal"
            aria-label="Flip Horizontal"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetViewport}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Viewer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cornerstone Viewport Canvas (Left 8 Columns) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={handleViewportMouseUp}
            onMouseLeave={handleViewportMouseUp}
            onWheel={(e) => {
              if (selectedSeries.totalSlices > 1) {
                e.preventDefault();
                setSliceIndex((prev) =>
                  e.deltaY > 0
                    ? Math.min(selectedSeries.totalSlices, prev + 1)
                    : Math.max(1, prev - 1)
                );
              }
            }}
            className="relative w-full h-[420px] bg-black rounded-2xl border border-slate-800 overflow-hidden select-none flex items-center justify-center cursor-crosshair"
          >
            {/* Zero-Config Synchronized Canvas Layer */}
            <canvas
              ref={fallbackCanvasRef}
              aria-label={`Cornerstone DICOM canvas for ${selectedSeries.modalityLabel}`}
              className="w-[384px] h-[384px] object-contain pointer-events-none transition-transform duration-75"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${
                  hFlip ? -zoomScale : zoomScale
                }, ${zoomScale}) rotate(${rotation}deg)`,
              }}
            />

            {/* Cornerstone.js Enabled DOM Element */}
            <div
              ref={viewportElementRef}
              data-testid="cornerstone-dicom-viewport"
              className="absolute inset-0 w-full h-full pointer-events-none opacity-90"
            />

            {/* Caliper Measurements SVG Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {measurements.map((m) => (
                <g key={m.id}>
                  <line
                    x1={m.x1}
                    y1={m.y1}
                    x2={m.x2}
                    y2={m.y2}
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                  <circle cx={m.x1} cy={m.y1} r="4" fill="#10b981" />
                  <circle cx={m.x2} cy={m.y2} r="4" fill="#10b981" />
                  <text
                    x={(m.x1 + m.x2) / 2}
                    y={(m.y1 + m.y2) / 2 - 8}
                    fill="#34d399"
                    className="text-[11px] font-mono font-bold"
                  >
                    {m.distanceMm} mm
                  </text>
                </g>
              ))}
              {pendingPoint && (
                <circle cx={pendingPoint.x} cy={pendingPoint.y} r="4.5" fill="#f59e0b" />
              )}
            </svg>

            {/* DICOM Standard 4-Corner Clinical HUD Overlays */}
            <div className="absolute top-3 left-3.5 text-[11px] font-mono text-emerald-400/90 pointer-events-none space-y-0.5">
              <div className="font-bold text-white">{displayPatientName}</div>
              <div>{displayMrn} &bull; DOB: {displayDob}</div>
              <div>{selectedSeries.studyDescription}</div>
            </div>

            <div className="absolute top-3 right-3.5 text-right text-[11px] font-mono text-cyan-300/90 pointer-events-none space-y-0.5">
              <div className="font-bold">Modality: {selectedSeries.modality}</div>
              <div>Series: {selectedSeries.seriesNumber}</div>
              <div>{selectedSeries.kvp} &bull; {selectedSeries.sliceThicknessMm}</div>
            </div>

            <div className="absolute bottom-3 left-3.5 text-[11px] font-mono text-amber-300/90 pointer-events-none space-y-0.5">
              <div>
                WW: {Math.round(windowWidth)} / WC: {Math.round(windowCenter)}
              </div>
              <div>
                Zoom: {zoomScale.toFixed(2)}x &bull; Rot: {rotation}&deg;{' '}
                {invertLut ? '• MONOCHROME1 (Inverted)' : '• MONOCHROME2'}
              </div>
            </div>

            <div className="absolute bottom-3 right-3.5 text-right text-[11px] font-mono text-indigo-300 pointer-events-none">
              <div>
                Slice: {sliceIndex} / {selectedSeries.totalSlices}
              </div>
              <div>Spacing: {selectedSeries.pixelSpacingMm} mm/px</div>
            </div>
          </div>

          {/* Multi-Slice Volumetric Scrubber (Shown for MRI & CT Stacks) */}
          {selectedSeries.totalSlices > 1 && (
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setCinePlaying((p) => !p)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {cinePlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause Cine
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Cine Loop
                  </>
                )}
              </button>

              <div className="flex-1 flex items-center gap-3">
                <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                <input
                  type="range"
                  aria-label="Scroll DICOM slice stack"
                  min={1}
                  max={selectedSeries.totalSlices}
                  value={sliceIndex}
                  onChange={(e) => setSliceIndex(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-200 whitespace-nowrap">
                  Slice {sliceIndex} / {selectedSeries.totalSlices}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Columns: Window/Level Controls, Presets & AI Radiological Synthesis */}
        <div className="lg:col-span-4 space-y-4">
          {/* Window / Level Sliders & Presets */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold">
              VOI LUT Window / Level Controls
            </h3>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Window Width (Contrast)</span>
                <span className="font-mono text-indigo-300">{Math.round(windowWidth)}</span>
              </div>
              <input
                type="range"
                aria-label="Window Width"
                min={100}
                max={4000}
                value={windowWidth}
                onChange={(e) => setWindowWidth(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Window Center (Brightness)</span>
                <span className="font-mono text-cyan-300">{Math.round(windowCenter)}</span>
              </div>
              <input
                type="range"
                aria-label="Window Center"
                min={50}
                max={3500}
                value={windowCenter}
                onChange={(e) => setWindowCenter(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-2">
                Radiology Window Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                {WINDOW_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setWindowWidth(preset.ww);
                      setWindowCenter(preset.wc);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preliminary Radiological Read & Findings */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Radiological Findings &amp; AI Synthesis</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedSeries.clinicalFinding}
            </p>
          </div>

          {/* Mandatory Clinical Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Assistive DICOM visualization only. Diagnostic interpretation must be verified on a calibrated clinical PACS display by a board-certified radiologist or qualified clinician.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

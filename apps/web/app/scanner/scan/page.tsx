'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { CheckInResponseDto, CheckInResult, StaffProfileDto } from '@cedoi/contracts';
import {
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Keyboard,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Volume2,
} from 'lucide-react';

export default function MobileScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [staff, setStaff] = useState<StaffProfileDto | null>(null);
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [activeGateId, setActiveGateId] = useState<string>('');

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualTicketNumber, setManualTicketNumber] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<CheckInResponseDto | null>(null);
  const [recentScans, setRecentScans] = useState<CheckInResponseDto[]>([]);

  // 1. Authenticate staff and get event/gate assignment
  useEffect(() => {
    let isMounted = true;
    async function loadStaffProfile() {
      try {
        const profile = await apiClient<StaffProfileDto>('api/v1/auth/me', { timeoutMs: 8000 });
        if (!isMounted) return;
        setStaff(profile);

        if (profile.assignedEventIds && profile.assignedEventIds.length > 0) {
          setActiveEventId(profile.assignedEventIds[0]);
        } else {
          // Default to published summit
          const events = await apiClient<any[]>('api/v1/events', { timeoutMs: 8000 });
          if (isMounted && events && events.length > 0) {
            setActiveEventId(events[0].id);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        router.replace('/scanner/login');
      }
    }
    loadStaffProfile();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // 2. Start Camera Feed
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported on this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Prefer rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in browser settings or use manual lookup.'
          : `Camera unavailable (${err.message}). Use manual lookup below.`
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // 3. Continuous Barcode Detection loop if supported
  useEffect(() => {
    if (!cameraActive || isProcessing || scanResult) return;

    let animationFrameId: number;
    const hasBarcodeDetector = typeof (window as any).BarcodeDetector !== 'undefined';

    if (hasBarcodeDetector) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

      const detectFrame = async () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && !isProcessing) {
              const qrValue = barcodes[0].rawValue;
              if (qrValue) {
                await processCheckIn({ qrCredential: qrValue });
                return;
              }
            }
          } catch (e) {
            // Ignore frame detection hiccups
          }
        }
        animationFrameId = requestAnimationFrame(detectFrame);
      };

      animationFrameId = requestAnimationFrame(detectFrame);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive, isProcessing, scanResult]);

  // 4. Atomic Check-In Request
  const processCheckIn = async (params: { qrCredential?: string; ticketNumber?: string }) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Client-generated UUID for request idempotency
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Haptic feedback if supported on mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(100);
      }

      const response = await apiClient<CheckInResponseDto>('api/v1/check-in', {
        method: 'POST',
        body: JSON.stringify({
          eventId: activeEventId,
          gateId: activeGateId || undefined,
          qrCredential: params.qrCredential,
          ticketNumber: params.ticketNumber,
          requestId,
        }),
      });

      setScanResult(response);
      setRecentScans((prev) => [response, ...prev.slice(0, 9)]);

      // Auto-reset after 2.5 seconds if successful, or keep for inspection
      if (response.result === CheckInResult.SUCCESS) {
        setTimeout(() => {
          resetScan();
        }, 2500);
      }
    } catch (err: any) {
      setScanResult({
        result: CheckInResult.INVALID,
        message: err.message || 'Network error communicating with check-in service.',
        isDuplicateRequest: false,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setIsProcessing(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTicketNumber.trim()) return;
    setShowManualModal(false);
    processCheckIn({ ticketNumber: manualTicketNumber.trim() });
    setManualTicketNumber('');
  };

  return (
    <div className="flex-1 flex flex-col relative bg-[#F7F7F7]">
      {/* Top Banner: Gate & Event Selector (Airbnb Light) */}
      <div className="p-3.5 bg-white border-b border-gray-200 flex items-center justify-between text-xs z-20 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-gray-800">
            {staff?.name || 'Gate Operator'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowManualModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-300 shadow-xs transition"
        >
          <Keyboard className="w-3.5 h-3.5 text-[#EE8518]" />
          <span>Manual Entry</span>
        </button>
      </div>

      {/* Camera Viewfinder View */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-900">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
        />

        {/* Viewfinder Target Overlay */}
        <div className="relative z-10 w-64 h-64 border-2 border-emerald-500 rounded-3xl flex items-center justify-center pointer-events-none shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
          <div className="text-[11px] font-bold tracking-wider uppercase text-emerald-800 bg-white/95 px-3.5 py-1 rounded-full border border-emerald-200 shadow-sm">
            Align QR in Frame
          </div>
        </div>

        {/* Camera Permission / Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-3 text-gray-500">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Camera Stream Inactive</h3>
            <p className="text-xs text-gray-500 max-w-xs mb-5 leading-relaxed">{cameraError}</p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-xs font-semibold rounded-xl border border-gray-300 shadow-xs text-gray-700 transition"
              >
                Retry Camera
              </button>
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="px-4 py-2 bg-[#08537B] hover:bg-[#064364] text-xs font-bold text-white rounded-xl shadow-xs transition"
              >
                Manual Ticket Entry
              </button>
            </div>
          </div>
        )}

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center z-25">
            <Loader2 className="w-10 h-10 text-[#08537B] animate-spin mb-3" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-900">
              Verifying Admission...
            </span>
          </div>
        )}

        {/* Instant Scan Result Modal / Overlay */}
        {scanResult && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div
              className={`w-full max-w-sm rounded-3xl p-6 text-center border shadow-2xl transition-all bg-white ${
                scanResult.result === CheckInResult.SUCCESS
                  ? 'border-emerald-300'
                  : scanResult.result === CheckInResult.ALREADY_USED
                  ? 'border-amber-300'
                  : 'border-rose-300'
              }`}
            >
              {/* Status Icon */}
              <div className="mb-3">
                {scanResult.result === CheckInResult.SUCCESS && (
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                )}
                {scanResult.result === CheckInResult.ALREADY_USED && (
                  <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                )}
                {scanResult.result !== CheckInResult.SUCCESS &&
                  scanResult.result !== CheckInResult.ALREADY_USED && (
                    <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
                      <XCircle className="w-10 h-10" />
                    </div>
                  )}
              </div>

              {/* Status Title */}
              <div
                className={`text-xs font-black tracking-widest uppercase mb-1 ${
                  scanResult.result === CheckInResult.SUCCESS
                    ? 'text-emerald-700'
                    : scanResult.result === CheckInResult.ALREADY_USED
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {scanResult.result === CheckInResult.SUCCESS
                  ? 'ADMISSION GRANTED'
                  : scanResult.result === CheckInResult.ALREADY_USED
                  ? 'ALREADY CHECKED IN'
                  : 'ENTRY REJECTED'}
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">
                {scanResult.message}
              </h2>

              {/* Ticket Details */}
              {scanResult.ticket && (
                <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Category:</span>
                    <span className="font-bold text-[#08537B]">
                      {scanResult.ticket.ticketTypeName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Ticket #:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {scanResult.ticket.ticketNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Attendee Buyer:</span>
                    <span className="font-semibold text-gray-900 truncate max-w-[150px]">
                      {scanResult.ticket.customerName}
                    </span>
                  </div>
                </div>
              )}

              {/* Previous check-in details if ALREADY_USED */}
              {scanResult.result === CheckInResult.ALREADY_USED && scanResult.firstAdmittedAt && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  First admitted at:{' '}
                  <span className="font-bold font-mono">
                    {new Date(scanResult.firstAdmittedAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>{' '}
                  ({scanResult.firstAdmittedGate || 'Gate'})
                </div>
              )}

              {/* Dismiss / Scan Next Action */}
              <button
                type="button"
                onClick={resetScan}
                className="mt-5 w-full py-3 rounded-xl bg-[#08537B] hover:bg-[#064364] text-white font-bold text-xs shadow-xs transition"
              >
                Scan Next Attendee
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-gray-200 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 mb-1">Manual Ticket Lookup</h3>
            <p className="text-xs text-gray-500 mb-4">
              Enter the admission ticket number printed on the attendee pass.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                placeholder="Enter ticket number"
                value={manualTicketNumber}
                onChange={(e) => setManualTicketNumber(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-gray-300 text-sm font-mono text-gray-900 placeholder-gray-400 uppercase focus:outline-none focus:ring-2 focus:ring-[#08537B]"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#08537B] hover:bg-[#064364] text-white font-bold text-xs transition shadow-xs"
                >
                  Verify Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { CheckInResponseDto, CheckInResult, StaffProfileDto } from '@cedoi/contracts';
import jsQR from 'jsqr';
import {
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Keyboard,
  Loader2,
  Volume2,
  VolumeX,
  Zap,
  RefreshCw,
  Clock,
  UserCheck,
  QrCode,
  Shield,
  Upload,
  SwitchCamera,
  ImageIcon,
} from 'lucide-react';

export default function MobileScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [staff, setStaff] = useState<StaffProfileDto | null>(null);
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [activeGateId, setActiveGateId] = useState<string>('');

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isRetryingCamera, setIsRetryingCamera] = useState<boolean>(false);

  const [manualTicketNumber, setManualTicketNumber] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<CheckInResponseDto | null>(null);
  const [recentScans, setRecentScans] = useState<CheckInResponseDto[]>([]);
  const [sessionAdmittedCount, setSessionAdmittedCount] = useState<number>(0);

  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // 1. Authenticate staff and set event context
  useEffect(() => {
    let isMounted = true;
    async function loadStaffProfile() {
      try {
        const profile = await apiClient<StaffProfileDto>('api/v1/auth/me', { timeoutMs: 8000 });
        if (!isMounted) return;
        setStaff(profile);

        // Fetch active published event to guarantee match
        try {
          const events = await apiClient<any[]>('api/v1/events', { timeoutMs: 8000 });
          if (isMounted && events && events.length > 0) {
            setActiveEventId(events[0].id);
          }
        } catch {
          if (profile.assignedEventIds && profile.assignedEventIds.length > 0) {
            setActiveEventId(profile.assignedEventIds[0]);
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

  // 2. Audio feedback via Web Audio API (Zero external network dependencies)
  const playAudioFeedback = useCallback(
    (type: 'success' | 'warning' | 'error') => {
      if (isMuted) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
          // Pleasant high double chime
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.28);
        } else if (type === 'warning') {
          // Double warning beep
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(420, ctx.currentTime);
          osc.frequency.setValueAtTime(320, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
        } else {
          // Low error buzz
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, ctx.currentTime);
          gain.gain.setValueAtTime(0.35, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        }
      } catch {}
    },
    [isMuted]
  );

  // 3. Stop Active Camera Tracks safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // 4. Start Camera Feed (with hardware cooldown, dual-facing fallback & progressive constraints)
  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      setIsRetryingCamera(true);
      setCameraError(null);
      stopCamera();

      // Give browser/OS camera driver a 150ms cooldown to release hardware lock
      await new Promise((resolve) => setTimeout(resolve, 150));

      try {
        if (
          typeof window !== 'undefined' &&
          !window.isSecureContext &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1'
        ) {
          throw new Error('CAMERA_INSECURE_CONTEXT');
        }

        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('CAMERA_NOT_SUPPORTED');
        }

        let stream: MediaStream | null = null;
        let lastErr: any = null;

        // Progressive constraints hierarchy:
        // 1. Preferred facingMode with flexible dimensions (works on iOS & Android rear camera)
        // 2. Preferred facingMode unconstrained
        // 3. Opposite camera (front/user if rear not available, e.g. laptop webcams)
        // 4. Any camera video stream supported by the OS
        // 5. Basic low-res stream fallback
        const otherMode = mode === 'environment' ? 'user' : 'environment';
        const attempts: MediaStreamConstraints[] = [
          { video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: { facingMode: { ideal: mode } } },
          { video: { facingMode: { ideal: otherMode } } },
          { video: true },
          { video: { width: { ideal: 640 }, height: { ideal: 480 } } },
        ];

        for (const constraints of attempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (stream) break;
          } catch (err: any) {
            lastErr = err;
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              throw err; // Stop trying if user explicitly denied permission
            }
          }
        }

        if (!stream) {
          throw lastErr || new Error('Could not acquire video stream.');
        }

        streamRef.current = stream;

        // Inspect track for torch (flashlight) support
        const track = stream.getVideoTracks()[0];
        if (track && (track.getCapabilities as any)) {
          try {
            const caps = (track.getCapabilities as any)();
            setHasTorch(Boolean(caps?.torch));
          } catch {}
        }

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.muted = true;
          video.defaultMuted = true;
          video.setAttribute('muted', '');
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');
          video.setAttribute('autoplay', '');

          try {
            video.load();
          } catch {}

          // Wait for metadata so play() does not reject
          await new Promise<void>((resolve) => {
            if (video.readyState >= 2) {
              resolve();
            } else {
              const onLoaded = () => {
                video.removeEventListener('loadedmetadata', onLoaded);
                resolve();
              };
              video.addEventListener('loadedmetadata', onLoaded);
              setTimeout(resolve, 800);
            }
          });

          try {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              await playPromise;
            }
          } catch (playErr) {
            console.warn('Video play interrupted, retrying on next frame:', playErr);
            setTimeout(() => {
              video.play().catch(() => {});
            }, 150);
          }
          setCameraActive(true);
          setCameraError(null);
        }
      } catch (err: any) {
        if (err.message === 'CAMERA_INSECURE_CONTEXT') {
          setCameraError(
            'Mobile browsers require HTTPS to open live camera. When testing over Wi-Fi, please use Snap/Upload QR Photo or Manual Ticket Entry below.'
          );
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was blocked. Please tap the lock/camera icon in your address bar to allow Camera, then tap Retry Camera.'
          );
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraError(
            'Camera is currently in use or locked by another app (Zoom, Teams, or browser tab). Please close other camera apps and tap Retry Camera.'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device. Please use Snap/Upload QR Photo or Manual Ticket Entry.');
        } else {
          setCameraError(
            `Camera stream inactive (${err.message || 'Access error'}). Please tap Retry Camera, switch camera, or snap a photo.`
          );
        }
        setCameraActive(false);
      } finally {
        setIsRetryingCamera(false);
      }
    },
    [facingMode, stopCamera]
  );

  const toggleCameraFacing = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  // Direct native photo snapshot / image file QR decoder (Works 100% on any device)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imgData.data, img.width, img.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code && code.data) {
          handleDetectedQr(code.data);
        } else {
          setScanResult({
            result: CheckInResult.INVALID,
            message: 'No QR code could be detected in this photo. Please ensure clear lighting and try again or use manual entry.',
            isDuplicateRequest: false,
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleTorch = async () => {
    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track && (track.applyConstraints as any)) {
        const nextState = !torchOn;
        await (track.applyConstraints as any)({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      }
    } catch {}
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, []);

  // 4. Universal QR Detection Loop (Hardware BarcodeDetector + Fast Canvas jsQR fallback)
  useEffect(() => {
    if (!cameraActive || isProcessing || scanResult) return;

    let isRunning = true;
    let scanTimer: any;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let nativeDetector: any = null;
    if (typeof (window as any).BarcodeDetector !== 'undefined') {
      try {
        nativeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {}
    }

    const checkFrame = async () => {
      if (!isRunning) return;

      if (videoRef.current && videoRef.current.readyState >= 2 && !isProcessing && !scanResult) {
        const video = videoRef.current;
        const w = video.videoWidth;
        const h = video.videoHeight;

        if (w > 0 && h > 0) {
          try {
            // 1. Hardware-accelerated native detector if available
            if (nativeDetector) {
              const barcodes = await nativeDetector.detect(video);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                handleDetectedQr(barcodes[0].rawValue);
                return;
              }
            }

            // 2. High-performance jsQR frame decoder (Guarantees 100% iOS Safari & Android support)
            if (ctx) {
              const targetW = Math.min(w, 640);
              const targetH = Math.min(h, 480);
              canvas.width = targetW;
              canvas.height = targetH;
              ctx.drawImage(video, 0, 0, targetW, targetH);
              const imgData = ctx.getImageData(0, 0, targetW, targetH);
              const code = jsQR(imgData.data, targetW, targetH, {
                inversionAttempts: 'dontInvert',
              });

              if (code && code.data) {
                handleDetectedQr(code.data);
                return;
              }
            }
          } catch {}
        }
      }

      // Scan every 130ms: ultra-responsive without thermal throttling
      if (isRunning) {
        scanTimer = setTimeout(checkFrame, 130);
      }
    };

    scanTimer = setTimeout(checkFrame, 150);

    return () => {
      isRunning = false;
      if (scanTimer) clearTimeout(scanTimer);
    };
  }, [cameraActive, isProcessing, scanResult]);

  // 5. Debounce & Discard duplicate bursts
  const handleDetectedQr = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;

    const now = Date.now();
    if (lastScannedRef.current.code === clean && now - lastScannedRef.current.time < 3500) {
      return; // Skip duplicate scan within 3.5 seconds
    }

    lastScannedRef.current = { code: clean, time: now };
    processCheckIn({ qrCredential: clean });
  };

  // 6. Atomic, Resilient Check-In Request
  const processCheckIn = async (params: { qrCredential?: string; ticketNumber?: string }) => {
    if (isProcessing) return;
    setIsProcessing(true);

    let rawCred = params.qrCredential?.trim() || '';
    let manualTkt = params.ticketNumber?.trim() || '';

    // Handle URL, JSON or query parameter encoding edge cases
    if (rawCred) {
      if (rawCred.startsWith('{') && rawCred.endsWith('}')) {
        try {
          const parsed = JSON.parse(rawCred);
          rawCred = parsed.qrCredential || parsed.ticketNumber || parsed.code || rawCred;
        } catch {}
      } else if (rawCred.startsWith('http://') || rawCred.startsWith('https://')) {
        try {
          const u = new URL(rawCred);
          const t =
            u.searchParams.get('ticket') ||
            u.searchParams.get('code') ||
            u.searchParams.get('ticketNumber') ||
            u.searchParams.get('t');
          if (t) rawCred = t;
        } catch {}
      }
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const response = await apiClient<CheckInResponseDto>('api/v1/check-in', {
        method: 'POST',
        body: JSON.stringify({
          eventId: activeEventId || undefined,
          gateId: activeGateId || undefined,
          qrCredential: rawCred || undefined,
          ticketNumber: manualTkt || undefined,
          requestId,
        }),
        timeoutMs: 8000,
      });

      setScanResult(response);
      setRecentScans((prev) => [response, ...prev.slice(0, 3)]);

      if (response.result === CheckInResult.SUCCESS) {
        setSessionAdmittedCount((c) => c + 1);
        playAudioFeedback('success');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(100);
        }
        // Fast-flow auto reset after 2.2s
        setTimeout(() => {
          resetScan();
        }, 2200);
      } else if (response.result === CheckInResult.ALREADY_USED) {
        playAudioFeedback('warning');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([150, 80, 150]);
        }
      } else {
        playAudioFeedback('error');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([250, 100, 250]);
        }
      }
    } catch (err: any) {
      playAudioFeedback('error');
      setScanResult({
        result: CheckInResult.INVALID,
        message: err.message || 'Connection timeout or network failure. Please retry.',
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

  // Keyboard shortcut: Space or Enter clears modal to scan next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (scanResult && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        resetScan();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanResult]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTicketNumber.trim()) return;
    setShowManualModal(false);
    processCheckIn({ ticketNumber: manualTicketNumber.trim().toUpperCase() });
    setManualTicketNumber('');
  };

  return (
    <div className="flex-1 flex flex-col relative bg-[#F7F7F7]">
      {/* Top Bar: Gate Operator, Shift Throughput & Quick Controls */}
      <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between text-xs z-20 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <div className="truncate">
            <span className="font-bold text-gray-900 block truncate">
              {staff?.name || 'Gate Staff'}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              Admitted: <span className="font-bold">{sessionAdmittedCount}</span>
            </span>
          </div>
        </div>

        {/* Action Controls: Sound, Torch, Flip Camera, Manual Entry */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute scanner chime' : 'Mute scanner chime'}
            className={`p-2 rounded-xl border transition shadow-xs ${
              isMuted
                ? 'bg-gray-100 text-gray-400 border-gray-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              title="Toggle flashlight"
              className={`p-2 rounded-xl border transition shadow-xs ${
                torchOn
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Zap className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleCameraFacing}
            title="Flip camera (front / back)"
            className="p-2 rounded-xl bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 shadow-xs transition cursor-pointer"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Snap photo or upload QR image"
            className="p-2 rounded-xl bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 shadow-xs transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#08537B] hover:bg-[#064364] text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Viewfinder View */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-950">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Viewfinder Target Overlay */}
        <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 border-2 border-emerald-500 rounded-3xl flex items-center justify-center pointer-events-none shadow-[0_0_50px_rgba(16,185,129,0.2)]">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
          <div className="text-[11px] font-bold tracking-wider uppercase text-emerald-800 bg-white/95 px-3.5 py-1 rounded-full border border-emerald-200 shadow-sm">
            Align QR in Frame
          </div>
        </div>

        {/* Floating Quick Guide */}
        <div className="absolute bottom-4 inset-x-4 z-15 flex justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] text-white/90 font-medium flex items-center gap-2 border border-white/10 shadow-lg">
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Instant Scan • Works on phone screens & print passes</span>
          </div>
        </div>

        {/* Camera Permission / Fallback View */}
        {cameraError && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-3 text-gray-500">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Camera Stream Inactive</h3>
            <p className="text-xs text-gray-500 max-w-sm mb-5 leading-relaxed">{cameraError}</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md">
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                disabled={isRetryingCamera}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 disabled:opacity-60 text-xs font-semibold rounded-xl border border-gray-300 shadow-xs text-gray-700 transition cursor-pointer"
              >
                {isRetryingCamera ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#08537B]" />
                    <span>Opening Camera...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Retry Camera</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 text-xs font-semibold rounded-xl border border-gray-300 shadow-xs text-gray-700 transition cursor-pointer"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-gray-500" />
                <span>Switch to {facingMode === 'environment' ? 'Front' : 'Rear'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 shadow-xs transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Snap / Upload QR</span>
              </button>

              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#08537B] hover:bg-[#064364] text-xs font-bold text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Manual Entry</span>
              </button>
            </div>
          </div>
        )}

        {/* Verification Spinner */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center z-25">
            <Loader2 className="w-10 h-10 text-[#08537B] animate-spin mb-3" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-900">
              Verifying Admission...
            </span>
          </div>
        )}

        {/* Instant Scan Result Modal */}
        {scanResult && (
          <div
            onClick={resetScan}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs cursor-pointer animate-fadeIn"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-3xl p-6 text-center border-2 shadow-2xl transition-all bg-white cursor-default ${
                scanResult.result === CheckInResult.SUCCESS
                  ? 'border-emerald-500 ring-4 ring-emerald-100'
                  : scanResult.result === CheckInResult.ALREADY_USED
                  ? 'border-amber-500 ring-4 ring-amber-100'
                  : 'border-rose-500 ring-4 ring-rose-100'
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

              {/* Ticket Details Card */}
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
                    <span className="text-gray-500">Attendee:</span>
                    <span className="font-semibold text-gray-900 truncate max-w-[170px]">
                      {scanResult.ticket.attendeeName || scanResult.ticket.customerName}
                    </span>
                  </div>
                  {scanResult.ticket.businessName && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Business:</span>
                      <span className="text-gray-700 truncate max-w-[170px]">
                        {scanResult.ticket.businessName}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Prior Check-In Details for ALREADY_USED */}
              {scanResult.result === CheckInResult.ALREADY_USED && scanResult.firstAdmittedAt && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 text-left">
                  <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Prior Gate Admission</span>
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Checked in at{' '}
                    <span className="font-bold font-mono">
                      {new Date(scanResult.firstAdmittedAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>{' '}
                    via {scanResult.firstAdmittedGate || 'Main Gate'}.
                  </div>
                </div>
              )}

              {/* Dismiss / Scan Next Action */}
              <button
                type="button"
                onClick={resetScan}
                className="mt-5 w-full py-3.5 rounded-xl bg-[#08537B] hover:bg-[#064364] active:bg-[#04324c] text-white font-bold text-xs shadow-md transition"
              >
                Scan Next Attendee (Tap / Space)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-900">Manual Ticket Lookup</h3>
              <span className="text-[10px] uppercase font-bold text-[#EE8518] bg-amber-50 px-2 py-0.5 rounded-md">
                Gate Entry
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Enter the ticket number printed on the physical or digital pass (e.g. CEDOI-TKT-...).
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                placeholder="CEDOI-TKT-XXXX-XXXX"
                value={manualTicketNumber}
                onChange={(e) => setManualTicketNumber(e.target.value.toUpperCase())}
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

      {/* Hidden file input for native camera snapshot / photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}

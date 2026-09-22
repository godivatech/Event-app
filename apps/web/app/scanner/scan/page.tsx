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
  Lock,
  Settings,
  HelpCircle,
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

  // 4. Start Camera Feed with comprehensive browser permission diagnostics & recovery
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');

  // Check browser permission status if API is available
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
      (navigator as any).permissions
        .query({ name: 'camera' })
        .then((permissionStatus: any) => {
          setPermissionState(permissionStatus.state);
          permissionStatus.onchange = () => {
            setPermissionState(permissionStatus.state);
            if (permissionStatus.state === 'granted') {
              startCamera(facingMode);
            }
          };
        })
        .catch(() => {
          setPermissionState('unknown');
        });
    }
  }, [facingMode]);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      setIsRetryingCamera(true);
      setCameraError(null);
      stopCamera();

      // Give OS hardware and browser media session cooldown
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
              setPermissionState('denied');
              throw err;
            }
          }
        }

        if (!stream) {
          throw lastErr || new Error('Could not acquire video stream.');
        }

        streamRef.current = stream;
        setPermissionState('granted');

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
            console.warn('Video play interrupted, retrying:', playErr);
            setTimeout(() => {
              video.play().catch(() => {});
            }, 150);
          }
          setCameraActive(true);
          setCameraError(null);
        }
      } catch (err: any) {
        if (err.message === 'CAMERA_INSECURE_CONTEXT') {
          setCameraError('INSECURE_CONTEXT');
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('PERMISSION_DENIED');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraError('HARDWARE_LOCKED');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('NO_DEVICE');
        } else {
          setCameraError(err.message || 'GENERAL_ERROR');
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
        // Fast-flow auto reset after 2.5s for seamless line management
        setTimeout(() => {
          resetScan();
        }, 2500);
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
      const isTimeout = err?.code === 'REQUEST_TIMEOUT' || err?.message?.toLowerCase().includes('timeout');
      setScanResult({
        result: CheckInResult.INVALID,
        message: isTimeout
          ? 'Gate server response delayed. Please re-scan QR pass.'
          : err?.message || 'Network connection issue. Please check connection.',
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

        {/* Camera Permission / Error / Blocked Helper View */}
        {cameraError && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20 overflow-y-auto">
            {cameraError === 'PERMISSION_DENIED' ? (
              <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-xl text-left animate-fadeIn">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-950">Camera Permission Blocked</h3>
                    <p className="text-[11px] text-gray-500">Your browser has blocked camera access for this site.</p>
                  </div>
                </div>

                <div className="my-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-2">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800 block flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    How to Unblock in 2 Easy Steps:
                  </span>
                  <div className="space-y-1.5 text-[11px] text-amber-900 leading-snug">
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Tap the <strong>Lock / Settings icon</strong> 🔒 in your browser address bar (top or bottom of screen).</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Change <strong>Camera</strong> permission to <strong>Allow</strong>, then tap the button below.</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    disabled={isRetryingCamera}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#08537B] hover:bg-[#064364] active:bg-[#04334c] disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    {isRetryingCamera ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>I Allowed It - Retry</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Snap / Upload QR</span>
                  </button>
                </div>

                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(true)}
                    className="text-[11px] text-gray-500 hover:text-[#08537B] font-semibold underline underline-offset-2 transition"
                  >
                    Or enter ticket number manually
                  </button>
                </div>
              </div>
            ) : cameraError === 'INSECURE_CONTEXT' ? (
              <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 border border-amber-200 shadow-xl text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-950">HTTPS Required for Live Camera</h3>
                    <p className="text-[11px] text-gray-500">Mobile browsers restrict live camera stream to HTTPS or localhost.</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  You can still scan tickets instantly using your phone camera via the Snap Photo button or Manual Entry:
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Snap QR with Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualModal(true)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#08537B] hover:bg-[#064364] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Manual Entry</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-3 text-gray-500">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-950 mb-1">
                  {cameraError === 'HARDWARE_LOCKED'
                    ? 'Camera In Use by Another App'
                    : cameraError === 'NO_DEVICE'
                    ? 'No Camera Detected'
                    : 'Camera Stream Inactive'}
                </h3>
                <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto leading-relaxed">
                  {cameraError === 'HARDWARE_LOCKED'
                    ? 'Another app or browser tab may be using your camera. Please close it and retry.'
                    : cameraError === 'NO_DEVICE'
                    ? 'No camera was found. Use snapshot upload or manual ticket entry.'
                    : 'Please allow camera permission or choose an alternative scanning method.'}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    disabled={isRetryingCamera}
                    className="py-2.5 px-4 bg-white hover:bg-gray-50 text-xs font-semibold rounded-xl border border-gray-300 text-gray-700 shadow-xs transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5 inline mr-1.5 text-gray-500" />
                    <span>Retry Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="py-2.5 px-4 bg-white hover:bg-gray-50 text-xs font-semibold rounded-xl border border-gray-300 text-gray-700 shadow-xs transition"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 inline mr-1.5 text-gray-500" />
                    <span>Flip Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                    <span>Snap / Upload QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManualModal(true)}
                    className="py-2.5 px-4 bg-[#08537B] hover:bg-[#064364] text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <Keyboard className="w-3.5 h-3.5 inline mr-1.5" />
                    <span>Manual Entry</span>
                  </button>
                </div>
              </div>
            )}
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
                className={`text-xs font-black tracking-widest uppercase mb-1.5 flex items-center justify-center gap-1.5 ${
                  scanResult.result === CheckInResult.SUCCESS
                    ? 'text-emerald-700'
                    : scanResult.result === CheckInResult.ALREADY_USED
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                <span>
                  {scanResult.result === CheckInResult.SUCCESS
                    ? 'ADMISSION GRANTED'
                    : scanResult.result === CheckInResult.ALREADY_USED
                    ? 'ALREADY CHECKED IN'
                    : scanResult.result === CheckInResult.WRONG_EVENT
                    ? 'WRONG EVENT TICKET'
                    : scanResult.result === CheckInResult.CANCELLED
                    ? 'TICKET VOID / CANCELLED'
                    : scanResult.result === CheckInResult.OUTSIDE_WINDOW
                    ? 'OUTSIDE ENTRY WINDOW'
                    : 'ENTRY REJECTED'}
                </span>
                {scanResult.isDuplicateRequest && (
                  <span className="text-[10px] lowercase font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    duplicate
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-gray-950 mb-2 tracking-tight">
                {scanResult.message}
              </h2>

              {/* Ticket Details Card */}
              {scanResult.ticket && (
                <div className="mt-4 p-4 rounded-2xl bg-gray-50/90 border border-gray-200 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Pass Type:</span>
                    <span className="font-bold text-[#08537B]">
                      {scanResult.ticket.ticketTypeName || 'Event Pass'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Ticket #:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {scanResult.ticket.ticketNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Attendee Name:</span>
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
                  {scanResult.ticket.status && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                      <span className="text-gray-500">Database Status:</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        scanResult.ticket.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : scanResult.ticket.status === 'USED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {scanResult.ticket.status}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Prior Check-In Details for ALREADY_USED */}
              {scanResult.result === CheckInResult.ALREADY_USED && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 text-left">
                  <div className="font-bold mb-1 flex items-center gap-1.5 text-amber-900">
                    <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Prior Gate Admission Record</span>
                  </div>
                  <div className="text-[11px] text-amber-900 leading-relaxed">
                    {scanResult.firstAdmittedAt ? (
                      <>
                        Admitted at{' '}
                        <span className="font-bold font-mono">
                          {new Date(scanResult.firstAdmittedAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}
                        </span>{' '}
                        via <span className="font-semibold">{scanResult.firstAdmittedGate || 'Main Gate'}</span>.
                      </>
                    ) : (
                      'This pass was already scanned and accepted earlier.'
                    )}
                  </div>
                </div>
              )}

              {/* Dismiss / Scan Next Action */}
              <button
                type="button"
                onClick={resetScan}
                className="mt-5 w-full py-3.5 rounded-xl bg-[#08537B] hover:bg-[#064364] active:bg-[#04324c] text-white font-bold text-xs shadow-md transition cursor-pointer"
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

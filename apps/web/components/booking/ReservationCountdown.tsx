import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface ReservationCountdownProps {
  expiresAt: string;
  onExpired?: () => void;
}

export const ReservationCountdown: React.FC<ReservationCountdownProps> = ({
  expiresAt,
  onExpired,
}) => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; isExpired: boolean }>({
    minutes: 10,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const target = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
        if (onExpired) onExpired();
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ minutes, seconds, isExpired: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const isUrgent = timeLeft.minutes < 2 && !timeLeft.isExpired;

  if (timeLeft.isExpired) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-[12px] text-xs font-semibold">
        <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
        <span>Your reservation hold has expired. The tickets may no longer be available.</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-[12px] border transition-colors ${
        isUrgent
          ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-[#08537B]/5 border-[#08537B]/20 text-[#08537B]'
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        <Clock className={`w-4 h-4 ${isUrgent ? 'text-amber-600 animate-pulse' : 'text-[#08537B]'}`} />
        <span>Tickets temporarily reserved. Complete payment in:</span>
      </div>
      <div className="font-mono text-sm font-bold tracking-wider">
        {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </div>
    </div>
  );
};

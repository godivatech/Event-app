'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';

export default function DeveloperRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('cedoi_admin_token') || localStorage.getItem('cedoi_staff_token');
    if (token) {
      apiClient('api/v1/auth/me', { timeoutMs: 3000 })
        .then((profile: any) => {
          if (profile?.role === 'SUPER_ADMIN') {
            router.replace('/admin/bookings');
          } else {
            router.replace('/developer/login');
          }
        })
        .catch(() => {
          router.replace('/developer/login');
        });
    } else {
      router.replace('/developer/login');
    }
  }, [router]);

  return null;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Next.js maneja automáticamente el basePath en router.push
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-700 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  );
}




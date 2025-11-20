'use client';

import { useEffect, useState } from 'react';

export function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">Plataforma OKR/CRM</h2>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center text-white font-semibold">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}




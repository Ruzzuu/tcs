'use client';

// ============================================
// ADMIN SEED PAGE (One-time use)
// ============================================
// This page allows initial admin creation
// DELETE THIS FILE after creating the admin!

import { useState } from 'react';

export default function SeedAdminPage() {
  const [seedKey, setSeedKey] = useState('');
  const [username, setUsername] = useState('everyoneherelikelisa');
  const [password, setPassword] = useState('temancs251810');
  const [email, setEmail] = useState('admin@cucipremium.com');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/auth/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email, seedKey }),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('Seed error:', error);
      setResult({ success: false, message: 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-red-600">
          ⚠️ Admin Seed Page
        </h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          DELETE THIS FILE after creating admin!<br/>
          File: src/app/admin/seed/page.tsx
        </p>

        {result && (
          <div className={`mb-6 p-4 rounded-lg ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {result.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Seed Key (from .env)</label>
            <input
              type="password"
              value={seedKey}
              onChange={(e) => setSeedKey(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="ADMIN_SEED_KEY"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

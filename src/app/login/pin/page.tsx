'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nama = searchParams.get('nama');

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShake, setIsShake] = useState(false);
  
  // Setup mode states
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState('');

  const MAX_PIN_LENGTH = 6;

  // Cek apakah user perlu setup PIN dulu dengan hit login menggunakan empty PIN (akan di-handle di backend sebagai NEEDS_PIN_SETUP)
  useEffect(() => {
    if (!nama) {
      router.push('/login');
      return;
    }
    
    // Quick check to see if user needs setup (optional step, backend could return this info differently, 
    // but we can try a dry-run login or just wait for the user to type and then check.
    // A better approach is to hit a separate endpoint, but we'll handle it during the first submit 
    // or by just letting them try to login.
  }, [nama, router]);

  const triggerShake = () => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  };

  const handleKeyPress = (num: number) => {
    if (pin.length < MAX_PIN_LENGTH) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN minimal 4 digit');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError('');

    if (isSetupMode) {
      if (setupStep === 1) {
        setFirstPin(pin);
        setPin('');
        setSetupStep(2);
        setIsLoading(false);
        return;
      } else {
        if (pin !== firstPin) {
          setError('Konfirmasi PIN tidak cocok');
          triggerShake();
          setPin('');
          setIsLoading(false);
          return;
        }

        // Hit API setup pin
        try {
          const res = await fetch('/api/auth/setup-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama, pin }),
          });
          const data = await res.json();
          if (res.ok) {
            router.push('/');
          } else {
            setError(data.error || 'Gagal setup PIN');
            triggerShake();
          }
        } catch {
          setError('Terjadi kesalahan jaringan');
          triggerShake();
        } finally {
          setIsLoading(false);
        }
        return;
      }
    }

    // Normal Login Mode
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, pin }),
      });
      const data = await res.json();
      
      if (res.ok) {
        router.push('/');
      } else if (res.status === 403 && data.error === 'NEEDS_PIN_SETUP') {
        // Switch to setup mode
        setIsSetupMode(true);
        setPin('');
        setError('Buat PIN baru Anda (minimal 4 digit)');
      } else {
        setError(data.error || 'PIN Salah');
        setPin('');
        triggerShake();
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  if (!nama) return null;

  return (
    <div className="auth-container animate-in">
      <div className="auth-header" style={{ marginBottom: '2rem' }}>
        <button 
          onClick={() => router.push('/login')}
          className="back-btn"
        >
          ← Kembali
        </button>
        <h1 className="auth-title">
          {isSetupMode ? (setupStep === 1 ? 'Buat PIN' : 'Konfirmasi PIN') : 'Masukkan PIN'}
        </h1>
        <p className="auth-subtitle">
          {isSetupMode 
            ? (setupStep === 1 ? `Amankan akun ${nama}` : 'Masukkan ulang PIN Anda')
            : `Login sebagai ${nama}`
          }
        </p>
      </div>

      <div className={`pin-display ${isShake ? 'shake' : ''}`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
        ))}
      </div>

      {error && <p className="pin-error">{error}</p>}

      <div className="pin-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            className="pin-btn"
            disabled={isLoading}
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleDelete}
          className="pin-btn pin-btn-action"
          disabled={isLoading || pin.length === 0}
        >
          ⌫
        </button>
        <button
          onClick={() => handleKeyPress(0)}
          className="pin-btn"
          disabled={isLoading}
        >
          0
        </button>
        <button
          onClick={handleSubmit}
          className="pin-btn pin-btn-submit"
          disabled={isLoading || pin.length < 4}
        >
          OK
        </button>
      </div>
    </div>
  );
}

export default function PinPage() {
  return (
    <Suspense fallback={<div className="auth-container animate-in"><div className="empty-state">Loading...</div></div>}>
      <PinContent />
    </Suspense>
  );
}

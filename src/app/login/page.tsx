'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [anggotaList, setAnggotaList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/anggota')
      .then(res => res.json())
      .then(data => {
        // API returns array directly: ["Ayah","Ibu","Udin"]
        setAnggotaList(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSelect = (nama: string) => {
    router.push(`/login/pin?nama=${encodeURIComponent(nama)}`);
  };

  return (
    <div className="auth-container animate-in">
      <div className="auth-header">
        <h1 className="auth-title">Kas Keluarga</h1>
        <p className="auth-subtitle">Pilih nama Anda untuk masuk</p>
      </div>

      {isLoading ? (
        <div className="empty-state animate-pulse">
          <p>Memuat daftar anggota...</p>
        </div>
      ) : anggotaList.length === 0 ? (
        <div className="empty-state">
          <p>Belum ada anggota terdaftar.</p>
        </div>
      ) : (
        <div className="auth-grid">
          {anggotaList.map((nama) => (
            <button
              key={nama}
              className="auth-card"
              onClick={() => handleSelect(nama)}
            >
              <div className="auth-avatar">
                {nama.charAt(0).toUpperCase()}
              </div>
              <span className="auth-name">{nama}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

-- Buat tabel transaksi
CREATE TABLE transaksi (
  id          SERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tanggal     DATE        NOT NULL,
  jenis       VARCHAR(11) NOT NULL CHECK (jenis IN ('pemasukan', 'pengeluaran')),
  nominal     BIGINT      NOT NULL CHECK (nominal > 0),
  kategori    VARCHAR(50) NOT NULL,
  nama        VARCHAR(50) NOT NULL,
  catatan     TEXT        DEFAULT ''
);

-- Index untuk mempercepat query transaksi terbaru
CREATE INDEX idx_transaksi_created_at ON transaksi (created_at DESC);

-- Buat tabel anggota keluarga
CREATE TABLE anggota (
  id          SERIAL PRIMARY KEY,
  nama        VARCHAR(50) UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

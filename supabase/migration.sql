-- =============================================
-- DENTOFLEX - Migración de Base de Datos
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM TYPES ──────────────────────────────────────
CREATE TYPE tipo_documento AS ENUM ('dni', 'pasaporte', 'c.e');
CREATE TYPE genero AS ENUM ('masculino', 'femenino', 'otro');
CREATE TYPE estado_cita AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada');

-- ─── TABLA: pacientes ────────────────────────────────
-- Referencia a auth.users de Supabase (mismo UUID)
CREATE TABLE pacientes (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombres          VARCHAR(100) NOT NULL,
  apellidos        VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  tipo_documento   tipo_documento NOT NULL,
  numero_documento VARCHAR(20) NOT NULL UNIQUE,
  genero           genero NOT NULL,
  telefono         VARCHAR(15) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLA: dentistas ────────────────────────────────
CREATE TABLE dentistas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombres       VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(100) NOT NULL,
  especialidad  VARCHAR(100) NOT NULL DEFAULT 'Odontología General',
  foto_url      TEXT,
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLA: horarios_disponibles ─────────────────────
-- Define qué días y en qué rango de horas trabaja cada dentista
CREATE TABLE horarios_disponibles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dentista_id   UUID NOT NULL REFERENCES dentistas(id) ON DELETE CASCADE,
  dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Dom, 1=Lun...
  hora_inicio   TIME NOT NULL,
  hora_fin      TIME NOT NULL,
  UNIQUE (dentista_id, dia_semana, hora_inicio)
);

-- ─── TABLA: citas ────────────────────────────────────
CREATE TABLE citas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id   UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  dentista_id   UUID NOT NULL REFERENCES dentistas(id),
  fecha         DATE NOT NULL,
  hora          TIME NOT NULL,
  estado        estado_cita NOT NULL DEFAULT 'pendiente',
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  -- Un dentista no puede tener dos citas al mismo tiempo (activas)
  CONSTRAINT unique_cita_activa UNIQUE (dentista_id, fecha, hora)
    DEFERRABLE INITIALLY DEFERRED
);

-- ─── ÍNDICES ─────────────────────────────────────────
CREATE INDEX idx_citas_paciente    ON citas(paciente_id);
CREATE INDEX idx_citas_dentista    ON citas(dentista_id);
CREATE INDEX idx_citas_fecha       ON citas(fecha);
CREATE INDEX idx_citas_estado      ON citas(estado);

-- ─── TRIGGER: updated_at automático ──────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_citas_updated_at
  BEFORE UPDATE ON citas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_disponibles ENABLE ROW LEVEL SECURITY;

-- Pacientes: cada usuario solo ve/edita su propio perfil
CREATE POLICY "paciente_select_own"
  ON pacientes FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "paciente_update_own"
  ON pacientes FOR UPDATE
  USING (auth.uid() = id);

-- Citas: cada paciente solo ve/crea/edita sus citas
CREATE POLICY "cita_select_own"
  ON citas FOR SELECT
  USING (auth.uid() = paciente_id);

CREATE POLICY "cita_insert_own"
  ON citas FOR INSERT
  WITH CHECK (auth.uid() = paciente_id);

CREATE POLICY "cita_update_own"
  ON citas FOR UPDATE
  USING (auth.uid() = paciente_id);

-- Dentistas y horarios: todos los autenticados pueden leerlos
CREATE POLICY "dentistas_select_auth"
  ON dentistas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "horarios_select_auth"
  ON horarios_disponibles FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── DATOS DE EJEMPLO ────────────────────────────────
INSERT INTO dentistas (nombres, apellidos, especialidad, foto_url) VALUES
  ('Gordova', 'Lopez',       'Odontología General',   'assets/doctors/doctor1.jpg'),
  ('Martinez', 'Castañeda',  'Ortodoncia',            'assets/doctors/doctor2.jpg'),
  ('Romero', 'Huancal',      'Endodoncia',            'assets/doctors/doctor3.jpg');

-- Horarios: Lun-Vie 9:00-13:00 y 14:00-18:00 para el primer dentista
INSERT INTO horarios_disponibles (dentista_id, dia_semana, hora_inicio, hora_fin)
SELECT id, dia, '09:00', '13:00'
FROM dentistas CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS t(dia)
WHERE apellidos = 'Lopez';

INSERT INTO horarios_disponibles (dentista_id, dia_semana, hora_inicio, hora_fin)
SELECT id, dia, '14:00', '18:00'
FROM dentistas CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS t(dia)
WHERE apellidos = 'Lopez';

-- Horarios para los otros dentistas (Mar-Sáb)
INSERT INTO horarios_disponibles (dentista_id, dia_semana, hora_inicio, hora_fin)
SELECT id, dia, '08:00', '12:00'
FROM dentistas CROSS JOIN (VALUES (2),(3),(4),(5),(6)) AS t(dia)
WHERE apellidos = 'Castañeda';

INSERT INTO horarios_disponibles (dentista_id, dia_semana, hora_inicio, hora_fin)
SELECT id, dia, '10:00', '14:00'
FROM dentistas CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS t(dia)
WHERE apellidos = 'Huancal';

// =============================================
// DENTOFLEX - Tipos de Base de Datos
// =============================================

export type TipoDocumento = 'dni' | 'pasaporte' | 'c.e';
export type Genero = 'masculino' | 'femenino' | 'otro';
export type EstadoCita = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

// ---- Paciente ----
export interface Paciente {
  id: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  genero: Genero;
  telefono: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export type PacienteInsert = Omit<Paciente, 'created_at' | 'updated_at'>;
export type PacienteUpdate = Partial<Omit<Paciente, 'id' | 'email' | 'created_at' | 'updated_at'>>;

// ---- Dentista ----
export interface Dentista {
  id: string;
  nombres: string;
  apellidos: string;
  especialidad: string;
  foto_url: string | null;
  activo: boolean;
  created_at: string;
}

// ---- Cita ----
export interface Cita {
  id: string;
  paciente_id: string;
  dentista_id: string;
  fecha: string;
  hora: string;
  estado: EstadoCita;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Horario Disponible ----
export interface HorarioDisponible {
  id: string;
  dentista_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

// ---- DTOs de entrada ----
export interface RegisterDto {
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  genero: Genero;
  telefono: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CitaDto {
  dentista_id: string;
  fecha: string;
  hora: string;
  notas?: string;
}

// ---- Database type for Supabase (simplified) ----
export interface Database {
  public: {
    Tables: {
      pacientes: {
        Row: Paciente;
        Insert: PacienteInsert;
        Update: Partial<PacienteUpdate> & { updated_at?: string };
      };
      dentistas: {
        Row: Dentista;
        Insert: Omit<Dentista, 'id' | 'created_at'>;
        Update: Partial<Omit<Dentista, 'id' | 'created_at'>>;
      };
      citas: {
        Row: Cita;
        Insert: Omit<Cita, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Cita, 'id' | 'paciente_id' | 'created_at'>>;
      };
      horarios_disponibles: {
        Row: HorarioDisponible;
        Insert: Omit<HorarioDisponible, 'id'>;
        Update: Partial<Omit<HorarioDisponible, 'id'>>;
      };
    };
  };
}

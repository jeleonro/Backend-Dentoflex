import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../supabase/client';
import { RegisterDto, LoginDto, PacienteInsert } from '../types/database';

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const body: RegisterDto = req.body;
  const { email, password, nombres, apellidos, fecha_nacimiento, tipo_documento, numero_documento, genero, telefono } = body;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombres, apellidos } },
  });

  if (authError) { res.status(400).json({ error: authError.message }); return; }
  if (!authData.user) { res.status(500).json({ error: 'No se pudo crear el usuario' }); return; }

  const paciente: PacienteInsert = {
    id: authData.user.id,
    email,
    nombres,
    apellidos,
    fecha_nacimiento,
    tipo_documento,
    numero_documento,
    genero,
    telefono,
  };

  const { error: profileError } = await supabaseAdmin.from('pacientes').insert(paciente);

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    res.status(500).json({ error: 'Error al guardar el perfil del paciente' });
    return;
  }

  res.status(201).json({
    message: 'Registro exitoso. Revisa tu correo para confirmar tu cuenta.',
    user: { id: authData.user.id, email: authData.user.email },
  });
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password }: LoginDto = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) { res.status(401).json({ error: 'Credenciales inválidas' }); return; }

  res.json({
    message: 'Inicio de sesión exitoso',
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: { id: data.user.id, email: data.user.email },
  });
}

// POST /api/auth/logout
export async function logout(_req: Request, res: Response): Promise<void> {
  await supabase.auth.signOut();
  res.json({ message: 'Sesión cerrada exitosamente' });
}

// POST /api/auth/refresh
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refresh_token } = req.body;
  if (!refresh_token) { res.status(400).json({ error: 'refresh_token requerido' }); return; }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

  if (error || !data.session) { res.status(401).json({ error: 'Refresh token inválido o expirado' }); return; }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  });
}

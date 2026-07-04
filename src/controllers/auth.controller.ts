import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../supabase/client';
import { RegisterDto, LoginDto, PacienteInsert, RegisterDentistaDto } from '../types/database';

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const body: RegisterDto = req.body;
  const { email, password, nombres, apellidos, fecha_nacimiento, tipo_documento, numero_documento, genero, telefono } = body;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombres, apellidos, rol:'paciente' } },
  });

  if (authError) { res.status(400).json({ error: authError.message }); return; }
  if (!authData.user) { res.status(500).json({ error: 'No se pudo crear el usuario' }); return; }

  const paciente: PacienteInsert & { rol: string } = {
    id: authData.user.id,
    email, nombres, apellidos, fecha_nacimiento,
    tipo_documento, numero_documento, genero, telefono,
    rol: 'paciente',
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

// POST /api/auth/register-dentista  (solo admin)
export async function registerDentista(req: Request, res: Response): Promise<void> {
  const { email, password, dentista_id }: RegisterDentistaDto = req.body;

  // Verificar que el dentista_id existe
  const { data: dentista, error: dErr } = await supabaseAdmin
    .from('dentistas').select('id, nombres').eq('id', dentista_id).single();

  if (dErr || !dentista) {
    res.status(404).json({ error: 'Dentista no encontrado' });
    return;
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { rol: 'dentista', dentista_id },
    email_confirm: true,  // sin necesidad de confirmar email
  });

  if (authError) { res.status(400).json({ error: authError.message }); return; }

  const { error: linkError } = await supabaseAdmin.from('dentista_usuarios').insert({
    id: authData.user.id,
    dentista_id,
    email,
    rol: 'dentista',
  });

  if (linkError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    res.status(500).json({ error: 'Error al vincular el dentista' });
    return;
  }

  res.status(201).json({ message: `Usuario dentista creado para ${dentista.nombres}`, user: { id: authData.user.id, email } });
}

// POST /api/auth/forgot-password
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`
  });

  if (error) {
    res.status(400).json({
      error: error.message
    });
    return;
  }

  res.json({
    message: 'Se envió el enlace de recuperación al correo.'
  });
}


// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password }: LoginDto = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) { res.status(401).json({ error: 'Credenciales inválidas' }); return; }

  const rol = data.user.user_metadata?.rol ?? 'paciente';

  res.json({
    message: 'Inicio de sesión exitoso',
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    rol,                  // ← el frontend lo usa para redirigir
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

import { Request, Response } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { PacienteUpdate } from '../types/database';

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('pacientes')
    .select('*')
    .eq('id', req.user!.id)
    .single();

  if (error) { res.status(404).json({ error: 'Perfil no encontrado' }); return; }
  res.json(data);
}

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  const updates: PacienteUpdate = req.body;
  const clean: PacienteUpdate & { updated_at: string } = {
    ...(updates.nombres && { nombres: updates.nombres }),
    ...(updates.apellidos && { apellidos: updates.apellidos }),
    ...(updates.fecha_nacimiento && { fecha_nacimiento: updates.fecha_nacimiento }),
    ...(updates.tipo_documento && { tipo_documento: updates.tipo_documento }),
    ...(updates.numero_documento && { numero_documento: updates.numero_documento }),
    ...(updates.genero && { genero: updates.genero }),
    ...(updates.telefono && { telefono: updates.telefono }),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('pacientes')
    .update(clean)
    .eq('id', req.user!.id)
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
}

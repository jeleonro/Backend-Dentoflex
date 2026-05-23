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
  const userId = req.user!.id;
  const { telefono, email, foto_url } = req.body as Record<string, string>;

  const clean: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (telefono) clean['telefono'] = telefono;
  if (foto_url) clean['foto_url'] = foto_url;

  // Si viene email, actualizarlo también en auth.users
  if (email) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
    if (authError) {
      res.status(400).json({ error: 'No se pudo actualizar el email: ' + authError.message });
      return;
    }
    clean['email'] = email;
  }

  const { data, error } = await supabaseAdmin
    .from('pacientes')
    .update(clean)
    .eq('id', userId)
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
}

// POST /api/pacientes/me/foto
// Recibe la imagen en base64 y la sube a Supabase Storage
export async function uploadFoto(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { base64, mimeType } = req.body as { base64: string; mimeType: string };

  if (!base64 || !mimeType) {
    res.status(400).json({ error: 'base64 y mimeType son requeridos' });
    return;
  }

  const extension = mimeType.split('/')[1] ?? 'jpg';
  const fileName = `${userId}.${extension}`;
  const buffer = Buffer.from(base64, 'base64');

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatares')
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true, // reemplaza si ya existe
    });

  if (uploadError) {
    res.status(500).json({ error: 'Error al subir la imagen' });
    return;
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('avatares')
    .getPublicUrl(fileName);

  // Guardar la URL en el perfil del paciente
  await supabaseAdmin
    .from('pacientes')
    .update({ foto_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId);

  res.json({ foto_url: urlData.publicUrl });
}

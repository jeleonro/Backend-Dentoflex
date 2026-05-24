import { Request, Response } from 'express';
import { supabaseAdmin } from '../supabase/client';

// GET /api/chat/:citaId  — mensajes de una cita
export async function getMensajes(req: Request, res: Response): Promise<void> {
  const { citaId } = req.params;
  const userId = req.user!.id;

  // Verificar que el usuario pertenece a esta cita
  const tieneAcceso = await verificarAcceso(citaId, userId, req.user!.rol);
  if (!tieneAcceso) { res.status(403).json({ error: 'Sin acceso a esta conversación' }); return; }

  const { data, error } = await supabaseAdmin
    .from('mensajes')
    .select('id, contenido, emisor_id, emisor_rol, leido, created_at')
    .eq('cita_id', citaId)
    .order('created_at', { ascending: true });

  if (error) { res.status(500).json({ error: 'Error al obtener mensajes' }); return; }

  // Marcar como leídos los mensajes del otro
  await supabaseAdmin
    .from('mensajes')
    .update({ leido: true })
    .eq('cita_id', citaId)
    .neq('emisor_id', userId)
    .eq('leido', false);

  res.json(data);
}

// POST /api/chat/:citaId  — enviar mensaje
export async function enviarMensaje(req: Request, res: Response): Promise<void> {
  const { citaId } = req.params;
  const userId = req.user!.id;
  const { contenido } = req.body as { contenido: string };

  if (!contenido?.trim()) { res.status(400).json({ error: 'El mensaje no puede estar vacío' }); return; }

  const tieneAcceso = await verificarAcceso(citaId, userId, req.user!.rol);
  if (!tieneAcceso) { res.status(403).json({ error: 'Sin acceso a esta conversación' }); return; }

  const { data, error } = await supabaseAdmin
    .from('mensajes')
    .insert({
      cita_id: citaId,
      emisor_id: userId,
      emisor_rol: req.user!.rol,
      contenido: contenido.trim(),
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: 'Error al enviar mensaje' }); return; }
  res.status(201).json(data);
}

// GET /api/chat/no-leidos  — cantidad de mensajes no leídos por cita
export async function getNoLeidos(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('mensajes')
    .select('cita_id')
    .eq('leido', false)
    .neq('emisor_id', userId);

  if (error) { res.status(500).json({ error: 'Error' }); return; }

  // Agrupar por cita_id
  const conteo: Record<string, number> = {};
  for (const m of data ?? []) {
    conteo[m.cita_id] = (conteo[m.cita_id] ?? 0) + 1;
  }

  res.json(conteo); // { "uuid-cita": 3, ... }
}

// ── Helper ────────────────────────────────────────────────────────
async function verificarAcceso(citaId: string, userId: string, rol: string): Promise<boolean> {
  if (rol === 'paciente') {
    const { data } = await supabaseAdmin
      .from('citas').select('id').eq('id', citaId).eq('paciente_id', userId).maybeSingle();
    return !!data;
  }

  if (rol === 'dentista') {
    const { data: du } = await supabaseAdmin
      .from('dentista_usuarios').select('dentista_id').eq('id', userId).single();
    if (!du) return false;
    const { data } = await supabaseAdmin
      .from('citas').select('id').eq('id', citaId).eq('dentista_id', du.dentista_id).maybeSingle();
    return !!data;
  }

  return false;
}
import { Request, Response } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { CitaDto } from '../types/database';

export async function getMisCitas(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('citas')
    .select('id, fecha, hora, estado, notas, created_at, dentistas(id, nombres, apellidos, especialidad, foto_url)')
    .eq('paciente_id', req.user!.id)
    .order('fecha', { ascending: true });

  if (error) { res.status(500).json({ error: 'Error al obtener las citas' }); return; }
  res.json(data);
}

export async function crearCita(req: Request, res: Response): Promise<void> {
  const { dentista_id, fecha, hora, notas }: CitaDto = req.body;

  const { data: existente } = await supabaseAdmin
    .from('citas')
    .select('id')
    .eq('dentista_id', dentista_id)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .in('estado', ['pendiente', 'confirmada'])
    .maybeSingle();

  if (existente) { res.status(409).json({ error: 'Ese horario ya no está disponible' }); return; }

  const { data, error } = await supabaseAdmin
    .from('citas')
    .insert({
      paciente_id: req.user!.id,
      dentista_id,
      fecha,
      hora,
      estado: 'pendiente' as const,
      notas: notas ?? null,
    })
    .select('id, fecha, hora, estado, notas, dentistas(nombres, apellidos, especialidad)')
    .single();

  if (error) { res.status(500).json({ error: 'Error al crear la cita' }); return; }
  res.status(201).json(data);
}

export async function actualizarCita(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { estado, notas, fecha, hora, dentista_id } = req.body as Record<string, string>;

  const { data: cita } = await supabaseAdmin
    .from('citas')
    .select('id, estado')
    .eq('id', id)
    .eq('paciente_id', req.user!.id)
    .single();

  if (!cita) { res.status(404).json({ error: 'Cita no encontrada' }); return; }
  
  const citaRow = cita as { id: string; estado: string };
  if (citaRow.estado === 'completada') { res.status(400).json({ error: 'No se puede modificar una cita completada' }); return; }

  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  if (estado) updates['estado'] = estado;
  if (notas !== undefined) updates['notas'] = notas;
  if (fecha) updates['fecha'] = fecha;
  if (hora) updates['hora'] = hora;
  if (dentista_id) updates['dentista_id'] = dentista_id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabaseAdmin.from('citas').update(updates as any).eq('id', id).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
}

export async function cancelarCita(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const { data: cita } = await supabaseAdmin
    .from('citas')
    .select('id, estado')
    .eq('id', id)
    .eq('paciente_id', req.user!.id)
    .single();

  if (!cita) { res.status(404).json({ error: 'Cita no encontrada' }); return; }

  const citaRow = cita as { id: string; estado: string };
  if (!['pendiente', 'confirmada'].includes(citaRow.estado)) {
    res.status(400).json({ error: 'Esta cita no puede ser cancelada' }); return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabaseAdmin.from('citas').update({ estado: 'cancelada', updated_at: new Date().toISOString() } as any).eq('id', id).select().single();
  if (error) { res.status(500).json({ error: 'Error al cancelar la cita' }); return; }
  res.json({ message: 'Cita cancelada', cita: data });
}

import { Request, Response } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { HorarioDisponible } from '../types/database';

export async function getDentistas(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('dentistas')
    .select('id, nombres, apellidos, especialidad, foto_url')
    .eq('activo', true)
    .order('apellidos');

  if (error) { res.status(500).json({ error: 'Error al obtener los dentistas' }); return; }
  res.json(data);
}

export async function getHorariosDisponibles(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { fecha } = req.query;

  if (!fecha || typeof fecha !== 'string') {
    res.status(400).json({ error: 'El parámetro "fecha" es requerido (YYYY-MM-DD)' });
    return;
  }

  const diaSemana = new Date(fecha).getUTCDay();

  const { data: horarios, error: horariosError } = await supabaseAdmin
    .from('horarios_disponibles')
    .select('hora_inicio, hora_fin')
    .eq('dentista_id', id)
    .eq('dia_semana', diaSemana);

  if (horariosError || !horarios?.length) { res.json({ disponibles: [] }); return; }

  const { data: citasOcupadas } = await supabaseAdmin
    .from('citas')
    .select('hora')
    .eq('dentista_id', id)
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmada']);

  const horasOcupadas = new Set((citasOcupadas ?? []).map((c: { hora: string }) => c.hora));

  const slots: string[] = [];
  for (const h of (horarios as Pick<HorarioDisponible, 'hora_inicio' | 'hora_fin'>[])) {
    const [hI, mI] = h.hora_inicio.split(':').map(Number);
    const [hF, mF] = h.hora_fin.split(':').map(Number);
    let cur = hI * 60 + mI;
    const end = hF * 60 + mF;
    while (cur < end) {
      const slot = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`;
      if (!horasOcupadas.has(slot)) slots.push(slot);
      cur += 30;
    }
  }

  res.json({ disponibles: slots });
}

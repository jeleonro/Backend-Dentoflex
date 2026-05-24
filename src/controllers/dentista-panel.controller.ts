import { Request, Response } from 'express';
import { supabaseAdmin } from '../supabase/client';

// GET /api/dentista/mis-citas  — citas del dentista autenticado
export async function getMisCitasDentista(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    // Obtener el dentista_id vinculado a este usuario
    const { data: du, error: duErr } = await supabaseAdmin
        .from('dentista_usuarios')
        .select('dentista_id')
        .eq('id', userId)
        .single();

    if (duErr || !du) { res.status(404).json({ error: 'Perfil de dentista no encontrado' }); return; }

    const { data: citas, error } = await supabaseAdmin
        .from('citas')
        .select(`
      id, fecha, hora, estado, notas, created_at,
      pacientes (
        id, nombres, apellidos, telefono, email, foto_url
      )
    `)
        .eq('dentista_id', du.dentista_id)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

    if (error) { res.status(500).json({ error: 'Error al obtener citas' }); return; }
    res.json(citas);
}

// GET /api/dentista/citas-hoy  — solo las de hoy
export async function getCitasHoy(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const { data: du } = await supabaseAdmin
        .from('dentista_usuarios')
        .select('dentista_id')
        .eq('id', userId)
        .single();

    if (!du) { res.status(404).json({ error: 'Perfil de dentista no encontrado' }); return; }

    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
        .from('citas')
        .select(`
      id, fecha, hora, estado, notas,
      pacientes ( id, nombres, apellidos, telefono, foto_url )
    `)
        .eq('dentista_id', du.dentista_id)
        .eq('fecha', hoy)
        .in('estado', ['pendiente', 'confirmada'])
        .order('hora');

    if (error) { res.status(500).json({ error: 'Error al obtener citas' }); return; }
    res.json(data);
}

// PUT /api/dentista/citas/:id/estado  — confirmar o completar una cita
export async function actualizarEstadoCita(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { id } = req.params;
    const { estado } = req.body as { estado: 'confirmada' | 'completada' | 'cancelada' };

    const { data: du } = await supabaseAdmin
        .from('dentista_usuarios')
        .select('dentista_id')
        .eq('id', userId)
        .single();

    if (!du) { res.status(404).json({ error: 'Perfil de dentista no encontrado' }); return; }

    // Verificar que la cita pertenece a este dentista
    const { data: cita } = await supabaseAdmin
        .from('citas').select('id').eq('id', id).eq('dentista_id', du.dentista_id).single();

    if (!cita) { res.status(404).json({ error: 'Cita no encontrada' }); return; }

    const { data, error } = await supabaseAdmin
        .from('citas')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json(data);
}

// GET /api/dentista/perfil
export async function getPerfilDentista(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const { data: du } = await supabaseAdmin
        .from('dentista_usuarios')
        .select('dentista_id')
        .eq('id', userId)
        .single();

    if (!du) { res.status(404).json({ error: 'Perfil no encontrado' }); return; }

    const { data, error } = await supabaseAdmin
        .from('dentistas')
        .select('*')
        .eq('id', du.dentista_id)
        .single();

    if (error) { res.status(404).json({ error: 'Dentista no encontrado' }); return; }
    res.json(data);
}
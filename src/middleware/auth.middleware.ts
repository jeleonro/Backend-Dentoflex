import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../supabase/client';
import { Rol } from '../types/database';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        rol: Rol;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token de acceso requerido' });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return;
  }

  // El rol se guarda en user_metadata al registrarse
  const rol: Rol = (data.user.user_metadata?.rol as Rol) ?? 'paciente';

  req.user = { id: data.user.id, email: data.user.email!, rol };
  next();
}

// Middleware de guard por rol
export function requireRol(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    if (!roles.includes(req.user.rol)) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' });
      return;
    }
    next();
  };
}
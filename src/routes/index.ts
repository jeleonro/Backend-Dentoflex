import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';

import { register, login, logout, refreshToken } from '../controllers/auth.controller';
import { getMyProfile, updateMyProfile, uploadFoto } from '../controllers/paciente.controller';
import { getDentistas, getHorariosDisponibles } from '../controllers/dentista.controller';
import { getMisCitas, crearCita, actualizarCita, cancelarCita } from '../controllers/cita.controller';

const router = Router();

// ─── AUTH ───────────────────────────────────────────
router.post(
  '/auth/register',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener mínimo 6 caracteres'),
    body('nombres').notEmpty().withMessage('Nombres requeridos'),
    body('apellidos').notEmpty().withMessage('Apellidos requeridos'),
    body('fecha_nacimiento').isDate().withMessage('Fecha de nacimiento inválida'),
    body('tipo_documento').isIn(['dni', 'pasaporte', 'c.e']).withMessage('Tipo de documento inválido'),
    body('numero_documento').notEmpty().withMessage('Número de documento requerido'),
    body('genero').isIn(['masculino', 'femenino', 'otro']).withMessage('Género inválido'),
    body('telefono').notEmpty().withMessage('Teléfono requerido'),
  ],
  register
);

router.post(
  '/auth/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
  ],
  login
);

router.post('/auth/logout', logout);

router.post(
  '/auth/refresh',
  [body('refresh_token').notEmpty().withMessage('refresh_token requerido')],
  refreshToken
);

// ─── PACIENTES (requieren auth) ──────────────────────
router.get('/pacientes/me', authMiddleware, getMyProfile);
router.put('/pacientes/me', authMiddleware, updateMyProfile);
router.post('/pacientes/me/foto', authMiddleware, uploadFoto);

// ─── DENTISTAS ───────────────────────────────────────
router.get('/dentistas', authMiddleware, getDentistas);
router.get(
  '/dentistas/:id/horarios',
  authMiddleware,
  [
    param('id').isUUID().withMessage('ID de dentista inválido'),
    query('fecha').isDate().withMessage('Fecha inválida (use YYYY-MM-DD)'),
  ],
  getHorariosDisponibles
);

// ─── CITAS (requieren auth) ──────────────────────────
router.get('/citas', authMiddleware, getMisCitas);

router.post(
  '/citas',
  authMiddleware,
  [
    body('dentista_id').isUUID().withMessage('dentista_id inválido'),
    body('fecha').isDate().withMessage('Fecha inválida (YYYY-MM-DD)'),
    body('hora').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Hora inválida (HH:MM)'),
  ],
  crearCita
);

router.put(
  '/citas/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('ID de cita inválido')],
  actualizarCita
);

router.delete(
  '/citas/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('ID de cita inválido')],
  cancelarCita
);

export default router;

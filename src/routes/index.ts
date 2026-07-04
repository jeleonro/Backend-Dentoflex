import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware, requireRol } from '../middleware/auth.middleware';

import { register, login, logout, refreshToken, registerDentista, forgotPassword } from '../controllers/auth.controller';
import { getMyProfile, updateMyProfile, uploadFoto } from '../controllers/paciente.controller';
import { getDentistas, getHorariosDisponibles } from '../controllers/dentista.controller';
import { getMisCitas, crearCita, actualizarCita, cancelarCita } from '../controllers/cita.controller';
import { actualizarEstadoCita, getCitasHoy, getMisCitasDentista, getPerfilDentista } from '../controllers/dentista-panel.controller';
import { getMensajes, enviarMensaje, getNoLeidos, getInfoCita } from '../controllers/chat.controller';

const router = Router();

// ─── AUTH
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

router.post(
  '/auth/forgot-password',
  [
    body('email').isEmail().withMessage('Email inválido')
  ],
  forgotPassword
);

router.post('/auth/logout', logout);


router.post(
  '/auth/refresh',
  [body('refresh_token').notEmpty().withMessage('refresh_token requerido')],
  refreshToken
);


// Solo admin puede crear cuentas de dentistas --- pa que comprendas atudo
router.post('/auth/register-dentista',
  authMiddleware,
  requireRol('admin'),
  [body('email').isEmail(), body('password').isLength({ min: 6 }), body('dentista_id').isUUID()],
  registerDentista
);

// ─── PACIENTES (requieren auth) ──────────────────────
router.get('/pacientes/me', authMiddleware, getMyProfile);
router.put('/pacientes/me', authMiddleware, updateMyProfile);
router.post('/pacientes/me/foto', authMiddleware, uploadFoto);

// ─── DENTISTAS (lista pública para pacientes) ─────────
router.get('/dentistas', authMiddleware, getDentistas);
router.get('/dentistas/:id/horarios', authMiddleware, [
  param('id').isUUID(),
  query('fecha').isDate(),
], getHorariosDisponibles);




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
router.get('/citas', authMiddleware, requireRol('paciente'), getMisCitas);
router.post('/citas', authMiddleware, requireRol('paciente'), [
  body('dentista_id').isUUID(),
  body('fecha').isDate(),
  body('hora').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
], crearCita);
router.put('/citas/:id', authMiddleware, requireRol('paciente'), [param('id').isUUID()], actualizarCita);
router.delete('/citas/:id', authMiddleware, requireRol('paciente'), [param('id').isUUID()], cancelarCita);

// ─── PANEL DENTISTA ───────────────────────────────────
router.get('/dentista/perfil', authMiddleware, requireRol('dentista'), getPerfilDentista);
router.get('/dentista/mis-citas', authMiddleware, requireRol('dentista'), getMisCitasDentista);
router.get('/dentista/citas-hoy', authMiddleware, requireRol('dentista'), getCitasHoy);
router.put('/dentista/citas/:id/estado', authMiddleware, requireRol('dentista'), [
  param('id').isUUID(),
  body('estado').isIn(['confirmada', 'completada', 'cancelada']),
], actualizarEstadoCita);

// ─── CHAT ─────────────────────────────────────────────
router.get('/chat/no-leidos', authMiddleware, getNoLeidos);
router.get('/chat/:citaId', authMiddleware, [param('citaId').isUUID()], getMensajes);
router.get('/chat/:citaId/info', authMiddleware, [param('citaId').isUUID()], getInfoCita);
router.post('/chat/:citaId', authMiddleware, [
  param('citaId').isUUID(),
  body('contenido').notEmpty().trim(),
], enviarMensaje);

export default router;

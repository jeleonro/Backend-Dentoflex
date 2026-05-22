import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ─── Middlewares globales ──────────────────────────
app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://localhost:8100',          // Ionic dev server
    process.env.FRONTEND_URL ?? '',   // tu URL de producción
  ].filter(Boolean),
  credentials: true,
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Rutas ─────────────────────────────────────────
app.use('/api', routes);

// ─── Health check ──────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── Error handler global ──────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Iniciar servidor ──────────────────────────────
app.listen(PORT, () => {
  console.log(`\n Test Dentoflex API corriendo en http://localhost:${PORT}`);
  console.log(` Test Health check: http://localhost:${PORT}/health\n`);
});

export default app;

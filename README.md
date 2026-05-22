# 🦷 Dentoflex Backend

Backend REST API para la app **Dentoflex** (Ionic + Angular).  
Construido con **TypeScript + Express + Supabase**.

---

## 📁 Estructura del proyecto

```
dentoflex-backend/
├── src/
│   ├── index.ts                    # Entry point del servidor Express
│   ├── supabase/
│   │   └── client.ts               # Clientes de Supabase (público y admin)
│   ├── middleware/
│   │   └── auth.middleware.ts      # Verificación JWT de Supabase
│   ├── controllers/
│   │   ├── auth.controller.ts      # Register, Login, Logout, Refresh
│   │   ├── paciente.controller.ts  # Perfil del paciente
│   │   ├── dentista.controller.ts  # Lista dentistas + horarios disponibles
│   │   └── cita.controller.ts      # CRUD de citas
│   ├── routes/
│   │   └── index.ts                # Definición de todas las rutas
│   └── types/
│       └── database.ts             # Tipos TypeScript del esquema
└── supabase/
    └── migration.sql               # SQL para crear las tablas en Supabase
```

---

## 🚀 Setup paso a paso

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. En **SQL Editor**, ejecuta todo el contenido de `supabase/migration.sql`.
3. En **Settings → API** copia:
   - `Project URL`
   - `anon / public` key
   - `service_role` key (¡mantenla secreta!)

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=3000
FRONTEND_URL=http://localhost:4200
```

### 3. Instalar dependencias y correr

```bash
npm install
npm run dev        # desarrollo con hot-reload
npm run build      # compilar para producción
npm start          # correr compilado
```

---

## 🔌 Endpoints de la API

Base URL: `http://localhost:3000/api`

### Auth (sin token)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registrar nuevo paciente |
| POST | `/auth/login` | Iniciar sesión → devuelve JWT |
| POST | `/auth/logout` | Cerrar sesión |
| POST | `/auth/refresh` | Renovar access token |

#### Body para `/auth/register`:
```json
{
  "email": "paciente@gmail.com",
  "password": "123456",
  "nombres": "Juan Carlos",
  "apellidos": "Pérez López",
  "fecha_nacimiento": "1990-05-15",
  "tipo_documento": "dni",
  "numero_documento": "12345678",
  "genero": "masculino",
  "telefono": "987654321"
}
```

#### Body para `/auth/login`:
```json
{
  "email": "paciente@gmail.com",
  "password": "123456"
}
```

### Pacientes (requiere `Authorization: Bearer <token>`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/pacientes/me` | Ver mi perfil |
| PUT | `/pacientes/me` | Actualizar mi perfil |

### Dentistas (requiere token)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dentistas` | Listar dentistas activos |
| GET | `/dentistas/:id/horarios?fecha=YYYY-MM-DD` | Slots disponibles |

### Citas (requiere token)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/citas` | Mis citas |
| POST | `/citas` | Crear cita |
| PUT | `/citas/:id` | Actualizar cita |
| DELETE | `/citas/:id` | Cancelar cita |

#### Body para `POST /citas`:
```json
{
  "dentista_id": "uuid-del-dentista",
  "fecha": "2025-07-10",
  "hora": "10:00",
  "notas": "Primera consulta"
}
```

---

## 🔐 Autenticación en el Frontend (Angular)

Guarda el token al hacer login y envíalo en cada request:

```typescript
// En tu auth.service.ts
login(email: string, password: string) {
  return this.http.post<{access_token: string}>(`${API_URL}/auth/login`, { email, password })
    .pipe(tap(res => localStorage.setItem('token', res.access_token)));
}

// En tu http.interceptor.ts
intercept(req: HttpRequest<unknown>, next: HttpHandler) {
  const token = localStorage.getItem('token');
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next.handle(req);
}
```

---

## 🗄️ Diagrama de la Base de Datos

```
auth.users (Supabase interno)
    │
    └──► pacientes (id = auth.users.id)
              │
              └──► citas ◄──── dentistas
                                    │
                                    └──► horarios_disponibles
```

---

## 📝 Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL de tu proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave pública (usada para auth del usuario) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave admin (nunca exponerla al cliente) |
| `PORT` | Puerto del servidor (default: 3000) |
| `FRONTEND_URL` | URL del frontend para CORS |

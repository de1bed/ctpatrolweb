# CTPatrol

Inspecciones de seguridad C-TPAT: flujo guiado, evidencia fotográfica
georreferenciada, análisis con IA y expedientes.

Web app mobile-first (PWA instalable) con dos perfiles sobre el mismo login:
**operativo** (el inspector, en el teléfono) y **administrativo** (el panel).

---

## Cómo correrla

```bash
npm install
npm run dev
```

Y abrir **http://localhost:3100**

> **El puerto es 3100, no 3000.** Está fijo en `package.json` a propósito:
> en esta máquina hay otro proyecto ocupando el 3000, y como ese escucha en
> IPv6, `localhost:3000` cae en la app equivocada sin dar ningún error —
> simplemente aparece otra cosa. Fijar el puerto evita esa confusión.

### Entrar

Usuarios de prueba de la cuenta DEMO:

| Correo               | Rol       | Contraseña          |
| -------------------- | --------- | ------------------- |
| `inspector@demo.mx`  | Inspector | `CtpatrolDemo2026!` |
| `admin@demo.mx`      | Admin     | `CtpatrolDemo2026!` |

Son credenciales de desarrollo sobre datos de juguete. Los usuarios reales se
dan de alta desde el panel administrativo.

---

## Cómo está armado

| Capa      | Qué se usó                                              |
| --------- | ------------------------------------------------------- |
| Framework | Next.js 16 (App Router) + TypeScript                    |
| Estilos   | Tailwind 4, sistema de diseño propio en `globals.css`   |
| Backend   | Supabase — Postgres, Auth, Storage, RLS                 |
| IA        | OpenAI, **solo desde el servidor** (`/api`)             |

### Estructura

```
src/
  app/
    (app)/          Perfil operativo: flujo de inspección
    login/          Autenticación
  components/
    shell/          Armazón: encabezado, pestañas, riel lateral
    ui/             Primitivos: botón, campo, tarjeta
    inspection/     Piezas del dominio
  lib/
    auth.ts         Sesión, roles y permisos (solo servidor)
    env.ts          Variables de entorno validadas
    supabase/       Clientes de navegador, servidor y admin
supabase/
  migrations/       Schema versionado — la fuente de verdad
  seed.sql          Datos de desarrollo
  tests/rls.sql     Prueba de aislamiento entre empresas
brand/
  logo-fuente.png   Logo original; `npm run icons` regenera todo
```

---

## Reglas que no se rompen

**Ninguna llave secreta lleva `NEXT_PUBLIC_`.** Ese prefijo la compila dentro
del JavaScript que baja al navegador, donde cualquiera la lee. Las llaves de
OpenAI y el service role viven solo en el servidor. (En el sistema anterior
las cuatro llaves de API estaban expuestas así.)

**RLS es lo único que separa a una empresa de otra.** No se filtra por cuenta
en el cliente. Después de tocar cualquier política, correr
`supabase/tests/rls.sql`.

**El schema se cambia con migraciones**, nunca a mano en el dashboard. Si no
está en `supabase/migrations/`, no existe.

**El folio de inspección lo genera Postgres**, no el cliente. Generarlo en el
dispositivo fue lo que producía folios duplicados en el sistema anterior.

---

## Comandos

| Comando            | Qué hace                                  |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Servidor de desarrollo en el puerto 3100  |
| `npm run build`    | Build de producción                       |
| `npm run typecheck`| Revisa tipos sin compilar                 |
| `npm run lint`     | ESLint                                    |
| `npm run icons`    | Regenera los íconos desde `brand/`        |

---

## Configuración

Copiar `.env.example` a `.env.local` y llenar. Las de Supabase ya vienen
puestas; faltan dos:

- `SUPABASE_SERVICE_ROLE_KEY` — panel de Supabase → Project Settings → API Keys
- `OPENAI_API_KEY` — para el análisis de evidencia

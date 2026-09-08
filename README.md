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

### Probarla en el teléfono (cámara y GPS)

```bash
npm run dev:https
```

Y desde el teléfono, **en la misma red**: `https://192.168.100.10:3443`

> **La cámara y el GPS NO funcionan sin HTTPS.** Los navegadores solo los
> permiten en un origen seguro, y `localhost` es la única excepción. Por eso
> hay un servidor aparte con certificado local: sin él, probar la captura en
> un teléfono es imposible.
>
> El certificado es autofirmado, así que el teléfono va a mostrar una
> advertencia la primera vez. Acéptala ("Avanzado" → "Continuar"): a partir
> de ahí el navegador trata el sitio como seguro y la cámara funciona.

### Entrar

Usuarios de prueba de la cuenta DEMO:

| Correo               | Rol       | Contraseña          |
| -------------------- | --------- | ------------------- |
| `inspector@demo.mx`  | Inspector | `CtpatrolDemo2026!` |
| `admin@demo.mx`      | Admin     | `CtpatrolDemo2026!` |

Son credenciales de desarrollo sobre datos de juguete. Los usuarios reales se
dan de alta desde el panel administrativo.

---

## Qué funciona hoy

**Flujo operativo completo**, de crear la inspección a imprimir el reporte:

- Flujo guiado de 20 fases con lógica condicional por tipo de transporte
- Cámara con fecha, hora y coordenadas **quemadas en la imagen**
- Evidencia guardada en el dispositivo antes de subirse, con cola de
  sincronización que reintenta sola
- Catálogos con búsqueda y alta en campo, controlada por permisos
- Firmas, cierre automático con resultado calculado, y reporte imprimible

**Pendiente:** panel administrativo (siguiente entrega) y el análisis con IA,
que está construido pero requiere `OPENAI_API_KEY`.

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

**La foto se guarda en el dispositivo antes de intentar subirla.** IndexedDB
primero, red después. Es lo que hace que un corte de señal, una recarga o una
batería agotada no borren evidencia ya capturada.

**Las claves de paso viajan en la URL**, así que no pueden llevar caracteres
reservados. Y las rutas de Storage no aceptan los mismos caracteres que una
URL: hay un sanitizador entre ambas. Ver `flujo.ts` y `uploader.tsx`.

---

## Comandos

| Comando            | Qué hace                                  |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Servidor de desarrollo en el puerto 3100  |
| `npm run build`    | Build de producción                       |
| `npm test`         | Pruebas del motor de flujo                |
| `npm run typecheck`| Revisa tipos sin compilar                 |
| `npm run lint`     | ESLint                                    |
| `npm run icons`    | Regenera los íconos desde `brand/`        |

---

## Configuración

Copiar `.env.example` a `.env.local` y llenar. Las de Supabase ya vienen
puestas; faltan dos:

- `SUPABASE_SERVICE_ROLE_KEY` — panel de Supabase → Project Settings → API Keys
- `OPENAI_API_KEY` — para el análisis de evidencia

# Poner CTPatrol en producción

Todo lo de esta guía necesita tus cuentas, así que lo dejo escrito en lugar
de hacerlo. Son unos 20 minutos.

---

## 1. Rotar las llaves del sistema anterior

**Hazlo primero, antes que nada.** Estas cuatro llaves están commiteadas en
`.env.working` y `.env.backup` del proyecto móvil viejo, con el prefijo
`EXPO_PUBLIC_` que las metía dentro del bundle de la app:

| Servicio | Qué hacer |
| --- | --- |
| **OpenAI** | Revocar y crear otra. Es de pago por uso: quien la tenga, gasta a tu nombre. |
| Google Gemini | Revocar. Ya no se usa. |
| OCR.space | Revocar. Ya no se usa. |
| PDFShift | Revocar y **cancelar la suscripción**: el reporte ahora lo genera el navegador. |

---

## 2. Elegir dónde vive

Recomiendo **Vercel**: es de los mismos que hacen Next.js, el despliegue es
conectar el repositorio, y da HTTPS con certificado real sin configurar nada.
El plan gratuito alcanza de sobra para el volumen de una empresa de
inspecciones.

```bash
npm i -g vercel
vercel
```

Alternativas válidas si prefieres no depender de Vercel: Netlify, Cloudflare
Pages, o un contenedor propio con `next build && next start`. En cualquiera,
**HTTPS no es opcional** — sin él la cámara y el GPS no funcionan.

---

## 3. Variables de entorno

En el panel de tu proveedor, no en un archivo del repositorio:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xwkmfxxurcercpvrksyf.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Panel Supabase → API Keys → publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | Panel Supabase → API Keys → **service_role** |
| `OPENAI_API_KEY` | La llave **nueva** del punto 1 |
| `OPENAI_MAX_CALLS_PER_INSPECTION` | `40` |
| `NEXT_PUBLIC_APP_URL` | **Tu dominio real con https** |

> ⚠️ **`NEXT_PUBLIC_APP_URL` se imprime dentro del QR de cada reporte.** Si la
> configuras mal, los reportes salen con un enlace muerto impreso en papel que
> ya se entregó, y eso no se corrige después. Ponla bien desde el primer
> despliegue.

> ⚠️ **`SUPABASE_SERVICE_ROLE_KEY` se salta RLS por completo.** Nunca con
> prefijo `NEXT_PUBLIC_`, nunca en el repositorio, nunca en un mensaje de
> chat.

---

## 4. Preparar Supabase para producción

**Aplicar las migraciones.** Están en `supabase/migrations/`, numeradas y en
orden. Si creas un proyecto nuevo, córrelas de la 0001 a la 0007.

**Crear la cuenta real de la empresa** y su primer administrador:

```sql
insert into company_accounts (code, name)
values ('CRI', 'Nombre real de la empresa');
```

Después el admin se da de alta desde el panel (Administración → Inspectores →
Nuevo usuario), que es el camino soportado. Para el primerísimo admin, cuando
todavía no hay nadie que pueda entrar, créalo desde el panel de Supabase
(Authentication → Add user) con estos `user_metadata`:

```json
{
  "company_account_id": "<el id de company_accounts>",
  "role": "admin",
  "full_name": "Nombre del administrador"
}
```

**Borrar los datos de prueba** si usas el mismo proyecto:

```sql
delete from company_accounts where code in ('DEMO', 'RIVAL');
```

Eso arrastra en cascada sus inspecciones, catálogos y perfiles.

---

## 5. Comprobar antes de repartir

Con el dominio ya en línea, revisa desde un teléfono real:

- [ ] Entrar con un usuario real
- [ ] **La cámara abre** (si no, revisa que sea https y no http)
- [ ] **El GPS captura coordenadas**
- [ ] Se puede instalar desde el menú del navegador y abre sin barra
- [ ] Cerrar una inspección y ver el reporte
- [ ] **Escanear el QR del reporte impreso** y que abra la verificación
- [ ] Poner el teléfono en modo avión a media inspección: la app debe seguir
      funcionando y las fotos deben subirse solas al reconectar

Ese último punto es el que de verdad importa: es el escenario que rompía el
sistema anterior.

---

## Lo que queda pendiente de decidir

**Correo transaccional.** Hoy el reporte se comparte con el menú nativo del
teléfono y el cliente de correo del inspector. Para que el sistema mande
correos por su cuenta hace falta un proveedor (Resend o SES), un dominio
verificado y registros SPF/DKIM. Sin eso los correos caen en spam, que es
peor que no mandarlos: el admin cree que llegaron.

**Notificaciones push.** Funcionan en Android; en iPhone solo si la app se
instala en la pantalla de inicio. Requieren claves VAPID y guardar las
suscripciones. Vale la pena cuando haya suficientes inspectores como para que
avisar por WhatsApp deje de alcanzar.

**Retención de evidencia.** Ahora las fotos se guardan indefinidamente. Vale
la pena definir por cuántos años deben conservarse los expedientes y
programar el archivado del resto: Storage se cobra por gigabyte, y 41 fotos
por inspección suman rápido.

import type { Metadata } from "next";

import { MarcoLegal } from "@/components/legal/marco-legal";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Política de cookies de CTPatrol.",
};

/**
 * Política de cookies.
 *
 * ⚠️  BORRADOR PARA REVISIÓN LEGAL
 *
 * Este documento es un borrador que debe ser revisado y aprobado por el
 * área legal de Vortex Lab antes de publicarse.
 */
export default function CookiesPage() {
  return (
    <MarcoLegal titulo="Política de cookies" ultimaActualizacion="[PENDIENTE]">
      {/* ================================================================
          ⚠️  BORRADOR PARA REVISIÓN LEGAL
          
          Esta política de cookies es un borrador que debe ser revisada
          y aprobada por David y el área legal de Vortex Lab.
          
          Nota: Actualmente la app solo usa cookies y almacenamiento
          esenciales para el funcionamiento. No hay cookies de analytics,
          publicidad ni tracking de terceros.
          ================================================================ */}

      <section>
        <h2>1. ¿Qué son las cookies?</h2>
        <p>
          Las cookies son pequeños archivos de texto que los sitios web
          almacenan en su navegador. Se utilizan para recordar información sobre
          su visita, como sus preferencias y el estado de su sesión.
        </p>
        <p>
          Además de las cookies, los sitios web modernos pueden utilizar otras
          tecnologías de almacenamiento como localStorage (almacenamiento local
          del navegador) e IndexedDB (base de datos del navegador).
        </p>
      </section>

      <section>
        <h2>2. Cookies que utilizamos</h2>
        <p>
          CTPatrol utiliza <strong>únicamente cookies esenciales</strong> que
          son necesarias para el funcionamiento de la plataforma. No utilizamos
          cookies de análisis, publicidad ni rastreo de terceros.
        </p>

        <h3>2.1 Cookies de sesión (esenciales)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Nombre</th>
              <th className="text-left">Propósito</th>
              <th className="text-left">Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>sb-*-auth-token</code>
              </td>
              <td>
                Mantiene su sesión iniciada. Sin esta cookie, tendría que
                iniciar sesión cada vez que visita la plataforma.
              </td>
              <td>Hasta cerrar sesión o expiración (1 año)</td>
            </tr>
            <tr>
              <td>
                <code>tz</code>
              </td>
              <td>
                Guarda su zona horaria para mostrar fechas y horas correctamente
                en su ubicación.
              </td>
              <td>1 año</td>
            </tr>
          </tbody>
        </table>

        <h3>2.2 Almacenamiento local (esencial)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Clave</th>
              <th className="text-left">Propósito</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>ctpatrol:tema</code>
              </td>
              <td>
                Guarda su preferencia de tema (claro, oscuro o sistema) para que
                la interfaz mantenga su elección al volver.
              </td>
            </tr>
          </tbody>
        </table>

        <h3>2.3 IndexedDB (esencial)</h3>
        <p>
          Para permitir la captura de evidencia fotográfica cuando no hay
          conexión a internet, CTPatrol almacena temporalmente las fotos en la
          base de datos local del navegador (IndexedDB). Estas fotos se suben
          automáticamente cuando se restablece la conexión y se eliminan del
          almacenamiento local.
        </p>
      </section>

      <section>
        <h2>3. Cookies de terceros</h2>
        <p>
          Nuestro proveedor de autenticación (Supabase) puede establecer cookies
          adicionales necesarias para el inicio de sesión seguro. Estas cookies
          son esenciales y están sujetas a las políticas de privacidad de
          Supabase.
        </p>
        <p>
          <strong>No utilizamos</strong> cookies de:
        </p>
        <ul>
          <li>Google Analytics ni otras herramientas de análisis</li>
          <li>Redes publicitarias</li>
          <li>Redes sociales</li>
          <li>Servicios de rastreo de comportamiento</li>
        </ul>
      </section>

      <section>
        <h2>4. Gestión de cookies</h2>
        <p>
          Puede configurar su navegador para rechazar o eliminar cookies. Sin
          embargo, si bloquea las cookies esenciales, la plataforma no
          funcionará correctamente:
        </p>
        <ul>
          <li>No podrá iniciar sesión ni mantener su sesión activa</li>
          <li>
            Las fechas y horas podrían mostrarse en una zona horaria incorrecta
          </li>
          <li>
            Las fotos capturadas sin conexión no se guardarán para subir después
          </li>
        </ul>

        <h3>Cómo gestionar cookies en su navegador</h3>
        <ul>
          <li>
            <strong>Chrome:</strong> Configuración → Privacidad y seguridad →
            Cookies
          </li>
          <li>
            <strong>Safari:</strong> Preferencias → Privacidad → Cookies y datos
            de sitios
          </li>
          <li>
            <strong>Firefox:</strong> Configuración → Privacidad y seguridad →
            Cookies
          </li>
          <li>
            <strong>Edge:</strong> Configuración → Cookies y permisos del sitio
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Por qué no mostramos un banner de cookies</h2>
        <p>
          CTPatrol utiliza únicamente cookies técnicamente necesarias para el
          funcionamiento del servicio. Según la normativa aplicable, las cookies
          estrictamente necesarias no requieren consentimiento previo ni
          presentación de un banner.
        </p>
        <p>
          Si en el futuro añadimos cookies no esenciales (como analítica),
          implementaremos un mecanismo de consentimiento antes de utilizarlas.
        </p>
      </section>

      <section>
        <h2>6. Cambios en esta política</h2>
        <p>
          Nos reservamos el derecho de modificar esta Política de Cookies en
          cualquier momento. Los cambios se publicarán en esta página con la
          fecha de última actualización.
        </p>
      </section>

      <section>
        <h2>7. Más información</h2>
        <p>
          Para más información sobre cómo tratamos sus datos personales,
          consulte nuestro{" "}
          <a href="/privacidad">Aviso de Privacidad</a>.
        </p>
        <p>
          Si tiene preguntas sobre esta política, puede contactarnos en{" "}
          <a href="mailto:soporte@vortexlabai.com">soporte@vortexlabai.com</a>.
        </p>
      </section>
    </MarcoLegal>
  );
}

import type { Metadata } from "next";

import { MarcoLegal } from "@/components/legal/marco-legal";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso de CTPatrol.",
};

/**
 * Términos y condiciones de uso.
 *
 * ⚠️  BORRADOR PARA REVISIÓN LEGAL
 *
 * Este documento es un borrador que debe ser revisado y aprobado por el
 * área legal de Vortex Lab antes de publicarse. Los datos marcados con
 * [PENDIENTE] deben completarse con la información real.
 */
export default function TerminosPage() {
  return (
    <MarcoLegal
      titulo="Términos y condiciones"
      ultimaActualizacion="[PENDIENTE]"
    >
      {/* ================================================================
          ⚠️  BORRADOR PARA REVISIÓN LEGAL
          
          Estos términos y condiciones son un borrador que debe ser
          revisado y aprobado por David y el área legal de Vortex Lab.
          
          Información pendiente de completar:
          - Razón social completa de Vortex Lab
          - Domicilio fiscal completo
          - RFC de la empresa
          - Fecha de última actualización
          - Detalles de planes y precios (si aplica)
          - Jurisdicción específica para disputas
          ================================================================ */}

      <section>
        <h2>1. Aceptación de los términos</h2>
        <p>
          Al acceder y utilizar CTPatrol (&ldquo;la Plataforma&rdquo;), usted
          acepta estos Términos y Condiciones de Uso (&ldquo;Términos&rdquo;),
          así como nuestro{" "}
          <a href="/privacidad">Aviso de Privacidad</a> y{" "}
          <a href="/cookies">Política de Cookies</a>. Si no está de acuerdo con
          estos Términos, no utilice la Plataforma.
        </p>
        <p>
          La Plataforma es operada por{" "}
          <strong>[RAZÓN SOCIAL PENDIENTE]</strong> (&ldquo;Vortex Lab&rdquo;,
          &ldquo;nosotros&rdquo; o &ldquo;nuestro&rdquo;), con domicilio en{" "}
          <strong>[DOMICILIO FISCAL PENDIENTE]</strong>.
        </p>
      </section>

      <section>
        <h2>2. Descripción del servicio</h2>
        <p>
          CTPatrol es una plataforma digital para la gestión de inspecciones de
          seguridad conforme al programa C-TPAT (Customs-Trade Partnership
          Against Terrorism). La Plataforma permite:
        </p>
        <ul>
          <li>Realizar inspecciones de seguridad guiadas</li>
          <li>Capturar evidencia fotográfica y documental</li>
          <li>Generar reportes e informes de inspección</li>
          <li>Almacenar y gestionar expedientes de inspección</li>
          <li>Verificar la autenticidad de reportes mediante códigos QR</li>
          <li>
            Utilizar inteligencia artificial para asistir en el análisis de
            evidencia
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Registro y cuenta de usuario</h2>
        <h3>3.1 Requisitos</h3>
        <p>
          Para utilizar la Plataforma debe crear una cuenta de usuario. Usted
          declara que:
        </p>
        <ul>
          <li>Es mayor de edad conforme a la legislación mexicana</li>
          <li>
            Tiene capacidad legal para celebrar contratos vinculantes
          </li>
          <li>
            Está autorizado por su organización para actuar en su nombre (si
            aplica)
          </li>
          <li>
            La información proporcionada es verdadera, exacta y completa
          </li>
        </ul>

        <h3>3.2 Seguridad de la cuenta</h3>
        <p>
          Usted es responsable de mantener la confidencialidad de sus
          credenciales de acceso y de todas las actividades que ocurran bajo su
          cuenta. Debe notificarnos inmediatamente si sospecha uso no autorizado
          de su cuenta.
        </p>

        <h3>3.3 Cuentas de empresa</h3>
        <p>
          Si utiliza la Plataforma como parte de una organización, los
          administradores de su cuenta empresarial pueden tener acceso a la
          información de las inspecciones realizadas por los usuarios de dicha
          cuenta.
        </p>
      </section>

      <section>
        <h2>4. Uso aceptable</h2>
        <p>Al utilizar la Plataforma, usted se compromete a:</p>
        <ul>
          <li>Utilizar la Plataforma solo para fines legítimos relacionados con inspecciones de seguridad</li>
          <li>No falsificar información o documentos</li>
          <li>No intentar acceder a cuentas o datos de otros usuarios</li>
          <li>No interferir con el funcionamiento de la Plataforma</li>
          <li>No utilizar la Plataforma para actividades ilegales</li>
          <li>No cargar contenido malicioso, virus o código dañino</li>
          <li>No infringir derechos de propiedad intelectual de terceros</li>
          <li>Cumplir con todas las leyes y regulaciones aplicables</li>
        </ul>
      </section>

      <section>
        <h2>5. Contenido del usuario</h2>
        <h3>5.1 Responsabilidad</h3>
        <p>
          Usted es el único responsable del contenido que carga a la Plataforma,
          incluyendo fotografías, videos, documentos y comentarios. Al cargar
          contenido, declara que tiene los derechos necesarios para hacerlo y
          que el contenido no infringe derechos de terceros.
        </p>

        <h3>5.2 Licencia</h3>
        <p>
          Al cargar contenido a la Plataforma, usted otorga a Vortex Lab una
          licencia no exclusiva, mundial y libre de regalías para almacenar,
          procesar y mostrar dicho contenido con el fin de proporcionar el
          servicio. Esta licencia termina cuando usted elimina el contenido o
          cierra su cuenta, excepto cuando el contenido haya sido compartido
          con otros usuarios o sea necesario conservarlo por obligaciones
          legales.
        </p>
      </section>

      <section>
        <h2>6. Propiedad intelectual</h2>
        <p>
          La Plataforma, incluyendo su diseño, código, logotipos, marcas y
          contenido creado por Vortex Lab, es propiedad exclusiva de Vortex Lab
          o sus licenciantes. Queda prohibida la reproducción, distribución,
          modificación o uso no autorizado.
        </p>
        <p>
          &ldquo;CTPatrol&rdquo; y &ldquo;Vortex Lab&rdquo; son marcas de Vortex
          Lab. Su uso sin autorización está prohibido.
        </p>
      </section>

      <section>
        <h2>7. Inteligencia artificial</h2>
        <p>
          La Plataforma puede utilizar inteligencia artificial para asistir en
          el análisis de evidencia fotográfica. Esta funcionalidad:
        </p>
        <ul>
          <li>Es una herramienta de asistencia, no un sustituto del criterio del inspector</li>
          <li>Puede no estar disponible en todas las cuentas</li>
          <li>Puede generar resultados inexactos o incompletos</li>
          <li>No debe utilizarse como único fundamento para decisiones críticas</li>
        </ul>
        <p>
          El inspector es siempre responsable de la evaluación final y del
          contenido de los reportes.
        </p>
      </section>

      <section>
        <h2>8. Disponibilidad del servicio</h2>
        <p>
          Nos esforzamos por mantener la Plataforma disponible, pero no
          garantizamos disponibilidad ininterrumpida. Podemos suspender el
          servicio temporalmente para mantenimiento, actualizaciones o por
          causas fuera de nuestro control.
        </p>
        <p>
          Nos reservamos el derecho de modificar, suspender o discontinuar
          cualquier funcionalidad de la Plataforma en cualquier momento.
        </p>
      </section>

      <section>
        <h2>9. Limitación de responsabilidad</h2>
        <p>
          LA PLATAFORMA SE PROPORCIONA &ldquo;TAL CUAL&rdquo; Y &ldquo;SEGÚN
          DISPONIBILIDAD&rdquo;. EN LA MEDIDA PERMITIDA POR LA LEY:
        </p>
        <ul>
          <li>
            No garantizamos que la Plataforma cumpla con sus requisitos
            específicos
          </li>
          <li>
            No garantizamos la exactitud o completitud de los resultados del
            análisis con IA
          </li>
          <li>
            No seremos responsables por daños indirectos, incidentales,
            especiales o consecuentes
          </li>
          <li>
            Nuestra responsabilidad total no excederá el monto pagado por usted
            en los últimos 12 meses
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Indemnización</h2>
        <p>
          Usted acepta indemnizar y mantener indemne a Vortex Lab, sus
          directivos, empleados y agentes de cualquier reclamación, daño,
          pérdida o gasto (incluyendo honorarios legales) derivado de: su uso de
          la Plataforma, su incumplimiento de estos Términos, o la violación de
          derechos de terceros.
        </p>
      </section>

      <section>
        <h2>11. Suspensión y terminación</h2>
        <p>
          Podemos suspender o terminar su acceso a la Plataforma si:
        </p>
        <ul>
          <li>Incumple estos Términos</li>
          <li>Utiliza la Plataforma de manera que pueda causarnos daño legal o reputacional</li>
          <li>Se requiere por orden judicial o autoridad competente</li>
          <li>Dejamos de ofrecer el servicio</li>
        </ul>
        <p>
          Usted puede cancelar su cuenta en cualquier momento contactando a{" "}
          <a href="mailto:soporte@vortexlabai.com">soporte@vortexlabai.com</a>.
        </p>
      </section>

      <section>
        <h2>12. Modificaciones</h2>
        <p>
          Nos reservamos el derecho de modificar estos Términos en cualquier
          momento. Las modificaciones entrarán en vigor al publicarse en la
          Plataforma. El uso continuado después de las modificaciones implica su
          aceptación.
        </p>
        <p>
          Le notificaremos de cambios sustanciales a través del correo
          electrónico registrado en su cuenta.
        </p>
      </section>

      <section>
        <h2>13. Ley aplicable y jurisdicción</h2>
        <p>
          Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos.
          Para la interpretación y cumplimiento de estos Términos, las partes se
          someten a la jurisdicción de los tribunales competentes de{" "}
          <strong>[CIUDAD PENDIENTE]</strong>, renunciando a cualquier otro
          fuero que pudiera corresponderles por razón de domicilio presente o
          futuro.
        </p>
      </section>

      <section>
        <h2>14. Disposiciones generales</h2>
        <ul>
          <li>
            <strong>Divisibilidad:</strong> Si alguna disposición de estos
            Términos es declarada inválida, las demás disposiciones
            permanecerán vigentes.
          </li>
          <li>
            <strong>Renuncia:</strong> La falta de ejercicio de un derecho no
            implica renuncia al mismo.
          </li>
          <li>
            <strong>Acuerdo completo:</strong> Estos Términos, junto con el
            Aviso de Privacidad y la Política de Cookies, constituyen el acuerdo
            completo entre las partes.
          </li>
          <li>
            <strong>Cesión:</strong> No puede ceder sus derechos u obligaciones
            bajo estos Términos sin nuestro consentimiento previo por escrito.
          </li>
        </ul>
      </section>

      <section>
        <h2>15. Contacto</h2>
        <p>
          Para cualquier duda sobre estos Términos, puede contactarnos en:
        </p>
        <ul>
          <li>
            <strong>Correo electrónico:</strong>{" "}
            <a href="mailto:soporte@vortexlabai.com">soporte@vortexlabai.com</a>
          </li>
          <li>
            <strong>Domicilio:</strong>{" "}
            <strong>[DOMICILIO FISCAL PENDIENTE]</strong>
          </li>
        </ul>
      </section>
    </MarcoLegal>
  );
}

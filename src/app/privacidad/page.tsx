import type { Metadata } from "next";

import { MarcoLegal } from "@/components/legal/marco-legal";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Aviso de privacidad de CTPatrol conforme a la LFPDPPP.",
};

/**
 * Aviso de privacidad conforme a la LFPDPPP.
 *
 * ⚠️  BORRADOR PARA REVISIÓN LEGAL
 *
 * Este documento es un borrador que debe ser revisado y aprobado por el
 * área legal de Vortex Lab antes de publicarse. Los datos marcados con
 * [PENDIENTE] deben completarse con la información real de la empresa.
 */
export default function PrivacidadPage() {
  return (
    <MarcoLegal titulo="Aviso de privacidad" ultimaActualizacion="[PENDIENTE]">
      {/* ================================================================
          ⚠️  BORRADOR PARA REVISIÓN LEGAL
          
          Este aviso de privacidad es un borrador que debe ser revisado
          y aprobado por David y el área legal de Vortex Lab.
          
          Información pendiente de completar:
          - Razón social completa de Vortex Lab
          - Domicilio fiscal completo
          - RFC de la empresa
          - Fecha de última actualización
          - Plazo de retención de datos (actualmente dice "el tiempo necesario")
          - Lista completa de encargados y transferencias
          - Datos del oficial de protección de datos (si aplica)
          ================================================================ */}

      <section>
        <h2>1. Identidad del responsable</h2>
        <p>
          <strong>[RAZÓN SOCIAL PENDIENTE]</strong> (en adelante
          &ldquo;Vortex Lab&rdquo; o el &ldquo;Responsable&rdquo;), con
          domicilio en <strong>[DOMICILIO FISCAL PENDIENTE]</strong>, es
          responsable del tratamiento de sus datos personales conforme a la Ley
          Federal de Protección de Datos Personales en Posesión de los
          Particulares (LFPDPPP) y su Reglamento.
        </p>
        <p>
          El presente Aviso de Privacidad tiene como objeto informarle sobre el
          tratamiento que se dará a sus datos personales cuando sean recabados,
          utilizados, almacenados y/o transferidos por Vortex Lab a través de la
          plataforma CTPatrol.
        </p>
      </section>

      <section>
        <h2>2. Datos personales que recabamos</h2>
        <p>
          Para llevar a cabo las finalidades descritas en el presente Aviso de
          Privacidad, podemos recabar las siguientes categorías de datos
          personales:
        </p>

        <h3>Datos de identificación</h3>
        <ul>
          <li>Nombre completo</li>
          <li>Correo electrónico</li>
          <li>Contraseña (almacenada de forma encriptada)</li>
          <li>Empresa u organización a la que pertenece</li>
          <li>Rol o puesto dentro de la organización</li>
        </ul>

        <h3>Datos de inspección</h3>
        <ul>
          <li>Fotografías de unidades de transporte e instalaciones</li>
          <li>Videos de inspección</li>
          <li>Datos de geolocalización (ubicación de la inspección)</li>
          <li>Fecha, hora y duración de las inspecciones</li>
          <li>Comentarios y observaciones del inspector</li>
        </ul>

        <h3>Datos de terceros</h3>
        <p>
          Durante las inspecciones pueden capturarse datos de conductores,
          operadores y otros terceros involucrados en las operaciones de
          transporte, incluyendo:
        </p>
        <ul>
          <li>Nombre del conductor u operador</li>
          <li>Documentos de identificación (fotografías)</li>
          <li>Placas y datos de vehículos</li>
          <li>Números de contenedor y sellos</li>
        </ul>

        <h3>Datos técnicos</h3>
        <ul>
          <li>Dirección IP</li>
          <li>Tipo de dispositivo y navegador</li>
          <li>Sistema operativo</li>
          <li>Datos de uso de la plataforma</li>
        </ul>
      </section>

      <section>
        <h2>3. Finalidades del tratamiento</h2>
        <p>Sus datos personales serán utilizados para las siguientes finalidades:</p>

        <h3>Finalidades primarias (necesarias)</h3>
        <ul>
          <li>Crear y administrar su cuenta de usuario en CTPatrol</li>
          <li>Permitir la realización de inspecciones de seguridad C-TPAT</li>
          <li>Generar reportes e informes de inspección</li>
          <li>Almacenar evidencia fotográfica y documental de las inspecciones</li>
          <li>Verificar la autenticidad de los reportes mediante códigos QR</li>
          <li>Enviar notificaciones relacionadas con el servicio</li>
          <li>Atender solicitudes de soporte técnico</li>
          <li>Cumplir con obligaciones legales y regulatorias</li>
        </ul>

        <h3>Finalidades secundarias (opcionales)</h3>
        <ul>
          <li>Enviar comunicaciones sobre actualizaciones del servicio</li>
          <li>Realizar análisis estadísticos para mejorar la plataforma</li>
          <li>
            Utilizar inteligencia artificial para asistir en el análisis de
            evidencia
          </li>
        </ul>
        <p>
          Si no desea que sus datos sean tratados para las finalidades
          secundarias, puede manifestarlo enviando un correo a{" "}
          <a href="mailto:soporte@vortexlabai.com">soporte@vortexlabai.com</a>.
        </p>
      </section>

      <section>
        <h2>4. Transferencias de datos</h2>
        <p>
          Sus datos personales pueden ser transferidos y tratados por terceros
          dentro y fuera de México para las siguientes finalidades:
        </p>
        <ul>
          <li>
            <strong>Supabase Inc.</strong> (Estados Unidos): Almacenamiento
            seguro de datos y autenticación de usuarios.
          </li>
          <li>
            <strong>OpenAI</strong> (Estados Unidos): Análisis de imágenes con
            inteligencia artificial para asistir en la evaluación de
            inspecciones. Las imágenes se procesan de forma transitoria.
          </li>
          <li>
            <strong>Resend</strong> (Estados Unidos): Envío de correos
            electrónicos transaccionales.
          </li>
          <li>
            <strong>Vercel Inc.</strong> (Estados Unidos): Alojamiento de la
            plataforma.
          </li>
        </ul>
        <p>
          Estas transferencias se realizan conforme a lo establecido en la
          LFPDPPP y su Reglamento. Los terceros receptores asumen las mismas
          obligaciones de confidencialidad y seguridad.
        </p>
      </section>

      <section>
        <h2>5. Derechos ARCO</h2>
        <p>
          Usted tiene derecho a Acceder a sus datos personales, Rectificarlos
          cuando sean inexactos, solicitar su Cancelación cuando considere que
          no se requieren para las finalidades señaladas, u Oponerse al
          tratamiento de los mismos para fines específicos (derechos ARCO).
        </p>
        <p>
          Para ejercer cualquiera de estos derechos, envíe su solicitud al
          correo{" "}
          <a href="mailto:soporte@vortexlabai.com">soporte@vortexlabai.com</a>{" "}
          incluyendo:
        </p>
        <ul>
          <li>Nombre completo del titular</li>
          <li>
            Descripción clara del derecho que desea ejercer y los datos
            involucrados
          </li>
          <li>Copia de identificación oficial vigente</li>
          <li>Correo electrónico para recibir la respuesta</li>
        </ul>
        <p>
          Responderemos su solicitud en un plazo máximo de 20 días hábiles
          contados a partir de la recepción. Si la solicitud resulta procedente,
          se hará efectiva dentro de los 15 días hábiles siguientes. Estos
          plazos podrán ampliarse conforme a la LFPDPPP.
        </p>
      </section>

      <section>
        <h2>6. Revocación del consentimiento</h2>
        <p>
          Usted puede revocar el consentimiento otorgado para el tratamiento de
          sus datos personales enviando su solicitud al correo{" "}
          <a href="mailto:soporte@vortexlabai.com">soporte@vortexlabai.com</a>.
          La revocación no tendrá efectos retroactivos y puede implicar la
          imposibilidad de continuar prestándole el servicio.
        </p>
      </section>

      <section>
        <h2>7. Opciones para limitar el uso</h2>
        <p>
          Si desea limitar el uso o divulgación de sus datos personales, o ser
          excluido de las comunicaciones secundarias, envíe su solicitud al
          correo{" "}
          <a href="mailto:soporte@vortexlabai.com">soporte@vortexlabai.com</a>.
        </p>
      </section>

      <section>
        <h2>8. Uso de cookies y tecnologías</h2>
        <p>
          CTPatrol utiliza cookies y tecnologías similares para el
          funcionamiento de la plataforma. Para más información, consulte
          nuestra{" "}
          <a href="/cookies">Política de Cookies</a>.
        </p>
      </section>

      <section>
        <h2>9. Seguridad de los datos</h2>
        <p>
          Implementamos medidas de seguridad administrativas, técnicas y físicas
          para proteger sus datos personales contra daño, pérdida, alteración,
          destrucción, uso, acceso o tratamiento no autorizado. Estas medidas
          incluyen:
        </p>
        <ul>
          <li>Cifrado de datos en tránsito y en reposo</li>
          <li>Controles de acceso basados en roles</li>
          <li>Autenticación segura</li>
          <li>Respaldos periódicos</li>
          <li>Monitoreo de actividad</li>
        </ul>
      </section>

      <section>
        <h2>10. Conservación de datos</h2>
        <p>
          Sus datos personales serán conservados durante el tiempo necesario
          para cumplir con las finalidades descritas en este Aviso y para
          atender requerimientos legales aplicables.{" "}
          <strong>[PENDIENTE: Definir plazos específicos de retención]</strong>
        </p>
      </section>

      <section>
        <h2>11. Cambios al aviso de privacidad</h2>
        <p>
          Nos reservamos el derecho de modificar este Aviso de Privacidad en
          cualquier momento. Las modificaciones estarán disponibles en esta
          página:{" "}
          <a href="https://ctpatrol.vortexlabai.com/privacidad">
            ctpatrol.vortexlabai.com/privacidad
          </a>
          . Le notificaremos de cambios relevantes a través del correo
          electrónico registrado en su cuenta.
        </p>
      </section>

      <section>
        <h2>12. Contacto</h2>
        <p>
          Para cualquier duda o aclaración respecto al tratamiento de sus datos
          personales, puede contactarnos en:
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

      <section>
        <h2>13. Consentimiento</h2>
        <p>
          Al utilizar CTPatrol y proporcionar sus datos personales, usted
          consiente el tratamiento de los mismos conforme a lo establecido en el
          presente Aviso de Privacidad.
        </p>
      </section>
    </MarcoLegal>
  );
}

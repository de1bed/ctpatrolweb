/**
 * Guías de inspección: qué buscar en cada punto y cómo fotografiarlo.
 *
 * GENERADO por scripts/portar-guias.mjs desde el proyecto móvil anterior.
 * Regenerar con: node scripts/portar-guias.mjs
 *
 * Es el conocimiento del oficio, escrito por quien sabe inspeccionar. La app
 * anterior lo mostraba junto a un diagrama con el punto resaltado, y es lo
 * que permite que un inspector nuevo sepa qué está viendo. Sin esto, la
 * pantalla de captura es una lista de nombres sin contexto.
 */

export type GuiaPunto = {
  /** Diagrama con este punto resaltado, en /public/guias. */
  diagrama: string;
  /** Qué verificar exactamente. */
  puntosClave: string[];
  /** Cómo tomar la evidencia. */
  recomendaciones: string[];
  /** Criterio C-TPAT del punto. */
  descripcion: string;
};

export const GUIAS: Record<string, GuiaPunto> = {

  // ── tractor ──────────────────────────────────────────────
  defensa: {
    diagrama: "/guias/tractor/defensa.webp",
    puntosClave: [
      "Verificar que no tenga compartimentos ocultos o modificaciones",
      "Revisar que esté firmemente fijada al chasis",
      "Comprobar que no haya espacios o huecos inusuales",
      "Inspeccionar por signos de soldadura reciente o alteraciones",
    ],
    recomendaciones: [
      "Tomar foto desde ángulo frontal y lateral",
      "Asegurar buena iluminación para detectar modificaciones",
      "Verificar integridad estructural completa",
      "Documentar cualquier daño o reparación visible",
    ],
    descripcion: "La defensa frontal debe estar completamente sellada sin compartimentos ocultos o modificaciones que puedan ocultar contrabando.",
  },
  llantas_rines: {
    diagrama: "/guias/tractor/llantas_rines.webp",
    puntosClave: [
      "Inspeccionar llantas por doble pared o cavidades ocultas",
      "Verificar que los rines no tengan modificaciones",
      "Revisar presión de aire y estado general",
      "Comprobar que no haya objetos escondidos entre llantas",
    ],
    recomendaciones: [
      "Fotografiar cada llanta individualmente",
      "Revisar área entre llantas gemelas",
      "Verificar tapas de válvulas y estado de los rines",
      "Documentar cualquier anomalía en el dibujo del neumático",
    ],
    descripcion: "Las llantas y rines deben estar en buen estado sin modificaciones que permitan ocultar contrabando en cavidades.",
  },
  caja_bateria: {
    diagrama: "/guias/tractor/caja_bateria.webp",
    puntosClave: [
      "Verificar que la caja esté sellada correctamente",
      "Revisar cables de conexión sin alteraciones",
      "Comprobar que no haya compartimentos adicionales",
      "Inspeccionar por signos de manipulación reciente",
    ],
    recomendaciones: [
      "Tomar foto con tapa abierta y cerrada",
      "Verificar estado de los cables y conexiones",
      "Revisar área alrededor de la caja",
      "Documentar número de serie de la batería",
    ],
    descripcion: "La caja de batería debe estar sellada sin modificaciones y con todas las conexiones intactas.",
  },
  puertas: {
    diagrama: "/guias/tractor/puertas.webp",
    puntosClave: [
      "Verificar cerraduras y mecanismos de apertura",
      "Revisar marcos y bisagras sin alteraciones",
      "Comprobar que no haya espacios o huecos inusuales",
      "Inspeccionar sellos y gomas de cierre",
    ],
    recomendaciones: [
      "Fotografiar puertas abiertas y cerradas",
      "Probar funcionamiento de cerraduras",
      "Verificar alineación de puertas",
      "Documentar cualquier daño en marcos o bisagras",
    ],
    descripcion: "Las puertas deben funcionar correctamente con cerraduras intactas y sin espacios que permitan acceso no autorizado.",
  },
  compartimiento_herramienta: {
    diagrama: "/guias/tractor/compartimiento_herramienta.webp",
    puntosClave: [
      "Verificar que el compartimiento esté vacío o con herramientas legítimas",
      "Revisar fondo y paredes por compartimentos ocultos",
      "Comprobar que la tapa cierre herméticamente",
      "Inspeccionar por signos de modificaciones estructurales",
    ],
    recomendaciones: [
      "Fotografiar interior completamente vacío",
      "Verificar integridad del fondo y paredes",
      "Probar funcionamiento de la tapa",
      "Documentar herramientas presentes si las hay",
    ],
    descripcion: "El compartimiento de herramientas debe estar limpio y sin compartimentos ocultos o modificaciones.",
  },
  mecanismos_cerrado: {
    diagrama: "/guias/tractor/mecanismos_cerrado.webp",
    puntosClave: [
      "Verificar funcionamiento de cerraduras y pestillos",
      "Revisar que no haya mecanismos adicionales no autorizados",
      "Comprobar sellos de seguridad intactos",
      "Inspeccionar por signos de manipulación",
    ],
    recomendaciones: [
      "Probar cada mecanismo individualmente",
      "Fotografiar cerraduras y sellos",
      "Verificar numeración de sellos",
      "Documentar estado de todos los mecanismos",
    ],
    descripcion: "Todos los mecanismos de cerrado deben funcionar correctamente sin modificaciones o dispositivos adicionales.",
  },
  tanque_aire: {
    diagrama: "/guias/tractor/tanque_aire.webp",
    puntosClave: [
      "Verificar que el tanque esté sellado sin modificaciones",
      "Revisar válvulas y conexiones intactas",
      "Comprobar que no haya compartimentos adicionales",
      "Inspeccionar por signos de soldadura reciente",
    ],
    recomendaciones: [
      "Fotografiar tanque desde múltiples ángulos",
      "Verificar presión del sistema de aire",
      "Revisar válvulas de drenaje",
      "Documentar cualquier reparación visible",
    ],
    descripcion: "El tanque de aire debe estar sellado herméticamente sin modificaciones que permitan acceso no autorizado.",
  },
  tanque_combustible: {
    diagrama: "/guias/tractor/tanque_combustible.webp",
    puntosClave: [
      "Verificar que el tanque esté sellado sin modificaciones",
      "Revisar tapa de combustible con sello de seguridad",
      "Comprobar que no haya compartimentos ocultos",
      "Inspeccionar por signos de manipulación o alteraciones",
    ],
    recomendaciones: [
      "Fotografiar tapa y área del tanque",
      "Verificar sello de seguridad en tapa",
      "Revisar nivel de combustible",
      "Documentar numeración de sellos",
    ],
    descripcion: "El tanque de combustible debe estar completamente sellado con tapas de seguridad sin modificaciones.",
  },
  cabina: {
    diagrama: "/guias/tractor/cabina.webp",
    puntosClave: [
      "Verificar interior de cabina sin objetos ocultos",
      "Revisar compartimentos y espacios de almacenamiento",
      "Comprobar que no haya modificaciones estructurales",
      "Inspeccionar asientos y áreas de descanso",
    ],
    recomendaciones: [
      "Fotografiar interior completo de cabina",
      "Revisar todos los compartimentos",
      "Verificar área de descanso si existe",
      "Documentar objetos personales del conductor",
    ],
    descripcion: "La cabina debe estar libre de contrabando con todos los compartimentos verificados.",
  },
  rompevientos_techo: {
    diagrama: "/guias/tractor/rompevientos_techo.webp",
    puntosClave: [
      "Verificar que no haya cortes o modificaciones en el techo",
      "Revisar rompe vientos sin alteraciones",
      "Comprobar sellos de ventanas intactos",
      "Inspeccionar por signos de reparaciones recientes",
    ],
    recomendaciones: [
      "Fotografiar techo desde múltiples ángulos",
      "Verificar integridad de ventanas",
      "Revisar sellos y juntas",
      "Documentar cualquier daño o reparación",
    ],
    descripcion: "El techo y rompe vientos deben estar intactos sin modificaciones que permitan acceso no autorizado.",
  },
  motor: {
    diagrama: "/guias/tractor/motor.webp",
    puntosClave: [
      "Verificar compartimento del motor sin objetos ocultos",
      "Revisar componentes principales sin modificaciones",
      "Comprobar que no haya compartimentos adicionales",
      "Inspeccionar por signos de manipulación reciente",
    ],
    recomendaciones: [
      "Fotografiar compartimento completo del motor",
      "Revisar componentes principales",
      "Verificar nivel de fluidos",
      "Documentar estado general del motor",
    ],
    descripcion: "El compartimento del motor debe estar libre de contrabando con todos los componentes en su lugar original.",
  },
  quinta_rueda_chasis: {
    diagrama: "/guias/tractor/quinta_rueda_chasis.webp",
    puntosClave: [
      "Verificar quinta rueda sin modificaciones",
      "Revisar chasis por compartimentos ocultos",
      "Comprobar conexiones de remolque intactas",
      "Inspeccionar por signos de alteraciones estructurales",
    ],
    recomendaciones: [
      "Fotografiar quinta rueda y área de conexión",
      "Verificar mecanismo de enganche",
      "Revisar longitud del chasis",
      "Documentar estado de conexiones",
    ],
    descripcion: "La quinta rueda y chasis deben estar sin modificaciones con todas las conexiones en buen estado.",
  },
  mofle: {
    diagrama: "/guias/tractor/mofle.webp",
    puntosClave: [
      "Verificar que el mofle esté sellado correctamente",
      "Revisar que no tenga compartimentos ocultos",
      "Comprobar conexiones sin modificaciones",
      "Inspeccionar por signos de alteraciones recientes",
    ],
    recomendaciones: [
      "Fotografiar mofle desde múltiples ángulos",
      "Verificar conexiones y sellos",
      "Revisar sistema de escape completo",
      "Documentar estado del mofle",
    ],
    descripcion: "El mofle debe estar sellado herméticamente sin modificaciones que permitan ocultar contrabando.",
  },
  luces: {
    diagrama: "/guias/tractor/luces.webp",
    puntosClave: [
      "Verificar que las luces funcionen correctamente",
      "Revisar que no haya compartimentos ocultos detrás de luces",
      "Comprobar sellos y conexiones intactas",
      "Inspeccionar por signos de modificaciones",
    ],
    recomendaciones: [
      "Probar funcionamiento de todas las luces",
      "Fotografiar cada conjunto de luces",
      "Verificar sellos y conexiones",
      "Documentar cualquier luz dañada",
    ],
    descripcion: "Todas las luces deben funcionar correctamente sin modificaciones o compartimentos ocultos.",
  },
  mangueras_frenos: {
    diagrama: "/guias/tractor/mangueras_frenos.webp",
    puntosClave: [
      "Verificar que las mangueras estén intactas",
      "Revisar conexiones sin modificaciones",
      "Comprobar que no haya objetos ocultos en mangueras",
      "Inspeccionar por signos de manipulación",
    ],
    recomendaciones: [
      "Fotografiar sistema de frenos completo",
      "Verificar integridad de mangueras",
      "Revisar conexiones y abrazaderas",
      "Documentar estado del sistema",
    ],
    descripcion: "Las mangueras de frenos deben estar intactas sin modificaciones que comprometan la seguridad.",
  },
  polveras: {
    diagrama: "/guias/tractor/polveras.webp",
    puntosClave: [
      "Verificar que las polveras estén selladas",
      "Revisar que no tengan compartimentos ocultos",
      "Comprobar conexiones sin modificaciones",
      "Inspeccionar por signos de alteraciones",
    ],
    recomendaciones: [
      "Fotografiar polveras desde múltiples ángulos",
      "Verificar sellos y conexiones",
      "Revisar área alrededor de polveras",
      "Documentar estado general",
    ],
    descripcion: "Las polveras deben estar selladas herméticamente sin modificaciones o compartimentos ocultos.",
  },

  // ── exterior ──────────────────────────────────────────────
  pared_frontal_ext: {
    diagrama: "/guias/exterior/pared_frontal_ext.webp",
    puntosClave: [
      "Verificar integridad estructural sin modificaciones",
      "Revisar por compartimentos ocultos o doble pared",
      "Comprobar que no haya cortes o soldaduras sospechosas",
      "Inspeccionar remaches y puntos de unión",
    ],
    recomendaciones: [
      "Fotografiar toda la pared frontal externa",
      "Verificar uniformidad de la superficie",
      "Revisar área de conexión con el techo",
      "Documentar cualquier reparación visible",
    ],
    descripcion: "La pared frontal externa debe estar completamente sellada sin modificaciones que permitan acceso no autorizado al interior del contenedor.",
  },
  pared_frontal_int: {
    diagrama: "/guias/exterior/pared_frontal_int.webp",
    puntosClave: [
      "Verificar que no haya espacios ocultos detrás de revestimientos",
      "Revisar integridad de la pared sin modificaciones",
      "Comprobar que no haya compartimentos adicionales",
      "Inspeccionar por signos de acceso no autorizado",
    ],
    recomendaciones: [
      "Fotografiar pared interna completa",
      "Verificar áreas de difícil acceso",
      "Revisar revestimientos y paneles",
      "Documentar estado de aislamiento si existe",
    ],
    descripcion: "La pared frontal interna debe estar libre de compartimentos ocultos con todos los revestimientos intactos.",
  },
  paredes_laterales: {
    diagrama: "/guias/exterior/paredes_laterales.webp",
    puntosClave: [
      "Verificar ambas paredes laterales sin modificaciones",
      "Revisar por compartimentos ocultos o doble pared",
      "Comprobar integridad estructural completa",
      "Inspeccionar remaches y soldaduras",
    ],
    recomendaciones: [
      "Fotografiar ambas paredes completas",
      "Verificar uniformidad del material",
      "Revisar áreas de conexión con piso y techo",
      "Documentar cualquier irregularidad",
    ],
    descripcion: "Las paredes laterales deben estar completamente selladas sin modificaciones estructurales o compartimentos ocultos.",
  },
  piso: {
    diagrama: "/guias/exterior/piso.webp",
    puntosClave: [
      "Verificar que el piso esté sin modificaciones",
      "Revisar por compartimentos ocultos bajo el piso",
      "Comprobar integridad de tablones o superficie",
      "Inspeccionar por signos de alteraciones recientes",
    ],
    recomendaciones: [
      "Fotografiar toda la superficie del piso",
      "Verificar sonido al golpear (áreas huecas)",
      "Revisar conexiones con paredes",
      "Documentar estado de tablones o superficie",
    ],
    descripcion: "El piso debe estar completamente sellado sin compartimentos ocultos o modificaciones que permitan ocultar contrabando.",
  },
  techo_externo: {
    diagrama: "/guias/exterior/techo_externo.webp",
    puntosClave: [
      "Verificar integridad del techo sin cortes o modificaciones",
      "Revisar por compartimentos ocultos en la estructura",
      "Comprobar que no haya accesos no autorizados",
      "Inspeccionar estado de remaches y soldaduras",
    ],
    recomendaciones: [
      "Utilizar CCTV o escalera para inspección visual",
      "Fotografiar toda la superficie del techo",
      "Verificar áreas de difícil acceso",
      "Documentar cualquier reparación o modificación",
    ],
    descripcion: "El techo externo debe estar intacto sin modificaciones que permitan acceso no autorizado al contenedor.",
  },
  puertas_ext_int: {
    diagrama: "/guias/exterior/puertas_ext_int.webp",
    puntosClave: [
      "Verificar mecanismos de cierre sin modificaciones",
      "Revisar marcos y bisagras intactos",
      "Comprobar que no haya espacios ocultos en puertas",
      "Inspeccionar sellos y gomas de cierre",
    ],
    recomendaciones: [
      "Fotografiar puertas abiertas y cerradas",
      "Verificar funcionamiento de cerraduras",
      "Revisar interior de puertas por compartimentos ocultos",
      "Documentar estado de bisagras y sellos",
    ],
    descripcion: "Las puertas deben funcionar correctamente sin compartimentos ocultos y con todos los mecanismos de seguridad intactos.",
  },
  chasis: {
    diagrama: "/guias/exterior/chasis.webp",
    puntosClave: [
      "Verificar estructura del chasis sin modificaciones",
      "Revisar por compartimentos ocultos en la estructura",
      "Comprobar conexiones y soldaduras intactas",
      "Inspeccionar por signos de alteraciones estructurales",
    ],
    recomendaciones: [
      "Fotografiar estructura completa del chasis",
      "Verificar longitud y dimensiones estándar",
      "Revisar área bajo el contenedor",
      "Documentar estado de conexiones principales",
    ],
    descripcion: "El chasis debe estar sin modificaciones estructurales con todas las conexiones en buen estado.",
  },
  cubierta_ventilador: {
    diagrama: "/guias/exterior/cubierta_ventilador.webp",
    puntosClave: [
      "Verificar que la cubierta esté sellada correctamente",
      "Revisar por compartimentos ocultos detrás del ventilador",
      "Comprobar funcionamiento del sistema de refrigeración",
      "Inspeccionar por signos de manipulación reciente",
    ],
    recomendaciones: [
      "Fotografiar cubierta y sistema de refrigeración",
      "Verificar sellos de seguridad si existen",
      "Revisar área alrededor del ventilador",
      "Documentar estado del equipo de refrigeración",
    ],
    descripcion: "La cubierta del ventilador debe estar sellada sin modificaciones que permitan ocultar contrabando en el sistema de refrigeración.",
  },
  compartimiento_quinta_rueda: {
    diagrama: "/guias/exterior/compartimiento_quinta_rueda.webp",
    puntosClave: [
      "Verificar área de quinta rueda sin compartimentos ocultos",
      "Revisar conexiones y estructura intacta",
      "Comprobar que no haya modificaciones en el área",
      "Inspeccionar por signos de alteraciones",
    ],
    recomendaciones: [
      "Fotografiar compartimiento completo",
      "Verificar espacio entre tractor y contenedor",
      "Revisar conexiones de aire y electricidad",
      "Documentar estado general del área",
    ],
    descripcion: "El compartimiento de la quinta rueda debe estar libre de modificaciones con todas las conexiones visibles y accesibles.",
  },
  parachoques_trasero: {
    diagrama: "/guias/exterior/parachoques_trasero.webp",
    puntosClave: [
      "Verificar que el parachoques esté sellado sin modificaciones",
      "Revisar por compartimentos ocultos en la estructura",
      "Comprobar conexiones y fijaciones intactas",
      "Inspeccionar por signos de alteraciones recientes",
    ],
    recomendaciones: [
      "Fotografiar parachoques desde múltiples ángulos",
      "Verificar integridad estructural",
      "Revisar área de conexión con el chasis",
      "Documentar cualquier reparación visible",
    ],
    descripcion: "El parachoques trasero debe estar completamente sellado sin modificaciones o compartimentos ocultos.",
  },
  manijas_varillas_seguros: {
    diagrama: "/guias/exterior/manijas_varillas_seguros.webp",
    puntosClave: [
      "Verificar funcionamiento de todos los mecanismos",
      "Revisar que no haya dispositivos adicionales no autorizados",
      "Comprobar integridad de varillas y seguros",
      "Inspeccionar por signos de manipulación",
    ],
    recomendaciones: [
      "Probar cada mecanismo individualmente",
      "Fotografiar manijas y sistemas de cierre",
      "Verificar estado de varillas de cierre",
      "Documentar funcionamiento de seguros",
    ],
    descripcion: "Todas las manijas, varillas y seguros deben funcionar correctamente sin modificaciones o dispositivos adicionales.",
  },
  soportes: {
    diagrama: "/guias/exterior/soportes.webp",
    puntosClave: [
      "Verificar que los soportes estén sin modificaciones",
      "Revisar por compartimentos ocultos en soportes",
      "Comprobar conexiones y soldaduras intactas",
      "Inspeccionar integridad estructural",
    ],
    recomendaciones: [
      "Fotografiar todos los soportes estructurales",
      "Verificar estado de conexiones",
      "Revisar áreas de difícil acceso",
      "Documentar cualquier reparación o modificación",
    ],
    descripcion: "Los soportes estructurales deben estar intactos sin modificaciones o compartimentos ocultos.",
  },
  remaches: {
    diagrama: "/guias/exterior/remaches.webp",
    puntosClave: [
      "Verificar que todos los remaches sean originales",
      "Revisar por remaches nuevos o modificados",
      "Comprobar uniformidad de remaches",
      "Inspeccionar por signos de manipulación",
    ],
    recomendaciones: [
      "Fotografiar áreas con remaches sospechosos",
      "Verificar patrón y uniformidad de remaches",
      "Revisar áreas con remaches nuevos",
      "Documentar cualquier irregularidad",
    ],
    descripcion: "Todos los remaches deben ser originales y uniformes sin signos de manipulación o reemplazo reciente.",
  },
  llanta_refaccion: {
    diagrama: "/guias/exterior/llanta_refaccion.webp",
    puntosClave: [
      "Verificar que la llanta sea legítima sin modificaciones",
      "Revisar soporte de llanta sin compartimentos ocultos",
      "Comprobar que no haya objetos escondidos",
      "Inspeccionar presión y estado de la llanta",
    ],
    recomendaciones: [
      "Fotografiar llanta y soporte completo",
      "Verificar presión de la llanta",
      "Revisar área alrededor del soporte",
      "Documentar estado general",
    ],
    descripcion: "La llanta de refacción debe estar en buen estado sin modificaciones en el soporte que permitan ocultar contrabando.",
  },
  luces_laterales_chasis: {
    diagrama: "/guias/exterior/luces_laterales_chasis.webp",
    puntosClave: [
      "Verificar funcionamiento de todas las luces laterales",
      "Revisar que no haya compartimentos ocultos detrás de luces",
      "Comprobar conexiones eléctricas intactas",
      "Inspeccionar por modificaciones",
    ],
    recomendaciones: [
      "Probar funcionamiento de cada luz",
      "Fotografiar sistema de iluminación lateral",
      "Verificar conexiones y cables",
      "Documentar cualquier luz dañada o modificada",
    ],
    descripcion: "Las luces laterales deben funcionar correctamente sin compartimentos ocultos o modificaciones en las conexiones.",
  },
  direccionales_frenos_chasis: {
    diagrama: "/guias/exterior/direccionales_frenos_chasis.webp",
    puntosClave: [
      "Verificar funcionamiento de direccionales y luces de freno",
      "Revisar que no haya compartimentos ocultos",
      "Comprobar conexiones eléctricas sin alteraciones",
      "Inspeccionar integridad del sistema",
    ],
    recomendaciones: [
      "Probar todas las direccionales y luces de freno",
      "Fotografiar sistema completo de iluminación trasera",
      "Verificar sincronización con sistema del tractor",
      "Documentar estado de conexiones",
    ],
    descripcion: "Las direccionales y luces de freno deben funcionar correctamente sin modificaciones o compartimentos ocultos.",
  },
  llantas: {
    diagrama: "/guias/exterior/llantas.webp",
    puntosClave: [
      "Verificar todas las llantas por doble pared o cavidades",
      "Revisar presión de aire y estado general",
      "Comprobar que no haya objetos entre llantas gemelas",
      "Inspeccionar rines sin modificaciones",
    ],
    recomendaciones: [
      "Fotografiar cada llanta individualmente",
      "Verificar presión y dibujo del neumático",
      "Revisar área entre llantas gemelas",
      "Documentar estado de rines y tapas de válvulas",
    ],
    descripcion: "Todas las llantas deben estar en buen estado sin modificaciones que permitan ocultar contrabando en cavidades.",
  },
  polveras_remolque: {
    diagrama: "/guias/exterior/polveras_remolque.webp",
    puntosClave: [
      "Verificar que las polveras estén selladas correctamente",
      "Revisar por compartimentos ocultos en polveras",
      "Comprobar conexiones sin modificaciones",
      "Inspeccionar integridad de las polveras",
    ],
    recomendaciones: [
      "Fotografiar polveras desde múltiples ángulos",
      "Verificar sellos y conexiones",
      "Revisar área interna de polveras",
      "Documentar estado general",
    ],
    descripcion: "Las polveras deben estar selladas herméticamente sin modificaciones o compartimentos ocultos que permitan esconder contrabando.",
  },
  placas: {
    diagrama: "/guias/exterior/placas.webp",
    puntosClave: [
      "Verificar que las placas sean legítimas y correspondan al vehículo",
      "Revisar numeración sin alteraciones",
      "Comprobar fechas de vigencia",
      "Inspeccionar hologramas y sellos de seguridad",
    ],
    recomendaciones: [
      "Fotografiar placas frontal y trasera claramente",
      "Verificar numeración en sistema",
      "Revisar documentos que coincidan con placas",
      "Documentar fechas de vigencia y hologramas",
    ],
    descripcion: "Las placas deben ser legítimas, estar vigentes y corresponder al vehículo inspeccionado sin signos de alteración.",
  },

  // ── internos ──────────────────────────────────────────────
  pared_frontal: {
    diagrama: "/guias/internos/pared_frontal.webp",
    puntosClave: [
      "Verificar integridad completa sin compartimentos ocultos",
      "Revisar por modificaciones o doble pared",
      "Comprobar uniformidad del material",
      "Inspeccionar revestimientos y paneles intactos",
    ],
    recomendaciones: [
      "Fotografiar toda la pared frontal interna",
      "Verificar con golpes suaves por áreas huecas",
      "Revisar conexiones con techo y piso",
      "Documentar estado de aislamiento si existe",
    ],
    descripcion: "La pared frontal interna debe estar completamente sellada sin modificaciones estructurales o compartimentos ocultos.",
  },
  pared_izquierda: {
    diagrama: "/guias/internos/pared_izquierda.webp",
    puntosClave: [
      "Verificar integridad de toda la pared izquierda",
      "Revisar por compartimentos ocultos o doble pared",
      "Comprobar estado de revestimientos",
      "Inspeccionar conexiones estructurales",
    ],
    recomendaciones: [
      "Fotografiar pared completa de arriba a abajo",
      "Verificar uniformidad del material",
      "Revisar áreas de difícil acceso",
      "Documentar cualquier irregularidad",
    ],
    descripcion: "La pared izquierda debe estar libre de modificaciones con todos los revestimientos intactos y sin compartimentos ocultos.",
  },
  pared_derecha: {
    diagrama: "/guias/internos/pared_derecha.webp",
    puntosClave: [
      "Verificar integridad completa de la pared derecha",
      "Revisar por espacios ocultos detrás de paneles",
      "Comprobar uniformidad y estado del material",
      "Inspeccionar por signos de acceso no autorizado",
    ],
    recomendaciones: [
      "Fotografiar toda la pared derecha",
      "Verificar con golpes suaves por áreas huecas",
      "Revisar estado de paneles y revestimientos",
      "Documentar cualquier modificación visible",
    ],
    descripcion: "La pared derecha debe estar completamente sellada sin compartimentos ocultos o modificaciones estructurales.",
  },
  piso_interior: {
    diagrama: "/guias/internos/piso_interior.webp",
    puntosClave: [
      "Verificar que el piso esté sin modificaciones",
      "Revisar por compartimentos ocultos bajo el piso",
      "Comprobar integridad de tablones o superficie",
      "Inspeccionar por áreas sospechosas o recién reparadas",
    ],
    recomendaciones: [
      "Fotografiar toda la superficie del piso",
      "Verificar sonido al caminar (áreas huecas)",
      "Revisar conexiones con paredes",
      "Documentar estado y limpieza del piso",
    ],
    descripcion: "El piso interior debe estar completamente sellado sin compartimentos ocultos o modificaciones que permitan esconder contrabando.",
  },
  techo_interno: {
    diagrama: "/guias/internos/techo_interno.webp",
    puntosClave: [
      "Verificar integridad del techo sin cortes o modificaciones",
      "Revisar por compartimentos ocultos en la estructura",
      "Comprobar estado de paneles y revestimientos",
      "Inspeccionar por signos de acceso no autorizado",
    ],
    recomendaciones: [
      "Fotografiar toda la superficie del techo interno",
      "Utilizar iluminación adecuada para inspección",
      "Verificar áreas de difícil acceso",
      "Documentar estado de aislamiento y paneles",
    ],
    descripcion: "El techo interno debe estar intacto sin modificaciones o compartimentos ocultos que permitan acceso no autorizado.",
  },
  puerta_ext_int: {
    diagrama: "/guias/internos/puerta_ext_int.webp",
    puntosClave: [
      "Verificar interior de puertas sin compartimentos ocultos",
      "Revisar mecanismos de cierre y bisagras",
      "Comprobar que no haya doble pared en puertas",
      "Inspeccionar sellos y gomas de cierre",
    ],
    recomendaciones: [
      "Fotografiar interior completo de ambas puertas",
      "Verificar grosor y peso de las puertas",
      "Revisar funcionamiento de cerraduras",
      "Documentar estado de bisagras y mecanismos",
    ],
    descripcion: "Las puertas deben estar libres de compartimentos ocultos con todos los mecanismos de cierre funcionando correctamente.",
  },
};

export function guiaDe(clave: string): GuiaPunto | undefined {
  return GUIAS[clave];
}

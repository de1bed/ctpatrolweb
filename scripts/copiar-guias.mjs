import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const ORIGEN = "C:/Users/david/Downloads/ctpatrol mobile/019a1a35-3add-75c6-943d-f72c614b1d78 (3)/019a1a35-3add-75c6-943d-f72c614b1d78/mobile/assets/images";
const DESTINO = "C:/Users/david/Projects/ctpatrol/public/guias";

const TRACTOR = ["defensa","llantas_rines","caja_bateria","puertas","compartimiento_herramienta","mecanismos_cerrado","tanque_aire","tanque_combustible","cabina","rompevientos_techo","motor","quinta_rueda_chasis","mofle","luces","mangueras_frenos","polveras"];
const EXTERIOR = ["pared_frontal_ext","pared_frontal_int","paredes_laterales","piso","techo_externo","puertas_ext_int","chasis","cubierta_ventilador","compartimiento_quinta_rueda","parachoques_trasero","manijas_varillas_seguros","soportes","remaches","llanta_refaccion","luces_laterales_chasis","direccionales_frenos_chasis","llantas","polveras_remolque","placas"];
const INTERNOS = ["pared_frontal","pared_izquierda","pared_derecha","piso_interior","techo_interno","puerta_ext_int"];

const GRUPOS = [
  { grupo: "tractor",  carpeta: "tractor",   claves: TRACTOR,  desfase: 0  },
  { grupo: "exterior", carpeta: "container", claves: EXTERIOR, desfase: 1  },
  { grupo: "internos", carpeta: "internal",  claves: INTERNOS, desfase: 22 },
];

let originalTotal = 0, finalTotal = 0, n = 0;

for (const { grupo, carpeta, claves, desfase } of GRUPOS) {
  await mkdir(join(DESTINO, grupo), { recursive: true });
  for (let i = 0; i < claves.length; i++) {
    const origen = join(ORIGEN, carpeta, `${i + 1 + desfase}.png`);
    const destino = join(DESTINO, grupo, `${claves[i]}.webp`);
    const { size } = await stat(origen);
    originalTotal += size;
    // Los diagramas son de colores planos: webp los comprime muchísimo sin
    // que se note. Se limita el ancho a 1200px, más de eso no aporta detalle.
    const buf = await sharp(origen)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
    await writeFile(destino, buf);
    finalTotal += buf.length;
    n++;
  }
  console.log(`✓ ${grupo}: ${claves.length} diagramas`);
}

const mb = (b) => (b / 1048576).toFixed(1);
console.log(`\n${n} imágenes · ${mb(originalTotal)} MB → ${mb(finalTotal)} MB (${Math.round((1 - finalTotal / originalTotal) * 100)}% menos)`);

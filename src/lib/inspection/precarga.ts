/**
 * Precarga que escribe el admin y lee el inspector.
 *
 * Las fases no miran `customer_name` ni `tractor_number`: leen
 * `inspections.data[claveDeFase]`. Si las claves no coinciden con las de
 * `FaseCliente` / `FaseTractor` / `FaseConductor` / `FaseTipoTransporte`,
 * el inspector abre la pantalla y la ve vacía aunque el folio ya tenga nombre.
 */

export type DatosPrecarga = {
  clienteId?: string | null;
  clienteNombre?: string;
  tractorId?: string | null;
  tractorNumero?: string;
  tractorPlacas?: string;
  conductorId?: string | null;
  conductorNombre?: string;
  conductorLicencia?: string;
  tipoTransporte?: string | null;
};

export function armarPrecarga(d: DatosPrecarga): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (d.clienteId || d.clienteNombre) {
    data.cliente = {
      clienteId: d.clienteId ?? null,
      clienteNombre: d.clienteNombre ?? "",
    };
  }

  if (d.tractorId || d.tractorNumero) {
    data.tractor = {
      tractorId: d.tractorId ?? null,
      numero: d.tractorNumero ?? "",
      placas: d.tractorPlacas ?? "",
    };
  }

  if (d.conductorId || d.conductorNombre) {
    data.conductor = {
      conductorId: d.conductorId ?? null,
      nombre: d.conductorNombre ?? "",
      licencia: d.conductorLicencia ?? "",
      adicionales: [],
    };
  }

  if (d.tipoTransporte) {
    data["tipo-transporte"] = { tipo: d.tipoTransporte, esFull: false };
  }

  return data;
}

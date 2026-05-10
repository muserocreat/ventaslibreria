import {
  getCombosAction,
  getPromocionesAction,
  getProductosCatalogoAction,
} from "@/lib/combosActions";
import { CombosClient } from "./combos-client";

export const dynamic = "force-dynamic";

export default async function CombosPage() {
  const [combos, promociones, productos] = await Promise.all([
    getCombosAction(),
    getPromocionesAction(),
    getProductosCatalogoAction(),
  ]);

  return <CombosClient initialCombos={combos} initialPromociones={promociones} initialProductos={productos} />;
}

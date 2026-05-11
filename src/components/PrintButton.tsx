"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg"
    >
      <Printer className="w-4 h-4" />
      Imprimir / Guardar PDF
    </button>
  );
}

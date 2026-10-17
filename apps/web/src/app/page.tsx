"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Protegida, { Cargando } from "@/components/protegida";

// La app es de uso interno: la portada lleva directo a Nueva visita
// (o al login si no hay sesión).
function IrANuevaVisita() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/nueva-visita");
  }, [router]);
  return <Cargando />;
}

export default function Home() {
  return (
    <Protegida>
      <IrANuevaVisita />
    </Protegida>
  );
}

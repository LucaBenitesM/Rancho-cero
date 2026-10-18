import Footer from "@/components/footer";
import Header from "@/components/header";

// Layout de la fundación Cireneos (programa Rancho Cero): lleva el header y el
// footer de la marca. El portal relevAI (rutas fuera de este grupo) no los usa.
// El grupo (cireneos) no cambia las URLs: /ranking sigue siendo /ranking.
export default function CireneosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </>
  );
}

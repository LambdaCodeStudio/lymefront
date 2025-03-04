import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

const ScrollToTop = (): JSX.Element => {
  const [isVisible, setIsVisible] = React.useState(false);

  // Función para controlar la visibilidad del botón según la posición de scroll
  const toggleVisibility = () => {
    // Mostrar el botón cuando se ha desplazado más de 300px
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Función para desplazarse suavemente hacia arriba
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  React.useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    
    // Limpiar el event listener cuando el componente se desmonte
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
      }`}
    >
      <Button 
        variant="secondary" 
        size="icon" 
        onClick={scrollToTop}
        className="rounded-full shadow-md hover:shadow-lg bg-[#00888A] hover:bg-[#50C3AD] text-white h-12 w-12"
        aria-label="Volver arriba"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
};

export { ScrollToTop };
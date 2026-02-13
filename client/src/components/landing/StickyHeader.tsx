import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function StickyHeader() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Mostra o header após rolar 400px
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToOffer = () => {
    const offerSection = document.getElementById('oferta');
    offerSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="bg-[#0a1628]/95 backdrop-blur-lg border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo + Título */}
          <div className="flex items-center gap-3">
            <img 
              src="/logo.webp" 
              alt="Logo Mentoria Mário Machado" 
              className="w-10 h-10 rounded-lg"
            />
            <div className="hidden sm:block">
              <h3 className="text-sm font-bold text-white leading-tight">
                Plataforma Mentoria
              </h3>
              <p className="text-xs text-gray-400">Mário Machado</p>
            </div>
          </div>

          {/* Preço + CTA */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-gray-500 line-through">R$ 397</span>
              <span className="text-xl font-bold text-[#9aff00]">R$ 97</span>
            </div>
            
            <Button
              onClick={scrollToOffer}
              className="h-10 px-6 text-sm font-bold bg-[#9aff00] text-[#0a1628] hover:bg-[#88e600] hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(154,255,0,0.3)] rounded-full group"
            >
              GARANTIR VAGA
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

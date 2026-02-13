import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, MessageSquareQuote } from "lucide-react";

const testimonials = [
  { src: "/testimonials/depoimento-1.webp", alt: "Depoimento de aluno sobre a plataforma" },
  { src: "/testimonials/depoimento-2.webp", alt: "Depoimento de aluno sobre a plataforma" },
  { src: "/testimonials/depoimento-3.webp", alt: "Depoimento de aluno sobre a plataforma" },
  { src: "/testimonials/depoimento-4.webp", alt: "Depoimento de aluno sobre a plataforma" },
];

export default function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  // Autoplay infinito
  useEffect(() => {
    if (isPaused || fullscreen !== null) return;
    intervalRef.current = setInterval(next, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [next, isPaused, fullscreen]);

  // Navegação fullscreen com teclado
  useEffect(() => {
    if (fullscreen === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(null);
      if (e.key === "ArrowRight") setFullscreen((prev) => prev !== null ? (prev + 1) % testimonials.length : null);
      if (e.key === "ArrowLeft") setFullscreen((prev) => prev !== null ? (prev - 1 + testimonials.length) % testimonials.length : null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [fullscreen]);

  return (
    <>
      <section className="relative z-10 py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d1b2e] to-[#0a1628]" />
        
        <div className="container mx-auto max-w-5xl relative">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#9aff00]/10 border border-[#9aff00]/30 text-[#9aff00] font-bold text-sm mb-6 uppercase tracking-wider">
              <MessageSquareQuote className="w-4 h-4" />
              Prova Social
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
              O que nossos alunos <span className="text-[#9aff00]">estão dizendo</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Veja os feedbacks reais de quem já está usando a plataforma
            </p>
          </div>

          {/* Carrossel */}
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Container do slide */}
            <div className="relative overflow-hidden rounded-2xl bg-[#112240]/50 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.4)]">
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
              >
                {testimonials.map((t, i) => (
                  <div
                    key={i}
                    className="w-full flex-shrink-0 flex items-center justify-center p-6 md:p-10 cursor-pointer"
                    onClick={() => setFullscreen(i)}
                  >
                    <img
                      src={t.src}
                      alt={t.alt}
                      className="max-h-[400px] w-auto rounded-xl shadow-lg hover:scale-[1.02] transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>

              {/* Seta esquerda */}
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-[#9aff00]/20 hover:border-[#9aff00]/50 transition-all z-10"
                aria-label="Depoimento anterior"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              {/* Seta direita */}
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-[#9aff00]/20 hover:border-[#9aff00]/50 transition-all z-10"
                aria-label="Próximo depoimento"
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            {/* Indicadores (dots) */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-8 bg-[#9aff00]"
                      : "w-2.5 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Ir para depoimento ${i + 1}`}
                />
              ))}
            </div>

            {/* Dica de clique */}
            <p className="text-center text-gray-500 text-xs mt-3">
              Clique na imagem para ampliar
            </p>
          </div>
        </div>
      </section>

      {/* Modal Fullscreen */}
      {fullscreen !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setFullscreen(null)}
        >
          {/* Botão fechar */}
          <button
            onClick={() => setFullscreen(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-red-500/30 hover:border-red-500/50 transition-all z-10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Seta esquerda fullscreen */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen((prev) => prev !== null ? (prev - 1 + testimonials.length) % testimonials.length : null);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-[#9aff00]/20 hover:border-[#9aff00]/50 transition-all z-10"
            aria-label="Depoimento anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Imagem fullscreen */}
          <img
            src={testimonials[fullscreen].src}
            alt={testimonials[fullscreen].alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Seta direita fullscreen */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen((prev) => prev !== null ? (prev + 1) % testimonials.length : null);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-[#9aff00]/20 hover:border-[#9aff00]/50 transition-all z-10"
            aria-label="Próximo depoimento"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Indicadores fullscreen */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setFullscreen(i); }}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === fullscreen
                    ? "w-8 bg-[#9aff00]"
                    : "w-2.5 bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Ir para depoimento ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

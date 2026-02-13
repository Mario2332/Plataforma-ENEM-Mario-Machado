import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';

const CRONOMETRO_STORAGE_KEY = "aluno_cronometro_estado_global";

interface TimerState {
  ativo: boolean;
  tempoDecorrido: number;
  tempoMeta: number | null;
  modoFoco: boolean;
  minimizado: boolean;
  visivel: boolean; // Se o timer deve aparecer na tela (flutuante)
}

interface TimerContextType {
  ativo: boolean;
  tempoDecorrido: number;
  tempoMeta: number | null;
  modoFoco: boolean;
  minimizado: boolean;
  visivel: boolean;
  iniciar: () => void;
  pausar: () => void;
  parar: () => void; // Reseta e esconde
  definirMeta: (segundos: number | null) => void;
  alternarModoFoco: () => void;
  alternarMinimizado: () => void;
  mostrarTimer: () => void;
  esconderTimer: () => void;
  formatarTempo: (segundos: number) => string;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [ativo, setAtivo] = useState(false);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [tempoMeta, setTempoMeta] = useState<number | null>(null);
  const [modoFoco, setModoFoco] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [visivel, setVisivel] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tempoInicioRef = useRef<number | null>(null);
  const tempoAcumuladoRef = useRef<number>(0);
  const originalTitleRef = useRef<string>(document.title);

  // Carregar estado inicial
  useEffect(() => {
    const estadoSalvo = localStorage.getItem(CRONOMETRO_STORAGE_KEY);
    if (estadoSalvo) {
      try {
        const estado = JSON.parse(estadoSalvo);
        setTempoMeta(estado.tempoMeta);
        setModoFoco(estado.modoFoco);
        setMinimizado(estado.minimizado);
        
        // Só torna visível se não estiver em rotas públicas
        const rotasPublicas = ['/', '/login', '/cadastro'];
        const estaEmRotaPublica = rotasPublicas.some(rota => window.location.pathname.startsWith(rota));
        setVisivel(estaEmRotaPublica ? false : estado.visivel);
        
        tempoInicioRef.current = estado.tempoInicio;
        tempoAcumuladoRef.current = estado.tempoAcumulado;

        if (estado.ativo && estado.tempoInicio) {
          // Recalcular tempo decorrido se estava ativo
          const agora = Date.now();
          const decorrido = Math.floor((agora - estado.tempoInicio) / 1000) + estado.tempoAcumulado;
          setTempoDecorrido(decorrido);
          setAtivo(true);
        } else {
          setTempoDecorrido(estado.tempoAcumulado);
          setAtivo(false);
        }
      } catch (error) {
        console.error("Erro ao carregar timer:", error);
      }
    }
    originalTitleRef.current = document.title;
  }, []);

  // Salvar estado
  useEffect(() => {
    const estado = {
      ativo,
      tempoInicio: tempoInicioRef.current,
      tempoAcumulado: tempoAcumuladoRef.current,
      tempoMeta,
      modoFoco,
      minimizado,
      visivel
    };
    localStorage.setItem(CRONOMETRO_STORAGE_KEY, JSON.stringify(estado));
  }, [ativo, tempoDecorrido, tempoMeta, modoFoco, minimizado, visivel]);

  // Loop do cronômetro
  useEffect(() => {
    if (ativo) {
      intervalRef.current = setInterval(() => {
        if (tempoInicioRef.current) {
          const agora = Date.now();
          const atual = Math.floor((agora - tempoInicioRef.current) / 1000) + tempoAcumuladoRef.current;
          setTempoDecorrido(atual);

          // Verificar meta
          if (tempoMeta && atual >= tempoMeta) {
            pausar();
            toast.success("⏰ Tempo de estudos concluído! Parabéns!", { duration: 5000 });
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => {});
            } catch {}
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [ativo, tempoMeta]);

  // Atualizar Título da Aba
  useEffect(() => {
    // Só atualiza o título se o timer estiver visível (usuário autenticado e usando)
    if (visivel && ativo && tempoDecorrido > 0) {
      const tempoFormatado = formatarTempo(tempoDecorrido);
      document.title = `▶ ${tempoFormatado} - Focando...`;
    } else if (visivel && !ativo && tempoDecorrido > 0) {
      const tempoFormatado = formatarTempo(tempoDecorrido);
      document.title = `⏸ ${tempoFormatado} - Pausado`;
    } else {
      document.title = "Plataforma Mentoria Mário Machado";
    }

    return () => {
      // Ao desmontar, volta ao original (opcional, mas bom pra limpeza)
      // document.title = "Plataforma Mentoria Mário Machado";
    };
  }, [ativo, tempoDecorrido, visivel]);

  const iniciar = () => {
    if (!ativo) {
      tempoInicioRef.current = Date.now();
      setAtivo(true);
      setVisivel(true);
      setMinimizado(true); // Começa minimizado se iniciado de outra tela, ou normal. Vamos deixar normal por padrão ou minimizado? 
      // Melhor: Se iniciar, garante que está visível.
    }
  };

  const pausar = () => {
    if (ativo) {
      setAtivo(false);
      tempoAcumuladoRef.current = tempoDecorrido;
      tempoInicioRef.current = null;
    }
  };

  const parar = () => {
    setAtivo(false);
    setTempoDecorrido(0);
    tempoInicioRef.current = null;
    tempoAcumuladoRef.current = 0;
    setVisivel(false); // Esconde o timer flutuante ao finalizar
    document.title = "Plataforma Mentoria Mário Machado";
    // Limpar localStorage imediatamente para evitar restauração do estado
    localStorage.removeItem(CRONOMETRO_STORAGE_KEY);
  };

  const definirMeta = (segundos: number | null) => {
    setTempoMeta(segundos);
  };

  const alternarModoFoco = () => {
    setModoFoco(!modoFoco);
  };

  const alternarMinimizado = () => {
    setMinimizado(!minimizado);
  };

  const mostrarTimer = () => setVisivel(true);
  const esconderTimer = () => setVisivel(false);

  const formatarTempo = (segundos: number) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <TimerContext.Provider value={{
      ativo,
      tempoDecorrido,
      tempoMeta,
      modoFoco,
      minimizado,
      visivel,
      iniciar,
      pausar,
      parar,
      definirMeta,
      alternarModoFoco,
      alternarMinimizado,
      mostrarTimer,
      esconderTimer,
      formatarTempo
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

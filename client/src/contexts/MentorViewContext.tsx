/**
 * Contexto para visualização do mentor
 * 
 * Este contexto permite que os componentes do aluno detectem
 * quando estão sendo visualizados pelo mentor e usem o ID
 * do aluno correto para acessar os dados.
 */

import { createContext, useContext, ReactNode } from "react";
import { auth } from "@/lib/firebase";

interface MentorViewContextType {
  alunoId: string | null;
  isMentorView: boolean;
}

const MentorViewContext = createContext<MentorViewContextType>({
  alunoId: null,
  isMentorView: false,
});

interface MentorViewProviderProps {
  children: ReactNode;
  alunoId?: string | null;
  isMentorView?: boolean;
}

export function MentorViewProvider({ 
  children, 
  alunoId = null, 
  isMentorView = false 
}: MentorViewProviderProps) {
  return (
    <MentorViewContext.Provider value={{ alunoId, isMentorView }}>
      {children}
    </MentorViewContext.Provider>
  );
}

export function useMentorViewContext() {
  return useContext(MentorViewContext);
}

/**
 * Hook para obter o ID do usuário efetivo
 * 
 * Quando o mentor está visualizando a área de um aluno,
 * retorna o ID do aluno sendo visualizado.
 * Caso contrário, retorna o ID do usuário logado.
 */
export function useEffectiveUserId(): string | null {
  const { alunoId, isMentorView } = useMentorViewContext();
  
  // Se estiver na visualização do mentor, usar o ID do aluno
  if (isMentorView && alunoId) {
    return alunoId;
  }
  
  // Caso contrário, usar o ID do usuário logado
  return auth.currentUser?.uid || null;
}

/**
 * Hook para verificar se está na visualização do mentor
 */
export function useIsMentorView(): boolean {
  const { isMentorView } = useMentorViewContext();
  return isMentorView;
}

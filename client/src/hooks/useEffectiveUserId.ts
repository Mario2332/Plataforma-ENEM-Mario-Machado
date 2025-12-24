/**
 * Hook para obter o ID do usuário efetivo
 * 
 * Quando o mentor está visualizando a área de um aluno,
 * retorna o ID do aluno sendo visualizado.
 * Caso contrário, retorna o ID do usuário logado.
 */

import { useMentorView } from "@/pages/mentor/MentorViewAluno";
import { auth } from "@/lib/firebase";

export function useEffectiveUserId(): string | null {
  const mentorView = useMentorView();
  
  // Se estiver na visualização do mentor, usar o ID do aluno
  if (mentorView?.isMentorView && mentorView?.alunoId) {
    return mentorView.alunoId;
  }
  
  // Caso contrário, usar o ID do usuário logado
  return auth.currentUser?.uid || null;
}

/**
 * Função para obter o ID do usuário efetivo (versão não-hook)
 * Útil para funções que não podem usar hooks
 */
export function getEffectiveUserId(mentorViewAlunoId?: string | null): string | null {
  // Se foi passado um ID de aluno do mentor view, usar ele
  if (mentorViewAlunoId) {
    return mentorViewAlunoId;
  }
  
  // Caso contrário, usar o ID do usuário logado
  return auth.currentUser?.uid || null;
}

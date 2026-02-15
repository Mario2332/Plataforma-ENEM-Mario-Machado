/**
 * Data Service - Camada de Abstração de Dados Multi-Tenant
 * 
 * Este módulo fornece funções utilitárias para resolver caminhos do Firestore
 * com base no contexto do usuário (Legacy ou Multi-Tenant).
 * 
 * Se mentoriaId for fornecido, os dados são acessados em:
 * mentorias/{mentoriaId}/{collectionName}
 * 
 * Se mentoriaId for undefined/null, os dados são acessados na raiz (Legacy):
 * {collectionName}
 */

/**
 * Retorna o caminho base de uma coleção, considerando o modo multi-tenant.
 * @param collectionName Nome da coleção (ex: 'alunos', 'mentores')
 * @param mentoriaId ID da mentoria (opcional)
 */
export function getCollectionPath(collectionName: string, mentoriaId?: string | null): string {
  if (!mentoriaId) {
    return collectionName;
  }
  return `mentorias/${mentoriaId}/${collectionName}`;
}

/**
 * Retorna o caminho de uma subcoleção de um aluno.
 * @param alunoId ID do aluno
 * @param subcollection Nome da subcoleção (ex: 'estudos', 'simulados')
 * @param mentoriaId ID da mentoria (opcional)
 */
export function getAlunoSubcollectionPath(alunoId: string, subcollection: string, mentoriaId?: string | null): string {
  const basePath = getCollectionPath('alunos', mentoriaId);
  return `${basePath}/${alunoId}/${subcollection}`;
}

/**
 * Retorna o caminho de uma subcoleção de um mentor.
 * @param mentorId ID do mentor
 * @param subcollection Nome da subcoleção
 * @param mentoriaId ID da mentoria (opcional)
 */
export function getMentorSubcollectionPath(mentorId: string, subcollection: string, mentoriaId?: string | null): string {
  const basePath = getCollectionPath('mentores', mentoriaId);
  return `${basePath}/${mentorId}/${subcollection}`;
}

/**
 * Retorna o caminho para a coleção de ranking.
 * @param mentoriaId ID da mentoria (opcional)
 */
export function getRankingPath(mentoriaId?: string | null): string {
  return getCollectionPath('ranking', mentoriaId);
}

/**
 * Retorna o caminho para a coleção de conteúdos customizados.
 * @param mentoriaId ID da mentoria (opcional)
 */
export function getConteudosCustomizadosPath(mentoriaId?: string | null): string {
  return getCollectionPath('conteudos_customizados', mentoriaId);
}

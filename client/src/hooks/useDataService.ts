import { useAuthContext } from './useAuth';
import { 
  getCollectionPath, 
  getAlunoSubcollectionPath, 
  getMentorSubcollectionPath,
  getRankingPath,
  getConteudosCustomizadosPath
} from '../lib/data-service';
import { collection, doc, CollectionReference, DocumentReference } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Hook para acessar o serviço de dados com contexto do usuário logado.
 * Resolve automaticamente os caminhos do Firestore (Legacy ou Multi-Tenant).
 */
export function useDataService() {
  const { userData } = useAuthContext();
  const mentoriaId = userData?.mentoriaId;

  return {
    // Coleções Principais
    alunosCollection: (): CollectionReference => 
      collection(db, getCollectionPath('alunos', mentoriaId)),
    
    mentoresCollection: (): CollectionReference => 
      collection(db, getCollectionPath('mentores', mentoriaId)),
    
    rankingCollection: (): CollectionReference => 
      collection(db, getRankingPath(mentoriaId)),
    
    conteudosCustomizadosCollection: (): CollectionReference => 
      collection(db, getConteudosCustomizadosPath(mentoriaId)),

    // Documentos Específicos
    alunoDoc: (alunoId: string): DocumentReference => 
      doc(db, getCollectionPath('alunos', mentoriaId), alunoId),
    
    mentorDoc: (mentorId: string): DocumentReference => 
      doc(db, getCollectionPath('mentores', mentoriaId), mentorId),

    // Subcoleções de Aluno
    alunoSubcollection: (alunoId: string, subcollection: string): CollectionReference => 
      collection(db, getAlunoSubcollectionPath(alunoId, subcollection, mentoriaId)),
    
    alunoSubdoc: (alunoId: string, subcollection: string, docId: string): DocumentReference => 
      doc(db, getAlunoSubcollectionPath(alunoId, subcollection, mentoriaId), docId),

    // Subcoleções de Mentor
    mentorSubcollection: (mentorId: string, subcollection: string): CollectionReference => 
      collection(db, getMentorSubcollectionPath(mentorId, subcollection, mentoriaId)),
    
    mentorSubdoc: (mentorId: string, subcollection: string, docId: string): DocumentReference => 
      doc(db, getMentorSubcollectionPath(mentorId, subcollection, mentoriaId), docId),

    // Utilitários de Caminho (para uso direto se necessário)
    paths: {
      alunos: getCollectionPath('alunos', mentoriaId),
      mentores: getCollectionPath('mentores', mentoriaId),
      ranking: getRankingPath(mentoriaId),
      conteudosCustomizados: getConteudosCustomizadosPath(mentoriaId),
      getAlunoSubcollection: (alunoId: string, sub: string) => getAlunoSubcollectionPath(alunoId, sub, mentoriaId),
      getMentorSubcollection: (mentorId: string, sub: string) => getMentorSubcollectionPath(mentorId, sub, mentoriaId),
    },
    
    // Contexto atual
    mentoriaId,
    isMultiTenant: !!mentoriaId
  };
}

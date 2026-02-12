import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getAuthContext, requireRole } from "../utils/auth";

const db = admin.firestore();

/**
 * Obter dados do mentor logado
 */
const getMe = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const mentorDoc = await db.collection("mentores").doc(auth.uid).get();

    if (!mentorDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Mentor não encontrado");
    }

    return { id: mentorDoc.id, ...mentorDoc.data() };
  });

/**
 * Listar alunos do mentor
 */
const getAlunos = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    // Filtrar alunos do mentor:
    // 1. mentorId == auth.uid (alunos específicos do mentor)
    // 2. mentorId == "todos" (alunos compartilhados com todos os mentores)
    // 3. mentorId == "avulso" (alunos avulsos - NÃO aparecem para mentores)
    
    const [alunosEspecificos, alunosCompartilhados] = await Promise.all([
      db.collection("alunos").where("mentorId", "==", auth.uid).get(),
      db.collection("alunos").where("mentorId", "==", "todos").get(),
    ]);
    
    // Combinar os dois resultados
    const alunosDocs = [...alunosEspecificos.docs, ...alunosCompartilhados.docs];
    
    functions.logger.info(`[getAlunos] Mentor ${auth.uid}: ${alunosEspecificos.docs.length} específicos + ${alunosCompartilhados.docs.length} compartilhados = ${alunosDocs.length} total`);
    
    const alunosSnapshot = { docs: alunosDocs };

    // Calcular dias de inatividade para cada aluno
    const alunosComInatividade = await Promise.all(
      alunosSnapshot.docs.map(async (doc) => {
        const alunoData = doc.data();
        const alunoId = doc.id;
        
        let ultimaAtividade: Date | null = null;
        
        functions.logger.info(`[getAlunos] Processando aluno ${alunoId}`);
        
        try {
          // Buscar todos os estudos do aluno (sem ordenar para evitar problemas de índice)
          const estudosSnapshot = await db
            .collection("alunos")
            .doc(alunoId)
            .collection("estudos")
            .get();
          
          functions.logger.info(`[getAlunos] Aluno ${alunoId}: ${estudosSnapshot.docs.length} estudos encontrados`);
          
          // Encontrar o estudo mais recente manualmente
          estudosSnapshot.docs.forEach((estDoc) => {
            const estudo = estDoc.data();
            let dataEstudo: Date | null = null;
            
            if (estudo.data) {
              if (estudo.data.toDate) {
                dataEstudo = estudo.data.toDate();
              } else if (estudo.data.seconds) {
                dataEstudo = new Date(estudo.data.seconds * 1000);
              } else if (typeof estudo.data === 'string') {
                dataEstudo = new Date(estudo.data);
              }
            } else if (estudo.createdAt) {
              if (estudo.createdAt.toDate) {
                dataEstudo = estudo.createdAt.toDate();
              } else if (estudo.createdAt.seconds) {
                dataEstudo = new Date(estudo.createdAt.seconds * 1000);
              }
            }
            
            if (dataEstudo && (!ultimaAtividade || dataEstudo > ultimaAtividade)) {
              ultimaAtividade = dataEstudo;
            }
          });
        } catch (e) {
          // Ignorar erros de índice
        }
        
        try {
          // Buscar todos os simulados do aluno
          const simuladosSnapshot = await db
            .collection("alunos")
            .doc(alunoId)
            .collection("simulados")
            .get();
          
          functions.logger.info(`[getAlunos] Aluno ${alunoId}: ${simuladosSnapshot.docs.length} simulados encontrados`);
          
          // Encontrar o simulado mais recente manualmente
          simuladosSnapshot.docs.forEach((simDoc) => {
            const simulado = simDoc.data();
            let dataSimulado: Date | null = null;
            
            if (simulado.data) {
              if (simulado.data.toDate) {
                dataSimulado = simulado.data.toDate();
              } else if (simulado.data.seconds) {
                dataSimulado = new Date(simulado.data.seconds * 1000);
              } else if (typeof simulado.data === 'string') {
                dataSimulado = new Date(simulado.data);
              }
            } else if (simulado.createdAt) {
              if (simulado.createdAt.toDate) {
                dataSimulado = simulado.createdAt.toDate();
              } else if (simulado.createdAt.seconds) {
                dataSimulado = new Date(simulado.createdAt.seconds * 1000);
              }
            }
            
            if (dataSimulado && (!ultimaAtividade || dataSimulado > ultimaAtividade)) {
              ultimaAtividade = dataSimulado;
            }
          });
        } catch (e) {
          // Ignorar erros de índice
        }
        
        // Calcular dias de inatividade
        let diasInatividade = 0;
        const agora = new Date();
        agora.setHours(agora.getHours() - 3); // Ajustar para Brasília
        
        if (ultimaAtividade) {
          const diffTime = agora.getTime() - (ultimaAtividade as Date).getTime();
          diasInatividade = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diasInatividade < 0) diasInatividade = 0;
        } else if (alunoData.createdAt) {
          // Se não tem atividade, calcular desde o cadastro
          let dataCadastro: Date;
          if (alunoData.createdAt.toDate) {
            dataCadastro = alunoData.createdAt.toDate();
          } else if (alunoData.createdAt.seconds) {
            dataCadastro = new Date(alunoData.createdAt.seconds * 1000);
          } else {
            dataCadastro = new Date(alunoData.createdAt);
          }
          const diffTime = agora.getTime() - dataCadastro.getTime();
          diasInatividade = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diasInatividade < 0) diasInatividade = 0;
        }
        
        functions.logger.info(`[getAlunos] Aluno ${alunoId}: diasInatividade=${diasInatividade}, ultimaAtividade=${ultimaAtividade}`);
        
        return {
          id: alunoId,
          ...alunoData,
          diasInatividade,
          ultimaAtividade: ultimaAtividade ? (ultimaAtividade as Date).toISOString() : null,
        };
      })
    );

    return alunosComInatividade;
  });

/**
 * Obter aluno específico
 */
const getAlunoById = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    const alunoDoc = await db.collection("alunos").doc(alunoId).get();

    if (!alunoDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
    }

    // Permitir acesso a qualquer aluno (sem verificação de mentorId)
    return { id: alunoDoc.id, ...alunoDoc.data() };
  });

/**
 * Criar novo aluno
 */
const createAluno = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { email, password, nome, celular, plano } = data;

    if (!email || !password || !nome) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email, senha e nome são obrigatórios"
      );
    }

    try {
      // Criar usuário no Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: nome,
      });

      // Criar documento do usuário
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        name: nome,
        role: "aluno",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSignedIn: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Criar documento do aluno
      await db.collection("alunos").doc(userRecord.uid).set({
        userId: userRecord.uid,
        mentorId: auth.uid,
        nome,
        email,
        celular: celular || null,
        plano: plano || null,
        ativo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, alunoId: userRecord.uid };
    } catch (error: any) {
      functions.logger.error("Erro ao criar aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Atualizar dados do aluno
 */
const updateAluno = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, nome, email, celular, plano, ativo } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      // Verificar se o aluno existe
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      const updates: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (nome !== undefined) updates.nome = nome;
      if (email !== undefined) updates.email = email;
      if (celular !== undefined) updates.celular = celular;
      if (plano !== undefined) updates.plano = plano;
      if (ativo !== undefined) updates.ativo = ativo;

      await db.collection("alunos").doc(alunoId).update(updates);

      // Atualizar email no Firebase Auth se necessário
      if (email !== undefined) {
        await admin.auth().updateUser(alunoId, { email });
      }

      // Atualizar nome no documento users
      if (nome !== undefined) {
        await db.collection("users").doc(alunoId).update({
          name: nome,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Função auxiliar para deletar todas as subcoleções de um documento
 */
async function deleteSubcollections(docRef: admin.firestore.DocumentReference) {
  const subcollections = await docRef.listCollections();
  for (const subcollection of subcollections) {
    const docs = await subcollection.listDocuments();
    for (const doc of docs) {
      await deleteSubcollections(doc); // Recursivo para subcoleções aninhadas
      await doc.delete();
    }
  }
}

/**
 * Deletar aluno - Remove TODOS os dados do aluno da plataforma
 */
const deleteAluno = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      // Verificar se o aluno existe (pode já ter sido parcialmente excluído)
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      
      // Deletar todas as subcoleções do aluno (estudos, simulados, metas, etc.)
      if (alunoDoc.exists) {
        await deleteSubcollections(db.collection("alunos").doc(alunoId));
      }

      // Deletar documento do aluno
      await db.collection("alunos").doc(alunoId).delete();

      // Deletar documento do usuário
      await db.collection("users").doc(alunoId).delete();

      // Deletar registro do ranking
      await db.collection("ranking").doc(alunoId).delete();

      // Deletar usuário do Firebase Auth
      try {
        await admin.auth().deleteUser(alunoId);
      } catch (authError: any) {
        // Ignorar erro se usuário já não existe no Auth
        if (authError.code !== "auth/user-not-found") {
          throw authError;
        }
      }

      functions.logger.info(`Aluno ${alunoId} excluído completamente`);
      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Obter estudos de um aluno
 */
const getAlunoEstudos = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    // Verificar se o aluno existe
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
    }

    const estudosSnapshot = await db
      .collection("alunos")
      .doc(alunoId)
      .collection("estudos")
      .orderBy("data", "desc")
      .get();

    return estudosSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });

/**
 * Obter simulados de um aluno
 */
const getAlunoSimulados = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    // Verificar se o aluno existe
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
    }

    const simuladosSnapshot = await db
      .collection("alunos")
      .doc(alunoId)
      .collection("simulados")
      .orderBy("data", "desc")
      .get();

    return simuladosSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });

/**
 * Obter dashboard completo de um aluno
 */
const getAlunoDashboard = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    // Verificar se o aluno existe
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
    }

    // Buscar estudos
    const estudosSnapshot = await db
      .collection("alunos")
      .doc(alunoId)
      .collection("estudos")
      .get();

    // Buscar simulados
    const simuladosSnapshot = await db
      .collection("alunos")
      .doc(alunoId)
      .collection("simulados")
      .get();

    const estudos = estudosSnapshot.docs.map((doc) => doc.data());
    const simulados = simuladosSnapshot.docs.map((doc) => doc.data());

    // Calcular métricas (similar ao código original)
    const tempoTotal = estudos.reduce((acc, e: any) => acc + (e.tempoMinutos || 0), 0);
    const questoesFeitas = estudos.reduce((acc, e: any) => acc + (e.questoesFeitas || 0), 0);
    const questoesAcertadas = estudos.reduce((acc, e: any) => acc + (e.questoesAcertadas || 0), 0);

    return {
      aluno: { id: alunoDoc.id, ...alunoDoc.data() },
      metricas: {
        tempoTotal,
        questoesFeitas,
        questoesAcertadas,
        totalEstudos: estudos.length,
        totalSimulados: simulados.length,
      },
    };
  });

/**
 * Obter configurações da plataforma do mentor
 */
const getConfig = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const mentorDoc = await db.collection("mentores").doc(auth.uid).get();

    if (!mentorDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Mentor não encontrado");
    }

    const mentorData = mentorDoc.data()!;
    return {
      nomePlataforma: mentorData.nomePlataforma || "",
      logoUrl: mentorData.logoUrl || "",
      corPrincipal: mentorData.corPrincipal || "#3b82f6",
    };
  });

/**
 * Atualizar configurações da plataforma do mentor
 */
const updateConfig = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { nomePlataforma, logoUrl, corPrincipal } = data;

    try {
      const updates: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (nomePlataforma !== undefined) updates.nomePlataforma = nomePlataforma;
      if (logoUrl !== undefined) updates.logoUrl = logoUrl;
      if (corPrincipal !== undefined) updates.corPrincipal = corPrincipal;

      await db.collection("mentores").doc(auth.uid).update(updates);

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar configurações do mentor:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Obter métricas de todos os alunos
 */
const getAlunosMetricas = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    try {
      // Buscar alunos do mentor (específicos + compartilhados)
      const [alunosEspecificos, alunosCompartilhados] = await Promise.all([
        db.collection("alunos").where("mentorId", "==", auth.uid).get(),
        db.collection("alunos").where("mentorId", "==", "todos").get(),
      ]);
      
      const alunosDocs = [...alunosEspecificos.docs, ...alunosCompartilhados.docs];
      const alunosSnapshot = { docs: alunosDocs };
      
      const metricas = await Promise.all(
        alunosSnapshot.docs.map(async (alunoDoc) => {
          const alunoId = alunoDoc.id;
          
          // Buscar estudos
          const estudosSnapshot = await db
            .collection("alunos")
            .doc(alunoId)
            .collection("estudos")
            .get();
          
          const estudos = estudosSnapshot.docs.map((doc) => doc.data());
          
          // Calcular métricas
          const questoesFeitas = estudos.reduce((acc, e: any) => acc + (e.questoesFeitas || 0), 0);
          const questoesAcertadas = estudos.reduce((acc, e: any) => acc + (e.questoesAcertadas || 0), 0);
          const tempoMinutos = estudos.reduce((acc, e: any) => acc + (e.tempoMinutos || 0), 0);
          const horasEstudo = Math.round((tempoMinutos / 60) * 10) / 10;
          const desempenho = questoesFeitas > 0 ? Math.round((questoesAcertadas / questoesFeitas) * 100) : 0;
          
          return {
            alunoId,
            questoesFeitas,
            questoesAcertadas,
            desempenho,
            horasEstudo,
          };
        })
      );
      
      return metricas;
    } catch (error: any) {
      functions.logger.error("Erro ao buscar métricas dos alunos:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Obter evolução do número de alunos ao longo do tempo
 */
const getEvolucaoAlunos = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    try {
      // Buscar alunos do mentor (específicos + compartilhados)
      const [alunosEspecificos, alunosCompartilhados] = await Promise.all([
        db.collection("alunos").where("mentorId", "==", auth.uid).get(),
        db.collection("alunos").where("mentorId", "==", "todos").get(),
      ]);
      
      const alunosDocs = [...alunosEspecificos.docs, ...alunosCompartilhados.docs];
      
      // Ordenar por createdAt manualmente
      alunosDocs.sort((a, b) => {
        const aTime = a.data().createdAt?.toDate?.() || a.data().createdAt?.seconds * 1000 || 0;
        const bTime = b.data().createdAt?.toDate?.() || b.data().createdAt?.seconds * 1000 || 0;
        return aTime - bTime;
      });
      
      const alunosSnapshot = { docs: alunosDocs };
      
      const evolucao: { data: string; total: number }[] = [];
      let contador = 0;
      
      alunosSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        contador++;
        
        let dataFormatada = "Data desconhecida";
        if (data.createdAt) {
          const timestamp = data.createdAt;
          let date: Date;
          
          if (timestamp.toDate) {
            date = timestamp.toDate();
          } else if (timestamp.seconds || timestamp._seconds) {
            const seconds = timestamp.seconds || timestamp._seconds;
            date = new Date(seconds * 1000);
          } else {
            date = new Date(timestamp);
          }
          
          dataFormatada = date.toISOString().split("T")[0];
        }
        
        evolucao.push({
          data: dataFormatada,
          total: contador,
        });
      });
      
      return evolucao;
    } catch (error: any) {
      functions.logger.error("Erro ao buscar evolução de alunos:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Obter dados completos do aluno para visualização pelo mentor
 */
const getAlunoAreaCompleta = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();

      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      // Buscar estudos
      const estudosSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("estudos")
        .orderBy("data", "desc")
        .get();

      // Buscar simulados
      const simuladosSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("simulados")
        .orderBy("data", "desc")
        .get();

      // Buscar diário emocional
      const diarioSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("diario_emocional")
        .orderBy("data", "desc")
        .get();

      // Buscar autodiagnósticos
      const autodiagnosticosSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("autodiagnosticos")
        .orderBy("createdAt", "desc")
        .get();

      return {
        aluno: { id: alunoDoc.id, ...alunoDoc.data() },
        estudos: estudosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        simulados: simuladosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        diarioEmocional: diarioSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        autodiagnosticos: autodiagnosticosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      };
    } catch (error: any) {
      functions.logger.error("Erro ao buscar área completa do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Funções para o mentor gerenciar estudos do aluno
 */
const createAlunoEstudo = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, ...estudoData } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      const estudoRef = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("estudos")
        .add({
          ...estudoData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true, estudoId: estudoRef.id };
    } catch (error: any) {
      functions.logger.error("Erro ao criar estudo do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const updateAlunoEstudo = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, estudoId, ...updates } = data;

    if (!alunoId || !estudoId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e estudo são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("estudos")
        .doc(estudoId)
        .update({
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar estudo do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const deleteAlunoEstudo = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, estudoId } = data;

    if (!alunoId || !estudoId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e estudo são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("estudos")
        .doc(estudoId)
        .delete();

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar estudo do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Funções para o mentor gerenciar simulados do aluno
 */
const createAlunoSimulado = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, ...simuladoData } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      const simuladoRef = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("simulados")
        .add({
          ...simuladoData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true, simuladoId: simuladoRef.id };
    } catch (error: any) {
      functions.logger.error("Erro ao criar simulado do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const updateAlunoSimulado = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, simuladoId, ...updates } = data;

    if (!alunoId || !simuladoId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e simulado são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("simulados")
        .doc(simuladoId)
        .update({
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar simulado do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const deleteAlunoSimulado = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, simuladoId } = data;

    if (!alunoId || !simuladoId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e simulado são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("simulados")
        .doc(simuladoId)
        .delete();

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar simulado do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Obter dados específicos do aluno (estudos, simulados, etc.)
 */
const getAlunoData = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, collection } = data;

    if (!alunoId || !collection) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno e coleção são obrigatórios");
    }

    try {
      const snapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection(collection)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error: any) {
      functions.logger.error(`Erro ao buscar ${collection} do aluno:`, error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

// Placeholder - exportação será feita no final do arquivo

/**
 * Funções para o mentor gerenciar horários do cronograma do aluno
 */
const createAlunoHorario = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, ...horarioData } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      const horarioRef = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("horarios")
        .add({
          ...horarioData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true, horarioId: horarioRef.id };
    } catch (error: any) {
      functions.logger.error("Erro ao criar horário do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const updateAlunoHorario = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, horarioId, ...updates } = data;

    if (!alunoId || !horarioId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e horário são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("horarios")
        .doc(horarioId)
        .update({
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar horário do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const deleteAlunoHorario = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, horarioId } = data;

    if (!alunoId || !horarioId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e horário são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("horarios")
        .doc(horarioId)
        .delete();

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar horário do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Limpar todos os horários do cronograma do aluno (para salvar novos)
 */
const clearAlunoHorarios = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const horariosRef = db
        .collection("alunos")
        .doc(alunoId)
        .collection("horarios");
      
      const snapshot = await horariosRef.get();
      
      if (snapshot.empty) {
        return { success: true, deleted: 0 };
      }
      
      // Deletar em batch para melhor performance
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      return { success: true, deleted: snapshot.size };
    } catch (error: any) {
      functions.logger.error("Erro ao limpar horários do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Funções para o mentor gerenciar templates de cronograma do aluno
 */
const saveAlunoTemplate = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, ...templateData } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      const templateRef = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("templates")
        .add({
          ...templateData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true, templateId: templateRef.id };
    } catch (error: any) {
      functions.logger.error("Erro ao salvar template do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const loadAlunoTemplate = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, templateId } = data;

    if (!alunoId || !templateId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e template são obrigatórios");
    }

    try {
      const templateDoc = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("templates")
        .doc(templateId)
        .get();

      if (!templateDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Template não encontrado");
      }

      return { id: templateDoc.id, ...templateDoc.data() };
    } catch (error: any) {
      functions.logger.error("Erro ao carregar template do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const deleteAlunoTemplate = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, templateId } = data;

    if (!alunoId || !templateId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e template são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("templates")
        .doc(templateId)
        .delete();

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar template do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Funções para o mentor gerenciar diário emocional do aluno
 */
const createAlunoDiarioEmocional = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, ...diarioData } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      const diarioRef = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("diario_emocional")
        .add({
          ...diarioData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true, registroId: diarioRef.id };
    } catch (error: any) {
      functions.logger.error("Erro ao criar registro emocional do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const deleteAlunoDiarioEmocional = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, registroId } = data;

    if (!alunoId || !registroId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e registro são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("diario_emocional")
        .doc(registroId)
        .delete();

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar registro emocional do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Funções para o mentor gerenciar autodiagnósticos do aluno
 */
const createAlunoAutodiagnostico = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, ...autodiagnosticoData } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      const autodiagnosticoRef = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("autodiagnosticos")
        .add({
          ...autodiagnosticoData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true, autodiagnosticoId: autodiagnosticoRef.id };
    } catch (error: any) {
      functions.logger.error("Erro ao criar autodiagnóstico do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const deleteAlunoAutodiagnostico = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, autodiagnosticoId } = data;

    if (!alunoId || !autodiagnosticoId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e autodiagnóstico são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("autodiagnosticos")
        .doc(autodiagnosticoId)
        .delete();

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar autodiagnóstico do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Funções para o mentor gerenciar progresso nos conteúdos ENEM do aluno
 */
const updateAlunoProgresso = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, materia, topico, concluido } = data;

    if (!alunoId || !materia || !topico) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno, matéria e tópico são obrigatórios");
    }

    try {
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      // Buscar ou criar documento de progresso
      const progressoQuery = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("progresso")
        .where("materia", "==", materia)
        .where("topico", "==", topico)
        .limit(1)
        .get();

      if (progressoQuery.empty) {
        // Criar novo registro
        await db
          .collection("alunos")
          .doc(alunoId)
          .collection("progresso")
          .add({
            materia,
            topico,
            concluido: concluido || false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      } else {
        // Atualizar registro existente
        const progressoDoc = progressoQuery.docs[0];
        await progressoDoc.ref.update({
          concluido: concluido || false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar progresso do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Atualizar perfil do aluno
 */
const updateAlunoProfile = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, ...updates } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      await db.collection("alunos").doc(alunoId).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar perfil do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Funções para o mentor gerenciar cronogramas do aluno
 */
const createAlunoCronograma = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, ...cronogramaData } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }

      const cronogramaRef = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("cronogramas")
        .add({
          ...cronogramaData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true, cronogramaId: cronogramaRef.id };
    } catch (error: any) {
      functions.logger.error("Erro ao criar cronograma do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const updateAlunoCronograma = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, cronogramaId, ...updates } = data;

    if (!alunoId || !cronogramaId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e cronograma são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("cronogramas")
        .doc(cronogramaId)
        .update({
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar cronograma do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const deleteAlunoCronograma = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, cronogramaId } = data;

    if (!alunoId || !cronogramaId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e cronograma são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("cronogramas")
        .doc(cronogramaId)
        .delete();

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar cronograma do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Funções para o mentor gerenciar tarefas do cronograma do aluno
 */
const createAlunoTarefa = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, cronogramaId, ...tarefaData } = data;

    if (!alunoId || !cronogramaId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno e cronograma são obrigatórios");
    }

    try {
      const tarefaRef = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("cronogramas")
        .doc(cronogramaId)
        .collection("tarefas")
        .add({
          ...tarefaData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true, tarefaId: tarefaRef.id };
    } catch (error: any) {
      functions.logger.error("Erro ao criar tarefa do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const updateAlunoTarefa = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, cronogramaId, tarefaId, ...updates } = data;

    if (!alunoId || !cronogramaId || !tarefaId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno, cronograma e tarefa são obrigatórios");
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("cronogramas")
        .doc(cronogramaId)
        .collection("tarefas")
        .doc(tarefaId)
        .update({
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar tarefa do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

const deleteAlunoTarefa = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");
    const { alunoId, cronogramaId, tarefaId } = data;
    if (!alunoId || !cronogramaId || !tarefaId) {
      throw new functions.https.HttpsError("invalid-argument", "IDs do aluno, cronograma e tarefa são obrigatórios");
    }
    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("cronogramas")
        .doc(cronogramaId)
        .collection("tarefas")
        .doc(tarefaId)
        .delete();
      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar tarefa do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Criar meta para aluno (mentor)
 */
const createAlunoMeta = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const {
      alunoId,
      tipo,
      nome,
      descricao,
      valorAlvo,
      unidade,
      dataInicio,
      dataFim,
      materia,
      incidencia,
    } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    if (!tipo || !nome || !valorAlvo || !unidade || !dataInicio || !dataFim) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Tipo, nome, valor alvo, unidade, data início e data fim são obrigatórios"
      );
    }

    try {
      // Para metas de sequência, buscar sequência atual do aluno
      let valorAtual = 0;
      
      if (tipo === 'sequencia') {
        const estudosSnapshot = await db
          .collection("alunos")
          .doc(alunoId)
          .collection("estudos")
          .orderBy("data", "desc")
          .get();

        const estudos = estudosSnapshot.docs.map((doc) => doc.data());
        
        // Usar fuso horário de Brasília para extrair datas
        const datasEstudo = [...new Set(estudos.map((e: any) => {
          const data = e.data.toDate();
          return data.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        }))].sort().reverse();

        let streak = 0;
        const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        
        if (datasEstudo.length > 0) {
          let dataAtualStr = hoje;
          
          for (const dataStr of datasEstudo) {
            // Calcular diferença em dias usando strings de data
            const dataAtualDate = new Date(dataAtualStr + 'T12:00:00Z');
            const dataEstudoDate = new Date(dataStr + 'T12:00:00Z');
            const diffDias = Math.round((dataAtualDate.getTime() - dataEstudoDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDias === 0 || diffDias === 1) {
              streak++;
              dataAtualStr = dataStr;
            } else {
              break;
            }
          }
        }
        
        valorAtual = streak;
      }

      // Helper para converter data para fuso de Brasília
      const parseDateBrasilia = (dateString: string): Date => {
        const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
        const [year, month, day] = dateOnly.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 15, 0, 0, 0)); // 15:00 UTC = 12:00 Brasília
      };

      const metaData: any = {
        alunoId,
        tipo,
        nome,
        descricao: descricao || '',
        valorAlvo: Number(valorAlvo),
        valorAtual,
        unidade,
        dataInicio: admin.firestore.Timestamp.fromDate(parseDateBrasilia(dataInicio)),
        dataFim: admin.firestore.Timestamp.fromDate(parseDateBrasilia(dataFim)),
        status: 'ativa',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: auth.uid, // ID do mentor que criou
      };

      if (materia) metaData.materia = materia;
      if (incidencia) metaData.incidencia = incidencia;

      const metaRef = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("metas")
        .add(metaData);

      return { success: true, metaId: metaRef.id };
    } catch (error: any) {
      functions.logger.error("Erro ao criar meta do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Atualizar meta do aluno (mentor)
 */
const updateAlunoMeta = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const {
      alunoId,
      metaId,
      nome,
      descricao,
      valorAlvo,
      dataFim,
      status,
    } = data;

    if (!alunoId || !metaId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "IDs do aluno e da meta são obrigatórios"
      );
    }

    try {
      const updateData: any = {
        updatedAt: admin.firestore.Timestamp.now(),
      };

      if (nome !== undefined) updateData.nome = nome;
      if (descricao !== undefined) updateData.descricao = descricao;
      if (valorAlvo !== undefined) updateData.valorAlvo = Number(valorAlvo);
      if (dataFim !== undefined) {
        updateData.dataFim = admin.firestore.Timestamp.fromDate(new Date(dataFim));
      }
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'concluida') {
          updateData.dataConclusao = admin.firestore.Timestamp.now();
        }
      }

      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("metas")
        .doc(metaId)
        .update(updateData);

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao atualizar meta do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Deletar meta do aluno (mentor)
 */
const deleteAlunoMeta = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId, metaId } = data;

    if (!alunoId || !metaId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "IDs do aluno e da meta são obrigatórios"
      );
    }

    try {
      await db
        .collection("alunos")
        .doc(alunoId)
        .collection("metas")
        .doc(metaId)
        .delete();

      return { success: true };
    } catch (error: any) {
      functions.logger.error("Erro ao deletar meta do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Obter resumo completo de um aluno para o mentor
 */
const getAlunoResumo = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    const auth = await getAuthContext(context);
    requireRole(auth, "mentor");

    const { alunoId } = data;

    if (!alunoId) {
      throw new functions.https.HttpsError("invalid-argument", "ID do aluno é obrigatório");
    }

    try {
      // Buscar dados do aluno
      const alunoDoc = await db.collection("alunos").doc(alunoId).get();
      if (!alunoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Aluno não encontrado");
      }
      const alunoData = alunoDoc.data()!;

      // Buscar estudos
      const estudosSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("estudos")
        .get();
      const estudos = estudosSnapshot.docs.map((doc) => doc.data());

      // Buscar simulados
      const simuladosSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("simulados")
        .get();
      const simulados = simuladosSnapshot.docs.map((doc) => doc.data());

      // Buscar metas
      const metasSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("metas")
        .get();
      const metas = metasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Buscar progresso de conteúdos
      const progressoSnapshot = await db
        .collection("alunos")
        .doc(alunoId)
        .collection("conteudo_progresso")
        .get();
      const progresso = progressoSnapshot.docs.map((doc) => doc.data());

      // Calcular métricas
      const tempoTotal = estudos.reduce((acc, e: any) => acc + (e.tempoMinutos || 0), 0);
      const questoesFeitas = estudos.reduce((acc, e: any) => acc + (e.questoesFeitas || 0), 0);
      const questoesAcertadas = estudos.reduce((acc, e: any) => acc + (e.questoesAcertadas || 0), 0);
      const desempenho = questoesFeitas > 0 ? Math.round((questoesAcertadas / questoesFeitas) * 100) : 0;

      // Calcular streak (sequência de dias de estudo)
      const hoje = new Date();
      hoje.setHours(hoje.getHours() - 3); // Ajustar para Brasília
      const hojeStr = hoje.toISOString().split("T")[0];
      
      const datasEstudo = new Set(
        estudos
          .filter((e: any) => e.data)
          .map((e: any) => {
            const d = typeof e.data === "string" ? e.data : e.data.toDate?.().toISOString().split("T")[0];
            return d?.split("T")[0];
          })
          .filter(Boolean)
      );

      let streak = 0;
      let dataCheck = new Date(hoje);
      
      // Verificar se estudou hoje
      if (datasEstudo.has(hojeStr)) {
        streak = 1;
        dataCheck.setDate(dataCheck.getDate() - 1);
      }
      
      // Contar dias consecutivos anteriores
      while (datasEstudo.has(dataCheck.toISOString().split("T")[0])) {
        streak++;
        dataCheck.setDate(dataCheck.getDate() - 1);
      }

      // Calcular tópicos concluídos
      const topicosTotal = progresso.length;
      const topicosConcluidos = progresso.filter((p: any) => p.status === "concluido").length;

      // Calcular metas ativas e concluídas
      const metasAtivas = metas.filter((m: any) => m.status === "ativa" && !m.metaPaiId).length;
      const metasConcluidas = metas.filter((m: any) => m.status === "concluida" && !m.metaPaiId).length;

      // Calcular média de desempenho nos simulados
      const simuladosComNota = simulados.filter((s: any) => s.nota !== undefined && s.nota !== null);
      const mediaSimulados = simuladosComNota.length > 0
        ? Math.round(simuladosComNota.reduce((acc, s: any) => acc + (s.nota || 0), 0) / simuladosComNota.length)
        : 0;

      // Formatar data de cadastro
      let dataCadastro = null;
      if (alunoData.createdAt) {
        const timestamp = alunoData.createdAt;
        if (timestamp.toDate) {
          dataCadastro = timestamp.toDate().toISOString();
        } else if (timestamp.seconds || timestamp._seconds) {
          const seconds = timestamp.seconds || timestamp._seconds;
          dataCadastro = new Date(seconds * 1000).toISOString();
        } else {
          dataCadastro = new Date(timestamp).toISOString();
        }
      }

      // Calcular dias de inatividade
      let diasInatividade = 0;
      let ultimaAtividade = null;
      
      // Verificar último estudo
      const estudosOrdenados = estudos
        .filter((e: any) => e.data)
        .sort((a: any, b: any) => {
          const dataA = a.data?.toDate?.() || new Date(a.data);
          const dataB = b.data?.toDate?.() || new Date(b.data);
          return dataB.getTime() - dataA.getTime();
        });
      
      if (estudosOrdenados.length > 0) {
        const ultimoEstudo = estudosOrdenados[0];
        ultimaAtividade = ultimoEstudo.data?.toDate?.() || new Date(ultimoEstudo.data);
      }
      
      // Verificar último simulado
      const simuladosOrdenados = simulados
        .filter((s: any) => s.data || s.createdAt)
        .sort((a: any, b: any) => {
          const dataA = a.data?.toDate?.() || a.createdAt?.toDate?.() || new Date(a.data || a.createdAt);
          const dataB = b.data?.toDate?.() || b.createdAt?.toDate?.() || new Date(b.data || b.createdAt);
          return dataB.getTime() - dataA.getTime();
        });
      
      if (simuladosOrdenados.length > 0) {
        const ultimoSimulado = simuladosOrdenados[0];
        const dataSimulado = ultimoSimulado.data?.toDate?.() || ultimoSimulado.createdAt?.toDate?.() || new Date(ultimoSimulado.data || ultimoSimulado.createdAt);
        if (!ultimaAtividade || dataSimulado > ultimaAtividade) {
          ultimaAtividade = dataSimulado;
        }
      }
      
      if (ultimaAtividade) {
        const agora = new Date();
        agora.setHours(agora.getHours() - 3); // Ajustar para Brasília
        const diffTime = agora.getTime() - ultimaAtividade.getTime();
        diasInatividade = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diasInatividade < 0) diasInatividade = 0;
      } else {
        // Se não tem atividade, calcular desde o cadastro
        if (dataCadastro) {
          const agora = new Date();
          agora.setHours(agora.getHours() - 3);
          const diffTime = agora.getTime() - new Date(dataCadastro).getTime();
          diasInatividade = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diasInatividade < 0) diasInatividade = 0;
        }
      }

      // Buscar perfil de estudante do diagnóstico
      let perfilEstudante = alunoData.perfilEstudante || null;
      let perfilEstudanteNome = null;
      
      // Se não tem no documento principal, buscar na subcoleção
      if (!perfilEstudante) {
        try {
          const diagnosticoDoc = await db
            .collection("alunos")
            .doc(alunoId)
            .collection("diagnostico")
            .doc("perfil")
            .get();
          
          if (diagnosticoDoc.exists) {
            const diagnosticoData = diagnosticoDoc.data();
            perfilEstudante = diagnosticoData?.perfilId || null;
          }
        } catch (e) {
          // Ignorar erro se não existir
        }
      }
      
      // Buscar nome do perfil na configuração
      if (perfilEstudante) {
        try {
          const perfisConfigDoc = await db
            .collection("diagnostico_perfil_config")
            .doc("perfis")
            .get();
          
          if (perfisConfigDoc.exists) {
            const perfisConfig = perfisConfigDoc.data();
            if (perfisConfig && perfisConfig[perfilEstudante]) {
              perfilEstudanteNome = perfisConfig[perfilEstudante].nome || perfilEstudante;
            }
          }
        } catch (e) {
          // Usar o ID como fallback
          perfilEstudanteNome = perfilEstudante;
        }
      }

      // Buscar nível e ranking da coleção ranking
      const xp = alunoData.xp || 0;
      let nivel = 1;
      let posicaoRanking = 0;
      let totalAlunosNoNivel = 0;
      let pontosSemanais = 0;
      
      try {
        // Buscar dados do ranking do aluno
        const rankingDoc = await db.collection("ranking").doc(alunoId).get();
        
        if (rankingDoc.exists) {
          const rankingData = rankingDoc.data();
          nivel = rankingData?.nivel || 1;
          pontosSemanais = rankingData?.pontosSemanais || 0;
          
          // Buscar todos os alunos do mesmo nível para calcular posição
          const rankingSnapshot = await db.collection("ranking").get();
          const alunosDoNivel = rankingSnapshot.docs
            .filter((doc) => doc.data().nivel === nivel)
            .map((doc) => ({
              id: doc.id,
              pontosSemanais: doc.data().pontosSemanais || 0,
            }))
            .sort((a, b) => b.pontosSemanais - a.pontosSemanais);
          
          totalAlunosNoNivel = alunosDoNivel.length;
          posicaoRanking = alunosDoNivel.findIndex((a) => a.id === alunoId) + 1;
        }
      } catch (e) {
        functions.logger.error("Erro ao buscar ranking:", e);
      }

      // ===== CRONOGRAMA ANUAL DE CICLOS =====
      let cronogramaAnualAtivo: "extensive" | "intensive" | null = null;
      let cronogramaAnualTopicosConcluidos = 0;
      let cronogramaAnualTopicosTotal = 0;
      
      try {
        // Buscar dados do cronograma anual do aluno
        functions.logger.info("[getAlunoResumo] Buscando cronograma anual para:", alunoId);
        const cronogramaAnualDoc = await db.collection("cronogramas_anuais").doc(alunoId).get();
        
        functions.logger.info("[getAlunoResumo] Cronograma anual existe:", cronogramaAnualDoc.exists);
        
        if (cronogramaAnualDoc.exists) {
          const cronogramaAnualData = cronogramaAnualDoc.data();
          functions.logger.info("[getAlunoResumo] Dados do cronograma anual:", {
            activeSchedule: cronogramaAnualData?.activeSchedule,
            completedTopicsCount: Object.keys(cronogramaAnualData?.completedTopics || {}).length
          });
          
          cronogramaAnualAtivo = cronogramaAnualData?.activeSchedule || "extensive";
          const completedTopics = cronogramaAnualData?.completedTopics || {};
          
          // Contar tópicos concluídos
          cronogramaAnualTopicosConcluidos = Object.values(completedTopics).filter((v) => v === true).length;
          
          // Total de tópicos baseado no tipo de cronograma ativo
          // Extensivo: 453 tópicos, Intensivo: 383 tópicos
          cronogramaAnualTopicosTotal = cronogramaAnualAtivo === "intensive" ? 383 : 453;
        } else {
          // Se não existe documento, definir como extensivo por padrão
          // Todos os alunos têm cronograma, mesmo que não tenham acessado ainda
          cronogramaAnualAtivo = "extensive";
          cronogramaAnualTopicosTotal = 453;
          functions.logger.info("[getAlunoResumo] Cronograma anual não existe, usando padrão extensivo");
        }
      } catch (e) {
        functions.logger.error("Erro ao buscar cronograma anual:", e);
        // Em caso de erro, ainda definir valores padrão
        cronogramaAnualAtivo = "extensive";
        cronogramaAnualTopicosTotal = 453;
      }

      // ===== CRONOGRAMA DINÂMICO =====
      let cronogramaDinamicoAtivo = false;
      let cronogramaDinamicoTopicosConcluidos = 0;
      let cronogramaDinamicoTopicosTotal = 0;
      let cronogramaDinamicoTipo: "extensivo" | "intensivo" | null = null;
      
      try {
        // Buscar dados do cronograma dinâmico do aluno
        functions.logger.info("[getAlunoResumo] Buscando cronograma dinâmico para:", alunoId);
        const cronogramaDinamicoDoc = await db
          .collection("alunos")
          .doc(alunoId)
          .collection("cronograma")
          .doc("dinamico")
          .get();
        
        functions.logger.info("[getAlunoResumo] Cronograma dinâmico existe:", cronogramaDinamicoDoc.exists);
        
        if (cronogramaDinamicoDoc.exists) {
          const cronogramaDinamicoData = cronogramaDinamicoDoc.data();
          const schedule = cronogramaDinamicoData?.schedule || [];
          
          functions.logger.info("[getAlunoResumo] Dados do cronograma dinâmico:", {
            scheduleLength: schedule.length,
            scheduleType: cronogramaDinamicoData?.scheduleType,
            checkedItemsCount: (cronogramaDinamicoData?.checkedItems || []).length
          });
          
          // Verificar se tem um cronograma criado (schedule não vazio)
          if (schedule.length > 0) {
            cronogramaDinamicoAtivo = true;
            cronogramaDinamicoTipo = cronogramaDinamicoData?.scheduleType || "extensivo";
            
            // Contar total de tópicos no cronograma dinâmico
            // Cada dia tem um array de tasks, cada task é um tópico
            let totalTasks = 0;
            schedule.forEach((day: any) => {
              if (day.tasks && Array.isArray(day.tasks)) {
                totalTasks += day.tasks.length;
              }
            });
            cronogramaDinamicoTopicosTotal = totalTasks;
            
            // Contar tópicos concluídos (checkedItems)
            const checkedItems = cronogramaDinamicoData?.checkedItems || [];
            cronogramaDinamicoTopicosConcluidos = checkedItems.length;
            
            functions.logger.info("[getAlunoResumo] Cronograma dinâmico processado:", {
              ativo: cronogramaDinamicoAtivo,
              tipo: cronogramaDinamicoTipo,
              total: cronogramaDinamicoTopicosTotal,
              concluidos: cronogramaDinamicoTopicosConcluidos
            });
          }
        }
      } catch (e) {
        functions.logger.error("Erro ao buscar cronograma dinâmico:", e);
      }

      return {
        // Dados básicos
        id: alunoDoc.id,
        nome: alunoData.nome || "",
        email: alunoData.email || "",
        celular: alunoData.celular || "",
        plano: alunoData.plano || "",
        ativo: alunoData.ativo !== false,
        dataCadastro,
        perfil: alunoData.perfil || null,
        
        // Perfil de estudante (diagnóstico)
        perfilEstudante,
        perfilEstudanteNome,
        
        // Dias de inatividade
        diasInatividade,
        ultimaAtividade: ultimaAtividade ? ultimaAtividade.toISOString() : null,
        
        // Métricas de estudo
        horasEstudo: Math.round((tempoTotal / 60) * 10) / 10,
        questoesFeitas,
        questoesAcertadas,
        desempenho,
        totalEstudos: estudos.length,
        
        // Simulados
        totalSimulados: simulados.length,
        mediaSimulados,
        
        // Sequência
        streak,
        
        // Progresso
        topicosTotal,
        topicosConcluidos,
        progressoConteudo: topicosTotal > 0 ? Math.round((topicosConcluidos / topicosTotal) * 100) : 0,
        
        // Metas
        metasAtivas,
        metasConcluidas,
        
        // Gamificação
        xp,
        nivel,
        pontosSemanais,
        posicaoRanking: posicaoRanking > 0 ? posicaoRanking : null,
        totalAlunos: totalAlunosNoNivel,
        
        // Cronograma Anual de Ciclos
        cronogramaAnualAtivo,
        cronogramaAnualTopicosConcluidos,
        cronogramaAnualTopicosTotal,
        
        // Cronograma Dinâmico
        cronogramaDinamicoAtivo,
        cronogramaDinamicoTopicosConcluidos,
        cronogramaDinamicoTopicosTotal,
        cronogramaDinamicoTipo,
      };
    } catch (error: any) {
      functions.logger.error("Erro ao buscar resumo do aluno:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

// Exportar todas as funções do mentor
export const mentorFunctions = {
  // Funções básicas do mentor
  getMe,
  getAlunos,
  getAlunoById,
  createAluno,
  updateAluno,
  deleteAluno,
  getAlunoEstudos,
  getAlunoSimulados,
  getAlunoDashboard,
  getConfig,
  updateConfig,
  getAlunosMetricas,
  getEvolucaoAlunos,
  getAlunoAreaCompleta,
  getAlunoData,
  
  // Estudos
  createAlunoEstudo,
  updateAlunoEstudo,
  deleteAlunoEstudo,
  
  // Simulados
  createAlunoSimulado,
  updateAlunoSimulado,
  deleteAlunoSimulado,
  
  // Horários
  createAlunoHorario,
  updateAlunoHorario,
  deleteAlunoHorario,
  clearAlunoHorarios,
  
  // Templates
  saveAlunoTemplate,
  loadAlunoTemplate,
  deleteAlunoTemplate,
  
  // Diário Emocional
  createAlunoDiarioEmocional,
  deleteAlunoDiarioEmocional,
  
  // Autodiagnósticos
  createAlunoAutodiagnostico,
  deleteAlunoAutodiagnostico,
  
  // Progresso
  updateAlunoProgresso,
  
  // Perfil
  updateAlunoProfile,
  
  // Cronogramas
  createAlunoCronograma,
  updateAlunoCronograma,
  deleteAlunoCronograma,
  
  // Tarefas
  createAlunoTarefa,
  updateAlunoTarefa,
  deleteAlunoTarefa,
  
  // Metas
  createAlunoMeta,
  updateAlunoMeta,
  deleteAlunoMeta,
  
  // Resumo
  getAlunoResumo,
};

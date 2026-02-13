import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuthContextV2, requireRole } from "../utils/auth";

const db = getFirestore();

// ==================== TIPOS ====================

interface Tarefa {
  id?: string;
  titulo: string;
  descricao?: string;
  categoria: "questoes" | "videoaula" | "revisao" | "redacao" | "leitura" | "outro";
  prioridade: "alta" | "media" | "baixa";
  mentorId: string;
  alunoId: string;
  dataInicio: Timestamp;
  dataFim: Timestamp;
  recorrencia?: {
    ativa: boolean;
    tipo: "diaria" | "semanal" | "mensal";
    diasSemana?: number[]; // 0-6 (domingo-sábado)
    diaDoMes?: number; // 1-31
  };
  status: "pendente" | "concluida" | "atrasada";
  comentarios: Array<{
    autor: "mentor" | "aluno";
    autorId: string;
    texto: string;
    data: Timestamp;
  }>;
  concluidaEm?: Timestamp;
  criadaEm: Timestamp;
  atualizadaEm: Timestamp;
}

// ==================== CRIAR TAREFA ====================

export const criarTarefa = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const {
      titulo,
      descricao,
      categoria,
      prioridade,
      alunoId,
      dataInicio,
      dataFim,
      recorrencia,
    } = request.data;

    // Validações
    if (!titulo || !categoria || !prioridade || !alunoId || !dataInicio || !dataFim) {
      throw new HttpsError("invalid-argument", "Campos obrigatórios faltando");
    }

    // Verificar se o aluno pertence ao mentor
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
      throw new HttpsError("not-found", "Aluno não encontrado");
    }

    const alunoData = alunoDoc.data();
    if (alunoData?.mentorId !== auth.uid) {
      throw new HttpsError("permission-denied", "Aluno não pertence a este mentor");
    }

    // Verificar se o aluno não está vinculado a "todos" ou "Avulsa - sem mentor"
    if (alunoData?.mentorId === "todos" || alunoData?.mentorId === "avulsa") {
      throw new HttpsError(
        "permission-denied",
        "Não é possível criar tarefas para alunos sem mentor específico"
      );
    }

    const novaTarefa: Tarefa = {
      titulo,
      descricao: descricao || "",
      categoria,
      prioridade,
      mentorId: auth.uid,
      alunoId,
      dataInicio: Timestamp.fromDate(new Date(dataInicio)),
      dataFim: Timestamp.fromDate(new Date(dataFim)),
      recorrencia: recorrencia || { ativa: false, tipo: "diaria" },
      status: "pendente",
      comentarios: [],
      criadaEm: FieldValue.serverTimestamp() as Timestamp,
      atualizadaEm: FieldValue.serverTimestamp() as Timestamp,
    };

    const tarefaRef = await db.collection("tarefas").add(novaTarefa);

    // Criar notificação para o aluno
    await db.collection("notificacoes").add({
      tipo: "nova_tarefa",
      destinatarioId: alunoId,
      tarefaId: tarefaRef.id,
      titulo: "Nova tarefa atribuída",
      mensagem: `Seu mentor adicionou: "${titulo}"`,
      lida: false,
      criadaEm: FieldValue.serverTimestamp(),
    });

    return { id: tarefaRef.id, success: true };
  }
);

// ==================== LISTAR TAREFAS DO ALUNO ====================

// ==================== LISTAR TAREFAS DO ALUNO ====================

export const getTarefasAluno = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "aluno");

    const { filtro } = request.data;

    const alunoDoc = await db.collection("alunos").doc(auth.uid).get();
    if (!alunoDoc.exists) {
      throw new HttpsError("not-found", "Aluno não encontrado");
    }

    const alunoData = alunoDoc.data();
    
    if (
      !alunoData?.mentorId ||
      alunoData.mentorId === "todos" ||
      alunoData.mentorId === "avulsa"
    ) {
      return [];
    }

    const tarefasSnapshot = await db
      .collection("tarefas")
      .where("alunoId", "==", auth.uid)
      .get();

    let tarefas = tarefasSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    const now = new Date();
    if (filtro === "dia") {
      const inicioDia = new Date(now.setHours(0, 0, 0, 0));
      const fimDia = new Date(now.setHours(23, 59, 59, 999));
      tarefas = tarefas.filter((t) => {
        const dataFim = t.dataFim.toDate();
        return dataFim >= inicioDia && dataFim <= fimDia;
      });
    } else if (filtro === "semana") {
      const inicioSemana = new Date(now);
      inicioSemana.setDate(now.getDate() - now.getDay());
      inicioSemana.setHours(0, 0, 0, 0);
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      fimSemana.setHours(23, 59, 59, 999);
      tarefas = tarefas.filter((t) => {
        const dataFim = t.dataFim.toDate();
        return dataFim >= inicioSemana && dataFim <= fimSemana;
      });
    } else if (filtro === "mes") {
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
      const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      tarefas = tarefas.filter((t) => {
        const dataFim = t.dataFim.toDate();
        return dataFim >= inicioMes && dataFim <= fimMes;
      });
    }

    const agora = Timestamp.now();
    for (const tarefa of tarefas) {
      if (tarefa.status === "pendente" && tarefa.dataFim.toMillis() < agora.toMillis()) {
        await db.collection("tarefas").doc(tarefa.id).update({ status: "atrasada" });
        tarefa.status = "atrasada";
      }
    }

    return tarefas;
  }
);

// ==================== LISTAR TAREFAS DOS ALUNOS DO MENTOR ====================

export const getTarefasMentor = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { alunoId, filtro } = request.data;

    let query = db.collection("tarefas").where("mentorId", "==", auth.uid);

    if (alunoId) {
      query = query.where("alunoId", "==", alunoId);
    }

    const tarefasSnapshot = await query.get();

    const tarefas = tarefasSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    // Atualizar status de tarefas atrasadas
    const agora = Timestamp.now();
    for (const tarefa of tarefas) {
      if (
        tarefa.status === "pendente" &&
        tarefa.dataFim.toMillis() < agora.toMillis()
      ) {
        await db.collection("tarefas").doc(tarefa.id).update({
          status: "atrasada",
        });
        tarefa.status = "atrasada";
      }
    }

    return tarefas;
  }
);

// ==================== CONCLUIR TAREFA ====================

export const concluirTarefa = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "aluno");

    const { tarefaId, comentario } = request.data;

    if (!tarefaId) {
      throw new HttpsError("invalid-argument", "tarefaId é obrigatório");
    }

    const tarefaRef = db.collection("tarefas").doc(tarefaId);
    const tarefaDoc = await tarefaRef.get();

    if (!tarefaDoc.exists) {
      throw new HttpsError("not-found", "Tarefa não encontrada");
    }

    const tarefaData = tarefaDoc.data();
    if (tarefaData?.alunoId !== auth.uid) {
      throw new HttpsError("permission-denied", "Tarefa não pertence a este aluno");
    }

    const updates: any = {
      status: "concluida",
      concluidaEm: FieldValue.serverTimestamp(),
      atualizadaEm: FieldValue.serverTimestamp(),
    };

    // Adicionar comentário se fornecido
    if (comentario) {
      updates.comentarios = FieldValue.arrayUnion({
        autor: "aluno",
        autorId: auth.uid,
        texto: comentario,
        data: FieldValue.serverTimestamp(),
      });
    }

    await tarefaRef.update(updates);

    // Criar notificação para o mentor
    await db.collection("notificacoes").add({
      tipo: "tarefa_concluida",
      destinatarioId: tarefaData.mentorId,
      tarefaId,
      alunoId: auth.uid,
      titulo: "Tarefa concluída",
      mensagem: `${tarefaData.titulo} foi concluída`,
      lida: false,
      criadaEm: FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);

// ==================== ADICIONAR COMENTÁRIO ====================

export const adicionarComentarioTarefa = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    const { tarefaId, comentario } = request.data;

    if (!tarefaId || !comentario) {
      throw new HttpsError("invalid-argument", "tarefaId e comentario são obrigatórios");
    }

    const tarefaRef = db.collection("tarefas").doc(tarefaId);
    const tarefaDoc = await tarefaRef.get();

    if (!tarefaDoc.exists) {
      throw new HttpsError("not-found", "Tarefa não encontrada");
    }

    const tarefaData = tarefaDoc.data();
    
    // Verificar permissão
    const isAluno = auth.role === "aluno" && tarefaData?.alunoId === auth.uid;
    const isMentor = auth.role === "mentor" && tarefaData?.mentorId === auth.uid;

    if (!isAluno && !isMentor) {
      throw new HttpsError("permission-denied", "Sem permissão para comentar");
    }

    await tarefaRef.update({
      comentarios: FieldValue.arrayUnion({
        autor: auth.role,
        autorId: auth.uid,
        texto: comentario,
        data: FieldValue.serverTimestamp(),
      }),
      atualizadaEm: FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);

// ==================== EDITAR TAREFA (MENTOR) ====================

export const editarTarefa = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { tarefaId, ...updates } = request.data;

    if (!tarefaId) {
      throw new HttpsError("invalid-argument", "tarefaId é obrigatório");
    }

    const tarefaRef = db.collection("tarefas").doc(tarefaId);
    const tarefaDoc = await tarefaRef.get();

    if (!tarefaDoc.exists) {
      throw new HttpsError("not-found", "Tarefa não encontrada");
    }

    const tarefaData = tarefaDoc.data();
    if (tarefaData?.mentorId !== auth.uid) {
      throw new HttpsError("permission-denied", "Tarefa não pertence a este mentor");
    }

    // Converter datas se fornecidas
    if (updates.dataInicio) {
      updates.dataInicio = Timestamp.fromDate(new Date(updates.dataInicio));
    }
    if (updates.dataFim) {
      updates.dataFim = Timestamp.fromDate(new Date(updates.dataFim));
    }

    updates.atualizadaEm = FieldValue.serverTimestamp();

    await tarefaRef.update(updates);

    return { success: true };
  }
);

// ==================== DELETAR TAREFA (MENTOR) ====================

export const deletarTarefa = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { tarefaId } = request.data;

    if (!tarefaId) {
      throw new HttpsError("invalid-argument", "tarefaId é obrigatório");
    }

    const tarefaRef = db.collection("tarefas").doc(tarefaId);
    const tarefaDoc = await tarefaRef.get();

    if (!tarefaDoc.exists) {
      throw new HttpsError("not-found", "Tarefa não encontrada");
    }

    const tarefaData = tarefaDoc.data();
    if (tarefaData?.mentorId !== auth.uid) {
      throw new HttpsError("permission-denied", "Tarefa não pertence a este mentor");
    }

    await tarefaRef.delete();

    return { success: true };
  }
);

// ==================== ESTATÍSTICAS (MENTOR) ====================

export const getEstatisticasTarefas = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "mentor");

    const { alunoId } = request.data;

    let query = db.collection("tarefas").where("mentorId", "==", auth.uid);

    if (alunoId) {
      query = query.where("alunoId", "==", alunoId);
    }

    const tarefasSnapshot = await query.get();
    const tarefas = tarefasSnapshot.docs.map((doc) => doc.data());

    const total = tarefas.length;
    const concluidas = tarefas.filter((t) => t.status === "concluida").length;
    const pendentes = tarefas.filter((t) => t.status === "pendente").length;
    const atrasadas = tarefas.filter((t) => t.status === "atrasada").length;

    const taxaConclusao = total > 0 ? (concluidas / total) * 100 : 0;

    // Estatísticas por categoria
    const porCategoria: any = {};
    tarefas.forEach((t) => {
      if (!porCategoria[t.categoria]) {
        porCategoria[t.categoria] = { total: 0, concluidas: 0 };
      }
      porCategoria[t.categoria].total++;
      if (t.status === "concluida") {
        porCategoria[t.categoria].concluidas++;
      }
    });

    return {
      total,
      concluidas,
      pendentes,
      atrasadas,
      taxaConclusao: Math.round(taxaConclusao),
      porCategoria,
    };
  }
);

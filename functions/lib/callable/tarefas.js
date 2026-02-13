"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEstatisticasTarefas = exports.deletarTarefa = exports.editarTarefa = exports.adicionarComentarioTarefa = exports.concluirTarefa = exports.getTarefasMentor = exports.getTarefasAluno = exports.criarTarefa = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../utils/auth");
const db = (0, firestore_1.getFirestore)();
// ==================== CRIAR TAREFA ====================
exports.criarTarefa = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { titulo, descricao, categoria, prioridade, alunoId, dataInicio, dataFim, recorrencia, } = request.data;
    // Validações
    if (!titulo || !categoria || !prioridade || !alunoId || !dataInicio || !dataFim) {
        throw new https_1.HttpsError("invalid-argument", "Campos obrigatórios faltando");
    }
    // Verificar se o aluno pertence ao mentor
    const alunoDoc = await db.collection("alunos").doc(alunoId).get();
    if (!alunoDoc.exists) {
        throw new https_1.HttpsError("not-found", "Aluno não encontrado");
    }
    const alunoData = alunoDoc.data();
    if (alunoData?.mentorId !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Aluno não pertence a este mentor");
    }
    // Verificar se o aluno não está vinculado a "todos" ou "Avulsa - sem mentor"
    if (alunoData?.mentorId === "todos" || alunoData?.mentorId === "avulsa") {
        throw new https_1.HttpsError("permission-denied", "Não é possível criar tarefas para alunos sem mentor específico");
    }
    const novaTarefa = {
        titulo,
        descricao: descricao || "",
        categoria,
        prioridade,
        mentorId: auth.uid,
        alunoId,
        dataInicio: firestore_1.Timestamp.fromDate(new Date(dataInicio)),
        dataFim: firestore_1.Timestamp.fromDate(new Date(dataFim)),
        recorrencia: recorrencia || { ativa: false, tipo: "diaria" },
        status: "pendente",
        comentarios: [],
        criadaEm: firestore_1.FieldValue.serverTimestamp(),
        atualizadaEm: firestore_1.FieldValue.serverTimestamp(),
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
        criadaEm: firestore_1.FieldValue.serverTimestamp(),
    });
    return { id: tarefaRef.id, success: true };
});
// ==================== LISTAR TAREFAS DO ALUNO ====================
// ==================== LISTAR TAREFAS DO ALUNO ====================
exports.getTarefasAluno = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "aluno");
    const { filtro } = request.data;
    const alunoDoc = await db.collection("alunos").doc(auth.uid).get();
    if (!alunoDoc.exists) {
        throw new https_1.HttpsError("not-found", "Aluno não encontrado");
    }
    const alunoData = alunoDoc.data();
    if (!alunoData?.mentorId ||
        alunoData.mentorId === "todos" ||
        alunoData.mentorId === "avulsa") {
        return [];
    }
    const tarefasSnapshot = await db
        .collection("tarefas")
        .where("alunoId", "==", auth.uid)
        .get();
    let tarefas = tarefasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    const now = new Date();
    if (filtro === "dia") {
        const inicioDia = new Date(now.setHours(0, 0, 0, 0));
        const fimDia = new Date(now.setHours(23, 59, 59, 999));
        tarefas = tarefas.filter((t) => {
            const dataFim = t.dataFim.toDate();
            return dataFim >= inicioDia && dataFim <= fimDia;
        });
    }
    else if (filtro === "semana") {
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
    }
    else if (filtro === "mes") {
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
        const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        tarefas = tarefas.filter((t) => {
            const dataFim = t.dataFim.toDate();
            return dataFim >= inicioMes && dataFim <= fimMes;
        });
    }
    const agora = firestore_1.Timestamp.now();
    for (const tarefa of tarefas) {
        if (tarefa.status === "pendente" && tarefa.dataFim.toMillis() < agora.toMillis()) {
            await db.collection("tarefas").doc(tarefa.id).update({ status: "atrasada" });
            tarefa.status = "atrasada";
        }
    }
    return tarefas;
});
// ==================== LISTAR TAREFAS DOS ALUNOS DO MENTOR ====================
exports.getTarefasMentor = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { alunoId, filtro } = request.data;
    let query = db.collection("tarefas").where("mentorId", "==", auth.uid);
    if (alunoId) {
        query = query.where("alunoId", "==", alunoId);
    }
    const tarefasSnapshot = await query.get();
    const tarefas = tarefasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    // Atualizar status de tarefas atrasadas
    const agora = firestore_1.Timestamp.now();
    for (const tarefa of tarefas) {
        if (tarefa.status === "pendente" &&
            tarefa.dataFim.toMillis() < agora.toMillis()) {
            await db.collection("tarefas").doc(tarefa.id).update({
                status: "atrasada",
            });
            tarefa.status = "atrasada";
        }
    }
    return tarefas;
});
// ==================== CONCLUIR TAREFA ====================
exports.concluirTarefa = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "aluno");
    const { tarefaId, comentario } = request.data;
    if (!tarefaId) {
        throw new https_1.HttpsError("invalid-argument", "tarefaId é obrigatório");
    }
    const tarefaRef = db.collection("tarefas").doc(tarefaId);
    const tarefaDoc = await tarefaRef.get();
    if (!tarefaDoc.exists) {
        throw new https_1.HttpsError("not-found", "Tarefa não encontrada");
    }
    const tarefaData = tarefaDoc.data();
    if (tarefaData?.alunoId !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Tarefa não pertence a este aluno");
    }
    const updates = {
        status: "concluida",
        concluidaEm: firestore_1.FieldValue.serverTimestamp(),
        atualizadaEm: firestore_1.FieldValue.serverTimestamp(),
    };
    // Adicionar comentário se fornecido
    if (comentario) {
        updates.comentarios = firestore_1.FieldValue.arrayUnion({
            autor: "aluno",
            autorId: auth.uid,
            texto: comentario,
            data: firestore_1.FieldValue.serverTimestamp(),
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
        criadaEm: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
// ==================== ADICIONAR COMENTÁRIO ====================
exports.adicionarComentarioTarefa = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    const { tarefaId, comentario } = request.data;
    if (!tarefaId || !comentario) {
        throw new https_1.HttpsError("invalid-argument", "tarefaId e comentario são obrigatórios");
    }
    const tarefaRef = db.collection("tarefas").doc(tarefaId);
    const tarefaDoc = await tarefaRef.get();
    if (!tarefaDoc.exists) {
        throw new https_1.HttpsError("not-found", "Tarefa não encontrada");
    }
    const tarefaData = tarefaDoc.data();
    // Verificar permissão
    const isAluno = auth.role === "aluno" && tarefaData?.alunoId === auth.uid;
    const isMentor = auth.role === "mentor" && tarefaData?.mentorId === auth.uid;
    if (!isAluno && !isMentor) {
        throw new https_1.HttpsError("permission-denied", "Sem permissão para comentar");
    }
    await tarefaRef.update({
        comentarios: firestore_1.FieldValue.arrayUnion({
            autor: auth.role,
            autorId: auth.uid,
            texto: comentario,
            data: firestore_1.FieldValue.serverTimestamp(),
        }),
        atualizadaEm: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
// ==================== EDITAR TAREFA (MENTOR) ====================
exports.editarTarefa = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { tarefaId, ...updates } = request.data;
    if (!tarefaId) {
        throw new https_1.HttpsError("invalid-argument", "tarefaId é obrigatório");
    }
    const tarefaRef = db.collection("tarefas").doc(tarefaId);
    const tarefaDoc = await tarefaRef.get();
    if (!tarefaDoc.exists) {
        throw new https_1.HttpsError("not-found", "Tarefa não encontrada");
    }
    const tarefaData = tarefaDoc.data();
    if (tarefaData?.mentorId !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Tarefa não pertence a este mentor");
    }
    // Converter datas se fornecidas
    if (updates.dataInicio) {
        updates.dataInicio = firestore_1.Timestamp.fromDate(new Date(updates.dataInicio));
    }
    if (updates.dataFim) {
        updates.dataFim = firestore_1.Timestamp.fromDate(new Date(updates.dataFim));
    }
    updates.atualizadaEm = firestore_1.FieldValue.serverTimestamp();
    await tarefaRef.update(updates);
    return { success: true };
});
// ==================== DELETAR TAREFA (MENTOR) ====================
exports.deletarTarefa = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
    const { tarefaId } = request.data;
    if (!tarefaId) {
        throw new https_1.HttpsError("invalid-argument", "tarefaId é obrigatório");
    }
    const tarefaRef = db.collection("tarefas").doc(tarefaId);
    const tarefaDoc = await tarefaRef.get();
    if (!tarefaDoc.exists) {
        throw new https_1.HttpsError("not-found", "Tarefa não encontrada");
    }
    const tarefaData = tarefaDoc.data();
    if (tarefaData?.mentorId !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Tarefa não pertence a este mentor");
    }
    await tarefaRef.delete();
    return { success: true };
});
// ==================== ESTATÍSTICAS (MENTOR) ====================
exports.getEstatisticasTarefas = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    const auth = await (0, auth_1.getAuthContextV2)(request);
    (0, auth_1.requireRole)(auth, "mentor");
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
    const porCategoria = {};
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
});
//# sourceMappingURL=tarefas.js.map
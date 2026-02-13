"use strict";
// Função getTarefasAluno corrigida - sem índices compostos
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTarefasAluno = void 0;
exports.getTarefasAluno = onCall({ region: "southamerica-east1" }, async (request) => {
    const auth = await getAuthContextV2(request);
    requireRole(auth, "aluno");
    const { filtro } = request.data; // "dia", "semana", "mes", "todas"
    const alunoDoc = await db.collection("alunos").doc(auth.uid).get();
    if (!alunoDoc.exists) {
        throw new HttpsError("not-found", "Aluno não encontrado");
    }
    const alunoData = alunoDoc.data();
    // Verificar se o aluno tem mentor específico
    if (!alunoData?.mentorId ||
        alunoData.mentorId === "todos" ||
        alunoData.mentorId === "avulsa") {
        return []; // Retorna vazio para alunos sem mentor específico
    }
    // Buscar todas as tarefas do aluno (sem filtro de data para evitar índices compostos)
    const tarefasSnapshot = await db
        .collection("tarefas")
        .where("alunoId", "==", auth.uid)
        .get();
    let tarefas = tarefasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    // Aplicar filtro de data no código (não no Firestore)
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
    // Atualizar status de tarefas atrasadas
    const agora = Timestamp.now();
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
//# sourceMappingURL=tarefas_fixed.js.map
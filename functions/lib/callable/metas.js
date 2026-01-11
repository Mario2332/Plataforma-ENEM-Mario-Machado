"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metasFunctions = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../utils/auth");
// BACKUP: Sistema de notificações removido temporariamente - ver pasta backup_notificacoes
// import { criarNotificacao } from "./notificacoes";
const db = admin.firestore();
/**
 * Helper para converter string de data para Date no fuso horário de Brasília
 * Usa meio-dia de Brasília (15:00 UTC) para evitar problemas de mudança de dia
 */
function parseDateWithBrasiliaTimezone(dateString) {
    // Extrair apenas a parte da data (YYYY-MM-DD)
    let dateOnly = dateString;
    if (dateString.includes('T')) {
        dateOnly = dateString.split('T')[0];
    }
    // Criar data com meio-dia de Brasília (15:00 UTC, pois Brasília = UTC-3)
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 15, 0, 0, 0));
}
/**
 * Helper para obter a data de hoje no fuso horário de Brasília
 * Retorna a data à meia-noite de Brasília
 */
function getHojeBrasilia() {
    const agora = new Date();
    // Converter para string no fuso de Brasília e extrair apenas a data
    const dataBrasilia = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    // Criar Date com meio-dia de Brasília
    return parseDateWithBrasiliaTimezone(dataBrasilia);
}
/**
 * Helper para comparar datas ignorando o horário
 * Compara apenas ano, mês e dia
 */
function isSameDateBrasilia(date1, date2) {
    const d1 = date1.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const d2 = date2.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return d1 === d2;
}
/**
 * Helper para verificar se uma data é anterior a outra (ignorando horário)
 */
function isBeforeDateBrasilia(date1, date2) {
    const d1 = date1.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const d2 = date2.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return d1 < d2;
}
/**
 * Helper para verificar se uma data está dentro de um período (inclusive)
 */
function isDateInRangeBrasilia(date, inicio, fim) {
    const d = date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const i = inicio.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const f = fim.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return d >= i && d <= f;
}
/**
 * Listar metas do aluno
 */
const getMetas = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "aluno");
    try {
        const metasSnapshot = await db
            .collection("alunos")
            .doc(auth.uid)
            .collection("metas")
            .orderBy("createdAt", "desc")
            .get();
        // Filtrar metas para não mostrar as "metas-mãe" (templates)
        // Metas-mãe são aquelas com repetirDiariamente=true MAS sem metaPaiId
        // Essas são apenas templates usados para gerar instâncias diárias
        const metasFiltradas = metasSnapshot.docs
            .map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))
            .filter((meta) => {
            // Se não é meta diária, mostrar normalmente
            if (!meta.repetirDiariamente)
                return true;
            // Se é meta diária, só mostrar se for uma instância (tem metaPaiId)
            // Não mostrar o template (meta-mãe)
            return !!meta.metaPaiId;
        });
        return metasFiltradas;
    }
    catch (error) {
        functions.logger.error("Erro ao listar metas:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Criar nova meta
 */
const createMeta = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "aluno");
    const { tipo, nome, descricao, valorAlvo, unidade, dataInicio, dataFim, materia, incidencia, repetirDiariamente, } = data;
    // Validações
    if (!tipo || !nome || !valorAlvo || !unidade || !dataInicio || !dataFim) {
        throw new functions.https.HttpsError("invalid-argument", "Tipo, nome, valor alvo, unidade, data início e data fim são obrigatórios");
    }
    const tiposValidos = ['horas', 'questoes', 'simulados', 'topicos', 'sequencia', 'desempenho'];
    if (!tiposValidos.includes(tipo)) {
        throw new functions.https.HttpsError("invalid-argument", `Tipo de meta inválido. Tipos válidos: ${tiposValidos.join(', ')}`);
    }
    try {
        // Calcular progresso inicial baseado no histórico
        // (apenas para metas não-diárias)
        let valorAtual = 0;
        if (!repetirDiariamente) {
            // Buscar estudos e simulados para calcular progresso inicial
            const estudosSnapshot = await db
                .collection("alunos")
                .doc(auth.uid)
                .collection("estudos")
                .orderBy("data", "desc")
                .get();
            const simuladosSnapshot = await db
                .collection("alunos")
                .doc(auth.uid)
                .collection("simulados")
                .orderBy("data", "desc")
                .get();
            const estudos = estudosSnapshot.docs.map((doc) => doc.data());
            const simulados = simuladosSnapshot.docs.map((doc) => doc.data());
            // Usar helpers de data com fuso horário de Brasília
            const dataInicioDate = parseDateWithBrasiliaTimezone(dataInicio);
            const dataFimDate = parseDateWithBrasiliaTimezone(dataFim);
            switch (tipo) {
                case 'horas': {
                    // Somar horas de estudos no período
                    valorAtual = estudos
                        .filter((e) => {
                        const dataEstudo = e.data.toDate();
                        return isDateInRangeBrasilia(dataEstudo, dataInicioDate, dataFimDate);
                    })
                        .reduce((acc, e) => acc + (e.tempoMinutos || 0), 0) / 60;
                    valorAtual = Math.round(valorAtual * 10) / 10;
                    break;
                }
                case 'questoes': {
                    // Somar questões no período
                    valorAtual = estudos
                        .filter((e) => {
                        const dataEstudo = e.data.toDate();
                        const matchPeriodo = isDateInRangeBrasilia(dataEstudo, dataInicioDate, dataFimDate);
                        const matchMateria = !materia || e.materia === materia;
                        return matchPeriodo && matchMateria;
                    })
                        .reduce((acc, e) => acc + (e.questoesFeitas || 0), 0);
                    break;
                }
                case 'simulados': {
                    // Contar simulados no período
                    valorAtual = simulados.filter((s) => {
                        const dataSimulado = s.data.toDate();
                        return isDateInRangeBrasilia(dataSimulado, dataInicioDate, dataFimDate);
                    }).length;
                    break;
                }
                case 'desempenho': {
                    // Somar acertos em simulados no período
                    valorAtual = simulados
                        .filter((s) => {
                        const dataSimulado = s.data.toDate();
                        const matchPeriodo = isDateInRangeBrasilia(dataSimulado, dataInicioDate, dataFimDate);
                        const matchMateria = !materia || s.questoes?.some((q) => q.materia === materia);
                        return matchPeriodo && matchMateria;
                    })
                        .reduce((acc, s) => {
                        if (!materia) {
                            return acc + (s.acertos || 0);
                        }
                        return acc + (s.questoes?.filter((q) => q.materia === materia && q.acertou).length || 0);
                    }, 0);
                    break;
                }
                case 'topicos': {
                    // Buscar progresso de conteúdos
                    const progressoSnapshot = await db
                        .collection("alunos")
                        .doc(auth.uid)
                        .collection("conteudos_progresso")
                        .where("concluido", "==", true)
                        .get();
                    valorAtual = progressoSnapshot.docs.filter((doc) => {
                        const progresso = doc.data();
                        // Usar dataConclusao se existir, senão usar updatedAt ou createdAt
                        const dataConclusao = progresso.dataConclusao?.toDate() || progresso.updatedAt?.toDate() || progresso.createdAt?.toDate();
                        if (!dataConclusao)
                            return false;
                        const matchPeriodo = isDateInRangeBrasilia(dataConclusao, dataInicioDate, dataFimDate);
                        // Filtrar por incidencia apenas se a meta especificar E o progresso tiver incidencia
                        const matchIncidencia = !incidencia || !progresso.incidencia || progresso.incidencia === incidencia;
                        return matchPeriodo && matchIncidencia;
                    }).length;
                    break;
                }
                case 'sequencia': {
                    // Calcular streak (dias consecutivos de estudo)
                    // Usar fuso horário de Brasília para extrair datas
                    const datasEstudo = [...new Set(estudos.map((e) => {
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
                            }
                            else {
                                break;
                            }
                        }
                    }
                    valorAtual = streak;
                    break;
                }
            }
        }
        // Verificar se a meta já foi concluída com base no histórico
        let status = 'ativa';
        let dataConclusao;
        if (!repetirDiariamente && valorAtual >= Number(valorAlvo)) {
            status = 'concluida';
            dataConclusao = admin.firestore.Timestamp.now();
        }
        const metaData = {
            alunoId: auth.uid,
            tipo,
            nome,
            descricao: descricao || '',
            valorAlvo: Number(valorAlvo),
            valorAtual,
            unidade,
            dataInicio: admin.firestore.Timestamp.fromDate(parseDateWithBrasiliaTimezone(dataInicio)),
            dataFim: admin.firestore.Timestamp.fromDate(parseDateWithBrasiliaTimezone(dataFim)),
            status,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        };
        if (dataConclusao) {
            metaData.dataConclusao = dataConclusao;
        }
        // Adicionar campos opcionais
        if (materia)
            metaData.materia = materia;
        if (incidencia)
            metaData.incidencia = incidencia;
        if (repetirDiariamente !== undefined)
            metaData.repetirDiariamente = repetirDiariamente;
        const metaRef = await db
            .collection("alunos")
            .doc(auth.uid)
            .collection("metas")
            .add(metaData);
        // Se for meta diária, criar instância para hoje
        if (repetirDiariamente) {
            // Usar fuso horário de Brasília para determinar a data de referência
            const dataInicioDate = parseDateWithBrasiliaTimezone(dataInicio);
            const hojeBrasilia = getHojeBrasilia();
            // Comparar usando strings de data no fuso de Brasília
            const dataInicioStr = dataInicioDate.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
            const hojeStr = hojeBrasilia.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
            // Se dataInicio for posterior a hoje, usar dataInicio
            // Caso contrário, usar hoje (para criar a instância do dia atual)
            const dataRefStr = dataInicioStr > hojeStr ? dataInicioStr : hojeStr;
            const dataRef = parseDateWithBrasiliaTimezone(dataRefStr);
            const instanciaDiaria = {
                ...metaData,
                metaPaiId: metaRef.id,
                dataReferencia: admin.firestore.Timestamp.fromDate(dataRef),
                valorAtual: 0, // Instância começa zerada
                nome: `${nome} - ${dataRef.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
            };
            await db
                .collection("alunos")
                .doc(auth.uid)
                .collection("metas")
                .add(instanciaDiaria);
        }
        // BACKUP: Sistema de notificações removido temporariamente - ver pasta backup_notificacoes
        // Criar notificação de meta criada
        // const mensagemNotificacao = status === 'concluida' 
        //   ? `Meta "${nome}" foi criada e já está concluída com base no seu histórico!`
        //   : `Nova meta "${nome}" criada com sucesso. Vamos alcançá-la juntos!`;
        // 
        // await criarNotificacao(
        //   auth.uid,
        //   status === 'concluida' ? 'meta_concluida' : 'meta_criada',
        //   status === 'concluida' ? '🎉 Meta Concluída!' : '⭐ Nova Meta Criada',
        //   mensagemNotificacao,
        //   metaRef.id,
        //   nome
        // );
        return { success: true, metaId: metaRef.id };
    }
    catch (error) {
        functions.logger.error("Erro ao criar meta:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Atualizar meta existente
 */
const updateMeta = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "aluno");
    const { metaId, nome, descricao, valorAlvo, dataInicio, dataFim, status, repetirDiariamente, } = data;
    if (!metaId) {
        throw new functions.https.HttpsError("invalid-argument", "ID da meta é obrigatório");
    }
    try {
        const metaRef = db
            .collection("alunos")
            .doc(auth.uid)
            .collection("metas")
            .doc(metaId);
        // Verificar se a meta existe
        const metaDoc = await metaRef.get();
        if (!metaDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Meta não encontrada");
        }
        // Preparar dados para atualização
        const updateData = {
            updatedAt: admin.firestore.Timestamp.now(),
        };
        const metaAtual = metaDoc.data();
        if (!metaAtual) {
            throw new functions.https.HttpsError("not-found", "Dados da meta não encontrados");
        }
        if (nome !== undefined)
            updateData.nome = nome;
        if (descricao !== undefined)
            updateData.descricao = descricao;
        if (valorAlvo !== undefined)
            updateData.valorAlvo = Number(valorAlvo);
        if (dataInicio !== undefined) {
            updateData.dataInicio = admin.firestore.Timestamp.fromDate(parseDateWithBrasiliaTimezone(dataInicio));
        }
        if (dataFim !== undefined) {
            updateData.dataFim = admin.firestore.Timestamp.fromDate(parseDateWithBrasiliaTimezone(dataFim));
        }
        if (status !== undefined) {
            updateData.status = status;
            if (status === 'concluida') {
                updateData.dataConclusao = admin.firestore.Timestamp.now();
            }
        }
        // Se repetirDiariamente foi alterado de false para true, transformar em meta diária
        if (repetirDiariamente === true && !metaAtual.repetirDiariamente) {
            // Transformar a meta atual em "meta-mãe" (template)
            updateData.repetirDiariamente = true;
            updateData.valorAtual = 0; // Reset progresso da meta-mãe
            // Criar a primeira instância diária para hoje
            const hoje = getHojeBrasilia();
            const dataInicioMeta = dataInicio ? parseDateWithBrasiliaTimezone(dataInicio) : metaAtual.dataInicio.toDate();
            const dataFimMeta = dataFim ? parseDateWithBrasiliaTimezone(dataFim) : metaAtual.dataFim.toDate();
            // Só criar instância se hoje estiver dentro do período da meta
            if (isDateInRangeBrasilia(hoje, dataInicioMeta, dataFimMeta)) {
                // Criar instância diária sem copiar campos indesejados
                const instanciaData = {
                    alunoId: metaAtual.alunoId,
                    tipo: metaAtual.tipo,
                    nome: nome || metaAtual.nome,
                    descricao: descricao || metaAtual.descricao || '',
                    valorAlvo: valorAlvo !== undefined ? Number(valorAlvo) : metaAtual.valorAlvo,
                    unidade: metaAtual.unidade,
                    dataInicio: admin.firestore.Timestamp.fromDate(dataInicioMeta),
                    dataFim: admin.firestore.Timestamp.fromDate(dataFimMeta),
                    repetirDiariamente: true,
                    metaPaiId: metaId, // Referência à meta-mãe
                    dataReferencia: admin.firestore.Timestamp.fromDate(hoje),
                    valorAtual: 0, // Começa zerada
                    status: 'ativa',
                    createdAt: admin.firestore.Timestamp.now(),
                    updatedAt: admin.firestore.Timestamp.now(),
                };
                // Copiar campos opcionais se existirem
                if (metaAtual.materia)
                    instanciaData.materia = metaAtual.materia;
                if (metaAtual.incidencia)
                    instanciaData.incidencia = metaAtual.incidencia;
                await db
                    .collection("alunos")
                    .doc(auth.uid)
                    .collection("metas")
                    .add(instanciaData);
                functions.logger.info(`Instância diária criada para meta ${metaId}`);
            }
        }
        else if (repetirDiariamente === false && metaAtual.repetirDiariamente) {
            // Transformar de meta diária para meta normal
            updateData.repetirDiariamente = false;
            // Deletar instâncias diárias existentes
            const instanciasSnapshot = await db
                .collection("alunos")
                .doc(auth.uid)
                .collection("metas")
                .where("metaPaiId", "==", metaId)
                .get();
            const batch = db.batch();
            instanciasSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            functions.logger.info(`${instanciasSnapshot.size} instâncias diárias removidas da meta ${metaId}`);
        }
        // Se dataInicio foi alterada, recalcular progresso (apenas para metas não-diárias)
        if (dataInicio !== undefined && !metaAtual.repetirDiariamente) {
            // Usar mesma lógica de cálculo inicial
            const estudosSnapshot = await db
                .collection("alunos")
                .doc(auth.uid)
                .collection("estudos")
                .orderBy("data", "desc")
                .get();
            const simuladosSnapshot = await db
                .collection("alunos")
                .doc(auth.uid)
                .collection("simulados")
                .orderBy("data", "desc")
                .get();
            const estudos = estudosSnapshot.docs.map((doc) => doc.data());
            const simulados = simuladosSnapshot.docs.map((doc) => doc.data());
            const dataInicioDate = new Date(dataInicio);
            const dataFimDate = dataFim ? new Date(dataFim) : metaAtual.dataFim.toDate();
            let valorAtual = 0;
            switch (metaAtual.tipo) {
                case 'horas':
                    valorAtual = estudos
                        .filter((e) => {
                        const dataEstudo = e.data.toDate();
                        return dataEstudo >= dataInicioDate && dataEstudo <= dataFimDate;
                    })
                        .reduce((acc, e) => acc + (e.tempoMinutos || 0), 0) / 60;
                    valorAtual = Math.round(valorAtual * 10) / 10;
                    break;
                case 'questoes':
                    valorAtual = estudos
                        .filter((e) => {
                        const dataEstudo = e.data.toDate();
                        const matchPeriodo = dataEstudo >= dataInicioDate && dataEstudo <= dataFimDate;
                        const matchMateria = !metaAtual.materia || e.materia === metaAtual.materia;
                        return matchPeriodo && matchMateria;
                    })
                        .reduce((acc, e) => acc + (e.questoesFeitas || 0), 0);
                    break;
                case 'simulados':
                    valorAtual = simulados.filter((s) => {
                        const dataSimulado = s.data.toDate();
                        return dataSimulado >= dataInicioDate && dataSimulado <= dataFimDate;
                    }).length;
                    break;
                case 'desempenho':
                    valorAtual = simulados
                        .filter((s) => {
                        const dataSimulado = s.data.toDate();
                        const matchPeriodo = dataSimulado >= dataInicioDate && dataSimulado <= dataFimDate;
                        const matchMateria = !metaAtual.materia || s.questoes?.some((q) => q.materia === metaAtual.materia);
                        return matchPeriodo && matchMateria;
                    })
                        .reduce((acc, s) => {
                        if (!metaAtual.materia) {
                            return acc + (s.acertos || 0);
                        }
                        return acc + (s.questoes?.filter((q) => q.materia === metaAtual.materia && q.acertou).length || 0);
                    }, 0);
                    break;
                case 'topicos':
                    const progressoSnapshot = await db
                        .collection("alunos")
                        .doc(auth.uid)
                        .collection("conteudos_progresso")
                        .where("concluido", "==", true)
                        .get();
                    valorAtual = progressoSnapshot.docs.filter((doc) => {
                        const progresso = doc.data();
                        // Usar dataConclusao se existir, senão usar updatedAt ou createdAt
                        const dataConclusao = progresso.dataConclusao?.toDate() || progresso.updatedAt?.toDate() || progresso.createdAt?.toDate();
                        if (!dataConclusao)
                            return false;
                        const matchPeriodo = dataConclusao >= dataInicioDate && dataConclusao <= dataFimDate;
                        // Filtrar por incidencia apenas se a meta especificar E o progresso tiver incidencia
                        const matchIncidencia = !metaAtual.incidencia || !progresso.incidencia || progresso.incidencia === metaAtual.incidencia;
                        return matchPeriodo && matchIncidencia;
                    }).length;
                    break;
            }
            updateData.valorAtual = valorAtual;
            // Verificar se a meta foi concluída após recalcular progresso
            if (valorAtual >= (valorAlvo !== undefined ? Number(valorAlvo) : metaAtual.valorAlvo)) {
                updateData.status = 'concluida';
                updateData.dataConclusao = admin.firestore.Timestamp.now();
            }
        }
        await metaRef.update(updateData);
        return { success: true, metaId };
    }
    catch (error) {
        functions.logger.error("Erro ao atualizar meta:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Deletar meta
 */
const deleteMeta = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "aluno");
    const { metaId } = data;
    if (!metaId) {
        throw new functions.https.HttpsError("invalid-argument", "ID da meta é obrigatório");
    }
    try {
        await db
            .collection("alunos")
            .doc(auth.uid)
            .collection("metas")
            .doc(metaId)
            .delete();
        return { success: true };
    }
    catch (error) {
        functions.logger.error("Erro ao deletar meta:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Atualizar progresso de uma meta específica
 * (Usado internamente por triggers)
 */
const updateMetaProgress = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "aluno");
    const { metaId, valorAtual } = data;
    if (!metaId || valorAtual === undefined) {
        throw new functions.https.HttpsError("invalid-argument", "ID da meta e valor atual são obrigatórios");
    }
    try {
        const metaRef = db
            .collection("alunos")
            .doc(auth.uid)
            .collection("metas")
            .doc(metaId);
        const metaDoc = await metaRef.get();
        if (!metaDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Meta não encontrada");
        }
        const metaData = metaDoc.data();
        // Verificar se atingiu o alvo
        const updateData = {
            valorAtual: Number(valorAtual),
            updatedAt: admin.firestore.Timestamp.now(),
        };
        if (Number(valorAtual) >= metaData.valorAlvo && metaData.status === 'ativa') {
            updateData.status = 'concluida';
            updateData.dataConclusao = admin.firestore.Timestamp.now();
        }
        await metaRef.update(updateData);
        return { success: true, metaId, concluida: updateData.status === 'concluida' };
    }
    catch (error) {
        functions.logger.error("Erro ao atualizar progresso da meta:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Verificar e atualizar status de metas expiradas
 * (Chamado periodicamente ou ao carregar página de metas)
 */
const checkExpiredMetas = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    (0, auth_1.requireRole)(auth, "aluno");
    try {
        const now = admin.firestore.Timestamp.now();
        const metasSnapshot = await db
            .collection("alunos")
            .doc(auth.uid)
            .collection("metas")
            .where("status", "==", "ativa")
            .where("dataFim", "<", now)
            .get();
        const batch = db.batch();
        let expiredCount = 0;
        metasSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                status: 'expirada',
                updatedAt: now,
            });
            expiredCount++;
        });
        if (expiredCount > 0) {
            await batch.commit();
        }
        return { success: true, expiredCount };
    }
    catch (error) {
        functions.logger.error("Erro ao verificar metas expiradas:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
// Exportar todas as funções de metas
exports.metasFunctions = {
    getMetas,
    createMeta,
    updateMeta,
    deleteMeta,
    updateMetaProgress,
    checkExpiredMetas,
};
//# sourceMappingURL=metas.js.map
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
exports.getPreferenciaComparacao = exports.updatePreferenciaComparacao = exports.getMediasPlataforma = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../utils/auth");
const db = admin.firestore();
/**
 * Calcula as médias de desempenho de todos os alunos da plataforma
 * para comparação com o desempenho individual do aluno
 */
exports.getMediasPlataforma = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    const { periodo } = data;
    // Calcular data limite baseada no período
    const agora = new Date();
    let dataLimite = new Date();
    switch (periodo) {
        case "7d":
            dataLimite.setDate(agora.getDate() - 7);
            break;
        case "30d":
            dataLimite.setDate(agora.getDate() - 30);
            break;
        case "3m":
            dataLimite.setMonth(agora.getMonth() - 3);
            break;
        case "6m":
            dataLimite.setMonth(agora.getMonth() - 6);
            break;
        case "1a":
            dataLimite.setFullYear(agora.getFullYear() - 1);
            break;
        case "all":
        default:
            dataLimite = new Date(0); // Desde o início
            break;
    }
    // Buscar todos os usuários com role "aluno"
    const usersSnapshot = await db
        .collection("users")
        .where("role", "==", "aluno")
        .get();
    if (usersSnapshot.empty) {
        return {
            tempoMedio: 0,
            questoesMedia: 0,
            acertosMedia: 0,
            taxaAcertoMedia: 0,
            diasEstudoMedia: 0,
            totalAlunos: 0,
        };
    }
    const dadosPorAluno = new Map();
    // Para cada aluno, buscar seus estudos no período
    for (const userDoc of usersSnapshot.docs) {
        const alunoId = userDoc.id;
        // Buscar estudos do aluno
        const estudosSnapshot = await db
            .collection("users")
            .doc(alunoId)
            .collection("estudos")
            .get();
        if (estudosSnapshot.empty) {
            continue; // Pular alunos sem registros
        }
        const dados = {
            tempoTotal: 0,
            questoesTotal: 0,
            acertosTotal: 0,
            diasEstudo: new Set(),
        };
        for (const estudoDoc of estudosSnapshot.docs) {
            const estudo = estudoDoc.data();
            // Verificar se o estudo está no período
            let dataEstudo = null;
            if (estudo.data) {
                if (estudo.data.toDate) {
                    dataEstudo = estudo.data.toDate();
                }
                else if (estudo.data.seconds) {
                    dataEstudo = new Date(estudo.data.seconds * 1000);
                }
                else if (estudo.data._seconds) {
                    dataEstudo = new Date(estudo.data._seconds * 1000);
                }
                else {
                    dataEstudo = new Date(estudo.data);
                }
            }
            if (!dataEstudo || isNaN(dataEstudo.getTime()) || dataEstudo < dataLimite) {
                continue; // Pular estudos fora do período
            }
            // Acumular tempo
            dados.tempoTotal += estudo.tempoMinutos || estudo.duracao || 0;
            // Acumular questões e acertos
            dados.questoesTotal += estudo.questoesFeitas || estudo.questoes || 0;
            dados.acertosTotal += estudo.questoesAcertadas || estudo.acertos || 0;
            // Registrar dia de estudo
            const dataStr = dataEstudo.toISOString().split("T")[0];
            dados.diasEstudo.add(dataStr);
        }
        // Só adicionar alunos que têm dados no período
        if (dados.tempoTotal > 0 || dados.questoesTotal > 0) {
            dadosPorAluno.set(alunoId, dados);
        }
    }
    const totalAlunos = dadosPorAluno.size;
    if (totalAlunos === 0) {
        return {
            tempoMedio: 0,
            questoesMedia: 0,
            acertosMedia: 0,
            taxaAcertoMedia: 0,
            diasEstudoMedia: 0,
            totalAlunos: 0,
        };
    }
    // Calcular totais gerais
    let tempoTotalGeral = 0;
    let questoesTotalGeral = 0;
    let acertosTotalGeral = 0;
    let diasEstudoTotalGeral = 0;
    for (const dados of dadosPorAluno.values()) {
        tempoTotalGeral += dados.tempoTotal;
        questoesTotalGeral += dados.questoesTotal;
        acertosTotalGeral += dados.acertosTotal;
        diasEstudoTotalGeral += dados.diasEstudo.size;
    }
    // Calcular médias
    const tempoMedio = Math.round(tempoTotalGeral / totalAlunos);
    const questoesMedia = Math.round(questoesTotalGeral / totalAlunos);
    const acertosMedia = Math.round(acertosTotalGeral / totalAlunos);
    const diasEstudoMedia = Math.round(diasEstudoTotalGeral / totalAlunos);
    // Taxa de acerto média ponderada (total de acertos / total de questões)
    const taxaAcertoMedia = questoesTotalGeral > 0
        ? Math.round((acertosTotalGeral / questoesTotalGeral) * 100)
        : 0;
    functions.logger.info(`📊 Médias da plataforma calculadas: ${totalAlunos} alunos, tempo médio: ${tempoMedio}min, taxa acerto: ${taxaAcertoMedia}%`);
    return {
        tempoMedio,
        questoesMedia,
        acertosMedia,
        taxaAcertoMedia,
        diasEstudoMedia,
        totalAlunos,
    };
});
/**
 * Atualiza a preferência do usuário para mostrar/ocultar comparação com média
 */
exports.updatePreferenciaComparacao = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    const { mostrar } = data;
    await db.collection("users").doc(auth.uid).update({
        mostrarComparacaoMedia: mostrar,
    });
    return { success: true };
});
/**
 * Obtém a preferência do usuário para mostrar/ocultar comparação com média
 */
exports.getPreferenciaComparacao = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
    const auth = await (0, auth_1.getAuthContext)(context);
    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists) {
        return { mostrar: true }; // Padrão: mostrar comparação
    }
    const userData = userDoc.data();
    return { mostrar: userData?.mostrarComparacaoMedia ?? true };
});
//# sourceMappingURL=metricas-plataforma.js.map
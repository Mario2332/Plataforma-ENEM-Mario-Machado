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
exports.verificarECriarNotificacoesMeta = verificarECriarNotificacoesMeta;
const admin = __importStar(require("firebase-admin"));
const notificacoes_1 = require("../callable/notificacoes");
/**
 * Verifica e cria notificações de progresso e conclusão de meta
 * @param alunoId ID do aluno
 * @param metaId ID da meta
 * @param metaNome Nome da meta
 * @param metaStatus Status atual da meta
 * @param valorAnterior Valor anterior da meta
 * @param valorAtual Valor atual da meta
 * @param valorAlvo Valor alvo da meta
 * @param triggerName Nome do trigger que chamou (para logs)
 * @returns Objeto com status e dataConclusao se meta foi concluída
 */
async function verificarECriarNotificacoesMeta(alunoId, metaId, metaNome, metaStatus, valorAnterior, valorAtual, valorAlvo, triggerName) {
    const resultado = {};
    console.log(`[${triggerName}] Meta "${metaNome}" (${metaId})`);
    console.log(`[${triggerName}]   - Status: ${metaStatus}`);
    console.log(`[${triggerName}]   - Progresso: ${valorAnterior} -> ${valorAtual} / ${valorAlvo}`);
    // Verificar se atingiu o alvo
    if (valorAtual >= valorAlvo) {
        console.log(`[${triggerName}]   ✅ Meta atingiu o alvo!`);
        if (metaStatus === 'ativa') {
            console.log(`[${triggerName}]   🎉 Meta estava ativa, marcando como concluída e criando notificação...`);
            resultado.status = 'concluida';
            resultado.dataConclusao = admin.firestore.Timestamp.now();
            try {
                await (0, notificacoes_1.criarNotificacao)(alunoId, 'meta_concluida', '🎉 Meta Concluída!', `Parabéns! Você atingiu a meta "${metaNome}".`, metaId, metaNome);
                console.log(`[${triggerName}]   ✅ Notificação de conclusão criada com sucesso!`);
            }
            catch (error) {
                console.error(`[${triggerName}]   ❌ ERRO ao criar notificação de conclusão:`, error);
                throw error; // Re-throw para não perder o erro
            }
        }
        else {
            console.log(`[${triggerName}]   ⚠️  Meta já estava concluída (status: ${metaStatus}), não criando notificação`);
        }
    }
    else {
        // Verificar marcos de progresso (25%, 50%, 75%)
        const percentualAnterior = (valorAnterior / valorAlvo) * 100;
        const percentualAtual = (valorAtual / valorAlvo) * 100;
        console.log(`[${triggerName}]   - Percentual: ${percentualAnterior.toFixed(1)}% -> ${percentualAtual.toFixed(1)}%`);
        // Verificar cada marco
        const marcos = [
            { percentual: 25, tipo: 'progresso_25', emoji: '📈', mensagem: 'Continue assim!' },
            { percentual: 50, tipo: 'progresso_50', emoji: '🎯', mensagem: 'Você está na metade do caminho!' },
            { percentual: 75, tipo: 'progresso_75', emoji: '🚀', mensagem: 'Falta pouco!' }
        ];
        for (const marco of marcos) {
            if (percentualAnterior < marco.percentual && percentualAtual >= marco.percentual) {
                console.log(`[${triggerName}]   🎯 Marco ${marco.percentual}% atingido! Criando notificação...`);
                try {
                    await (0, notificacoes_1.criarNotificacao)(alunoId, marco.tipo, `${marco.emoji} ${marco.percentual}% da Meta Atingido`, `Você completou ${marco.percentual}% da meta "${metaNome}". ${marco.mensagem}`, metaId, metaNome);
                    console.log(`[${triggerName}]   ✅ Notificação ${marco.percentual}% criada com sucesso!`);
                }
                catch (error) {
                    console.error(`[${triggerName}]   ❌ ERRO ao criar notificação ${marco.percentual}%:`, error);
                    // Não re-throw aqui para tentar criar outras notificações
                }
            }
        }
    }
    return resultado;
}
//# sourceMappingURL=metaNotificacoes.js.map
"use strict";
/**
 * Tipos para o sistema Multi-Tenant (SaaS White Label) - Backend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIMITES_POR_PLANO = void 0;
exports.LIMITES_POR_PLANO = {
    basico: {
        maxAlunos: 50,
        maxMentores: 2,
        maxArmazenamentoMB: 500,
        cronogramaCustomizado: false,
        relatoriosAvancados: false,
        suporteWhatsapp: false,
        dominioCustomizado: false,
    },
    pro: {
        maxAlunos: 200,
        maxMentores: 5,
        maxArmazenamentoMB: 2000,
        cronogramaCustomizado: true,
        relatoriosAvancados: true,
        suporteWhatsapp: true,
        dominioCustomizado: false,
    },
    enterprise: {
        maxAlunos: 1000,
        maxMentores: 20,
        maxArmazenamentoMB: 10000,
        cronogramaCustomizado: true,
        relatoriosAvancados: true,
        suporteWhatsapp: true,
        dominioCustomizado: true,
    },
};
//# sourceMappingURL=mentoria.js.map
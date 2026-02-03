import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BookOpen, CheckCircle2, Clock, Brain } from "lucide-react";
import { parseDataSegura } from "@/pages/aluno/AlunoEstudos";

interface DailySummaryProps {
  estudos: any[];
  tempoDecorridoAtual: number; // em segundos
}

export function DailySummary({ estudos, tempoDecorridoAtual }: DailySummaryProps) {
  const resumo = useMemo(() => {
    // Obter data local no formato YYYY-MM-DD
    const hoje = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/').reverse().join('-');
    
    const estudosHoje = estudos.filter(estudo => {
      try {
        const dataEstudo = parseDataSegura(estudo.data);

        if (!dataEstudo) {
          return false;
        }

        // Converter data do estudo para local YYYY-MM-DD
        const dataEstudoStr = dataEstudo.toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).split('/').reverse().join('-');

        return dataEstudoStr === hoje;
      } catch (error) {
        console.warn("DailySummary - Erro ao processar data:", error, estudo);
        return false;
      }
    });

    // Garantir que tempoMinutos seja tratado como número e evitar NaN
    const tempoRegistradoMinutos = estudosHoje.reduce((acc, curr) => {
      const minutos = Number(curr.tempoMinutos);
      return acc + (isNaN(minutos) ? 0 : minutos);
    }, 0);

    // Garantir que tempoDecorridoAtual seja tratado como número
    const tempoAtualMinutos = isNaN(tempoDecorridoAtual) ? 0 : Math.floor(tempoDecorridoAtual / 60);
    
    const tempoTotalMinutos = tempoRegistradoMinutos + tempoAtualMinutos;
    
    const horas = Math.floor(tempoTotalMinutos / 60);
    const minutos = tempoTotalMinutos % 60;

    const questoesFeitas = estudosHoje.reduce((acc, curr) => acc + (Number(curr.questoesFeitas) || 0), 0);
    const questoesAcertadas = estudosHoje.reduce((acc, curr) => acc + (Number(curr.questoesAcertadas) || 0), 0);
    const flashcards = estudosHoje.reduce((acc, curr) => acc + (Number(curr.flashcardsRevisados) || 0), 0);
    
    // Matérias estudadas hoje (únicas)
    const materias = new Set(estudosHoje.map(e => e.materia)).size;

    return {
      tempoFormatado: `${horas}h ${minutos}min`,
      questoesFeitas,
      questoesAcertadas,
      taxaAcerto: questoesFeitas > 0 ? Math.round((questoesAcertadas / questoesFeitas) * 100) : 0,
      flashcards,
      materias,
      qtdRegistros: estudosHoje.length
    };
  }, [estudos, tempoDecorridoAtual]);

  return (
    <Card className="border-2 h-full hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-700 dark:text-gray-200">
          <Activity className="h-5 w-5 text-green-500" />
          Resumo do Dia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Tempo Total */}
          <div className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tempo Total</p>
              <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{resumo.tempoFormatado}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Questões */}
            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">Questões</span>
              </div>
              <p className="text-xl font-bold">{resumo.questoesFeitas}</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                {resumo.taxaAcerto}% acertos
              </p>
            </div>

            {/* Matérias */}
            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">Matérias</span>
              </div>
              <p className="text-xl font-bold">{resumo.materias}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {resumo.qtdRegistros} sessões
              </p>
            </div>
          </div>

          {/* Flashcards */}
          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
                <Brain className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Flashcards</span>
            </div>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{resumo.flashcards}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

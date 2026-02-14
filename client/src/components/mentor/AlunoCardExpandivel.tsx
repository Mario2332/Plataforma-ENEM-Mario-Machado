import { useState } from "react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { MetasBadges } from "./MetasBadges";
import { AlunoResumoExpandido } from "./AlunoResumoExpandido";

interface AlunoCardExpandivelProps {
  aluno: any;
  formatarDataCadastro: (aluno: any) => string;
  onVerAreaCompleta: (aluno: any) => void;
  onResumo: (aluno: any) => void;
  onMetas: (aluno: any) => void;
  onAnotacoes: (aluno: any) => void;
  onEdit: (aluno: any) => void;
  onDelete: (aluno: any) => void;
}

export function AlunoCardExpandivel({
  aluno,
  formatarDataCadastro,
  onVerAreaCompleta,
  onResumo,
  onMetas,
  onAnotacoes,
  onEdit,
  onDelete,
}: AlunoCardExpandivelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
            {aluno.nome}
          </div>
        </TableCell>
        <TableCell>{formatarDataCadastro(aluno)}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <MetasBadges alunoId={aluno.id} />
        </TableCell>
        <TableCell>{aluno.questoesFeitas}</TableCell>
        <TableCell>
          <span className={`font-medium ${
            aluno.desempenho >= 80 ? 'text-green-600' :
            aluno.desempenho >= 60 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {aluno.desempenho}%
          </span>
        </TableCell>
        <TableCell>{aluno.horasEstudo}h</TableCell>
        <TableCell>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            aluno.diasInatividade === 0 ? 'bg-green-100 text-green-800' :
            aluno.diasInatividade <= 3 ? 'bg-yellow-100 text-yellow-800' :
            aluno.diasInatividade <= 7 ? 'bg-orange-100 text-orange-800' :
            'bg-red-100 text-red-800'
          }`}>
            {aluno.diasInatividade === 0 ? 'Hoje' :
             aluno.diasInatividade === 1 ? '1 dia' :
             `${aluno.diasInatividade} dias`}
          </span>
        </TableCell>
        <TableCell>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            aluno.ativo !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}>
            {aluno.ativo !== false ? "Ativo" : "Inativo"}
          </span>
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVerAreaCompleta(aluno)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-muted/30 p-6">
            <AlunoResumoExpandido
              alunoId={aluno.id}
              onVerAreaCompleta={() => onVerAreaCompleta(aluno)}
              onMetas={() => onMetas(aluno)}
              onAnotacoes={() => onAnotacoes(aluno)}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

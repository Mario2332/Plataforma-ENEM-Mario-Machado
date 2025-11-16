import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import studyData from "@shared/study-content-data.json";

interface Topic {
  id: string;
  name: string;
  incidenceValue: number;
  incidenceLevel: string;
}

interface MentorMateriaPageProps {
  materiaKey: string;
}

export default function MentorMateriaPage({ materiaKey }: MentorMateriaPageProps) {
  const materia = (studyData as any)[materiaKey];
  
  const topics: Topic[] = useMemo(() => {
    return materia?.topics || [];
  }, [materia]);

  const getIncidenceBadgeColor = (level: string) => {
    switch (level) {
      case "Muito alta!": return "bg-red-500 text-white hover:bg-red-600";
      case "Alta!": return "bg-orange-500 text-white hover:bg-orange-600";
      case "Média": return "bg-yellow-500 text-black hover:bg-yellow-600";
      case "Baixa": return "bg-blue-500 text-white hover:bg-blue-600";
      case "Muito baixa": return "bg-gray-400 text-white hover:bg-gray-500";
      default: return "bg-gray-300 text-black hover:bg-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{materia?.displayName || "Matéria"}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{topics.length} tópicos cadastrados</p>
          </div>
          <BookOpen className="w-8 h-8 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tópico</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Incidência</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topics.map((topic) => (
                  <tr key={topic.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{topic.name}</td>
                    <td className="px-4 py-3">
                      <Badge className={getIncidenceBadgeColor(topic.incidenceLevel)}>
                        {topic.incidenceLevel}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

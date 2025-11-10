import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, BarChart3, Users, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";

export default function LoginMentor() {
  const [, setLocation] = useLocation();
  const { signIn } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    senha: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.senha) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);

    try {
      await signIn(loginData.email, loginData.senha);
      toast.success("Login realizado com sucesso!");
      setLocation("/mentor");
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      
      // Mensagens de erro amigáveis
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        toast.error("Email ou senha incorretos");
      } else if (error.code === "auth/user-not-found") {
        toast.error("Usuário não encontrado");
      } else if (error.code === "auth/too-many-requests") {
        toast.error("Muitas tentativas. Tente novamente mais tarde");
      } else {
        toast.error("Erro ao fazer login. Tente novamente");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Informações */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 to-indigo-700 p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <Building2 className="h-10 w-10" />
            <h1 className="text-3xl font-bold">Mentoria Mário Machado</h1>
          </div>
          <h2 className="text-4xl font-bold mb-6">
            Gerencie seus alunos e acompanhe o progresso de cada um
          </h2>
          <p className="text-lg text-purple-100 mb-12">
            Plataforma completa para mentores acompanharem o desenvolvimento dos seus alunos rumo à aprovação no ENEM.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="bg-white/10 p-3 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Gestão de Alunos</h3>
              <p className="text-purple-100">Adicione e gerencie todos os seus alunos em um só lugar</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-white/10 p-3 rounded-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Acompanhamento Detalhado</h3>
              <p className="text-purple-100">Visualize métricas e progresso de cada aluno</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-white/10 p-3 rounded-lg">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Comunicação Direta</h3>
              <p className="text-purple-100">Mantenha contato e ofereça suporte personalizado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center">Área do Mentor</CardTitle>
            <CardDescription className="text-center">
              Entre com suas credenciais para acessar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mentor@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  value={loginData.senha}
                  onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Apenas mentores autorizados podem acessar esta área.</p>
              <p className="mt-1">Entre em contato com o gestor para obter acesso.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, GraduationCap, Target, TrendingUp, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function LoginAluno() {
  const [, setLocation] = useLocation();
  const { signIn } = useAuthContext();
  const [loading, setLoading] = useState(false);

  // Estado para Login
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
    console.log('[LoginAluno] Iniciando login...');

    try {
      console.log('[LoginAluno] Chamando signIn...');
      await signIn(loginData.email, loginData.senha);
      console.log('[LoginAluno] signIn retornou com sucesso');
      toast.success("Login realizado com sucesso!");
      console.log('[LoginAluno] Navegando para /aluno');
      setLocation("/aluno");
      console.log('[LoginAluno] setLocation executado');
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos flutuantes */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-400/10 rounded-full blur-3xl" />

      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center relative z-10">
        {/* Lado Esquerdo - Informações Premium */}
        <div className="text-center md:text-left space-y-6 animate-fade-in">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-xl opacity-50" />
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/plataforma-mentoria-mario.firebasestorage.app/o/Logo%2FLogo%20mentoria%20sem%20texto.png?alt=media&token=452fed10-1481-41ad-a4c1-ddd61b039409" 
                alt="Logo Mentoria Mário Machado" 
                className="w-16 h-16 object-contain relative z-10 drop-shadow-2xl"
              />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-cyan-600 to-sky-600 bg-clip-text text-transparent">
              Mentoria Mário Machado
            </h1>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2 justify-center md:justify-start">
            <Sparkles className="w-8 h-8 text-blue-500" />
            Sua jornada rumo ao ENEM começa aqui!
          </h2>
          
          <p className="text-gray-600 text-lg font-semibold">
            Organize seus estudos, acompanhe seu progresso e alcance seus objetivos com nossa plataforma completa de gestão de estudos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3 bg-gradient-to-br from-white to-blue-50 p-5 rounded-xl border-2 border-blue-200 hover:shadow-xl transition-all hover:scale-105">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Registro de Estudos</h3>
                <p className="text-sm text-gray-600 font-semibold">Acompanhe cada sessão de estudo</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gradient-to-br from-white to-cyan-50 p-5 rounded-xl border-2 border-cyan-200 hover:shadow-xl transition-all hover:scale-105">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-sky-500 rounded-lg shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Simulados</h3>
                <p className="text-sm text-gray-600 font-semibold">Registre e analise seus simulados</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gradient-to-br from-white to-sky-50 p-5 rounded-xl border-2 border-sky-200 hover:shadow-xl transition-all hover:scale-105">
              <div className="p-2 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-lg shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Métricas</h3>
                <p className="text-sm text-gray-600 font-semibold">Visualize seu progresso em tempo real</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gradient-to-br from-white to-indigo-50 p-5 rounded-xl border-2 border-indigo-200 hover:shadow-xl transition-all hover:scale-105">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Cronograma</h3>
                <p className="text-sm text-gray-600 font-semibold">Organize sua rotina de estudos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito - Formulário de Login */}
        <Card className="w-full shadow-2xl border-2 border-blue-200 bg-white/95 backdrop-blur-sm animate-slide-up">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200">
            <CardTitle className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
              <Zap className="w-8 h-8 text-blue-500" />
              Área do Aluno
            </CardTitle>
            <CardDescription className="text-base font-semibold text-gray-600">
              Entre com suas credenciais
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="font-bold text-base">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  disabled={loading}
                  required
                  className="border-2 h-12 font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-senha" className="font-bold text-base">Senha</Label>
                <Input
                  id="login-senha"
                  type="password"
                  placeholder="••••••••"
                  value={loginData.senha}
                  onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                  disabled={loading}
                  required
                  className="border-2 h-12 font-semibold"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 font-bold text-lg shadow-lg hover:shadow-xl transition-all" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Entrando...
                  </div>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

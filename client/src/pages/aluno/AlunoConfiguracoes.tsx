import { useState, useEffect, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
// Substituindo alunoApi por funções diretas
import { getUserDirect, updateUserDirect } from "@/lib/firestore-direct-mentor"; // Usando do mentor pois tem as funções de user genéricas
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings, User, Lock, Loader2, Camera, Trash2, Upload, Zap, Sparkles } from "lucide-react";
import { getAuth, updateEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functions, auth } from "@/lib/firebase";

export default function AlunoConfiguracoes() {
  const { refreshUserData, userData } = useAuthContext();
  const [aluno, setAluno] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState({
    nome: "",
    email: "",
    celular: "",
    curso: "",
    faculdade: "",
  });

  const [passwordData, setPasswordData] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });

  const loadAluno = async () => {
    try {
      setIsLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Usando getUserDirect para buscar dados do usuário na coleção users (raiz)
      const data = await getUserDirect(userId);
      setAluno(data);
      setProfileData({
        nome: data.nome || "",
        email: data.email || "",
        celular: data.celular || "",
        curso: data.curso || userData?.curso || "",
        faculdade: data.faculdade || userData?.faculdade || "",
      });
      setPhotoPreview(data.photoURL || userData?.photoURL || null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados do aluno");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAluno();
  }, []);

  useEffect(() => {
    if (userData?.photoURL && !photoPreview) {
      setPhotoPreview(userData.photoURL);
    }
  }, [userData?.photoURL]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);

    if (!profileData.nome || !profileData.email) {
      toast.error("Nome e email são obrigatórios");
      setLoadingProfile(false);
      return;
    }

    try {
      const authInstance = getAuth();
      const userId = authInstance.currentUser?.uid;
      
      if (!userId) {
        throw new Error("Usuário não autenticado");
      }

      if (authInstance.currentUser && profileData.email !== aluno?.email) {
        await updateEmail(authInstance.currentUser, profileData.email);
      }

      // Usando updateUserDirect para atualizar dados na coleção users (raiz)
      await updateUserDirect(userId, { 
        nome: profileData.nome, 
        celular: profileData.celular,
        curso: profileData.curso,
        faculdade: profileData.faculdade,
        email: profileData.email // Atualizando email no firestore também
      });
      
      toast.success("Perfil atualizado com sucesso!");
      await loadAluno();
      await refreshUserData(); // Atualizar contexto global
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPassword(true);

    if (!passwordData.senhaAtual || !passwordData.novaSenha || !passwordData.confirmarSenha) {
      toast.error("Preencha todos os campos de senha");
      setLoadingPassword(false);
      return;
    }

    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      toast.error("As senhas não coincidem");
      setLoadingPassword(false);
      return;
    }

    if (passwordData.novaSenha.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres");
      setLoadingPassword(false);
      return;
    }

    try {
      const authInstance = getAuth();
      const user = authInstance.currentUser;
      if (!user || !user.email) {
        toast.error("Usuário não autenticado");
        setLoadingPassword(false);
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, passwordData.senhaAtual);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.novaSenha);

      toast.success("Senha alterada com sucesso!");
      setPasswordData({
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: "",
      });
    } catch (error: any) {
      if (error.code === "auth/wrong-password") {
        toast.error("Senha atual incorreta");
      } else {
        toast.error(error.message || "Erro ao alterar senha");
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Tamanho máximo: 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      setPhotoPreview(imageData);
      await uploadPhoto(imageData);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (imageData: string) => {
    try {
      setLoadingPhoto(true);
      // Cloud Function continua sendo a melhor opção para upload de imagem
      const uploadProfilePhoto = httpsCallable(functions, "uploadProfilePhoto");
      
      const result = await uploadProfilePhoto({ imageData });
      const data = result.data as any;

      if (data.success) {
        toast.success("Foto de perfil atualizada com sucesso!");
        await loadAluno();
        await refreshUserData();
      }
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error(error.message || "Erro ao fazer upload da foto");
      setPhotoPreview(aluno?.photoURL || null);
    } finally {
      setLoadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm("Tem certeza que deseja remover sua foto de perfil?")) {
      return;
    }

    try {
      setLoadingPhoto(true);
      // Cloud Function para deletar foto
      const deleteProfilePhoto = httpsCallable(functions, "deleteProfilePhoto");
      const result = await deleteProfilePhoto();
      const data = result.data as any;

      if (data.success) {
        toast.success("Foto de perfil removida com sucesso!");
        await loadAluno();
        await refreshUserData();
      }
    } catch (error: any) {
      console.error("Erro ao deletar foto:", error);
      toast.error(error.message || "Erro ao remover foto");
    } finally {
      setLoadingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Zap className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8 animate-fade-in">
      <div className="fixed top-20 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-float-delayed pointer-events-none" />

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 p-8 text-white animate-slide-up">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
            <Settings className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-4xl font-black mb-2">Configurações</h1>
            <p className="text-blue-50 text-lg">Gerencie suas informações pessoais e preferências de conta</p>
          </div>
        </div>
      </div>

      <Card className="border-2 hover:shadow-2xl transition-shadow rounded-2xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black">Foto de Perfil</CardTitle>
              <CardDescription className="font-semibold">Adicione ou atualize sua foto de perfil</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="w-40 h-40 rounded-full overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 border-4 border-blue-200 shadow-2xl group-hover:scale-105 transition-transform">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100">
                    <User className="w-20 h-20 text-blue-400" />
                  </div>
                )}
              </div>
              {loadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white"></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="gap-2 border-2 hover:border-blue-500 hover:text-blue-500 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loadingPhoto}
                >
                  <Upload className="w-4 h-4" />
                  Alterar Foto
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                />
                {photoPreview && (
                  <Button 
                    variant="destructive" 
                    className="gap-2"
                    onClick={handleDeletePhoto}
                    disabled={loadingPhoto}
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Recomendado: Imagem quadrada, máx. 5MB (JPG, PNG)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="border-2 hover:shadow-2xl transition-shadow rounded-2xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black">Dados Pessoais</CardTitle>
                <CardDescription className="font-semibold">Atualize suas informações de cadastro</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={profileData.nome}
                  onChange={(e) => setProfileData({ ...profileData, nome: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="celular">Celular (WhatsApp)</Label>
                <Input
                  id="celular"
                  value={profileData.celular}
                  onChange={(e) => setProfileData({ ...profileData, celular: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="curso">Curso Desejado</Label>
                <Input
                  id="curso"
                  value={profileData.curso}
                  onChange={(e) => setProfileData({ ...profileData, curso: e.target.value })}
                  placeholder="Ex: Medicina"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faculdade">Faculdade dos Sonhos</Label>
                <Input
                  id="faculdade"
                  value={profileData.faculdade}
                  onChange={(e) => setProfileData({ ...profileData, faculdade: e.target.value })}
                  placeholder="Ex: USP, UNICAMP..."
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" disabled={loadingProfile}>
                {loadingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-2xl transition-shadow rounded-2xl animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black">Segurança</CardTitle>
                <CardDescription className="font-semibold">Altere sua senha de acesso</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha Atual</Label>
                <Input
                  id="senhaAtual"
                  type="password"
                  value={passwordData.senhaAtual}
                  onChange={(e) => setPasswordData({ ...passwordData, senhaAtual: e.target.value })}
                  placeholder="Sua senha atual"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  value={passwordData.novaSenha}
                  onChange={(e) => setPasswordData({ ...passwordData, novaSenha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={passwordData.confirmarSenha}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmarSenha: e.target.value })}
                  placeholder="Repita a nova senha"
                />
              </div>

              <Button type="submit" variant="outline" className="w-full border-2 hover:bg-blue-50 hover:text-blue-600 font-bold py-6 rounded-xl transition-all" disabled={loadingPassword}>
                {loadingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  "Alterar Senha"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

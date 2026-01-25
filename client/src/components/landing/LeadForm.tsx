import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export function LeadForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    
    // Simulação de envio
    setTimeout(() => {
      setLoading(false);
      toast.success("Inscrição realizada com sucesso! Você receberá o link em breve.");
      setEmail("");
    }, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="Seu melhor e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 bg-card/50 border-primary/20 text-white placeholder:text-muted-foreground focus-visible:ring-primary focus-visible:border-primary"
          required
        />
        <Button 
          type="submit" 
          disabled={loading}
          className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base shadow-[0_0_20px_rgba(154,255,0,0.3)] hover:shadow-[0_0_30px_rgba(154,255,0,0.5)] transition-all duration-300"
        >
          {loading ? "Enviando..." : "QUERO O DESCONTO"}
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        🔒 Seus dados estão seguros. Junte-se a centenas de estudantes.
      </p>
    </form>
  );
}

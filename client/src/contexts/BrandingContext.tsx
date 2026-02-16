import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useDomain } from "@/hooks/useDomain";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface BrandingConfig {
  name: string;
  logoUrl: string;
  colors: {
    primary: string; // HSL value like "220 90% 56%"
    secondary: string;
  };
}

const DEFAULT_BRANDING: BrandingConfig = {
  name: "Mentoria Mário Machado",
  logoUrl: "https://firebasestorage.googleapis.com/v0/b/plataforma-mentoria-mario.firebasestorage.app/o/Logo%2FLogo%20mentoria%20sem%20texto.png?alt=media&token=452fed10-1481-41ad-a4c1-ddd61b039409",
  colors: {
    primary: "221.2 83.2% 53.3%", // Blue 600
    secondary: "199 89% 48%", // Cyan 500
  },
};

interface BrandingContextType {
  branding: BrandingConfig;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  loading: true,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const domain = useDomain();
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBranding() {
      if (!domain) return;

      try {
        // Tenta buscar configuração específica do domínio
        // A coleção 'tenants' deve ter documentos com ID igual ao domínio
        const docRef = doc(db, "tenants", domain);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<BrandingConfig>;
          setBranding({
            ...DEFAULT_BRANDING,
            ...data,
            colors: {
              ...DEFAULT_BRANDING.colors,
              ...data.colors,
            },
          });
        }
      } catch (error) {
        console.error("Erro ao carregar branding:", error);
        // Mantém o padrão em caso de erro
      } finally {
        setLoading(false);
      }
    }

    loadBranding();
  }, [domain]);

  // Aplica as cores ao CSS Variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", branding.colors.primary);
    // Adicione outras variáveis conforme necessário
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);

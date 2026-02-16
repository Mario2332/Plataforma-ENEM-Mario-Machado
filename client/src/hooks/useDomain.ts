import { useState, useEffect } from "react";

export function useDomain() {
  const [domain, setDomain] = useState<string>("");

  useEffect(() => {
    // Em desenvolvimento, podemos simular domínios diferentes
    // Em produção, usamos window.location.hostname
    const hostname = window.location.hostname;
    setDomain(hostname);
  }, []);

  return domain;
}

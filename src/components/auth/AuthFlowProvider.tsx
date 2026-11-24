import { createContext, useContext, useState, type ReactNode } from "react";

type AuthFlowContextValue = {
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (email: string | null) => void;
};

const AuthFlowContext = createContext<AuthFlowContextValue | null>(null);

export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  return (
    <AuthFlowContext.Provider value={{ pendingVerificationEmail, setPendingVerificationEmail }}>
      {children}
    </AuthFlowContext.Provider>
  );
}

export function useAuthFlow() {
  const context = useContext(AuthFlowContext);
  if (!context) {
    throw new Error("useAuthFlow must be used within AuthFlowProvider.");
  }
  return context;
}

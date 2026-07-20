import { Suspense } from "react";
import AuthPage from "./auth-client";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center text-muted">
          Cargando…
        </div>
      }
    >
      <AuthPage />
    </Suspense>
  );
}

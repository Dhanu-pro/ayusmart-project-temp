"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ClinicsDashboard from "@/components/clinics/ClinicsDashboard";

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    if (authState !== "checking") {
      return;
    }

    const timerId = window.setTimeout(() => {
      const nonceInUrl = searchParams.get("loginNonce");
      const nonceInSession = window.sessionStorage.getItem("rmd_admin_login_nonce");
      const isAllowed =
        Boolean(nonceInUrl) && Boolean(nonceInSession) && nonceInUrl === nonceInSession;

      if (isAllowed) {
        window.sessionStorage.removeItem("rmd_admin_login_nonce");
        window.history.replaceState({}, "", "/new_admin/pages/dashboard");
      }

      setAuthState(isAllowed ? "allowed" : "denied");
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [authState, searchParams]);

  useEffect(() => {
    if (authState === "denied") {
      window.location.replace(
        "/new_admin/pages/main_page?next=/new_admin/pages/dashboard",
      );
    }
  }, [authState]);

  if (authState !== "allowed") {
    return <main className="min-h-screen bg-slate-50" />;
  }

  return <ClinicsDashboard />;
}

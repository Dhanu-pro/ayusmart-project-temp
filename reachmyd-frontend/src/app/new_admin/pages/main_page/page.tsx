"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./styles.module.css";

type LoginState = {
  username: string;
  password: string;
};

type ValidationErrors = {
  username?: string;
  password?: string;
};

export default function AdminMainPage() {
  const [form, setForm] = useState<LoginState>({ username: "", password: "" });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => !isSubmitting && form.username.trim().length > 0 && form.password.length > 0,
    [form.password.length, form.username, isSubmitting],
  );

  const validate = () => {
    const nextErrors: ValidationErrors = {};

    if (!form.username.trim()) {
      nextErrors.username = "Enter Username";
    }

    if (!form.password) {
      nextErrors.password = "Enter Password";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:3000/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
        }),
      });

      if (!response.ok) {
        setServerError("Invalid user name or password");
        return;
      }

      const data = (await response.json()) as { RESPONSE?: string };
      if (data.RESPONSE !== "SUCCESS") {
        setServerError("Invalid user name or password");
        return;
      }

      const nonce =
        typeof window.crypto?.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      window.sessionStorage.removeItem("rmd_admin_authenticated");
      window.sessionStorage.setItem("rmd_admin_login_nonce", nonce);

      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get("next") || "/new_admin/pages/dashboard";
      const separator = nextPath.includes("?") ? "&" : "?";
      window.location.href = `${nextPath}${separator}loginNonce=${encodeURIComponent(nonce)}`;
    } catch {
      setServerError("Invalid user name or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.loginShell}>
        <div className={styles.loginContent}>
          <div className={styles.logoWrap}>
            <Image
              className={styles.logo}
              src="/new_admin/images/logo.png"
              alt="RMD Admin"
              width={210}
              height={67}
              priority
            />
          </div>

          <div className={styles.loginCard}>
            <form id="rmd_login_form" className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="rmd_username" className={styles.label}>
                  Username
                </label>
                <input
                  id="rmd_username"
                  name="rmd_username"
                  type="text"
                  className={`${styles.input} ${errors.username ? styles.inputError : ""}`}
                  placeholder="Username"
                  autoFocus
                  value={form.username}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, username: event.target.value }));
                    if (errors.username) {
                      setErrors((prev) => ({ ...prev, username: undefined }));
                    }
                  }}
                />
                {errors.username ? <p className={styles.error}>{errors.username}</p> : null}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="rmd_password" className={styles.label}>
                  Password
                </label>
                <input
                  id="rmd_password"
                  name="rmd_password"
                  type="password"
                  className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                  placeholder="Password"
                  value={form.password}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, password: event.target.value }));
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                />
                {errors.password ? <p className={styles.error}>{errors.password}</p> : null}
              </div>

              {serverError ? <p id="show_err" className={styles.serverError}>{serverError}</p> : null}

              <button id="login_btn" type="submit" className={styles.submitButton} disabled={!canSubmit}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

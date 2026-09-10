import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "../router";
import { BrandMark } from "../components/BrandMark";
import { SystemNotice } from "../components/SystemNotice";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { authService, type AuthResult } from "../services/authService";
import { organizationService } from "../services/organizationService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { AnimatedPencil } from "../components/icons/AnimatedIcons";

export type AuthMode = "signin" | "signup" | "forgot" | "reset";
export type FormStatus = "idle" | "submitting" | "blocked" | "success";
export type ForgotStatus = "idle" | "submitting" | "sent" | "blocked";
export type ResetStatus = "idle" | "loading" | "submitting" | "success" | "expired" | "blocked";
export type FormErrors = Partial<Record<"fullName" | "email" | "password" | "confirmPassword", string>>;

function getInitialMode(): AuthMode {
  if (authService.isRecoveryMode()) {
    return "reset";
  }
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const mode = params.get("mode");
  const type = params.get("type");

  if (
    mode === "reset" ||
    mode === "reset-password" ||
    type === "recovery" ||
    hash.includes("type=recovery")
  ) {
    return "reset";
  }
  if (mode === "forgot" || mode === "forgot-password") {
    return "forgot";
  }
  if (mode === "signup") {
    return "signup";
  }
  return "signin";
}

function readInviteContext() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  const org = params.get("org");
  const email = params.get("email");
  const invite = params.get("invite");
  const isDenied = invite === "expired" || invite === "used";

  return {
    email: email ?? "",
    invite,
    isDenied,
    org: org ?? "Invited organization",
    role: role ?? "Project member",
  };
}

function validateField(
  field: "fullName" | "email" | "password" | "confirmPassword",
  value: string,
  mode: AuthMode,
  extra?: { password?: string }
): string {
  if (field === "fullName" && mode === "signup" && value.trim().length < 2) {
    return "Enter your full name so your organization can identify your approvals.";
  }
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return "Enter a valid work email address.";
  }
  if (field === "password" && value.length < 8) {
    return "Use at least 8 characters.";
  }
  if (field === "confirmPassword" && mode === "reset") {
    if (!value) return "Confirm your new password.";
    if (extra?.password && value !== extra.password) {
      return "Passwords do not match.";
    }
  }
  return "";
}

function validateAuthForm(mode: AuthMode, fullName: string, email: string, password: string) {
  const errors: FormErrors = {};
  const nameErr = validateField("fullName", fullName, mode);
  const emailErr = validateField("email", email, mode);
  const passErr = validateField("password", password, mode);
  if (nameErr) errors.fullName = nameErr;
  if (emailErr) errors.email = emailErr;
  if (passErr) errors.password = passErr;
  return errors;
}

export function AuthPage() {
  const isOnline = useOnlineStatus();
  const inviteContext = useMemo(() => readInviteContext(), []);
  const [mode, setMode] = useState<AuthMode>(() => getInitialMode());

  // Theme sync: URL param overrides -> document data-theme -> localStorage -> OS preference
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">(() => {
    const urlParam = new URLSearchParams(window.location.search).get("theme");
    if (urlParam === "dark" || urlParam === "light") return urlParam;
    const docTheme = document.documentElement.getAttribute("data-theme");
    if (docTheme === "dark" || docTheme === "light") return docTheme;
    try {
      const stored = window.localStorage.getItem("vectoris.themePreference");
      if (stored === "dark" || stored === "light") return stored;
    } catch {
      // Ignore storage errors
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const docTheme = document.documentElement.getAttribute("data-theme");
      if (docTheme === "dark" || docTheme === "light") {
        setCurrentTheme(docTheme);
      }
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("themechange", handleThemeChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("themechange", handleThemeChange);
    };
  }, []);

  // Standard Login / Signup State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(inviteContext.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState("");

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState(inviteContext.email || "");
  const [forgotStatus, setForgotStatus] = useState<ForgotStatus>("idle");
  const [forgotResendCooldown, setForgotResendCooldown] = useState(0);

  // Reset Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetStatus, setResetStatus] = useState<ResetStatus>("idle");

  // Email verification check state
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verify") === "pending" && params.get("email")) {
      return params.get("email");
    }
    return null;
  });
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (forgotResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotResendCooldown]);

  // Refs for transitions-dev sliding pill (tabs-sliding §16)
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  // Refs for transitions-dev error shake (error-state-shake §12)
  const revertTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const isSignup = mode === "signup";
  const isSubmitting = status === "submitting" || forgotStatus === "submitting" || resetStatus === "submitting";
  const canSubmit = isOnline && !inviteContext.isDenied && !isSubmitting;

  // ── Sliding pill: move pill to active tab (transitions-dev §16) ──────────
  const movePill = useCallback((animate: boolean) => {
    if (mode === "forgot" || mode === "reset") return;
    const bar = tabsRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const activeTab = bar.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!activeTab) return;

    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      pill.style.width = `${activeTab.offsetWidth}px`;
      void pill.offsetWidth; // force reflow
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      pill.style.width = `${activeTab.offsetWidth}px`;
    }
  }, [mode]);

  // Initialize pill on mount and window resize
  useEffect(() => {
    if (mode === "signin" || mode === "signup") {
      requestAnimationFrame(() => movePill(false));
      const onResize = () => movePill(false);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
  }, [mode, movePill]);

  // Move pill when mode changes (animated)
  useEffect(() => {
    if (mode === "signin" || mode === "signup") {
      requestAnimationFrame(() => movePill(true));
    }
  }, [mode, movePill]);

  // ── Error shake: trigger shake animation on a field ──────────────────────
  const triggerShake = useCallback((fieldId: string) => {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const wrap = input.closest<HTMLElement>(".auth-field");
    const shakeTarget = input.closest<HTMLElement>(".t-input") ?? input;
    if (!wrap || !shakeTarget) return;

    wrap.classList.add("is-error");
    shakeTarget.classList.add("is-error");
    shakeTarget.classList.remove("is-shaking");
    void shakeTarget.offsetWidth; // reflow to replay
    shakeTarget.classList.add("is-shaking");

    const shakeMs = 80 * 2 + 60 * 2;
    setTimeout(() => shakeTarget.classList.remove("is-shaking"), shakeMs + 20);

    if (revertTimers.current[fieldId]) clearTimeout(revertTimers.current[fieldId]);
    revertTimers.current[fieldId] = setTimeout(() => {
      delete revertTimers.current[fieldId];
      wrap.classList.remove("is-error");
      shakeTarget.classList.remove("is-error");
    }, shakeMs + 3000);
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrors({});
    setFormMessage("");
    setStatus("idle");
    if (nextMode === "forgot") {
      setForgotStatus("idle");
    }
    if (nextMode === "reset") {
      setResetStatus("idle");
    }
    const params = new URLSearchParams(window.location.search);
    params.set("mode", nextMode);
    window.history.replaceState(null, "", `/auth?${params.toString()}`);
  };

  // ── Inline blur validation ───────────────────────────────────────────────
  const handleBlur = (
    field: "fullName" | "email" | "password" | "confirmPassword",
    value: string
  ) => {
    if (!value) return;
    const err = validateField(field, value, mode, { password: newPassword });
    if (err) {
      setErrors((prev) => ({ ...prev, [field]: err }));
      const idMap = {
        fullName: "fullName",
        email: mode === "forgot" ? "forgotEmail" : "email",
        password: mode === "reset" ? "newPassword" : "password",
        confirmPassword: "confirmPassword",
      };
      triggerShake(idMap[field]);
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const clearFieldError = (
    field: "fullName" | "email" | "password" | "confirmPassword",
    fieldId: string
  ) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      const wrap = document.getElementById(fieldId)?.closest<HTMLElement>(".auth-field");
      const shakeTarget =
        document.getElementById(fieldId)?.closest<HTMLElement>(".t-input") ??
        document.getElementById(fieldId);
      if (wrap) wrap.classList.remove("is-error");
      if (shakeTarget) shakeTarget.classList.remove("is-error");
      if (revertTimers.current[fieldId]) {
        clearTimeout(revertTimers.current[fieldId]);
        delete revertTimers.current[fieldId];
      }
    }
  };

  const { navigate } = useRouter();

  // ── Auto-forward if already authenticated (Safeguarded against recovery sessions) ─
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let isMounted = true;

    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const isRecoveryFlow =
      mode === "reset" ||
      mode === "forgot" ||
      authService.isRecoveryMode() ||
      params.get("mode") === "reset" ||
      params.get("mode") === "forgot" ||
      params.get("type") === "recovery" ||
      hash.includes("type=recovery");

    if (isRecoveryFlow) {
      return;
    }

    authService.getSession().then(async (session) => {
      if (!isMounted) return;
      if (authService.isRecoveryMode()) return;

      if (session?.user && authService.isEmailConfirmed(session.user)) {
        try {
          const userOrgs = await organizationService.getUserOrganizations();
          if (!isMounted) return;
          if (userOrgs.length > 0) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/onboarding", { replace: true });
          }
        } catch {
          if (isMounted) navigate("/onboarding", { replace: true });
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [navigate, mode]);

  // ── Recovery State Listener ───────────────────────────────────────────────
  useEffect(() => {
    const unbind = authService.onRecoveryStateChange((isRecovery) => {
      if (isRecovery) {
        setMode("reset");
        setResetStatus("idle");
        setFormMessage("");
      }
    });
    return () => unbind();
  }, []);

  // ── Desktop Deep-Link & URL Callback Listener ─────────────────────────────
  useEffect(() => {
    const handleAuthSuccess = async (session: unknown, user: unknown, isRecovery?: boolean) => {
      if (isRecovery || authService.isRecoveryMode()) {
        setMode("reset");
        setResetStatus("idle");
        setFormMessage("");
        return;
      }

      setStatus("success");
      setFormMessage("Email verified! Entering workstation…");
      setUnverifiedEmail(null);

      try {
        const userOrgs = await organizationService.getUserOrganizations();
        const hasOrg = userOrgs.length > 0;
        window.setTimeout(() => {
          if (hasOrg) {
            navigate("/dashboard");
          } else {
            navigate("/onboarding");
          }
        }, 400);
      } catch {
        navigate("/onboarding");
      }
    };

    const handleAuthError = (errMsg: string, isExpired?: boolean) => {
      if (isExpired || mode === "reset") {
        setMode("reset");
        setResetStatus("expired");
        setFormMessage(errMsg || "This password reset link is no longer valid.");
      } else {
        setStatus("blocked");
        setFormMessage(errMsg);
      }
    };

    const cleanup = authService.initializeDesktopAuthListener(
      handleAuthSuccess,
      handleAuthError
    );

    return () => cleanup();
  }, [navigate, mode]);

  // ── Background Verification Polling (Dual-Sync Resiliency) ─────────────────
  useEffect(() => {
    if (!unverifiedEmail) return;

    let isDisposed = false;
    const pollInterval = setInterval(async () => {
      if (isDisposed) return;
      try {
        let verifyResult: AuthResult | null = null;
        if (password) {
          verifyResult = await authService.signIn({ email: unverifiedEmail, password });
        } else {
          const user = await authService.getCurrentUser();
          if (user && authService.isEmailConfirmed(user)) {
            verifyResult = { success: true, user, isEmailUnconfirmed: false };
          }
        }

        if (verifyResult?.success && !verifyResult.isEmailUnconfirmed) {
          if (isDisposed) return;
          clearInterval(pollInterval);
          setVerificationFeedback("Email verified! Initializing your engineering workstation…");
          const userOrgs = await organizationService.getUserOrganizations();
          const hasOrg = userOrgs.length > 0;
          window.setTimeout(() => {
            if (hasOrg) {
              navigate("/dashboard");
            } else {
              navigate("/onboarding");
            }
          }, 400);
        }
      } catch {
        // Polling errors fail silently without blocking UI
      }
    }, 3500);

    return () => {
      isDisposed = true;
      clearInterval(pollInterval);
    };
  }, [unverifiedEmail, password, navigate]);

  const handleCheckVerification = async () => {
    if (!unverifiedEmail) return;
    setIsCheckingVerification(true);
    setVerificationFeedback(null);

    try {
      let verifyResult: AuthResult | null = null;
      if (password) {
        verifyResult = await authService.signIn({ email: unverifiedEmail, password });
      } else {
        const user = await authService.getCurrentUser();
        if (user && authService.isEmailConfirmed(user)) {
          verifyResult = { success: true, user, isEmailUnconfirmed: false };
        }
      }

      if (verifyResult?.success && !verifyResult.isEmailUnconfirmed) {
        setVerificationFeedback("Email verified! Initializing your engineering workstation…");
        const userOrgs = await organizationService.getUserOrganizations();
        const hasOrg = userOrgs.length > 0;
        window.setTimeout(() => {
          if (hasOrg) {
            navigate("/dashboard");
          } else {
            navigate("/onboarding");
          }
        }, 500);
      } else {
        setVerificationFeedback(
          "Email is not yet verified. Please click the confirmation link in your inbox, then click Check Verification Status again."
        );
      }
    } catch {
      setVerificationFeedback("Could not verify status. Please check your inbox or try resending the link.");
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendLink = async () => {
    if (!unverifiedEmail || resendCooldown > 0) return;
    try {
      const res = await authService.resendVerificationEmail(unverifiedEmail);
      if (res.success) {
        setVerificationFeedback(`A fresh verification link has been dispatched to ${unverifiedEmail}.`);
        setResendCooldown(60);
      } else {
        setVerificationFeedback(res.error || "Failed to resend confirmation email.");
      }
    } catch {
      setVerificationFeedback("Error requesting verification link.");
    }
  };

  // ── Forgot Password Submission ────────────────────────────────────────────
  const handleForgotSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isOnline) {
      setForgotStatus("blocked");
      setFormMessage("No connection detected. Vectoris needs network connectivity before requesting a password reset.");
      return;
    }

    const emailErr = validateField("email", forgotEmail, "forgot");
    if (emailErr) {
      setErrors({ email: emailErr });
      setForgotStatus("blocked");
      setFormMessage("Enter a valid work email address.");
      triggerShake("forgotEmail");
      return;
    }

    setForgotStatus("submitting");
    setFormMessage("");
    setErrors({});

    try {
      const res = await authService.resetPasswordForEmail(forgotEmail);
      if (res.success) {
        setForgotStatus("sent");
        setForgotResendCooldown(60);
      } else {
        setForgotStatus("blocked");
        setFormMessage(res.error || "Unable to send reset link. Please try again.");
        triggerShake("forgotEmail");
      }
    } catch (err: unknown) {
      setForgotStatus("blocked");
      const msg = err instanceof Error ? err.message : "Error requesting password reset.";
      setFormMessage(msg);
      triggerShake("forgotEmail");
    }
  };

  const handleForgotResend = async () => {
    if (forgotResendCooldown > 0 || forgotStatus === "submitting" || !forgotEmail) return;
    try {
      const res = await authService.resetPasswordForEmail(forgotEmail);
      if (res.success) {
        setFormMessage(`A new password reset link has been dispatched.`);
        setForgotResendCooldown(60);
      } else {
        setFormMessage(res.error || "Failed to resend reset link.");
      }
    } catch {
      setFormMessage("Error resending password reset link.");
    }
  };

  // ── Reset Password Submission ─────────────────────────────────────────────
  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isOnline) {
      setResetStatus("blocked");
      setFormMessage("No connection detected. Vectoris needs network connectivity before updating your password.");
      return;
    }

    const passErr = validateField("password", newPassword, "reset");
    const confirmErr = validateField("confirmPassword", confirmPassword, "reset", { password: newPassword });

    const nextErrors: FormErrors = {};
    if (passErr) nextErrors.password = passErr;
    if (confirmErr) nextErrors.confirmPassword = confirmErr;
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setResetStatus("blocked");
      setFormMessage("Resolve the highlighted fields before continuing.");
      if (nextErrors.password) triggerShake("newPassword");
      if (nextErrors.confirmPassword) triggerShake("confirmPassword");
      return;
    }

    setResetStatus("submitting");
    setFormMessage("");

    try {
      const res = await authService.updatePassword(newPassword);
      if (res.success) {
        authService.setRecoveryMode(false);
        setResetStatus("success");
        setFormMessage("Your password has been updated successfully.");
      } else {
        const lower = (res.error || "").toLowerCase();
        if (
          lower.includes("expired") ||
          lower.includes("invalid") ||
          lower.includes("session") ||
          lower.includes("token")
        ) {
          setResetStatus("expired");
          setFormMessage("This password reset session has expired. Request a new link to continue.");
        } else {
          setResetStatus("blocked");
          setFormMessage(res.error || "Failed to update password. Please check requirements and try again.");
          triggerShake("newPassword");
        }
      }
    } catch (err: unknown) {
      setResetStatus("blocked");
      const msg = err instanceof Error ? err.message : "Error updating password.";
      setFormMessage(msg);
      triggerShake("newPassword");
    }
  };

  const handleSkipReset = async () => {
    authService.setRecoveryMode(false);
    try {
      const userOrgs = await organizationService.getUserOrganizations();
      if (userOrgs.length > 0) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    } catch {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleResetSuccessContinue = async () => {
    authService.setRecoveryMode(false);
    try {
      const userOrgs = await organizationService.getUserOrganizations();
      if (userOrgs.length > 0) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    } catch {
      navigate("/dashboard", { replace: true });
    }
  };

  // ── Standard Sign In / Sign Up Submission ─────────────────────────────────
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isOnline) {
      setStatus("blocked");
      setFormMessage("No connection detected. Vectoris needs network connectivity before authenticating.");
      return;
    }

    if (inviteContext.isDenied) {
      setStatus("blocked");
      setFormMessage("This invitation link is no longer valid. Ask an organization admin for a new invite.");
      return;
    }

    const nextErrors = validateAuthForm(mode, fullName, email, password);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus("blocked");
      setFormMessage("Resolve the highlighted fields before continuing.");
      if (nextErrors.fullName) triggerShake("fullName");
      if (nextErrors.email) triggerShake("email");
      if (nextErrors.password) triggerShake("password");
      return;
    }

    setStatus("submitting");
    setFormMessage("");

    try {
      let result;
      if (mode === "signin") {
        result = await authService.signIn({ email, password });
      } else {
        result = await authService.signUp({ email, password, fullName });
      }

      if (result.isEmailUnconfirmed) {
        setStatus("idle");
        setUnverifiedEmail(email);
        setVerificationFeedback(
          mode === "signup"
            ? `Account created! A confirmation link has been sent to ${email}. Please confirm your email before entering the workstation.`
            : `Email verification is required for ${email}. Please check your inbox and confirm your address.`
        );
        return;
      }

      if (result.success && result.session) {
        setStatus("success");
        setFormMessage(
          mode === "signup"
            ? "Account created successfully. Initializing workspace…"
            : "Credentials verified. Entering workstation…"
        );

        // Resolve user organization membership
        const userOrgs = await organizationService.getUserOrganizations();
        const hasOrg = userOrgs.length > 0;

        window.setTimeout(() => {
          if (hasOrg) {
            navigate("/dashboard");
          } else {
            navigate("/onboarding");
          }
        }, 400);
      } else {
        setStatus("blocked");
        setFormMessage(result.error || "Authentication failed. Please check your credentials.");
        triggerShake("password");
      }
    } catch (err: unknown) {
      setStatus("blocked");
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during authentication.";
      setFormMessage(msg);
      triggerShake("password");
    }
  };

  return (
    <main
      className="auth-shell"
      data-theme={currentTheme}
      data-submitting={isSubmitting ? "true" : undefined}
    >
      {/* ── Art Panel (left) ─────────────────────────────────────── */}
      <section className="auth-art-panel" aria-label="Vectoris engineering intelligence">
        <header className="auth-art-panel__brand">
          <BrandMark />
        </header>

        <img
          src="/assets/isometric-cad-artwork.png"
          alt="Isometric electrical drawing intelligence visualization."
          className="auth-art-panel__image"
        />

        <div className="auth-art-panel__caption">
          <p>Local-first engineering intelligence</p>
          <span>Confidential drawings stay under user control. Organization access is scoped by role.</span>
        </div>
      </section>

      {/* ── Form Panel (right) ───────────────────────────────────── */}
      <section className="auth-form-panel" aria-labelledby="auth-title">
        <div className="auth-form-card">
          {/* Mobile-only brand */}
          <div className="auth-mobile-brand">
            <BrandMark />
          </div>

          {/* Offline notice */}
          {!isOnline ? (
            <SystemNotice
              title="No connection"
              message="Authentication requires network access. The form remains visible so you can review the required fields."
            />
          ) : null}

          {/* Invite context */}
          {inviteContext.invite ? (
            <aside className={inviteContext.isDenied ? "invite-card invite-card--denied" : "invite-card"}>
              <p>{inviteContext.isDenied ? "Invitation unavailable" : "Organization invitation"}</p>
              <span>
                {inviteContext.isDenied
                  ? "This link is expired or already used."
                  : `${inviteContext.org} invited you as ${inviteContext.role}.`}
              </span>
            </aside>
          ) : null}

          {/* ══════════════════════════════════════════════════════════
              VIEW 1: Email Verification Required
             ══════════════════════════════════════════════════════════ */}
          {unverifiedEmail ? (
            <div className="auth-verification-view" style={{ padding: "8px 0" }}>
              <div className="auth-heading" style={{ marginBottom: "20px" }}>
                <h1 id="auth-title">Verify your work email</h1>
                <span>
                  We sent an engineering activation link to <strong>{unverifiedEmail}</strong>.
                </span>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "14px 16px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#f59e0b",
                    boxShadow: "0 0 8px rgba(245, 158, 11, 0.6)",
                    marginTop: "5px",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#fbbf24",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Status: Email Verification Required
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--app-text-secondary, #cbd5e1)",
                      marginTop: "4px",
                      lineHeight: "1.4",
                    }}
                  >
                    Vectoris requires verified operator identity to protect confidential drawing packages, single-line diagrams, and digital engineering signatures.
                  </div>
                </div>
              </div>

              {verificationFeedback && (
                <div
                  className={
                    verificationFeedback.includes("verified") || verificationFeedback.includes("confirmed")
                      ? "auth-alert auth-alert--success"
                      : "auth-alert"
                  }
                  style={{ marginBottom: "20px" }}
                  role="status"
                >
                  {verificationFeedback}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleCheckVerification}
                  disabled={isCheckingVerification}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {isCheckingVerification ? (
                    <span>Checking Status…</span>
                  ) : (
                    <>
                      <span>Check Verification Status</span>
                      <span>→</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleResendLink}
                  disabled={resendCooldown > 0 || isCheckingVerification}
                  style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {resendCooldown > 0
                    ? `Resend link in ${resendCooldown}s`
                    : "Resend confirmation email"}
                </button>

                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setEmail(unverifiedEmail);
                      setUnverifiedEmail(null);
                      setVerificationFeedback(null);
                      setMode("signup");
                      setStatus("idle");
                    }}
                    style={{
                      flex: 1,
                      padding: "8px",
                      fontSize: "12px",
                      color: "var(--app-text-muted, #94a3b8)",
                    }}
                  >
                    <AnimatedPencil size={13} style={{ marginRight: "6px" }} />
                    Edit email address
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setUnverifiedEmail(null);
                      setVerificationFeedback(null);
                      setMode("signin");
                      setStatus("idle");
                    }}
                    style={{
                      flex: 1,
                      padding: "8px",
                      fontSize: "12px",
                      color: "var(--app-text-muted, #94a3b8)",
                    }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            </div>
          ) : mode === "forgot" ? (
            /* ══════════════════════════════════════════════════════════
                VIEW 2: Forgot Password Flow
               ══════════════════════════════════════════════════════════ */
            forgotStatus === "sent" ? (
              /* Neutral Confirmation State (Email Enumeration Protection) */
              <div className="auth-verification-view" style={{ padding: "8px 0" }}>
                <div className="auth-heading" style={{ marginBottom: "20px" }}>
                  <h1 id="auth-title">Check your work email</h1>
                  <span>
                    If an account exists for <strong>{forgotEmail}</strong>, we've sent a password reset link.
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "14px 16px",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.28)",
                    marginBottom: "20px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#10b981",
                      boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
                      marginTop: "5px",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#34d399",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Status: Reset Link Dispatched
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--app-text-secondary, #cbd5e1)",
                        marginTop: "4px",
                        lineHeight: "1.4",
                      }}
                    >
                      Click the link in the email to create a new password. If you don't see the email, check your spam or junk folder.
                    </div>
                  </div>
                </div>

                {formMessage ? (
                  <div className="auth-alert auth-alert--success" style={{ marginBottom: "20px" }} role="status">
                    {formMessage}
                  </div>
                ) : null}

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={handleForgotResend}
                    disabled={forgotResendCooldown > 0 || isSubmitting}
                    style={{
                      width: "100%",
                      padding: "10px",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    {forgotResendCooldown > 0
                      ? `Resend link in ${forgotResendCooldown}s`
                      : "Resend reset link"}
                  </button>

                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => switchMode("signin")}
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontSize: "13px",
                      color: "var(--app-text-muted, #94a3b8)",
                      marginTop: "6px",
                    }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              /* Request Reset Form */
              <>
                <div className="auth-heading">
                  <h1 id="auth-title">Reset your password</h1>
                  <span>
                    Enter your work email address and we'll send a secure link to reset your password.
                  </span>
                </div>

                {formMessage ? (
                  <div className="auth-alert" role="alert" tabIndex={-1}>
                    {formMessage}
                  </div>
                ) : null}

                <form className="auth-form" noValidate onSubmit={handleForgotSubmit}>
                  <div className="auth-field t-input-wrap">
                    <label htmlFor="forgotEmail">Work email</label>
                    <div className="t-input">
                      <input
                        id="forgotEmail"
                        name="forgotEmail"
                        type="email"
                        autoComplete="email"
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          clearFieldError("email", "forgotEmail");
                        }}
                        onBlur={(e) => handleBlur("email", e.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "forgotEmail-error" : undefined}
                        disabled={isSubmitting}
                        placeholder="jane.doe@company.com"
                      />
                    </div>
                    {errors.email ? (
                      <p id="forgotEmail-error" className="t-error-msg auth-field__error">
                        {errors.email}
                      </p>
                    ) : null}
                  </div>

                  <button className="auth-submit" type="submit" disabled={!canSubmit}>
                    {forgotStatus === "submitting" ? "Sending reset link…" : "Send reset link"}
                  </button>
                </form>

                <div className="auth-secondary-actions">
                  <button type="button" onClick={() => switchMode("signin")}>
                    ← Back to sign in
                  </button>
                </div>
              </>
            )
          ) : mode === "reset" ? (
            /* ══════════════════════════════════════════════════════════
                VIEW 3: Reset Password Flow
               ══════════════════════════════════════════════════════════ */
            resetStatus === "expired" ? (
              /* Expired / Invalid Session State */
              <div className="auth-verification-view" style={{ padding: "8px 0" }}>
                <div className="auth-heading" style={{ marginBottom: "20px" }}>
                  <h1 id="auth-title">Reset link expired</h1>
                  <span>
                    This password reset link is no longer valid. Request a new one to continue.
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "14px 16px",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    marginBottom: "20px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#ef4444",
                      boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
                      marginTop: "5px",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#f87171",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Status: Link Expired or Used
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--app-text-secondary, #cbd5e1)",
                        marginTop: "4px",
                        lineHeight: "1.4",
                      }}
                    >
                      For security, password reset links expire after a limited period or upon first use.
                    </div>
                  </div>
                </div>

                {formMessage ? (
                  <div className="auth-alert" style={{ marginBottom: "20px" }} role="alert">
                    {formMessage}
                  </div>
                ) : null}

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => switchMode("forgot")}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    Request a new reset link
                  </button>

                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => switchMode("signin")}
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontSize: "13px",
                      color: "var(--app-text-muted, #94a3b8)",
                      marginTop: "6px",
                    }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            ) : resetStatus === "success" ? (
              /* Success State */
              <div className="auth-verification-view" style={{ padding: "8px 0" }}>
                <div className="auth-heading" style={{ marginBottom: "20px" }}>
                  <h1 id="auth-title">Password updated</h1>
                  <span>Your Vectoris password has been changed successfully.</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "14px 16px",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.28)",
                    marginBottom: "20px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#10b981",
                      boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
                      marginTop: "5px",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#34d399",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Status: Password Successfully Updated
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--app-text-secondary, #cbd5e1)",
                        marginTop: "4px",
                        lineHeight: "1.4",
                      }}
                    >
                      You can now sign in with your updated credentials.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleResetSuccessContinue}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <span>Enter engineering workstation</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Create New Password Form */
              <>
                <div className="auth-heading">
                  <h1 id="auth-title">Create a new password</h1>
                  <span>Choose a new, secure password for your Vectoris account.</span>
                </div>

                {formMessage ? (
                  <div className="auth-alert" role="alert" tabIndex={-1}>
                    {formMessage}
                  </div>
                ) : null}

                <form className="auth-form" noValidate onSubmit={handleResetSubmit}>
                  <div className="auth-field t-input-wrap">
                    <label htmlFor="newPassword">New password</label>
                    <div className="password-control t-input">
                      <input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          clearFieldError("password", "newPassword");
                        }}
                        onBlur={(e) => handleBlur("password", e.target.value)}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={errors.password ? "newPassword-error newPassword-hint" : "newPassword-hint"}
                        disabled={isSubmitting}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="password-control__toggle"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                        aria-pressed={showNewPassword}
                        onClick={() => setShowNewPassword((c) => !c)}
                        disabled={isSubmitting}
                      >
                        {showNewPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {errors.password ? (
                      <p id="newPassword-error" className="t-error-msg auth-field__error">
                        {errors.password}
                      </p>
                    ) : null}
                    <span id="newPassword-hint" className="auth-field__hint">
                      Use at least 8 characters.
                    </span>
                  </div>

                  <div className="auth-field t-input-wrap">
                    <label htmlFor="confirmPassword">Confirm new password</label>
                    <div className="password-control t-input">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          clearFieldError("confirmPassword", "confirmPassword");
                        }}
                        onBlur={(e) => handleBlur("confirmPassword", e.target.value)}
                        aria-invalid={Boolean(errors.confirmPassword)}
                        aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                        disabled={isSubmitting}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="password-control__toggle"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        aria-pressed={showConfirmPassword}
                        onClick={() => setShowConfirmPassword((c) => !c)}
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {errors.confirmPassword ? (
                      <p id="confirmPassword-error" className="t-error-msg auth-field__error">
                        {errors.confirmPassword}
                      </p>
                    ) : null}
                  </div>

                  <button className="auth-submit" type="submit" disabled={!canSubmit}>
                    {resetStatus === "submitting" ? "Updating password…" : "Update password & enter workstation"}
                  </button>
                </form>

                <div className="auth-secondary-actions" style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={handleSkipReset}
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--app-accent, #6366f1)",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      padding: "4px 8px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>Skip for now &amp; Continue to workstation</span>
                    <span>→</span>
                  </button>
                  <button type="button" onClick={() => switchMode("signin")}>
                    ← Return to sign in
                  </button>
                </div>
              </>
            )
          ) : (
            /* ══════════════════════════════════════════════════════════
                VIEW 4: Standard Sign In / Sign Up Form
               ══════════════════════════════════════════════════════════ */
            <>
              {/* Heading */}
              <div className="auth-heading">
                <h1 id="auth-title">{isSignup ? "Create your account" : "Sign in to Vectoris"}</h1>
                <span>
                  {isSignup
                    ? "Join your engineering workspace and start from verified project data."
                    : "Continue to your projects, drawing packages, and review queues."}
                </span>
              </div>

              {/* Mode switch — sliding pill (transitions-dev §16) */}
              <div
                ref={tabsRef}
                className="auth-mode-switch t-tabs"
                role="tablist"
                aria-label="Authentication mode"
              >
                {/* Sliding pill — aria-hidden, purely visual */}
                <span ref={pillRef} className="auth-mode-switch__pill t-tabs-pill" aria-hidden="true" />

                <button
                  type="button"
                  role="tab"
                  id="tab-signin"
                  aria-selected={!isSignup}
                  aria-controls="panel-auth"
                  className="auth-mode-switch__tab t-tab"
                  onClick={() => switchMode("signin")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-signup"
                  aria-selected={isSignup}
                  aria-controls="panel-auth"
                  className="auth-mode-switch__tab t-tab"
                  onClick={() => switchMode("signup")}
                >
                  Create account
                </button>
              </div>

              {/* Form-level alert */}
              {formMessage ? (
                <div
                  className={status === "success" ? "auth-alert auth-alert--success" : "auth-alert"}
                  role="alert"
                  tabIndex={-1}
                >
                  {formMessage}
                </div>
              ) : null}

              {/* Auth form */}
              <form id="panel-auth" className="auth-form" noValidate onSubmit={handleSubmit}>
                {isSignup ? (
                  <div className="auth-field t-input-wrap">
                    <label htmlFor="fullName">Full name</label>
                    <div className="t-input">
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          clearFieldError("fullName", "fullName");
                        }}
                        onBlur={(e) => handleBlur("fullName", e.target.value)}
                        aria-invalid={Boolean(errors.fullName)}
                        aria-describedby={errors.fullName ? "fullName-error" : undefined}
                        disabled={isSubmitting}
                        placeholder="Jane Doe"
                      />
                    </div>
                    {errors.fullName ? (
                      <p id="fullName-error" className="t-error-msg auth-field__error">
                        {errors.fullName}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="auth-field t-input-wrap">
                  <label htmlFor="email">Work email</label>
                  <div className="t-input">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError("email", "email");
                      }}
                      onBlur={(e) => handleBlur("email", e.target.value)}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      disabled={isSubmitting || Boolean(inviteContext.email)}
                      placeholder="jane.doe@company.com"
                    />
                  </div>
                  {errors.email ? (
                    <p id="email-error" className="t-error-msg auth-field__error">
                      {errors.email}
                    </p>
                  ) : null}
                </div>

                <div className="auth-field t-input-wrap">
                  <label htmlFor="password">Password</label>
                  <div className="password-control t-input">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFieldError("password", "password");
                      }}
                      onBlur={(e) => handleBlur("password", e.target.value)}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? "password-error password-hint" : "password-hint"}
                      disabled={isSubmitting}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="password-control__toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((c) => !c)}
                      disabled={isSubmitting}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {errors.password ? (
                    <p id="password-error" className="t-error-msg auth-field__error">
                      {errors.password}
                    </p>
                  ) : null}
                  <span id="password-hint" className="auth-field__hint">
                    Password managers and paste are supported.
                  </span>
                </div>

                <button className="auth-submit" type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Checking credentials…" : isSignup ? "Create account" : "Sign in"}
                </button>
              </form>

              {/* ── OAuth ──────────────────────────────────────────────────────── */}
              <div className="auth-oauth">
                <div className="auth-oauth__divider" aria-hidden="true">
                  <span>or continue with</span>
                </div>
                <div className="auth-oauth__buttons">
                  <button
                    type="button"
                    className="auth-oauth__btn"
                    disabled
                    aria-disabled="true"
                    aria-label="Sign in with Google (coming soon)"
                    title="Google sign-in — coming soon"
                  >
                    <GoogleWordmark />
                  </button>
                  <button
                    type="button"
                    className="auth-oauth__btn"
                    disabled
                    aria-disabled="true"
                    aria-label="Sign in with Microsoft (coming soon)"
                    title="Microsoft sign-in — coming soon"
                  >
                    <MicrosoftWordmark />
                  </button>
                </div>
              </div>

              {/* Secondary actions */}
              <div className="auth-secondary-actions">
                {!isSignup ? (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--auth-text-secondary)",
                      cursor: "pointer",
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.9rem",
                    }}
                  >
                    Forgot password?
                  </button>
                ) : null}
                <button type="button" onClick={() => switchMode(isSignup ? "signin" : "signup")}>
                  {isSignup ? "Already have an account? Sign in" : "Need access? Create an account"}
                </button>
              </div>
            </>
          )}

        </div>
      </section>
    </main>
  );
}

// ── OAuth brand marks ─────────────────────────────────────────────────────

function GoogleWordmark() {
  return (
    <svg
      width="80"
      height="20"
      viewBox="0 0 80 20"
      fill="none"
      aria-hidden="true"
      role="img"
    >
      <g clipPath="url(#g-clip)">
        <path
          d="M10 4.18c1.56 0 2.95.54 4.05 1.44l3.01-3.01A9.72 9.72 0 0010 .5a9.75 9.75 0 00-8.7 5.35l3.5 2.72A5.81 5.81 0 0110 4.18z"
          fill="#EA4335"
        />
        <path
          d="M19.25 10.19c0-.65-.06-1.27-.17-1.87H10v3.54h5.21a4.46 4.46 0 01-1.93 2.93l2.99 2.32c1.74-1.6 2.98-3.97 2.98-6.92z"
          fill="#4285F4"
        />
        <path
          d="M4.8 11.85A5.82 5.82 0 014.5 10c0-.65.11-1.28.3-1.88L1.3 5.4A9.74 9.74 0 000 10c0 1.57.38 3.06 1.3 4.6l3.5-2.75z"
          fill="#FBBC05"
        />
        <path
          d="M10 19.5a9.73 9.73 0 006.77-2.47l-2.99-2.32A5.8 5.8 0 0110 15.82c-2.54 0-4.7-1.72-5.47-4.03l-3.5 2.75A9.75 9.75 0 0010 19.5z"
          fill="#34A853"
        />
      </g>
      <defs>
        <clipPath id="g-clip"><rect width="19.5" height="19" x="0" y=".5"/></clipPath>
      </defs>
      <text x="24" y="15" fontFamily="-apple-system,system-ui,sans-serif" fontSize="13" fontWeight="500" fill="currentColor" letterSpacing="-0.01em">Google</text>
    </svg>
  );
}

function MicrosoftWordmark() {
  return (
    <svg
      width="94"
      height="20"
      viewBox="0 0 94 20"
      fill="none"
      aria-hidden="true"
      role="img"
    >
      <rect x="0"  y="0"  width="9" height="9" fill="#F25022"/>
      <rect x="10" y="0"  width="9" height="9" fill="#7FBA00"/>
      <rect x="0"  y="10" width="9" height="9" fill="#00A4EF"/>
      <rect x="10" y="10" width="9" height="9" fill="#FFB900"/>
      <text x="24" y="15" fontFamily="-apple-system,system-ui,sans-serif" fontSize="13" fontWeight="500" fill="currentColor" letterSpacing="-0.01em">Microsoft</text>
    </svg>
  );
}

import { useEffect, useState, useRef } from "react";
import { engineService } from "../services/engineService";
import { organizationService } from "../services/organizationService";

interface DesktopTitleBarProps {
  /** Optional title override or breadcrumb */
  title?: string;
  /** Whether the user is inside an authenticated workstation session */
  isAuthenticated?: boolean;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Organic Cubic Ease-Out Liquid Wave Progression:
 * Fast, responsive initial wave splash smoothly gliding across the viewport
 * without any pauses, holds, or stuttering.
 */
function getLiquidProgress(p: number): number {
  return 1 - Math.pow(1 - p, 2.8);
}

/**
 * Multi-frequency organic water surface harmonics in real pixels.
 */
function getWaveOffsetPx(y: number, p: number, H: number): number {
  const damp = p < 0.88 ? 1.0 : Math.max(0, (1.0 - p) / 0.12);
  if (damp <= 0) return 0;

  const yNorm = y / H;
  const w1 = 38 * Math.sin(2 * Math.PI * 1.25 * yNorm + 3.2 * p);
  const w2 = 20 * Math.cos(2 * Math.PI * 2.4 * yNorm - 4.0 * p + 0.8);
  const w3 = 14 * Math.sin(2 * Math.PI * 0.75 * yNorm + 2.0 * p + 1.3);

  return (w1 + w2 + w3) * damp;
}

/**
 * Generates an ultra-smooth cubic Bézier liquid water front in actual pixel coordinates.
 * The wave front originates from the top-right button and travels across to the bottom-left.
 * Features extra-large bounding box safeguards to eliminate clipping on high-DPI displays or window maximize.
 */
function generateLiquidFrontPath(p: number, W: number, H: number): string {
  const progress = getLiquidProgress(p);
  // High-DPI and maximize safety margins: cover beyond any display resolution
  const safeRight = Math.max(W + 500, 3840);
  const safeBottom = Math.max(H + 400, 2560);
  const safeTop = -80;

  // Wave travels from right (+160) across to far left (-350)
  const totalSpan = W + 510;
  const baseX = (W + 160) - progress * totalSpan;

  const nodeCount = 36;
  const points: Point[] = [];

  for (let i = 0; i <= nodeCount; i++) {
    const y = (i / nodeCount) * H;
    // Diagonal origin tilt: top leads by ~50px to reflect click at the top-right button
    const tilt = -(1 - y / Math.max(H, 1)) * 50;
    const undulation = getWaveOffsetPx(y, p, H);
    const x = baseX + tilt + undulation;
    points.push({ x, y });
  }

  // Construct closed path enclosing the new theme region on the right side of the moving wave front:
  // (safeRight, safeTop) -> (safeRight, safeBottom) -> (points[nodeCount].x, safeBottom) -> smooth Catmull-Rom cubic splines UP to points[0] -> (safeRight, safeTop) -> Z
  const N = points.length - 1;
  let d = `M ${Math.round(safeRight)} ${safeTop} L ${Math.round(safeRight)} ${Math.round(safeBottom)} L ${points[N].x.toFixed(1)} ${Math.round(safeBottom)} `;

  for (let i = N; i > 0; i--) {
    const pCurrent = points[i];
    const pNext = points[i - 1];

    const pPrev = i < N ? points[i + 1] : { x: pCurrent.x, y: H + (pCurrent.y - points[i - 1].y) };
    const pAfter = i - 1 > 0 ? points[i - 2] : { x: pNext.x, y: -(points[1].y - pNext.y) };

    const cp1x = pCurrent.x + (pNext.x - pPrev.x) / 6;
    const cp1y = pCurrent.y + (pNext.y - pPrev.y) / 6;

    const cp2x = pNext.x - (pAfter.x - pCurrent.x) / 6;
    const cp2y = pNext.y - (pAfter.y - pCurrent.y) / 6;

    d += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${pNext.x.toFixed(1)} ${pNext.y.toFixed(1)} `;
  }

  d += `L ${Math.round(safeRight)} ${safeTop} Z`;
  return d;
}

export function DesktopTitleBar({ title, isAuthenticated = false }: DesktopTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauriApp, setIsTauriApp] = useState(false);
  const [engineStatus, setEngineStatus] = useState<{ status: string; message: string; is_tauri: boolean }>({
    status: "standby",
    message: "Local Engine · Standby",
    is_tauri: false,
  });

  const [orgName, setOrgName] = useState<string>("Workspace");

  useEffect(() => {
    if (isAuthenticated) {
      organizationService.getUserOrganizations().then((orgs) => {
        const activeId = organizationService.getActiveOrganizationId();
        const activeOrg = orgs.find((o) => o.id === activeId) || orgs[0];
        if (activeOrg) {
          setOrgName(activeOrg.name);
        }
      });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    engineService.getEngineStatus().then((res) => {
      setEngineStatus(res);
    });
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function initTauriWindow() {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        setIsTauriApp(true);

        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);

        unlisten = await appWindow.onResized(async () => {
          const max = await appWindow.isMaximized();
          setIsMaximized(max);
        });
      } catch {
        setIsTauriApp(false);
      }
    }

    initTauriWindow();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const docTheme = document.documentElement.getAttribute("data-theme");
    if (docTheme === "dark" || docTheme === "light") return docTheme;
    try {
      const stored = window.localStorage.getItem("vectoris.themePreference");
      if (stored === "dark" || stored === "light") return stored;
    } catch {}
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const docTheme = document.documentElement.getAttribute("data-theme");
      if (docTheme === "dark" || docTheme === "light") {
        setTheme(docTheme);
      }
    };
    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  const isTransitioningRef = useRef(false);

  const toggleTheme = () => {
    if (isTransitioningRef.current) return;

    const nextTheme = theme === "dark" ? "light" : "dark";

    // 1. Reduced Motion / Fallback: If reduced motion is preferred or View Transitions are unsupported
    const isReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (typeof document.startViewTransition !== "function" || isReducedMotion) {
      setTheme(nextTheme);
      document.documentElement.setAttribute("data-theme", nextTheme);
      try {
        window.localStorage.setItem("vectoris.themePreference", nextTheme);
      } catch {}
      window.dispatchEvent(new Event("themechange"));
      return;
    }

    isTransitioningRef.current = true;

    // 2. Cancel any leftover pseudo-element animations before starting a fresh transition
    try {
      document.getAnimations().forEach((anim) => {
        const pseudo = (anim.effect as KeyframeEffect | undefined)?.pseudoElement;
        if (pseudo && pseudo.startsWith("::view-transition")) {
          anim.cancel();
        }
      });
    } catch {}

    // 3. Trigger native browser View Transition
    let transition: any;
    try {
      transition = document.startViewTransition(() => {
        setTheme(nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
        try {
          window.localStorage.setItem("vectoris.themePreference", nextTheme);
        } catch {}
        window.dispatchEvent(new Event("themechange"));
      });
    } catch {
      isTransitioningRef.current = false;
      return;
    }

    // Always reset transition lock when finished or aborted
    transition.finished
      .catch(() => {})
      .finally(() => {
        isTransitioningRef.current = false;
      });

    // 4. Animate the liquid water front directly on the compositor layer via Web Animations API
    transition.ready
      .then(() => {
        const W = window.innerWidth;
        const H = window.innerHeight;

        // Generate 32 smooth keyframes along the 550ms timeline
        const keyframes: Keyframe[] = [];
        const totalFrames = 32;

        for (let i = 0; i <= totalFrames; i++) {
          const p = i / totalFrames;
          const pathD = generateLiquidFrontPath(p, W, H);
          keyframes.push({
            clipPath: `path("${pathD}")`,
          });
        }

        // CRITICAL: DO NOT use fill: "forwards" — it prevents View Transition cleanup and freezes the snapshot!
        const anim = document.documentElement.animate(keyframes, {
          duration: 550,
          easing: "linear",
          pseudoElement: "::view-transition-new(root)",
        });

        anim.onfinish = () => {
          isTransitioningRef.current = false;
        };
        anim.oncancel = () => {
          isTransitioningRef.current = false;
        };
      })
      .catch(() => {
        isTransitioningRef.current = false;
      });
  };

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch (err) {
      console.log("Minimize clicked (browser fallback)", err);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().toggleMaximize();
      const max = await getCurrentWindow().isMaximized();
      setIsMaximized(max);
    } catch (err) {
      console.log("Maximize clicked (browser fallback)", err);
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch (err) {
      console.log("Close clicked (browser fallback)", err);
    }
  };

  return (
    <header className="desktop-titlebar" data-tauri-drag-region>
      {/* ── Left: Branding & App Identity ──────────────────── */}
      <div className="desktop-titlebar__left" data-tauri-drag-region>
        <div className="desktop-titlebar__brand" data-tauri-drag-region>
          <svg
            className="desktop-titlebar__logo"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 4.5L12 20L21 4.5H16.5L12 13L7.5 4.5H3Z"
              fill="var(--accent-primary, #dd0200)"
            />
            <circle cx="12" cy="7" r="2" fill="currentColor" />
          </svg>
          <span className="desktop-titlebar__name">Vectoris</span>
        </div>

        <span className="desktop-titlebar__version" aria-label="Version 0.2.5 local workstation">
          v0.2.5
        </span>

        {title ? (
          <>
            <span className="desktop-titlebar__sep" aria-hidden="true">/</span>
            <span className="desktop-titlebar__context">{title}</span>
          </>
        ) : null}
      </div>

      {/* ── Center: Draggable Workspace / Command Center ──── */}
      <div className="desktop-titlebar__center" data-tauri-drag-region>
        {isAuthenticated ? (
          <div className="desktop-titlebar__status-pill" data-tauri-drag-region>
            <span className={`desktop-titlebar__status-dot desktop-titlebar__status-dot--${engineStatus.status}`} aria-hidden="true" />
            <span>{engineStatus.is_tauri ? "Desktop Workstation · Standby" : "Workstation · Local Standby"}</span>
          </div>
        ) : (
          <span className="desktop-titlebar__pill-static" data-tauri-drag-region>
            Engineering Workstation · Local-First
          </span>
        )}
      </div>

      {/* ── Right: Workstation Info + Window Controls ─────── */}
      <div className="desktop-titlebar__right">
        {isAuthenticated && (
          <div className="desktop-titlebar__org-badge" title="Active Workspace">
            <span>{orgName}</span>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="desktop-theme-btn"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
        >
          {theme === "dark" ? (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="3.5" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 9.5A6 6 0 116.5 2a4.5 4.5 0 007.5 7.5z" />
            </svg>
          )}
        </button>

        {/* Window controls (Windows style) */}
        <div className="desktop-window-controls" aria-label="Window controls">
          <button
            type="button"
            className="desktop-win-btn desktop-win-btn--minimize"
            onClick={handleMinimize}
            aria-label="Minimize Window"
            title="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
              <rect width="10" height="1" />
            </svg>
          </button>

          <button
            type="button"
            className="desktop-win-btn desktop-win-btn--maximize"
            onClick={handleToggleMaximize}
            aria-label={isMaximized ? "Restore Window" : "Maximize Window"}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2.5" y="0.5" width="7" height="7" rx="0.5" />
                <path d="M0.5 2.5v7h7" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="desktop-win-btn desktop-win-btn--close"
            onClick={handleClose}
            aria-label="Close Window"
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 1l8 8M9 1L1 9" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  isOnline: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isStandalone: false,
    canInstall: false,
    isOnline: navigator.onLine,
    installPrompt: null,
  });

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setState((prev) => ({
      ...prev,
      isStandalone,
      isInstalled: isStandalone,
    }));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState((prev) => ({
        ...prev,
        canInstall: true,
        installPrompt: e as BeforeInstallPromptEvent,
      }));
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        installPrompt: null,
      }));
    };

    // Listen for online/offline
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const promptInstall = async () => {
    if (!state.installPrompt) return false;

    try {
      await state.installPrompt.prompt();
      const { outcome } = await state.installPrompt.userChoice;
      
      if (outcome === "accepted") {
        setState((prev) => ({
          ...prev,
          canInstall: false,
          installPrompt: null,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Install prompt error:", error);
      return false;
    }
  };

  return {
    ...state,
    promptInstall,
  };
}

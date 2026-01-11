import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "admin_layout_preferences";

interface LayoutPreferences {
  dashboardCards: string[];
  sidebarModules: string[];
  sidebarFeatures: string[];
  sidebarSupport: string[];
}

const DEFAULT_LAYOUT: LayoutPreferences = {
  dashboardCards: [
    "revenue",
    "users",
    "commissions",
    "geography",
    "subscriptions",
    "codes",
    "tickets",
    "activity"
  ],
  sidebarModules: [
    "/admin",
    "/admin/financials",
    "/admin/users",
    "/admin/subscriptions",
    "/admin/resellers",
    "/admin/geography"
  ],
  sidebarFeatures: [
    "/admin/features",
    "/admin/roadmap",
    "/admin/feature-analytics",
    "/admin/commissions",
    "/admin/promo-codes"
  ],
  sidebarSupport: [
    "/admin/notifications",
    "/admin/support",
    "/admin/logs",
    "/admin/setup"
  ]
};

export function useAdminLayout() {
  const [layout, setLayout] = useState<LayoutPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_LAYOUT, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Failed to load layout preferences:", e);
    }
    return DEFAULT_LAYOUT;
  });

  // Save to localStorage whenever layout changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (e) {
      console.warn("Failed to save layout preferences:", e);
    }
  }, [layout]);

  const updateDashboardCards = useCallback((newOrder: string[]) => {
    setLayout((prev) => ({ ...prev, dashboardCards: newOrder }));
  }, []);

  const updateSidebarSection = useCallback(
    (section: "sidebarModules" | "sidebarFeatures" | "sidebarSupport", newOrder: string[]) => {
      setLayout((prev) => ({ ...prev, [section]: newOrder }));
    },
    []
  );

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    layout,
    updateDashboardCards,
    updateSidebarSection,
    resetLayout,
  };
}

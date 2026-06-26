import { NavLink, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@shared/lib/store";
import { useAuthStore } from "@shared/auth/auth-store";
import { ProgressBar } from "./ProgressBar";
import { BrandMark } from "./BrandMark";

// ---- SVG icon helpers (inline, placeholder quality) ----

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.6"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.6"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4"/>
    </svg>
  );
}

function IconStudy() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8 2V8M2 5.5L8 8L14 5.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function IconDecks() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconImport() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconAiGenerate() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2l1.5 3.5L13 7l-3.5 1.5L8 12l-1.5-3.5L3 7l3.5-1.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="13" cy="12" r="1.5" fill="currentColor" opacity="0.6"/>
      <circle cx="4" cy="3" r="1" fill="currentColor" opacity="0.4"/>
    </svg>
  );
}

function IconAskNotes() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2l3 2 3-2h2a1 1 0 001-1V3a1 1 0 00-1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconCollapse() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconExpand() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ---- Nav item ----

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  dueCount?: number;
  collapsed?: boolean;
}

function NavItem({ to, icon, label, end, dueCount, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      {...(end && { end })}
      className="group block"
      style={{ textDecoration: "none" }}
      {...(collapsed ? { "aria-label": label } : {})}
    >
      {({ isActive }) => (
        <span
          className="flex w-full items-center gap-3 transition-colors"
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 500,
            backgroundColor: isActive ? "#ffffff" : "transparent",
            color: isActive ? "#343433" : "#848281",
            boxShadow: isActive ? "#f2f0ed 0 0 0 1px inset" : "none",
          }}
        >
          <span className="shrink-0">{icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{label}</span>
              {typeof dueCount === "number" && dueCount > 0 && (
                <span
                  className="shrink-0 text-[11px] font-semibold text-white"
                  style={{
                    backgroundColor: "#ff3e00",
                    borderRadius: "10px",
                    padding: "1px 7px",
                  }}
                >
                  {dueCount}
                </span>
              )}
            </>
          )}
        </span>
      )}
    </NavLink>
  );
}

// ---- Sidebar props ----

interface SidebarProps {
  studyDueCount?: number;
  goalCurrent?: number;
  goalTotal?: number;
}

export function Sidebar({ studyDueCount = 0, goalCurrent = 0, goalTotal = 40 }: SidebarProps) {
  const { t } = useTranslation();
  const sidebarOpen = usePreferencesStore((s) => s.sidebarOpen);
  const toggleSidebar = usePreferencesStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const displayName = user?.displayName ?? user?.email ?? "User";
  const displayEmail = user?.email ?? "";
  const initial = displayName.charAt(0).toUpperCase();

  const goalPct = goalTotal > 0 ? goalCurrent / goalTotal : 0;

  return (
    <>
      {/* Sidebar panel */}
      <aside
        data-testid="sidebar"
        style={{
          width: sidebarOpen ? "248px" : "0px",
          padding: sidebarOpen ? "24px 16px" : "24px 0",
          borderRight: sidebarOpen ? "1px solid #f2f0ed" : "none",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          height: "100vh",
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 0.24s cubic-bezier(0.4,0,0.2,1), padding 0.24s cubic-bezier(0.4,0,0.2,1)",
          backgroundColor: "var(--color-warm-canvas)",
        }}
      >
        {/* Brand row */}
        <div className="mb-4 flex items-center" style={{ gap: "8px" }}>
          <BrandMark size="sm" wordmarkTestId="sidebar-wordmark" className="flex-1" />
          {sidebarOpen && (
            <button
              type="button"
              aria-label={t('nav.collapseAria')}
              data-testid="sidebar-collapse-btn"
              onClick={toggleSidebar}
              className="flex items-center justify-center transition-colors hover:opacity-80"
              style={{
                marginLeft: "auto",
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                color: "var(--color-ash)",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f2f0ed";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              }}
            >
              <IconCollapse />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav aria-label={t('nav.mainNavAria')} data-testid="sidebar-nav" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <NavItem to="/" icon={<IconDashboard />} label={t('nav.dashboard')} end collapsed={!sidebarOpen} />
          <NavItem to="/study" icon={<IconStudy />} label={t('nav.study')} dueCount={studyDueCount} collapsed={!sidebarOpen} />
          <NavItem to="/decks" icon={<IconDecks />} label={t('nav.cardsDecks')} collapsed={!sidebarOpen} />
          <NavItem to="/import" icon={<IconImport />} label={t('nav.importJson')} collapsed={!sidebarOpen} />
          <NavItem to="/ai/generate" icon={<IconAiGenerate />} label={t('nav.aiGenerate')} collapsed={!sidebarOpen} />
          <NavItem to="/rag/chat" icon={<IconAskNotes />} label={t('nav.askYourNotes')} collapsed={!sidebarOpen} />
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Settings nav item */}
        <NavItem to="/settings" icon={<IconSettings />} label={t('nav.settings')} collapsed={!sidebarOpen} />

        {sidebarOpen && (
          <>
            {/* Daily goal widget */}
            <div
              data-testid="sidebar-daily-goal"
              style={{
                backgroundColor: "var(--color-parchment-card)",
                borderRadius: "12px",
                padding: "14px",
                marginTop: "8px",
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-medium" style={{ color: "#848281" }}>
                  {t('nav.dailyGoal')}
                </span>
                <span className="text-[12px] font-semibold" style={{ color: "#343433" }}>
                  {goalCurrent}/{goalTotal}
                </span>
              </div>
              <ProgressBar value={goalPct} color="#00ca48" height={7} data-testid="sidebar-goal-progress" />
            </div>

            {/* User card */}
            <button
              type="button"
              data-testid="sidebar-user-card"
              onClick={() => navigate("/settings")}
              className="mt-2 flex w-full items-center gap-2 rounded-[10px] p-2 text-left transition-colors hover:bg-[#f6f4ef]"
              style={{ border: "none", backgroundColor: "transparent", cursor: "pointer" }}
            >
              {/* Avatar */}
              <div
                className="flex shrink-0 items-center justify-center text-[13px] font-semibold text-white"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#0090ff",
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-semibold"
                  style={{ color: "#343433", margin: 0 }}
                >
                  {displayName}
                </p>
                {displayEmail && (
                  <p
                    className="truncate text-[11px]"
                    style={{ color: "#a7a7a7", margin: 0 }}
                  >
                    {displayEmail}
                  </p>
                )}
              </div>
            </button>
          </>
        )}
      </aside>

      {/* Floating re-open button — always mounted so it can cross-fade IN only after the panel has
          finished collapsing (transition-delay matches the panel's 0.24s width animation), and OUT
          instantly when expanding. This avoids the button overlapping the still-closing sidebar. */}
      <button
        type="button"
        aria-label={t('nav.expandAria')}
        data-testid="sidebar-expand-btn"
        onClick={toggleSidebar}
        aria-hidden={sidebarOpen}
        tabIndex={sidebarOpen ? -1 : 0}
        className="flex items-center justify-center"
        style={{
          position: "fixed",
          top: "16px",
          left: "16px",
          zIndex: 40,
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          backgroundColor: "#ffffff",
          boxShadow: "var(--shadow-sm)",
          border: "none",
          cursor: "pointer",
          color: "var(--color-charcoal-primary)",
          opacity: sidebarOpen ? 0 : 1,
          transform: sidebarOpen ? "scale(0.85)" : "scale(1)",
          pointerEvents: sidebarOpen ? "none" : "auto",
          transition: "opacity 0.18s ease, transform 0.18s ease",
          // Collapsing: wait for the panel to finish (0.24s) before showing.
          // Expanding: hide immediately (no delay) so it never overlaps the opening panel.
          transitionDelay: sidebarOpen ? "0s" : "0.24s",
        }}
      >
        <IconExpand />
      </button>
    </>
  );
}

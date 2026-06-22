import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { useUserStats } from "@shared/stats/use-user-stats";

export function AppShell() {
  const { data: userStats } = useUserStats();

  return (
    <div
      data-testid="app-shell"
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "var(--color-warm-canvas)",
        overflow: "hidden",
      }}
    >
      <Sidebar
        {...(userStats?.dueToday !== undefined && { studyDueCount: userStats.dueToday })}
        {...(userStats?.reviewedToday !== undefined && { goalCurrent: userStats.reviewedToday })}
        {...(userStats?.dailyGoal !== undefined && { goalTotal: userStats.dailyGoal })}
      />
      <main
        data-testid="app-shell-main"
        className="flex-1 overflow-y-auto"
        style={{ minWidth: 0 }}
      >
        <Outlet />
      </main>
    </div>
  );
}

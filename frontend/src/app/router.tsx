import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { BlanksPage } from "../pages/BlanksPage";
import { ClientListPage } from "../pages/ClientListPage";
import { DashboardPage } from "../pages/DashboardPage";
import { DeletedAuditPage } from "../pages/DeletedAuditPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { EncountersPage } from "../pages/EncountersPage";
import { LoginPage } from "../pages/LoginPage";
import { RecallsPage } from "../pages/RecallsPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { canAccessReports, canAccessSettings } from "../shared/access";
import { useAuth } from "../shared/auth";

function ProtectedRoute({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  if (!allowed) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function AppRouter() {
  const { session } = useAuth();

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<ClientListPage />} />
      <Route path="/clients" element={<ClientListPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/blanks" element={<BlanksPage />} />
        <Route path="/encounters" element={<EncountersPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/deleted-audit" element={<DeletedAuditPage />} />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowed={canAccessReports(session.roleCode)}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/recalls" element={<RecallsPage />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowed={canAccessSettings(session.roleCode)}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { ClientListPage } from "../pages/ClientListPage";
import { DashboardPage } from "../pages/DashboardPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { EncountersPage } from "../pages/EncountersPage";
import { LoginPage } from "../pages/LoginPage";
import { RecallsPage } from "../pages/RecallsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { useAuth } from "../shared/auth";

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
      <Route element={<AppLayout />}>
        <Route path="/" element={<ClientListPage />} />
        <Route path="/clients" element={<ClientListPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/encounters" element={<EncountersPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/recalls" element={<RecallsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

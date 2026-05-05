import { Navigate, Route, Routes } from "react-router-dom";

import { AccessLayout } from "../components/AccessLayout";
import { AdminDeskPage } from "../pages/AdminDeskPage";
import { DocumentsDeskPage } from "../pages/DocumentsDeskPage";
import { RecallsDeskPage } from "../pages/RecallsDeskPage";
import { RegistryPage } from "../pages/RegistryPage";
import { VisitsPage } from "../pages/VisitsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AccessLayout />}>
        <Route path="/" element={<RegistryPage />} />
        <Route path="/visits" element={<VisitsPage />} />
        <Route path="/documents" element={<DocumentsDeskPage />} />
        <Route path="/recalls" element={<RecallsDeskPage />} />
        <Route path="/admin" element={<AdminDeskPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

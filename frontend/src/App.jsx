import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";

import DeliveryRadarPage from "./pages/DeliveryRadar/DeliveryRadarPage";
import EpicDetailPage from "./pages/EpicDetail/EpicDetailPage";
import EpicsPage from "./pages/Epics/EpicsPage";

import TeamsPage from "./pages/Teams/TeamsPage";
import TeamDetailPage from "./pages/Teams/TeamDetailPage";

import IntegrationsPage from "./pages/Integrations/IntegrationsPage";
import IntegrationDetailPage from "./pages/Integrations/IntegrationDetailPage";

import SettingsPage from "./pages/Settings/SettingsPage";
import NotFoundPage from "./pages/NotFound/NotFoundPage";

import LoginPage from "./pages/Auth/LoginPage";
import SignupPage from "./pages/Auth/SignupPage";
import RequireAuth from "./components/auth/RequireAuth";
import WeeklyCheckinsPage from "./pages/WeeklyCheckins/WeeklyCheckinsPage";
import HomePage from "./pages/Home/HomePage";

export default function App() {
  return (
    <Routes>
      {/* Public marketing homepage */}
      <Route path="/" element={<HomePage />} />

      {/* Public auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected app */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/radar" element={<DeliveryRadarPage />} />

          <Route path="/epics" element={<EpicsPage />} />
          <Route path="/epic/:id" element={<EpicDetailPage />} />

          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/team/:id" element={<TeamDetailPage />} />

          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/integrations/:id" element={<IntegrationDetailPage />} />

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/checkins" element={<WeeklyCheckinsPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

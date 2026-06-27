import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./stores";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PresentAuthoringPage } from "./pages/PresentAuthoringPage";
import { PastAuthoringPage } from "./pages/PastAuthoringPage";
import { FutureAuthoringPage } from "./pages/FutureAuthoringPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="ocean/*" element={<Navigate to="/present" replace />} />
        <Route path="present" element={<PresentAuthoringPage />} />
        <Route path="faults" element={<Navigate to="/present" replace />} />
        <Route path="virtues" element={<Navigate to="/present" replace />} />
        <Route path="past" element={<PastAuthoringPage />} />
        <Route path="future" element={<FutureAuthoringPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

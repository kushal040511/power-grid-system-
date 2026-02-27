import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ChatWidget from "./components/ChatWidget";
import Dashboard from "./pages/Dashboard";
import RiskMap from "./pages/RiskMap";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

const Layout = ({ children }) => (
  <div className="min-h-screen flex">
    <Sidebar />
    <main className="flex-1 p-6 lg:p-10 space-y-8">
      {children}
    </main>
    <ChatWidget />
  </div>
);

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("gg_token");
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/map"
        element={
          <PrivateRoute>
            <Layout>
              <RiskMap />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <PrivateRoute>
            <Layout>
              <Alerts />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Layout>
              <Reports />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

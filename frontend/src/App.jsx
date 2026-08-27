import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FileManager from './pages/FileManager';
import WebServices from './pages/WebServices';
import Settings from './pages/Settings';

export default function App() {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="animate-pulse text-sm text-zinc-500">Loading iCpanel…</div>
      </div>
    );
  }

  // Not authenticated: show the login screen regardless of the route
  if (!user) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/files" element={<FileManager />} />
        <Route path="/services" element={<WebServices />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

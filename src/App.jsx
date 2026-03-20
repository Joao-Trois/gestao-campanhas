import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tags from './pages/Tags';
import Templates from './pages/Templates';
import TemplateForm from './pages/TemplateForm';
import ContactLists from './pages/ContactLists';
import ContactListImport from './pages/ContactListImport';
import ContactListDetails from './pages/ContactListDetails';
import Campaigns from './pages/Campaigns';
import CampaignWizard from './pages/CampaignWizard';
import CampaignDetails from './pages/CampaignDetails';
import Settings from './pages/Settings';
import DashboardLayout from './layouts/DashboardLayout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center text-[var(--color-primary)] font-medium">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { profile, loading } = useAuth();
  
  if (loading || profile === null) {
    return <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center text-[var(--color-primary)] font-medium">Carregando...</div>;
  }
  
  if (profile.role !== 'admin') {
    return <Navigate to="/campanhas" replace />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="tags" element={<Tags />} />
            <Route path="templates" element={<Templates />} />
            <Route path="templates/novo" element={<TemplateForm />} />
            <Route path="templates/:id" element={<TemplateForm />} />
            <Route path="listas" element={<ContactLists />} />
            <Route path="listas/importar" element={<ContactListImport />} />
            <Route path="listas/:id" element={<ContactListDetails />} />
            <Route path="campanhas" element={<Campaigns />} />
            <Route path="campanhas/nova" element={<CampaignWizard />} />
            <Route path="campanhas/:id/editar" element={<CampaignWizard />} />
            <Route path="campanhas/:id" element={<CampaignDetails />} />
            <Route 
              path="configuracoes" 
              element={
                <AdminRoute>
                  <Settings />
                </AdminRoute>
              } 
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

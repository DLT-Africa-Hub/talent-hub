import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import GraduateDashboard from './pages/GraduateDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AccountType from './pages/AccountType';
import GraduateOnboarding from './pages/GraduateOnboarding';
import SkillAssessment from './pages/SkillAssessment';
import Layout from './components/layout/Layout';
import ExploreCompany from './pages/ExploreCompany';
import GraduateApplications from './pages/GraduateApplications';
import CompanyPreview from './pages/CompanyPreview';
import AuthPage from './pages/AuthPage';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';

function App() {
  return (
    <AuthProvider>
      <div className="App">
      
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage mode='login'/>} />
          <Route path="/register" element={<AuthPage mode='register' />} />
          <Route
            path="/graduate/*"
            element={
              <Layout>
                 <GraduateDashboard />
              </Layout>
            }
          />
          <Route
            path="/company/*"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <CompanyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/role" element={<AccountType />} />
          <Route path="/onboarding" element={<GraduateOnboarding />} />
          <Route path="/assessment" element={<SkillAssessment />} />
          <Route path="/company-preview/:id" element={<CompanyPreview mode='application' />} />
          <Route path="/contactCompany/:id" element={<CompanyPreview mode='contact'/>} />
          <Route path="/explore" element={<Layout >
            <ExploreCompany/>
          </Layout>} />
          <Route path="/applications" element={<Layout >
            <GraduateApplications/>
          </Layout>} />
          <Route path="/messages/:id" element={<Layout >
            <Messages/>
          </Layout>} />
          <Route path="/messages" element={<Layout >
            <Messages/>
          </Layout>} />
          <Route path="/notifications" element={<Layout >
            <Notifications/>
          </Layout>} />
          
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;


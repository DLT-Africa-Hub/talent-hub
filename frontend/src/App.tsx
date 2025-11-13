import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import GraduateDashboard from './pages/talent/GraduateDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AccountType from './pages/AccountType';
import Layout from './components/layout/Layout';
import CompanyPreview from './pages/talent/CompanyPreview';
import AuthPage from './pages/AuthPage';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import GraduateOnboarding from './pages/talent/GraduateOnboarding';
import SkillAssessment from './pages/talent/SkillAssessment';
import ExploreCompany from './pages/talent/ExploreCompany';
import GraduateApplications from './pages/talent/GraduateApplications';
import CompanyDashboard from './pages/CompanyDashboard';

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


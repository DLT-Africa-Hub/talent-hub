import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import GraduateDashboard from './pages/GraduateDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import AccountType from './components/onboarding/AccountType';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        {/* <Navbar /> */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/graduate/*"
            element={
              <ProtectedRoute allowedRoles={['graduate']}>
                <GraduateDashboard />
              </ProtectedRoute>
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
          <Route path="/onboarding" element={<AccountType />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;


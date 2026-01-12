import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={navbarStyle}>
      <div style={containerStyle}>
        <Link to="/" style={logoStyle}>
          Recruita
        </Link>
        <div style={linksStyle}>
          {isAuthenticated ? (
            <>
              <span style={userStyle}>Welcome, {user?.email}</span>
              {user?.role === 'graduate' && (
                <Link to="/graduate" style={linkStyle}>
                  Dashboard
                </Link>
              )}
              {user?.role === 'company' && (
                <Link to="/company" style={linkStyle}>
                  Dashboard
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" style={linkStyle}>
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} style={buttonStyle}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={linkStyle}>
                Login
              </Link>
              <Link to="/register" style={linkStyle}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// TODO: Move styles to CSS module or styled-components
const navbarStyle: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: 'white',
  padding: '1rem 0',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 2rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const logoStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  color: 'white',
  textDecoration: 'none',
};

const linksStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.5rem',
  alignItems: 'center',
};

const linkStyle: React.CSSProperties = {
  color: 'white',
  textDecoration: 'none',
  fontSize: '1rem',
};

const userStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  opacity: 0.9,
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: '1px solid white',
  color: 'white',
  padding: '0.5rem 1rem',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '1rem',
};

export default Navbar;

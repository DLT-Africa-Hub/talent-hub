import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../index';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch admin stats and data
    // const fetchData = async () => {
    //   try {
    //     const statsRes = await api.get('/admin/ai-stats');
    //     setStats(statsRes.data.stats);
    //   } catch (error) {
    //     console.error('Error fetching data:', error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // fetchData();
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={containerStyle}>
        <LoadingSpinner message="Loading dashboard..." fullPage />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1>Admin Dashboard</h1>
      <p>TODO: Implement user management, job management, match monitoring, and AI stats</p>
      
      {/* TODO: Stats Overview */}
      {/* TODO: Users Management */}
      {/* TODO: Jobs Management */}
      {/* TODO: Matches Monitoring */}
      {/* TODO: AI Activity Logs */}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
};

export default AdminDashboard;


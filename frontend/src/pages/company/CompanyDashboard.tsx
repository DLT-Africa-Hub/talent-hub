import { useState, useEffect } from 'react';
import api from '../api/auth';

const CompanyDashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch company profile and jobs
    // const fetchData = async () => {
    //   try {
    //     const profileRes = await api.get('/companies/profile');
    //     const jobsRes = await api.get('/companies/jobs');
    //     setProfile(profileRes.data);
    //     setJobs(jobsRes.data.jobs);
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
    return <div style={containerStyle}>Loading...</div>;
  }

  return (
    <div style={containerStyle}>
      <h1>Company Dashboard</h1>
      <p>TODO: Implement company profile, job posting, and match review</p>
      
      {/* TODO: Profile Section */}
      {/* TODO: Job Posting Form */}
      {/* TODO: Jobs List */}
      {/* TODO: Match Review */}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
};

export default CompanyDashboard;


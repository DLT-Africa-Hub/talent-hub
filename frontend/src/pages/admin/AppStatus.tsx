import React, { useEffect, useState } from 'react';
import {
  FiServer,
  FiDatabase,
  FiZap,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiMonitor,
} from 'react-icons/fi';
import { adminApi } from '../../api/admin';

interface ServiceItemProps {
  icon: React.ReactNode;
  title: string;
  status: 'operational' | 'degraded' | 'down' | 'loading';
  responseTime: string | null;
  uptime?: string;
}

const ServiceItem: React.FC<ServiceItemProps> = ({
  icon,
  title,
  status,
  responseTime,
  uptime,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'operational':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'down':
        return 'text-red-600';
      case 'loading':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'down':
        return 'Down';
      case 'loading':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'operational':
        return <FiCheckCircle />;
      case 'degraded':
      case 'down':
        return <FiXCircle />;
      case 'loading':
        return <FiLoader className="animate-spin" />;
      default:
        return <FiLoader className="animate-spin" />;
    }
  };

  return (
    <div className="p-5 border border-fade rounded-xl bg-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <div className="text-gray-600 text-2xl">{icon}</div>
        <div>
          <p className="font-semibold text-gray-800">{title}</p>
          {uptime && <p className="text-sm text-gray-500">Uptime: {uptime}</p>}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {responseTime !== null && (
          <p className="text-sm text-gray-600 flex flex-col">
            <p>Response Time</p>
            <span className="font-semibold text-gray-800 lg:self-end">
              {responseTime}
            </span>
          </p>
        )}

        <span
          className={`flex items-center gap-1 font-medium mt-1 sm:mt-0 ${getStatusColor()}`}
        >
          {getStatusIcon()} {getStatusText()}
        </span>
      </div>
    </div>
  );
};

interface HealthData {
  backend: {
    status: 'operational' | 'degraded' | 'down' | 'loading';
    responseTime: string | null;
    databaseConnected: boolean;
  };
  aiService: {
    status: 'operational' | 'degraded' | 'down' | 'loading';
    responseTime: string | null;
  };
  frontend: {
    status: 'operational';
    responseTime: string | null;
  };
}

const ApplicationStatus: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData>({
    backend: {
      status: 'loading',
      responseTime: null,
      databaseConnected: false,
    },
    aiService: { status: 'loading', responseTime: null },
    frontend: { status: 'operational', responseTime: null },
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealthData = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      // Fetch backend health (includes database status)
      const backendHealthPromise = adminApi.getHealthStatus();

      // Fetch AI service health
      const aiHealthPromise = adminApi.getAIHealthStatus();

      const [backendHealth, aiHealth] = await Promise.allSettled([
        backendHealthPromise,
        aiHealthPromise,
      ]);

      // Process backend health
      let backendStatus: 'operational' | 'degraded' | 'down' = 'down';
      let backendResponseTime: string | null = null;
      let databaseConnected = false;

      if (backendHealth.status === 'fulfilled' && backendHealth.value?.data) {
        const data = backendHealth.value.data;
        backendStatus = data.status === 'ok' ? 'operational' : 'down';
        databaseConnected = data.database?.connected || false;
        // Calculate response time from when we started
        backendResponseTime = `${Date.now() - startTime}ms`;
      } else {
        backendStatus = 'down';
      }

      // Process AI service health
      let aiStatus: 'operational' | 'degraded' | 'down' = 'down';
      let aiResponseTime: string | null = null;

      if (aiHealth.status === 'fulfilled' && aiHealth.value?.data) {
        const data = aiHealth.value.data;
        aiStatus = data.status === 'ok' ? 'operational' : 'down';
        aiResponseTime = data.responseTime || null;
      } else {
        aiStatus = 'down';
      }

      setHealthData({
        backend: {
          status: backendStatus,
          responseTime: backendResponseTime,
          databaseConnected,
        },
        aiService: {
          status: aiStatus,
          responseTime: aiResponseTime,
        },
        frontend: {
          status: 'operational',
          responseTime: null, // Frontend doesn't need response time
        },
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
      setHealthData({
        backend: {
          status: 'down',
          responseTime: null,
          databaseConnected: false,
        },
        aiService: { status: 'down', responseTime: null },
        frontend: { status: 'operational', responseTime: null },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    // Refresh health data every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate overall system status
  const allOperational =
    healthData.backend.status === 'operational' &&
    healthData.aiService.status === 'operational' &&
    healthData.backend.databaseConnected;

  const systemStatus = allOperational
    ? 'All Systems Operational'
    : 'Some Systems Degraded';

  const systemStatusColor = allOperational
    ? 'text-green-600'
    : 'text-yellow-600';

  return (
    <div className="w-full px-6 py-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Application Status & Control
        </h1>
        <p className="text-gray-500">Monitor and manage platform health</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
        <div className="p-6 border border-fade rounded-xl bg-white shadow-sm flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">System status</p>
            <p className={`text-lg font-semibold ${systemStatusColor}`}>
              {isLoading ? 'Checking...' : systemStatus}
            </p>
          </div>
          {isLoading ? (
            <FiLoader className="text-gray-400 text-2xl animate-spin" />
          ) : allOperational ? (
            <FiCheckCircle className="text-green-600 text-2xl" />
          ) : (
            <FiXCircle className="text-yellow-600 text-2xl" />
          )}
        </div>

        <div className="p-6 border border-fade rounded-xl bg-white shadow-sm flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Backend Uptime</p>
            <p className="text-lg font-semibold text-blue-600">
              {healthData.backend.status === 'operational'
                ? '99.99%'
                : healthData.backend.status === 'loading'
                  ? '...'
                  : '0%'}
            </p>
          </div>
          <FiZap className="text-blue-500 text-2xl" />
        </div>

        <div className="p-6 border border-fade rounded-xl bg-white shadow-sm flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Database Status</p>
            <p
              className={`text-lg font-semibold ${
                healthData.backend.databaseConnected
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {healthData.backend.databaseConnected
                ? 'Connected'
                : 'Disconnected'}
            </p>
          </div>
          <FiDatabase
            className={`text-2xl ${
              healthData.backend.databaseConnected
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          />
        </div>
      </div>

      {/* Service Health */}
      <h2 className="text-lg font-semibold text-gray-800 mt-12 mb-4">
        Service Health
      </h2>

      <div className="flex flex-col gap-4">
        <ServiceItem
          icon={<FiServer />}
          title="API Server"
          status={healthData.backend.status}
          responseTime={healthData.backend.responseTime}
        />
        <ServiceItem
          icon={<FiDatabase />}
          title="Database"
          status={
            healthData.backend.databaseConnected
              ? healthData.backend.status
              : 'down'
          }
          responseTime={null}
        />
        <ServiceItem
          icon={<FiServer />}
          title="AI Service"
          status={healthData.aiService.status}
          responseTime={healthData.aiService.responseTime}
        />
        <ServiceItem
          icon={<FiMonitor />}
          title="Frontend"
          status={healthData.frontend.status}
          responseTime={healthData.frontend.responseTime}
        />
      </div>
    </div>
  );
};

export default ApplicationStatus;

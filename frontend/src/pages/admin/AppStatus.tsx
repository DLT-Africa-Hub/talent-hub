import React from "react";
import { FiServer, FiDatabase, FiZap, FiUsers, FiCheckCircle } from "react-icons/fi";

interface ServiceItemProps {
  icon: React.ReactNode;
  title: string;
  uptime: string;
  responseTime: string;
}

const ServiceItem: React.FC<ServiceItemProps> = ({ icon, title, uptime, responseTime }) => {
  return (
    <div className="p-5 border border-fade rounded-xl bg-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <div className="text-gray-600 text-2xl">{icon}</div>
        <div>
          <p className="font-semibold text-gray-800">{title}</p>
          <p className="text-sm text-gray-500">Uptime: {uptime}</p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-600 flex flex-col ">
          <p>Response Time</p>
          <span className="font-semibold text-gray-800  lg:self-end ">{responseTime}</span>
        </p>

        <span className="flex items-center gap-1 text-green-600 font-medium mt-1 sm:mt-0">
          <FiCheckCircle /> Operational
        </span>
      </div>

    </div>
  );
};


const ApplicationStatus: React.FC = () => {
  return (
    <div className="w-full px-6 py-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Application Status & Control</h1>
        <p className="text-gray-500">Monitor and manage platform health</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
        <div className="p-6 border border-fade rounded-xl bg-white shadow-sm flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">System status</p>
            <p className="text-lg font-semibold text-green-600">All Systems Operational</p>
          </div>
          <FiCheckCircle className="text-green-600 text-2xl" />
        </div>

        <div className="p-6 border border-fade rounded-xl bg-white shadow-sm flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Average Uptime (7D)</p>
            <p className="text-lg font-semibold text-blue-600">99.94%</p>
          </div>
          <FiZap className="text-blue-500 text-2xl" />
        </div>

        <div className="p-6 border border-fade rounded-xl bg-white shadow-sm flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Active Users</p>
            <p className="text-lg font-semibold text-purple-600">2,341</p>
          </div>
          <FiUsers className="text-purple-500 text-2xl" />
        </div>
      </div>

      {/* Service Health */}
      <h2 className="text-lg font-semibold text-gray-800 mt-12 mb-4">Service Health</h2>

      <div className="flex flex-col gap-4">
        <ServiceItem
          icon={<FiServer />}
          title="API Server"
          uptime="99.99%"
          responseTime="145ms"
        />
        <ServiceItem
          icon={<FiDatabase />}
          title="Database"
          uptime="99.99%"
          responseTime="N/A"
        />
        <ServiceItem
          icon={<FiServer />}
          title="Cache Server"
          uptime="99.99%"
          responseTime="145ms"
        />
        <ServiceItem
          icon={<FiServer />}
          title="API Server"
          uptime="99.99%"
          responseTime="145ms"
        />
      </div>
    </div>
  );
};

export default ApplicationStatus;

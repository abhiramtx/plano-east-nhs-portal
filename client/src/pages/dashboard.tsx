import { useState, useEffect } from "react";
import { User, getCurrentUser } from "@/lib/firebase";
import { Clock, CheckCircle, Calendar } from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // Mock data for now - will be replaced with real data
  const stats = {
    verifiedFallHours: 0,
    verifiedSpringHours: 0,
    totalHours: 0,
  };

  const monthlyData = [
    { month: "Jun", hours: 0 },
    { month: "Jul", hours: 0 },
    { month: "Aug", hours: 0 },
    { month: "Sep", hours: 0 },
    { month: "Oct", hours: 0 },
    { month: "Nov", hours: 0 },
    { month: "Dec", hours: 0 },
    { month: "Jan", hours: 0 },
    { month: "Feb", hours: 0 },
    { month: "Mar", hours: 0 },
    { month: "Apr", hours: 0 },
    { month: "May", hours: 0 },
  ];

  const maxHours = Math.max(...monthlyData.map(d => d.hours), 4);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <nav className="text-sm text-gray-500 mb-2">
                Student / Dashboard
              </nav>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome to your dashboard!</p>
            </div>
            <div className="bg-yellow-400 rounded-full p-4">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-9 9a1 1 0 001.414 1.414L9 5.414V17a1 1 0 102 0V5.414l7.293 7.293a1 1 0 001.414-1.414l-9-9z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">You're all set!</h2>
            <p className="text-gray-600">
              Your account has been activated and your registration has been filed. You can access your profile information on the sidebar.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="text-orange-500 mr-3">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stats.verifiedFallHours}</p>
                <p className="text-sm text-gray-600">VERIFIED FALL HOURS</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="text-purple-500 mr-3">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stats.verifiedSpringHours}</p>
                <p className="text-sm text-gray-600">VERIFIED SPRING HOURS</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="text-blue-500 mr-3">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalHours}</p>
                <p className="text-sm text-gray-600">HOURS ALL TIME</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Hours Dedicated To Service Per Month</h3>
          <div className="h-64">
            <div className="flex items-end justify-between h-full">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="w-full flex justify-center mb-2">
                    <div
                      className="bg-blue-200 rounded-t"
                      style={{
                        height: `${(data.hours / maxHours) * 200}px`,
                        width: '20px',
                        minHeight: '2px'
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{data.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
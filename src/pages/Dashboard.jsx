import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  CheckCircle, Clock, XCircle, TrendingUp, IndianRupee
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, icon: Icon, colorClass, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:border-blue-200' : ''}`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

const COLORS = ['#F59E0B', '#3B82F6', '#10B981']; // Pending, Partial, Completed

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/accounts/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.status === 'success') {
          setData(response.data.data);
        } else {
          setError('Failed to fetch dashboard data');
        }
      } catch (err) {
        console.error(err);
        setError('An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const paymentData = [
    { name: 'Pending', value: data.paymentStatusBreakdown?.pending || 0 },
    { name: 'Partial', value: data.paymentStatusBreakdown?.partial || 0 },
    { name: 'Completed', value: data.paymentStatusBreakdown?.completed || 0 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Accountant Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of sales and payment statuses.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Closed Won" 
          value={data.totalClosedWon} 
          icon={TrendingUp} 
          colorClass="bg-blue-50 text-blue-600" 
          onClick={() => navigate('/leads-list?status=all')}
        />
        <StatCard 
          title="Verified Sales" 
          value={data.verifiedSales} 
          icon={CheckCircle} 
          colorClass="bg-green-50 text-green-600" 
          onClick={() => navigate('/leads-list?status=verified')}
        />
        <StatCard 
          title="Pending Verification" 
          value={data.pendingVerification} 
          icon={Clock} 
          colorClass="bg-yellow-50 text-yellow-600" 
          onClick={() => navigate('/leads-list?status=pending')}
        />
        <StatCard 
          title="Rejected Sales" 
          value={data.rejectedSales} 
          icon={XCircle} 
          colorClass="bg-red-50 text-red-600" 
          onClick={() => navigate('/leads-list?status=rejected')}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Payment Status Breakdown</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} allowDecimals={false} />
                <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Payment Status Distribution</h3>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

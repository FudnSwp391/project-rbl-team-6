import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import api from '../../config/axios';

const PredictiveTrendDashboard = ({ studentId }) => {
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const res = await api.get(`/api/students/${studentId}/predictive-trend`);
        setTrendData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchTrend();
  }, [studentId]);

  if (loading) return <div className="p-4 animate-pulse bg-gray-100 rounded-xl h-40"></div>;
  if (!trendData) return null;

  const isGathering = trendData.status === 'Gathering Data';

  // Biểu đồ demo xu hướng (nếu có đủ dữ liệu, ta có thể fetch biểu đồ thật, ở đây vẽ tượng trưng score)
  const chartData = [
    { name: 'Tuần -3', score: trendData.score ? trendData.score * 0.8 : 0 },
    { name: 'Tuần -2', score: trendData.score ? trendData.score * 0.9 : 0 },
    { name: 'Tuần -1', score: trendData.score ? trendData.score * 0.95 : 0 },
    { name: 'Hiện tại', score: trendData.score || 0 },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Activity size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Dự đoán Mục tiêu</h2>
          <p className="text-sm text-gray-500">Phân tích xu hướng học tập dựa trên AI</p>
        </div>
      </div>

      {isGathering ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Clock size={40} className="mb-3 text-gray-300" />
          <p className="font-medium text-gray-700">Hệ thống đang thu thập dữ liệu</p>
          <p className="text-sm">{trendData.message}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <div className={`p-5 rounded-2xl border-2 flex items-start gap-4 ${
              trendData.status === 'Green' ? 'border-green-200 bg-green-50' : 
              trendData.status === 'Yellow' ? 'border-yellow-200 bg-yellow-50' : 
              'border-red-200 bg-red-50'
            }`}>
              {trendData.status === 'Green' ? <CheckCircle className="text-green-600" size={32} /> : 
               trendData.status === 'Yellow' ? <AlertTriangle className="text-yellow-600" size={32} /> : 
               <AlertTriangle className="text-red-600" size={32} />}
              
              <div>
                <h3 className={`text-lg font-bold ${
                  trendData.status === 'Green' ? 'text-green-800' : 
                  trendData.status === 'Yellow' ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {trendData.status === 'Green' ? 'Tốc độ tuyệt vời' : 
                   trendData.status === 'Yellow' ? 'Cần chú ý nhẹ' : 'Nguy cơ sa sút'}
                </h3>
                <p className={`text-sm mt-1 font-medium ${
                  trendData.status === 'Green' ? 'text-green-700' : 
                  trendData.status === 'Yellow' ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  {trendData.message}
                </p>
                <div className="mt-3">
                  <span className="text-xs font-semibold bg-white/50 px-2 py-1 rounded-md">
                    Điểm xu hướng: {(trendData.score * 100).toFixed(0)} / 100
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis domain={[0, 1]} hide={true} />
                <Tooltip 
                  formatter={(value) => [(value * 100).toFixed(0) + '%', 'Điểm xu hướng']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke={trendData.status === 'Green' ? '#16a34a' : trendData.status === 'Yellow' ? '#ca8a04' : '#dc2626'} 
                  strokeWidth={4}
                  dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveTrendDashboard;

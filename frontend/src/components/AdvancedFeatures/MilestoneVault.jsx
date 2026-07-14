import { useState, useEffect, useCallback } from 'react';
import { Target, UploadCloud, CheckCircle, Clock, FileText } from 'lucide-react';
import api from '../../config/axios';

const MilestoneVault = ({ classId, isTutor }) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states cho Tutor
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Evidence upload
  const [uploadingMilestone, setUploadingMilestone] = useState(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await api.get(`/api/milestones/${classId}`);
      setMilestones(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (classId) fetchMilestones();
  }, [classId, fetchMilestones]);

  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/milestones', { class_id: classId, title, target_date: targetDate });
      setTitle('');
      setTargetDate('');
      setShowForm(false);
      fetchMilestones();
    } catch {
      alert('Lỗi tạo chặng');
    }
  };

  const handleUploadEvidence = async (milestoneId) => {
    try {
      await api.post('/api/evidences', { 
        milestone_id: milestoneId, 
        file_url: evidenceUrl, 
        file_type: 'image/url', 
        description: evidenceDesc 
      });
      // Gọi API complete luôn
      await api.put(`/api/milestones/${milestoneId}/complete`);
      setUploadingMilestone(null);
      setEvidenceUrl('');
      setEvidenceDesc('');
      fetchMilestones();
    } catch (e) {
      alert(e.response?.data?.error || 'Lỗi upload minh chứng');
    }
  };

  if (loading) return <div className="animate-pulse bg-gray-100 h-32 rounded-xl"></div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Chặng đường học tập (Milestones)</h2>
            <p className="text-sm text-gray-500">Mục tiêu & Minh chứng thực tế</p>
          </div>
        </div>
        {isTutor && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            + Tạo mục tiêu mới
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreateMilestone} className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên mục tiêu</label>
              <input 
                required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="VD: Đạt 8đ bài kiểm tra giữa kì"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày dự kiến đạt được</label>
              <input 
                type="date" required value={targetDate} onChange={e => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu mục tiêu</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {milestones.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-4">Chưa có mục tiêu nào được tạo cho lớp này.</p>
        ) : (
          milestones.map((m) => (
            <div key={m.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                {m.status === 'done' ? (
                  <CheckCircle className="text-green-500" size={28} />
                ) : (
                  <Clock className="text-orange-400" size={28} />
                )}
                <div>
                  <h4 className="font-bold text-gray-800">{m.title}</h4>
                  <p className="text-sm text-gray-500">Mục tiêu: {new Date(m.target_date).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0">
                {m.status === 'done' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                    <FileText size={14} /> Đã có minh chứng
                  </span>
                ) : isTutor ? (
                  uploadingMilestone === m.id ? (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2 md:mt-0 w-full md:w-80">
                      <input 
                        placeholder="Link ảnh minh chứng (URL)" 
                        value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)}
                        className="w-full text-xs p-2 border rounded mb-2"
                      />
                      <input 
                        placeholder="Mô tả minh chứng" 
                        value={evidenceDesc} onChange={e => setEvidenceDesc(e.target.value)}
                        className="w-full text-xs p-2 border rounded mb-2"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleUploadEvidence(m.id)} className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700">Upload & Hoàn thành</button>
                        <button onClick={() => setUploadingMilestone(null)} className="px-2 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setUploadingMilestone(m.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium rounded-lg hover:bg-blue-100"
                    >
                      <UploadCloud size={16} /> Nộp minh chứng
                    </button>
                  )
                ) : (
                  <span className="text-sm text-gray-400 italic">Đang chờ hoàn thành</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MilestoneVault;

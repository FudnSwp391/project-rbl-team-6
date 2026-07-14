import { useState } from 'react';
import { X, CheckCircle2, TrendingDown, Minus } from 'lucide-react';

const ParentPulseCheck = ({ isOpen, onClose, onSubmit, studentName }) => {
  const [evaluation, setEvaluation] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Kiểm tra định kỳ (Pulse Check)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Bạn thấy {studentName || 'con'} học tuần này thế nào?
            </p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <button
            onClick={() => setEvaluation('Có')}
            className={`w-full flex items-center p-4 rounded-xl border-2 transition-all ${
              evaluation === 'Có' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 hover:bg-gray-50'
            }`}
          >
            <CheckCircle2 className="mr-3" />
            <span className="font-medium">Có tiến bộ, rất tốt!</span>
          </button>
          
          <button
            onClick={() => setEvaluation('Không đổi')}
            className={`w-full flex items-center p-4 rounded-xl border-2 transition-all ${
              evaluation === 'Không đổi' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-100 hover:bg-gray-50'
            }`}
          >
            <Minus className="mr-3" />
            <span className="font-medium">Bình thường, không đổi</span>
          </button>
          
          <button
            onClick={() => setEvaluation('Kém đi')}
            className={`w-full flex items-center p-4 rounded-xl border-2 transition-all ${
              evaluation === 'Kém đi' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 hover:bg-gray-50'
            }`}
          >
            <TrendingDown className="mr-3" />
            <span className="font-medium">Sa sút, kém đi</span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 bg-gray-50 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl"
          >
            Bỏ qua
          </button>
          <button
            onClick={() => onSubmit({ evaluation })}
            disabled={!evaluation}
            className={`px-5 py-2.5 text-sm font-medium rounded-xl ${
              !evaluation ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Gửi ý kiến
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParentPulseCheck;

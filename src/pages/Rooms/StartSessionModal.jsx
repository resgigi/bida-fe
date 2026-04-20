import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import Modal from '../../components/Modal';

export default function StartSessionModal({ room, onClose }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState(user?.id || '');

  const { data: staffListRaw = [], isLoading: staffLoading } = useQuery({
    queryKey: ['assignable-staff'],
    queryFn: () => api.get('/sessions/assignable-staff').then((r) => r.data.data),
    enabled: !!room,
  });

  const staffList =
    user?.role === 'STAFF' ? staffListRaw.filter((s) => s.id === user.id) : staffListRaw;

  useEffect(() => {
    if (user?.id) setStaffId(user.id);
  }, [user?.id]);

  const startMutation = useMutation({
    mutationFn: () => api.post('/sessions/start', { roomId: room.id, staffId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Đã mở phiên chơi');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không mở được phiên'),
  });

  if (!room) return null;

  return (
    <Modal isOpen onClose={onClose} title={`Mở phiên — ${room.name}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nhân viên phụ trách</label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            disabled={staffLoading}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
          >
            {staffLoading ? (
              <option value={staffId}>Đang tải danh sách...</option>
            ) : (
              staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} {s.role === 'MANAGER' ? '(QL)' : s.role === 'CASHIER' ? '(Thu ngân)' : s.role === 'SUPER_ADMIN' ? '(Admin)' : ''}
                </option>
              ))
            )}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">
            {user?.role === 'STAFF'
              ? 'Bạn chỉ có thể chọn chính mình.'
              : 'Quản lý/thu ngân có thể giao phiên cho nhân viên khác.'}
          </p>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">
            Hủy
          </button>
          <button
            type="button"
            disabled={staffLoading || !staffId || startMutation.isPending}
            onClick={() => startMutation.mutate()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {startMutation.isPending ? 'Đang mở...' : 'Bắt đầu phiên'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

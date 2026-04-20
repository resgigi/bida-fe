import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiOutlineTrash, HiOutlineExclamation } from 'react-icons/hi';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import Modal from '../../components/Modal';

function DeleteDataModal({ type, label, onClose }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.delete(`/admin/data/${type}`, { data: { password, confirmation } }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
        <HiOutlineExclamation className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
        <div><p className="text-sm font-medium text-red-800">Hành động không thể hoàn tác!</p><p className="text-sm text-red-600 mt-1">Bạn đang xóa: <strong>{label}</strong></p></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nhập mật khẩu xác nhận</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none text-sm" /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nhập &quot;XOA TAT CA&quot; để xác nhận</label><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="XOA TAT CA" /></div>
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium">Hủy</button>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending || confirmation !== 'XOA TAT CA' || !password} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
          {mutation.isPending ? 'Đang xóa...' : 'Xóa'}
        </button>
      </div>
    </div>
  );
}

function AuditLogsSection() {
  const { data } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/admin/audit-logs', { params: { limit: 50 } }).then((r) => r.data.data),
  });
  const logs = data?.logs || [];
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-200"><h3 className="text-base font-semibold">Nhật ký thao tác</h3></div>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-2 px-4 font-medium text-gray-500">Người thực hiện</th>
            <th className="text-left py-2 px-4 font-medium text-gray-500">Hành động</th>
            <th className="text-left py-2 px-4 font-medium text-gray-500">Đối tượng</th>
            <th className="text-left py-2 px-4 font-medium text-gray-500">Thời gian</th>
          </tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-50">
                <td className="py-2 px-4">{log.user?.fullName}</td>
                <td className="py-2 px-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${log.action.includes('DELETE') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{log.action}</span></td>
                <td className="py-2 px-4 text-gray-500">{log.entity}</td>
                <td className="py-2 px-4 text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">Chưa có nhật ký</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [deleteModal, setDeleteModal] = useState(null);
  const queryClient = useQueryClient();

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data.data),
  });
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [stockManagementEnabled, setStockManagementEnabled] = useState(true);

  useEffect(() => {
    if (settings.storeName) setStoreName(settings.storeName);
    if (settings.storeAddress) setStoreAddress(settings.storeAddress);
    if (settings.storePhone) setStorePhone(settings.storePhone);
    if (settings.stockManagementEnabled != null) {
      setStockManagementEnabled(String(settings.stockManagementEnabled).toLowerCase() === 'true');
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (data) => api.put('/admin/settings', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('Đã cập nhật'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const deleteActions = isSuperAdmin
    ? [
      { type: 'sessions', label: 'Tất cả phiên chơi', desc: 'Xóa toàn bộ lịch sử phiên chơi và đơn hàng' },
      { type: 'products', label: 'Tất cả sản phẩm', desc: 'Xóa toàn bộ sản phẩm và danh mục' },
      { type: 'rooms', label: 'Tất cả phòng', desc: 'Xóa toàn bộ phòng bàn' },
      { type: 'all', label: 'TOÀN BỘ DỮ LIỆU', desc: 'Reset hệ thống về trạng thái ban đầu (trừ tài khoản, xóa luôn nhật ký thao tác)' },
    ]
    : [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Cài đặt</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold mb-4">Thông tin cửa hàng</h3>
        <div className="space-y-4 max-w-lg">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng</label><input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label><input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label><input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" /></div>
          <div className="rounded-lg border border-gray-200 p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Quản lý tồn kho</p>
              <p className="text-xs text-gray-500">
                {isSuperAdmin
                  ? 'Tắt đi nếu chỉ muốn tính tiền, không cần nhập kho.'
                  : 'Chỉ Admin tổng mới có quyền thay đổi mục này.'}
              </p>
            </div>
            <button
              type="button"
              disabled={!isSuperAdmin}
              onClick={() => setStockManagementEnabled((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${stockManagementEnabled ? 'bg-blue-600' : 'bg-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${stockManagementEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <button
            onClick={() =>
              updateSettings.mutate(
                isSuperAdmin
                  ? {
                    storeName,
                    storeAddress,
                    storePhone,
                    stockManagementEnabled: String(stockManagementEnabled),
                  }
                  : {
                    storeName,
                    storeAddress,
                    storePhone,
                  }
              )
            }
            disabled={updateSettings.isPending}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            Lưu cài đặt
          </button>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <h3 className="text-base font-semibold text-red-800 mb-1">Xóa dữ liệu</h3>
          <p className="text-sm text-red-600 mb-4">Cẩn thận! Dữ liệu đã xóa không thể khôi phục.</p>
          <div className="space-y-3">
            {deleteActions.map((action) => (
              <div key={action.type} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.desc}</p>
                </div>
                <button onClick={() => setDeleteModal(action)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">
                  <HiOutlineTrash className="w-4 h-4" /> Xóa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <AuditLogsSection />

      {deleteModal && (
        <Modal isOpen onClose={() => setDeleteModal(null)} title={`Xóa ${deleteModal.label}`}>
          <DeleteDataModal type={deleteModal.type} label={deleteModal.label} onClose={() => setDeleteModal(null)} />
        </Modal>
      )}
    </div>
  );
}

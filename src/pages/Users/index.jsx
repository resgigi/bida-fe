import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineBan, HiOutlineCheckCircle } from 'react-icons/hi';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import Modal from '../../components/Modal';

const ROLE_MAP = { SUPER_ADMIN: 'Admin', MANAGER: 'Quản lý', STAFF: 'Nhân viên' };

function UserForm({ user: editUser, onClose }) {
  const [form, setForm] = useState({
    username: editUser?.username || '', fullName: editUser?.fullName || '',
    password: '', role: editUser?.role || 'STAFF',
  });
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data) => editUser ? api.put(`/users/${editUser.id}`, data) : api.post('/users', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success(editUser ? 'Đã cập nhật' : 'Đã tạo'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi'),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (editUser && !data.password) delete data.password;
    mutation.mutate(data);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label><input value={form.username} onChange={(e) => set('username', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" required disabled={!!editUser} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label><input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" required /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">{editUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}</label><input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" required={!editUser} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label><select value={form.role} onChange={(e) => set('role', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"><option value="STAFF">Nhân viên</option><option value="MANAGER">Quản lý</option><option value="SUPER_ADMIN">Admin</option></select></div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium">Hủy</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">Lưu</button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const colSpan = currentUser?.role === 'SUPER_ADMIN' ? 5 : 4;

  const {
    data: users = [],
    isLoading,
    isError,
    error: usersError,
  } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then((r) => r.data.data) });
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/users/${id}`, { isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Đã cập nhật'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Nhân viên</h2>
        {currentUser?.role === 'SUPER_ADMIN' && (
          <button onClick={() => { setEditUser(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"><HiOutlinePlus className="w-5 h-5" />Thêm nhân viên</button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-500">Họ tên</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Tên đăng nhập</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Vai trò</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Trạng thái</th>
            {currentUser?.role === 'SUPER_ADMIN' && <th className="text-right py-3 px-4 font-medium text-gray-500">Thao tác</th>}
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={colSpan} className="py-8 text-center text-gray-400">Đang tải danh sách nhân viên...</td></tr>}
            {isError && <tr><td colSpan={colSpan} className="py-8 text-center text-red-500">{usersError?.response?.data?.message || 'Không thể tải danh sách nhân viên'}</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{u.fullName}</td>
                <td className="py-3 px-4 text-gray-500">{u.username}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700' : u.role === 'MANAGER' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{ROLE_MAP[u.role]}</span></td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{u.isActive ? 'Hoạt động' : 'Vô hiệu'}</span></td>
                {currentUser?.role === 'SUPER_ADMIN' && <td className="py-3 px-4 text-right">
                  <button onClick={() => { setEditUser(u); setShowForm(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><HiOutlinePencil className="w-4 h-4" /></button>
                  {u.id !== currentUser.id && (
                    <button onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })} className={`p-1.5 rounded ${u.isActive ? 'hover:bg-red-50 text-red-400' : 'hover:bg-green-50 text-green-500'}`}>
                      {u.isActive ? <HiOutlineBan className="w-4 h-4" /> : <HiOutlineCheckCircle className="w-4 h-4" />}
                    </button>
                  )}
                </td>}
              </tr>
            ))}
            {!isLoading && !isError && users.length === 0 && (
              <tr><td colSpan={colSpan} className="py-8 text-center text-gray-400">Chưa có nhân viên nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editUser ? 'Sửa nhân viên' : 'Thêm nhân viên'}><UserForm user={editUser} onClose={() => setShowForm(false)} /></Modal>
    </div>
  );
}

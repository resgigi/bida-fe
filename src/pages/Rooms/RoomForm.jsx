import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function RoomForm({ room, onClose }) {
  const [name, setName] = useState(room?.name || '');
  const [type, setType] = useState(room?.type || 'NORMAL');
  const [pricePerHour, setPricePerHour] = useState(room?.pricePerHour || 50000);
  const [description, setDescription] = useState(room?.description || '');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => room ? api.put(`/rooms/${room.id}`, data) : api.post('/rooms', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(room ? 'Cập nhật thành công' : 'Tạo phòng thành công');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ name, type, pricePerHour: Number(pricePerHour), description });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Loại phòng</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="NORMAL">Thường</option>
          <option value="VIP">VIP</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Giá mỗi giờ (VND)</label>
        <input type="number" value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" min="0" step="1000" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium">Hủy</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
          {mutation.isPending ? 'Đang lưu...' : room ? 'Cập nhật' : 'Tạo phòng'}
        </button>
      </div>
    </form>
  );
}

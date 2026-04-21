import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineClock, HiOutlineShoppingCart, HiOutlineUser } from 'react-icons/hi';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import { formatVND } from '../../utils/format';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import RoomSession from './RoomSession';
import RoomForm from './RoomForm';
import StartSessionModal from './StartSessionModal';

const statusTabs = [
  { label: 'Tất cả', value: '' },
  { label: 'Đang sử dụng', value: 'IN_USE' },
  { label: 'Còn trống', value: 'AVAILABLE' },
];

function RoomTimer({ startTime }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const sec = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return <span>{h}:{String(m).padStart(2, '0')}</span>;
}

export default function RoomsPage() {
  const [tab, setTab] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [deleteRoom, setDeleteRoom] = useState(null);
  const [startRoom, setStartRoom] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER' || user?.role === 'CASHIER';

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms', tab],
    queryFn: () => api.get('/rooms', { params: tab ? { status: tab } : {} }).then((r) => r.data.data),
    refetchInterval: 10000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/rooms/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rooms'] }); toast.success('Đã xóa phòng'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const handleRoomClick = (room) => {
    if (room.status === 'IN_USE' && room.sessions?.length > 0) {
      setSelectedRoom(room);
    } else if (room.status === 'AVAILABLE') {
      setStartRoom(room);
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'IN_USE') return 'border-blue-300 bg-blue-50';
    if (status === 'MAINTENANCE') return 'border-gray-300 bg-gray-100 opacity-60';
    return 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý phòng</h2>
        {isAdmin && (
          <button onClick={() => { setEditRoom(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
            <HiOutlinePlus className="w-5 h-5" /> Thêm phòng
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {statusTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {t.label} ({rooms.filter((r) => !t.value || r.status === t.value).length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {rooms.map((room) => {
            const activeSession = room.sessions?.[0];
            const isPaymentRequested = activeSession?.status === 'PAYMENT_REQUESTED';
            const statusText = room.status === 'IN_USE'
              ? (isPaymentRequested ? 'Chờ duyệt thanh toán' : 'Đang sử dụng')
              : room.status === 'AVAILABLE'
                ? 'Còn trống'
                : 'Bảo trì';
            const statusClass = room.status === 'IN_USE'
              ? (isPaymentRequested ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')
              : room.status === 'AVAILABLE'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-200 text-gray-600';
            return (
              <div
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${getStatusStyle(room.status)}`}
              >
                {room.type === 'TAKEAWAY' && (
                  <HiOutlineShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                )}
                <h3 className="font-semibold text-gray-800 truncate">{room.name}</h3>
                <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                  {statusText}
                </span>
                {activeSession && (
                  <div className="mt-2 space-y-1">
                    {activeSession.staff?.fullName && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 truncate" title={activeSession.staff.fullName}>
                        <HiOutlineUser className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{activeSession.staff.fullName}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <HiOutlineClock className="w-3.5 h-3.5" />
                      <RoomTimer startTime={activeSession.startTime} />
                    </p>
                    <p className="text-sm font-bold text-blue-600">
                      {formatVND(Math.round(((Date.now() - new Date(activeSession.startTime).getTime()) / 3600000) * room.pricePerHour))}
                    </p>
                  </div>
                )}
                {!activeSession && room.type !== 'TAKEAWAY' && (
                  <p className="text-xs text-gray-400 mt-2">{formatVND(room.pricePerHour)}/giờ</p>
                )}
                {isAdmin && room.type !== 'TAKEAWAY' && room.status !== 'IN_USE' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteRoom(room); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedRoom && (
        <RoomSession room={selectedRoom} session={selectedRoom.sessions[0]} onClose={() => { setSelectedRoom(null); queryClient.invalidateQueries({ queryKey: ['rooms'] }); }} />
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editRoom ? 'Sửa phòng' : 'Thêm phòng'}>
        <RoomForm room={editRoom} onClose={() => setShowForm(false)} />
      </Modal>

      {startRoom && (
        <StartSessionModal room={startRoom} onClose={() => { setStartRoom(null); queryClient.invalidateQueries({ queryKey: ['rooms'] }); }} />
      )}

      <ConfirmDialog
        isOpen={!!deleteRoom}
        onClose={() => setDeleteRoom(null)}
        onConfirm={() => deleteMutation.mutate(deleteRoom.id)}
        title="Xóa phòng"
        message={`Bạn có chắc muốn xóa phòng "${deleteRoom?.name}"?`}
        confirmText="Xóa"
        danger
      />
    </div>
  );
}

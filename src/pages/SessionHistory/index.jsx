import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiOutlineSearch, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { formatVND, formatDateTime } from '../../utils/format';
import { useAuthStore } from '../../store/auth';
import SessionDetailModal from './SessionDetailModal';

function formatShortDuration(start, end) {
  if (!start) return '—';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const sec = Math.max(0, Math.floor((e - s) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}p`;
  return `${m}p`;
}

function getRoomActionTags(roomActions) {
  const actions = Array.isArray(roomActions) ? roomActions : [];
  const tags = [];
  if (actions.some((a) => a.action === 'TRANSFER_ROOM')) tags.push('Chuyển phòng');
  if (actions.some((a) => a.action === 'CANCEL_SESSION')) tags.push('Hủy phòng');
  return tags;
}

function closureTypeLabel(status) {
  if (status === 'COMPLETED') return 'Thanh toán';
  if (status === 'CANCELLED') return 'Hủy / trả phòng';
  return '—';
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'COMPLETED', label: 'Đã thanh toán' },
  { value: 'PAYMENT_REQUESTED', label: 'Chờ duyệt thanh toán' },
  { value: 'ACTIVE', label: 'Đang chơi' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả biến động' },
  { value: 'HAS_ACTION', label: 'Có hủy/chuyển phòng' },
  { value: 'CANCELLED_ONLY', label: 'Chỉ hủy phòng' },
  { value: 'TRANSFER_ONLY', label: 'Chỉ chuyển phòng' },
];

const STATUS_BADGE = {
  COMPLETED: 'bg-green-100 text-green-800',
  PAYMENT_REQUESTED: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

export default function SessionHistoryPage() {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [viewMode, setViewMode] = useState('payment');
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [roomId, setRoomId] = useState('');
  const [roomAction, setRoomAction] = useState('');
  const [roomActionBy, setRoomActionBy] = useState('');
  const [showActorSuggestions, setShowActorSuggestions] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms-all'],
    queryFn: () => api.get('/rooms').then((r) => r.data.data),
  });
  const { data: assignableStaff = [] } = useQuery({
    queryKey: ['assignable-staff-history-filter'],
    queryFn: () => api.get('/sessions/assignable-staff').then((r) => r.data.data),
  });

  const params = { page, limit: 15 };
  if (from) params.from = from;
  if (to) params.to = to;
  if (viewMode === 'release') {
    params.statusIn = 'COMPLETED,CANCELLED';
  } else {
    params.status = 'COMPLETED';
  }
  if (roomId) params.roomId = roomId;
  if (roomAction) params.roomAction = roomAction;
  if (roomActionBy.trim()) params.roomActionBy = roomActionBy.trim();
  if (appliedSearch.trim()) params.search = appliedSearch.trim();

  const { data, isLoading } = useQuery({
    queryKey: ['sessions-history', viewMode, from, to, roomId, roomAction, roomActionBy, appliedSearch, page],
    queryFn: () => api.get('/sessions', { params }).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId) => api.delete(`/sessions/${sessionId}`),
    onSuccess: () => {
      toast.success('Đã xóa phiên');
      queryClient.invalidateQueries({ queryKey: ['sessions-history'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể xóa phiên'),
  });

  const sessions = data?.sessions || [];
  const total = data?.total || 0;
  const limit = data?.limit || 15;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const actorSuggestions = roomActionBy.trim()
    ? assignableStaff
      .filter((u) => {
        const keyword = roomActionBy.trim().toLowerCase();
        return u.fullName?.toLowerCase().includes(keyword) || u.username?.toLowerCase().includes(keyword);
      })
      .slice(0, 8)
    : assignableStaff.slice(0, 8);

  const showClosureCol = viewMode === 'release';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Lịch sử phiên chơi</h2>
        <p className="text-sm text-gray-500 mt-1">Tra cứu thanh toán (in lại bill) hoặc các phiên đã trả phòng (đã thanh toán hoặc đã hủy).</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setViewMode('payment'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'payment' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          Lịch sử thanh toán
        </button>
        <button
          type="button"
          onClick={() => { setViewMode('release'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'release' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          Lịch sử trả phòng
        </button>
      </div>
      {viewMode === 'payment' && (
        <p className="text-xs text-gray-500">Chỉ hiển thị phiên đã thanh toán. Mở chi tiết để in lại hóa đơn.</p>
      )}
      {viewMode === 'release' && (
        <p className="text-xs text-gray-500">Phiên đã đóng: đã thanh toán hoặc đã hủy (trả phòng, không thu tiền).</p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Từ ngày</label>
            <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Đến ngày</label>
            <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Phòng</label>
            <select value={roomId} onChange={(e) => { setPage(1); setRoomId(e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option value="">Tất cả phòng</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Biến động phòng</label>
            <select value={roomAction} onChange={(e) => { setPage(1); setRoomAction(e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value || 'all-action'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Người thao tác</label>
            <div className="relative">
              <input
                type="text"
                value={roomActionBy}
                onFocus={() => setShowActorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowActorSuggestions(false), 120)}
                onChange={(e) => { setPage(1); setRoomActionBy(e.target.value); }}
                placeholder="Tên hoặc username"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
              {showActorSuggestions && actorSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {actorSuggestions.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setRoomActionBy(u.fullName || u.username || '');
                        setPage(1);
                        setShowActorSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm text-gray-800">{u.fullName || 'N/A'}</p>
                      <p className="text-xs text-gray-500">@{u.username || 'n/a'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="relative max-w-md">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedSearch(search); setPage(1); } }}
            placeholder="Tìm tên phòng hoặc mã phiên..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => { setAppliedSearch(search); setPage(1); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Áp dụng bộ lọc
        </button>
      </div>

      <div className="text-sm text-gray-500">
        {total > 0 ? `${total} phiên` : 'Không có phiên phù hợp'}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="md:hidden p-3 space-y-2">
          {isLoading && (
            <div className="py-8 text-center text-gray-400">Đang tải...</div>
          )}
          {!isLoading && sessions.map((row) => (
            <div key={row.id} className="rounded-lg border border-gray-200 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] || 'bg-gray-100'}`}>
                  {STATUS_OPTIONS.find((o) => o.value === row.status)?.label || row.status}
                </span>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(row)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100"
                    >
                      <HiOutlineTrash className="w-4 h-4" /> Xóa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDetailId(row.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                  >
                    <HiOutlineEye className="w-4 h-4" /> Xem
                  </button>
                </div>
              </div>
              {showClosureCol && (
                <p className="text-xs font-medium text-gray-700">
                  Loại: <span className="text-gray-900">{closureTypeLabel(row.status)}</span>
                </p>
              )}
              <p className="font-semibold text-gray-800">{row.room?.name}</p>
              <p className="text-xs text-gray-500">NV: {row.staff?.fullName || '—'}</p>
              <p className="text-xs text-gray-500">Bắt đầu: {formatDateTime(row.startTime)}</p>
              <p className="text-xs text-gray-500">Kết thúc: {row.endTime ? formatDateTime(row.endTime) : '—'}</p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <p className="text-gray-500">TG: <span className="font-medium text-gray-700">{formatShortDuration(row.startTime, row.endTime)}</span></p>
                <p className="text-gray-500">Món: <span className="font-medium text-gray-700">{(row.orderItems || []).length}</span></p>
                <p className="text-gray-500">Tiền giờ: <span className="font-medium text-gray-700">{formatVND(row.totalPlayAmount)}</span></p>
                <p className="text-gray-500">Tiền món: <span className="font-medium text-gray-700">{formatVND(row.totalFoodAmount)}</span></p>
              </div>
              {getRoomActionTags(row.roomActions).length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {getRoomActionTags(row.roomActions).map((tag) => (
                    <span key={tag} className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm font-semibold text-right text-gray-900 pt-1">Tổng: {formatVND(row.totalAmount)}</p>
            </div>
          ))}
          {!isLoading && sessions.length === 0 && (
            <div className="py-8 text-center text-gray-400">Không có dữ liệu trong khoảng thời gian đã chọn.</div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-3 font-medium text-gray-500">Trạng thái</th>
                {showClosureCol && (
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Loại đóng</th>
                )}
                <th className="text-left py-3 px-3 font-medium text-gray-500">Phòng</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Nhân viên</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Bắt đầu</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Kết thúc</th>
                <th className="text-center py-3 px-3 font-medium text-gray-500">TG</th>
                <th className="text-center py-3 px-3 font-medium text-gray-500">Món</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500">Tiền chơi</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500">Tiền món</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500">Giảm</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500">Tổng</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Biến động</th>
                <th className="text-center py-3 px-3 font-medium text-gray-500 w-24">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={showClosureCol ? 14 : 13} className="py-12 text-center text-gray-400">Đang tải...</td></tr>
              )}
              {!isLoading && sessions.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                  <td className="py-3 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] || 'bg-gray-100'}`}>
                      {STATUS_OPTIONS.find((o) => o.value === row.status)?.label || row.status}
                    </span>
                  </td>
                  {showClosureCol && (
                    <td className="py-3 px-3 text-gray-700 text-xs font-medium">{closureTypeLabel(row.status)}</td>
                  )}
                  <td className="py-3 px-3 font-medium text-gray-800">{row.room?.name}</td>
                  <td className="py-3 px-3 text-gray-600">{row.staff?.fullName}</td>
                  <td className="py-3 px-3 text-gray-500 text-xs whitespace-nowrap">{formatDateTime(row.startTime)}</td>
                  <td className="py-3 px-3 text-gray-500 text-xs whitespace-nowrap">{row.endTime ? formatDateTime(row.endTime) : '—'}</td>
                  <td className="py-3 px-3 text-center text-gray-600">{formatShortDuration(row.startTime, row.endTime)}</td>
                  <td className="py-3 px-3 text-center">{(row.orderItems || []).length}</td>
                  <td className="py-3 px-3 text-right">{formatVND(row.totalPlayAmount)}</td>
                  <td className="py-3 px-3 text-right">{formatVND(row.totalFoodAmount)}</td>
                  <td className="py-3 px-3 text-right text-red-600">{row.discountAmount > 0 ? `-${formatVND(row.discountAmount)}` : '—'}</td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatVND(row.totalAmount)}</td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {getRoomActionTags(row.roomActions).length > 0 ? getRoomActionTags(row.roomActions).map((tag) => (
                        <span key={tag} className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                          {tag}
                        </span>
                      )) : <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100"
                          title="Xóa phiên"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetailId(row.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                      >
                        <HiOutlineEye className="w-4 h-4" /> Xem
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && sessions.length === 0 && (
                <tr><td colSpan={showClosureCol ? 14 : 13} className="py-12 text-center text-gray-400">Không có dữ liệu trong khoảng thời gian đã chọn.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-gray-500">Trang {page} / {totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-white"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-white"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {detailId && <SessionDetailModal sessionId={detailId} onClose={() => setDetailId(null)} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa phiên?</h3>
            <p className="text-sm text-gray-600 mb-1">
              Phiên: <strong>{deleteTarget.room?.name}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Thời gian: {formatDateTime(deleteTarget.startTime)} - {deleteTarget.endTime ? formatDateTime(deleteTarget.endTime) : '—'}
            </p>
            <p className="text-xs text-amber-600 mb-4">
              Cảnh báo: Hành động này sẽ xóa vĩnh viễn phiên này và không ảnh hưởng đến báo cáo đã tính.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiOutlineSearch, HiOutlineEye } from 'react-icons/hi';
import api from '../../services/api';
import { formatVND, formatDateTime } from '../../utils/format';
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

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'COMPLETED', label: 'Đã thanh toán' },
  { value: 'PAYMENT_REQUESTED', label: 'Chờ duyệt thanh toán' },
  { value: 'ACTIVE', label: 'Đang chơi' },
  { value: 'CANCELLED', label: 'Đã hủy' },
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
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState('COMPLETED');
  const [roomId, setRoomId] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms-all'],
    queryFn: () => api.get('/rooms').then((r) => r.data.data),
  });

  const params = { page, limit: 15 };
  if (from) params.from = from;
  if (to) params.to = to;
  if (status) params.status = status;
  if (roomId) params.roomId = roomId;
  if (appliedSearch.trim()) params.search = appliedSearch.trim();

  const { data, isLoading } = useQuery({
    queryKey: ['sessions-history', from, to, status, roomId, appliedSearch, page],
    queryFn: () => api.get('/sessions', { params }).then((r) => r.data.data),
  });

  const sessions = data?.sessions || [];
  const total = data?.total || 0;
  const limit = data?.limit || 15;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Lịch sử phiên chơi</h2>
        <p className="text-sm text-gray-500 mt-1">Tra cứu, lọc và xem chi tiết từng phiên (thời gian, món, thanh toán).</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Từ ngày</label>
            <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Đến ngày</label>
            <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Trạng thái</label>
            <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
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
                <button
                  type="button"
                  onClick={() => setDetailId(row.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                >
                  <HiOutlineEye className="w-4 h-4" /> Xem
                </button>
              </div>
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
                <th className="text-center py-3 px-3 font-medium text-gray-500 w-24">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={12} className="py-12 text-center text-gray-400">Đang tải...</td></tr>
              )}
              {!isLoading && sessions.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                  <td className="py-3 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] || 'bg-gray-100'}`}>
                      {STATUS_OPTIONS.find((o) => o.value === row.status)?.label || row.status}
                    </span>
                  </td>
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
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setDetailId(row.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                    >
                      <HiOutlineEye className="w-4 h-4" /> Xem
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && sessions.length === 0 && (
                <tr><td colSpan={12} className="py-12 text-center text-gray-400">Không có dữ liệu trong khoảng thời gian đã chọn.</td></tr>
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
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiOutlineX, HiOutlinePrinter } from 'react-icons/hi';
import api from '../../services/api';
import { formatVND, formatDateTime } from '../../utils/format';
import InvoicePrint from '../../components/InvoicePrint';

function formatDuration(start, end) {
  if (!start) return '—';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const sec = Math.max(0, Math.floor((e - s) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  return `${h} giờ ${m} phút ${ss} giây`;
}

const PAYMENT_LABEL = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', CARD: 'Thẻ' };
const STATUS_LABEL = { ACTIVE: 'Đang chơi', COMPLETED: 'Đã thanh toán', CANCELLED: 'Đã hủy' };

export default function SessionDetailModal({ sessionId, onClose }) {
  const [printSession, setPrintSession] = useState(null);
  const { data: s, isLoading } = useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then((r) => r.data.data),
    enabled: !!sessionId,
  });

  if (!sessionId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Chi tiết phiên</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{sessionId}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && s?.status === 'COMPLETED' && (
              <button
                type="button"
                onClick={() => setPrintSession(s)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <HiOutlinePrinter className="h-4 w-4" /> In hóa đơn
              </button>
            )}
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {isLoading && <p className="text-center text-gray-500 py-8">Đang tải...</p>}
          {!isLoading && !s && <p className="text-center text-red-500 py-8">Không tìm thấy phiên</p>}
          {!isLoading && s && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : s.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[s.status] || s.status}
                </span>
                <span className="text-sm text-gray-600">Phòng: <strong className="text-gray-900">{s.room?.name}</strong></span>
                {(s.room?.type === 'VIP' || s.room?.type === 'NORMAL') && (
                  <span className="text-xs text-gray-400">({s.room?.type === 'VIP' ? 'VIP' : 'Thường'})</span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Thời gian</h3>
                  <p className="text-sm"><span className="text-gray-500">Bắt đầu:</span> {formatDateTime(s.startTime)}</p>
                  <p className="text-sm"><span className="text-gray-500">Kết thúc:</span> {s.endTime ? formatDateTime(s.endTime) : '—'}</p>
                  <p className="text-sm"><span className="text-gray-500">Thời lượng:</span> <strong>{formatDuration(s.startTime, s.endTime)}</strong></p>
                  <p className="text-sm"><span className="text-gray-500">Giá mỗi giờ:</span> {formatVND(s.room?.pricePerHour)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Nhân viên</h3>
                  <p className="text-sm"><span className="text-gray-500">Họ tên:</span> <strong>{s.staff?.fullName}</strong></p>
                  <p className="text-sm"><span className="text-gray-500">Đăng nhập:</span> {s.staff?.username || '—'}</p>
                  <p className="text-xs text-gray-400 mt-2">Tạo lúc: {formatDateTime(s.createdAt)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Món ăn & đồ uống</h3>
                {(s.orderItems || []).length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Không có món kèm</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Món</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Mã</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-500">SL</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-500">Đơn giá</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-500">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.orderItems.map((row) => (
                          <tr key={row.id} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 px-3">
                              {row.product?.name}
                              {row.product?.category?.name && <span className="block text-xs text-gray-400">{row.product.category.name}</span>}
                            </td>
                            <td className="py-2 px-3 text-gray-500">{row.product?.code}</td>
                            <td className="py-2 px-3 text-right">{row.quantity}</td>
                            <td className="py-2 px-3 text-right">{formatVND(row.unitPrice)}</td>
                            <td className="py-2 px-3 text-right font-medium">{formatVND(row.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">Tổng hợp thanh toán</h3>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Tiền chơi</span><span className="font-medium">{formatVND(s.totalPlayAmount)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Tiền món</span><span className="font-medium">{formatVND(s.totalFoodAmount)}</span></div>
                {(s.discountAmount > 0 || s.discountPercent > 0) && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Giảm giá{s.discountPercent > 0 ? ` (${s.discountPercent}%)` : ''}</span>
                    <span>-{formatVND(s.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-blue-700 pt-2 border-t border-blue-200">
                  <span>Tổng cộng</span><span>{formatVND(s.totalAmount)}</span>
                </div>
                {s.status === 'COMPLETED' && (
                  <>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Đã thanh toán</span><span className="font-medium">{formatVND(s.paidAmount)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Phương thức</span><span className="font-medium">{PAYMENT_LABEL[s.paymentMethod] || s.paymentMethod}</span></div>
                  </>
                )}
                {s.note && (
                  <div className="pt-2 text-sm border-t border-blue-100">
                    <span className="text-gray-500">Ghi chú:</span>
                    <p className="mt-1 text-gray-800 whitespace-pre-wrap">{s.note}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {printSession && <InvoicePrint session={printSession} onClose={() => setPrintSession(null)} />}
    </div>
  );
}

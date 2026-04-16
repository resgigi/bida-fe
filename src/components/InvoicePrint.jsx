import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { HiOutlinePrinter, HiOutlineX } from 'react-icons/hi';
import api from '../services/api';
import { formatVND, formatDateTime } from '../utils/format';

const PAYMENT_LABEL = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', CARD: 'Thẻ' };

export default function InvoicePrint({ session, onClose }) {
  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data.data),
    enabled: !!session,
  });

  if (!session) return null;

  const storeName = settings.storeName || 'KARAOKE LASVEGAS 434';
  const storeAddr = settings.storeAddress || '';
  const storePhone = settings.storePhone || '';

  const handlePrint = () => {
    window.print();
  };

  const node = (
    <div
      id="invoice-print-portal"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 print:static print:inset-auto print:z-auto print:block print:p-0"
    >
      <div className="no-print absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        id="invoice-print-shell"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none print:overflow-visible"
      >
        <div className="no-print flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold">Hóa đơn</h2>
          <div className="flex gap-2">
            <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <HiOutlinePrinter className="h-5 w-5" /> In
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
              <HiOutlineX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div id="invoice-print-area" className="overflow-y-auto p-6 text-sm print:max-h-none print:overflow-visible">
          <div className="text-center border-b border-dashed border-gray-300 pb-4">
            <h1 className="text-xl font-bold text-gray-900">{storeName}</h1>
            {storeAddr && <p className="mt-1 text-gray-600">{storeAddr}</p>}
            {storePhone && <p className="text-gray-600">ĐT: {storePhone}</p>}
            <p className="mt-2 font-mono text-xs text-gray-500">Mã phiên: {session.id}</p>
          </div>

          <div className="mt-4 space-y-1 text-gray-700">
            <p><span className="text-gray-500">Phòng:</span> <strong>{session.room?.name}</strong></p>
            <p><span className="text-gray-500">NV phụ trách:</span> <strong>{session.staff?.fullName}</strong></p>
            <p><span className="text-gray-500">Bắt đầu:</span> {formatDateTime(session.startTime)}</p>
            <p><span className="text-gray-500">Kết thúc:</span> {session.endTime ? formatDateTime(session.endTime) : '—'}</p>
          </div>

          {(session.orderItems || []).length > 0 && (
            <table className="mt-4 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-2 pr-2">Món</th>
                  <th className="py-2 text-right">SL</th>
                  <th className="py-2 text-right">Đơn</th>
                  <th className="py-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {session.orderItems.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2">{row.product?.name}</td>
                    <td className="py-1.5 text-right">{row.quantity}</td>
                    <td className="py-1.5 text-right">{formatVND(row.unitPrice)}</td>
                    <td className="py-1.5 text-right font-medium">{formatVND(row.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-4 space-y-1 border-t border-gray-200 pt-4">
            <div className="flex justify-between"><span className="text-gray-600">Tiền giờ</span><span>{formatVND(session.totalPlayAmount)}</span></div>
            {(session.discountAmount ?? 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Giảm giá{session.discountPercent > 0 ? ` (${session.discountPercent}%)` : ''}</span>
                <span>-{formatVND(session.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
              <span>Tổng cộng</span><span>{formatVND(session.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Thanh toán</span><span>{PAYMENT_LABEL[session.paymentMethod] || session.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Đã thu</span><span className="font-medium">{formatVND(session.paidAmount)}</span>
            </div>
            {(session.paidAmount ?? 0) > (session.totalAmount ?? 0) && (
              <div className="flex justify-between text-green-700">
                <span>Tiền thừa</span><span>{formatVND((session.paidAmount ?? 0) - (session.totalAmount ?? 0))}</span>
              </div>
            )}
          </div>

          {session.note && (
            <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              <span className="font-medium text-gray-700">Ghi chú:</span> {session.note}
            </p>
          )}

          <p className="mt-6 text-center text-xs text-gray-400">Cảm ơn quý khách!</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 3mm;
            size: 80mm auto;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          /* Ẩn toàn bộ React app (navbar, phòng, menu, scrollbar) — chỉ giữ portal hóa đơn */
          body > *:not(#invoice-print-portal) {
            display: none !important;
          }
          #invoice-print-portal {
            display: block !important;
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #invoice-print-shell {
            width: 74mm !important;
            max-width: 74mm !important;
            margin: 0 auto !important;
            border: 0 !important;
          }
          #invoice-print-portal .no-print {
            display: none !important;
          }
          #invoice-print-shell {
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
          }
          #invoice-print-area {
            overflow: visible !important;
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(node, document.body);
}

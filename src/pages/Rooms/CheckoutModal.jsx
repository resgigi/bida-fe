import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiOutlineX } from 'react-icons/hi';
import api from '../../services/api';
import { formatVND } from '../../utils/format';

export default function CheckoutModal({ session, room, playAmount, foodAmount, capturedAt, canEditPlayAmount = false, onClose, onSuccess }) {
  const [discountType, setDiscountType] = useState('amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [note, setNote] = useState('');

  const [editablePlayAmount, setEditablePlayAmount] = useState(playAmount);

  useEffect(() => {
    setEditablePlayAmount(playAmount);
  }, [playAmount]);

  const effectivePlayAmount = canEditPlayAmount ? Number(editablePlayAmount) : playAmount;

  const subtotal = effectivePlayAmount + foodAmount;
  const discountAmount = discountType === 'percent' ? Math.round(subtotal * Number(discountValue) / 100) : Number(discountValue);
  const total = Math.max(0, subtotal - discountAmount);
  const paid = paidAmount ? Number(paidAmount) : total;
  const change = paid - total;

  const mutation = useMutation({
    mutationFn: () =>
      api
        .post(`/sessions/${session.id}/checkout`, {
          discountAmount: discountType === 'amount' ? Number(discountValue) : 0,
          discountPercent: discountType === 'percent' ? Number(discountValue) : 0,
          paidAmount: paid,
          paymentMethod,
          note,
          // Allow managers/cashiers to adjust the "Tiền giờ" before approving checkout.
          playAmountOverride: Number.isFinite(effectivePlayAmount) ? Math.max(0, Math.round(effectivePlayAmount)) : undefined,
        })
        .then((r) => r.data.data),
    onSuccess: (completed) => {
      toast.success('Thanh toán thành công!');
      onSuccess(completed);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi thanh toán'),
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Thanh toán</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><HiOutlineX className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tiền giờ:</span>
              {canEditPlayAmount ? (
                <input
                  type="number"
                  min={0}
                  value={editablePlayAmount}
                  onChange={(e) => setEditablePlayAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-28 text-right font-medium bg-white border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <span className="font-medium">{formatVND(playAmount)}</span>
              )}
            </div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Tiền món:</span><span className="font-medium">{formatVND(foodAmount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Giảm giá:</span><span className="font-medium text-red-500">-{formatVND(discountAmount)}</span></div>
            <div className="border-t border-gray-200 pt-2 flex justify-between"><span className="font-bold text-gray-800">Tổng cộng</span><span className="text-xl font-bold text-green-600">{formatVND(total)}</span></div>
            {capturedAt && (
              <p className="text-xs text-gray-500 pt-1">
                Số tiền được chốt lúc: {new Date(capturedAt).toLocaleTimeString('vi-VN')} {new Date(capturedAt).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức thanh toán</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              <option value="CASH">Tiền mặt</option>
              <option value="TRANSFER">Chuyển khoản</option>
              <option value="CARD">Thẻ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giảm giá
              <span className="inline-flex ml-2 gap-1">
                <button onClick={() => setDiscountType('amount')} className={`px-2 py-0.5 rounded text-xs ${discountType === 'amount' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>VND</button>
                <button onClick={() => setDiscountType('percent')} className={`px-2 py-0.5 rounded text-xs ${discountType === 'percent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>%</button>
              </span>
            </label>
            <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" min="0" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền thanh toán (VND)</label>
            <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder={formatVND(total)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" min="0" />
            {change > 0 && <p className="text-sm text-gray-500 mt-1">Còn lại: <span className="font-medium text-green-600">{formatVND(change)}</span></p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" rows={2} placeholder="Ghi chú đơn hàng..." />
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Đang xử lý...' : `Thanh toán ${formatVND(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

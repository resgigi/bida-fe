import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlinePlus, HiOutlineMinus, HiOutlineTrash } from 'react-icons/hi';
import api from '../../services/api';
import { formatVND, formatTime, calcDurationSeconds, calcPlayAmount } from '../../utils/format';
import CheckoutModal from './CheckoutModal';
import InvoicePrint from '../../components/InvoicePrint';
import ConfirmDialog from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import useAuthStore from '../../stores/authStore';

export default function RoomSession({ room, session, onClose }) {
  const [seconds, setSeconds] = useState(calcDurationSeconds(session.startTime));
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [checkoutSnapshot, setCheckoutSnapshot] = useState(null);
  const [endedForPayment, setEndedForPayment] = useState(false);
  const endingConfirmedRef = useRef(false);
  const [productQtyInput, setProductQtyInput] = useState({});
  const [completedForInvoice, setCompletedForInvoice] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const orderedSectionRef = useRef(null);
  const productsSectionRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setSeconds(calcDurationSeconds(session.startTime)), 1000);
    return () => clearInterval(id);
  }, [session.startTime]);

  const { data: sessionData } = useQuery({
    queryKey: ['session', session.id],
    queryFn: () => api.get(`/sessions/${session.id}`).then((r) => r.data.data),
    refetchInterval: 5000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => api.get('/products', { params: { isActive: 'true' } }).then((r) => r.data.data),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api.get('/products/categories').then((r) => r.data.data),
  });

  const { data: allRooms = [] } = useQuery({
    queryKey: ['rooms-transfer-list'],
    queryFn: () => api.get('/rooms').then((r) => r.data.data),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ productId, quantity }) => api.post(`/orders/${session.id}/items`, { productId, quantity }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['session', session.id] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, quantity }) => api.put(`/orders/items/${id}`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session', session.id] }),
  });

  const removeItemMutation = useMutation({
    mutationFn: (id) => api.delete(`/orders/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session', session.id] }),
  });
  const requestPaymentMutation = useMutation({
    mutationFn: () => api.post(`/sessions/${session.id}/request-payment`).then((r) => r.data.data),
    onError: (err) => toast.error(err.response?.data?.message || 'Không gửi được yêu cầu thanh toán'),
  });
  const cancelSessionMutation = useMutation({
    mutationFn: () => api.put(`/sessions/${session.id}/cancel`, { reason: cancelReason }).then((r) => r.data.data),
    onSuccess: () => {
      toast.success('Đã hủy phòng thành công');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowCancelConfirm(false);
      setCancelReason('');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không hủy được phòng'),
  });
  const transferRoomMutation = useMutation({
    mutationFn: () => api.put(`/sessions/${session.id}/transfer-room`, { targetRoomId, reason: transferReason }).then((r) => r.data.data),
    onSuccess: (transferred) => {
      toast.success('Chuyển phòng thành công');
      setShowTransferModal(false);
      setTargetRoomId('');
      setTransferReason('');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
      if (transferred?.room?.id) {
        onClose();
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không chuyển được phòng'),
  });

  const currentSession = sessionData || session;
  const orderItems = currentSession.orderItems || [];
  const currentPlayAmount = calcPlayAmount(session.startTime, room.pricePerHour);
  const isFrozenByPaymentRequested = currentSession.status === 'PAYMENT_REQUESTED';
  const frozenSeconds = isFrozenByPaymentRequested
    ? calcDurationSeconds(session.startTime, currentSession.endTime || currentSession.paymentRequestedAt || null)
    : seconds;
  const frozenPlayAmount = isFrozenByPaymentRequested
    ? (typeof currentSession.totalPlayAmount === 'number' ? currentSession.totalPlayAmount : currentPlayAmount)
    : currentPlayAmount;

  const playAmount = checkoutSnapshot?.playAmount ?? frozenPlayAmount;
  const foodAmount = orderItems.reduce((s, i) => s + i.totalPrice, 0);
  const displaySeconds = checkoutSnapshot?.seconds ?? (isFrozenByPaymentRequested ? frozenSeconds : seconds);

  const filteredProducts = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCat || p.categoryId === selectedCat;
    return matchSearch && matchCat;
  });

  const canApproveCheckout = ['SUPER_ADMIN', 'MANAGER', 'CASHIER'].includes(user?.role);
  const isPaymentRequested = currentSession.status === 'PAYMENT_REQUESTED';
  const canManageRoomFlow = ['SUPER_ADMIN', 'MANAGER', 'CASHIER'].includes(user?.role);
  const showRoomActions = currentSession.status === 'ACTIVE' && canManageRoomFlow;
  const showMobileSessionBar = showRoomActions || user?.role === 'STAFF';
  const isStaff = user?.role === 'STAFF';
  const availableTransferRooms = allRooms.filter(
    (r) => r.id !== room.id && r.status === 'AVAILABLE' && r.type !== 'TAKEAWAY'
  );
  const statusBadge = isPaymentRequested
    ? 'bg-amber-100 text-amber-700'
    : currentSession.status === 'ACTIVE'
      ? 'bg-blue-100 text-blue-700'
      : currentSession.status === 'CANCELLED'
        ? 'bg-gray-100 text-gray-700'
        : 'bg-green-100 text-green-700';
  const statusLabel = isPaymentRequested
    ? 'Chờ duyệt thanh toán'
    : currentSession.status === 'ACTIVE'
      ? 'Đang sử dụng'
      : currentSession.status === 'CANCELLED'
        ? 'Đã hủy'
        : currentSession.status === 'COMPLETED'
          ? 'Đã thanh toán'
          : 'Đang sử dụng';

  const commitEndSession = () => {
    endingConfirmedRef.current = true;
    setEndedForPayment(true);
  };

  const handleRequestOrCheckout = async () => {
    if (isPaymentRequested) {
      if (canApproveCheckout) setShowCheckout(true);
      return;
    }
    try {
      const requested = await requestPaymentMutation.mutateAsync();
      setEndedForPayment(false);
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Đã gửi yêu cầu thanh toán');
      if (canApproveCheckout) {
        setCheckoutSnapshot({
          seconds: calcDurationSeconds(requested.startTime, requested.endTime),
          playAmount: requested.totalPlayAmount,
          foodAmount: requested.totalFoodAmount,
          capturedAt: requested.paymentRequestedAt || new Date().toISOString(),
        });
        setShowCheckout(true);
      }
    } catch {
      // handled by mutation onError
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><HiOutlineArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-800">{room.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge}`}>{statusLabel}</span>
            {currentSession.staff?.fullName && (
              <span className="text-xs text-gray-600 truncate max-w-full" title={currentSession.staff.fullName}>
                NV: <strong className="text-gray-800">{currentSession.staff.fullName}</strong>
              </span>
            )}
          </div>
        </div>
      </header>

      {showRoomActions && (
        <div className="hidden md:flex shrink-0 items-stretch gap-2 border-b border-gray-200 bg-slate-50 px-4 py-2">
          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="flex-1 rounded-lg border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            Chuyển phòng
          </button>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Hủy phòng
          </button>
        </div>
      )}

      <div className={`flex-1 overflow-auto p-4 space-y-4 ${showMobileSessionBar ? 'pb-40 md:pb-24' : 'pb-24'}`}>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">Thời gian chơi</h3>
            <span className="text-2xl font-bold text-blue-600">{formatTime(displaySeconds)}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Bắt đầu</p>
              <p className="font-medium">{new Date(session.startTime).toLocaleString('vi-VN')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Giá mỗi giờ</p>
              <p className="font-medium">{formatVND(room.pricePerHour)}</p>
            </div>
          </div>
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700 font-medium">Tiền giờ</p>
            <p className="text-xl font-bold text-yellow-700">{formatVND(playAmount)}</p>
          </div>
          {showRoomActions && (
            <p className="mt-2 text-xs text-gray-500 md:hidden">
              Dùng thanh nút <strong>Chuyển phòng / Hủy phòng</strong> cố định phía dưới màn hình.
            </p>
          )}
          {isPaymentRequested ? (
            <button
              onClick={handleRequestOrCheckout}
              disabled={!canApproveCheckout}
              className="mt-4 w-full py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60 disabled:hover:bg-amber-600"
            >
              {canApproveCheckout ? 'Duyệt thanh toán' : 'Đã gửi yêu cầu thanh toán'}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setCheckoutSnapshot({
                    seconds,
                    playAmount: currentPlayAmount,
                    foodAmount,
                    capturedAt: new Date().toISOString(),
                  });
                  endingConfirmedRef.current = false;
                  setShowEndConfirm(true);
                }}
                className="mt-4 w-full py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
              >
                Kết thúc phiên
              </button>
              {endedForPayment && (
                <button
                  onClick={handleRequestOrCheckout}
                  disabled={requestPaymentMutation.isPending}
                  className="mt-2 w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {requestPaymentMutation.isPending ? 'Đang gửi...' : 'Yêu cầu thanh toán'}
                </button>
              )}
            </>
          )}
        </div>

        {orderItems.length > 0 && (
          <div ref={orderedSectionRef} className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-3">Đã gọi ({orderItems.length} món)</h3>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.product?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{formatVND(item.unitPrice)} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isStaff}
                        title={isStaff ? 'Nhân viên không được giảm hoặc xóa món' : undefined}
                        onClick={() => (item.quantity > 1 ? updateItemMutation.mutate({ id: item.id, quantity: item.quantity - 1 }) : removeItemMutation.mutate(item.id))}
                        className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <HiOutlineMinus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button type="button" onClick={() => updateItemMutation.mutate({ id: item.id, quantity: item.quantity + 1 })} className="p-1 rounded bg-gray-100 hover:bg-gray-200">
                        <HiOutlinePlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 w-24 text-right">{formatVND(item.totalPrice)}</span>
                    {!isStaff && (
                      <button type="button" onClick={() => removeItemMutation.mutate(item.id)} className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-semibold text-gray-800">
                <span>Tổng tiền món</span>
                <span>{formatVND(foodAmount)}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={productsSectionRef} className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Món ăn & Đồ uống</h3>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <button onClick={() => setSelectedCat('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${!selectedCat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Tất cả
            </button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setSelectedCat(c.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${selectedCat === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredProducts.map((p) => (
              <div key={p.id} className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all">
                <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.code}</p>
                <p className="text-sm font-bold text-blue-600 mt-1">{formatVND(p.price)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={productQtyInput[p.id] ?? 1}
                    onChange={(e) =>
                      setProductQtyInput((prev) => ({
                        ...prev,
                        [p.id]: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    className="w-20 px-2 py-1.5 rounded-md border border-gray-300 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addItemMutation.mutate({
                        productId: p.id,
                        quantity: Math.max(1, Number(productQtyInput[p.id] ?? 1)),
                      });
                    }}
                    className="flex-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    Thêm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCheckout && canApproveCheckout && (
        <CheckoutModal
          session={currentSession}
          room={room}
          playAmount={playAmount}
          foodAmount={
            checkoutSnapshot?.foodAmount ?? (isPaymentRequested
              ? (typeof currentSession.totalFoodAmount === 'number' ? currentSession.totalFoodAmount : foodAmount)
              : foodAmount)
          }
          capturedAt={checkoutSnapshot?.capturedAt ?? currentSession.paymentRequestedAt ?? currentSession.endTime}
          canEditPlayAmount={canApproveCheckout}
          onClose={() => {
            setShowCheckout(false);
            setCheckoutSnapshot(null);
            setEndedForPayment(false);
          }}
          onSuccess={(completed) => {
            setShowCheckout(false);
            setCheckoutSnapshot(null);
            setEndedForPayment(false);
            setCompletedForInvoice(completed);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showEndConfirm}
        onClose={() => {
          setShowEndConfirm(false);
          if (!endingConfirmedRef.current) {
            setCheckoutSnapshot(null);
            setEndedForPayment(false);
          }
          endingConfirmedRef.current = false;
        }}
        onConfirm={commitEndSession}
        title="Kết thúc phiên"
        message={`Bạn có chắc muốn kết thúc phiên của phòng "${room.name}"? Sau khi xác nhận, hệ thống sẽ giữ nguyên tiền giờ để bạn kiểm tra thanh toán.`}
        confirmText="Xác nhận kết thúc"
      />

      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Chuyển phòng">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Chọn phòng trống để chuyển. Hệ thống sẽ giữ nguyên phiên chơi hiện tại và toàn bộ món đã gọi.
          </p>
          <select
            value={targetRoomId}
            onChange={(e) => setTargetRoomId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          >
            <option value="">-- Chọn phòng đích --</option>
            {availableTransferRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} - {formatVND(r.pricePerHour)}/giờ
              </option>
            ))}
          </select>
          {availableTransferRooms.length === 0 && (
            <p className="text-xs text-amber-600">Hiện không có phòng trống để chuyển.</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lý do chuyển phòng</label>
            <textarea
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              rows={3}
              placeholder="Ví dụ: Khách muốn đổi sang phòng VIP gần sân khấu..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowTransferModal(false);
                setTargetRoomId('');
                setTransferReason('');
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => transferRoomMutation.mutate()}
              disabled={!targetRoomId || !transferReason.trim() || transferRoomMutation.isPending}
              className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {transferRoomMutation.isPending ? 'Đang chuyển...' : 'Xác nhận chuyển'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title="Hủy phòng">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Nhập lý do hủy phòng để lưu lại lịch sử thao tác.
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="Ví dụ: Khách đổi ý không sử dụng phòng..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCancelConfirm(false);
                setCancelReason('');
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => cancelSessionMutation.mutate()}
              disabled={!cancelReason.trim() || cancelSessionMutation.isPending}
              className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {cancelSessionMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
            </button>
          </div>
        </div>
      </Modal>

      {showMobileSessionBar && (
        <div className="fixed bottom-0 inset-x-0 z-[55] space-y-2 border-t border-gray-200 bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
          {showRoomActions && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowTransferModal(true)}
                className="rounded-lg border border-blue-200 bg-blue-50 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Chuyển phòng
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="rounded-lg border border-red-200 bg-red-50 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Hủy phòng
              </button>
            </div>
          )}
          {user?.role === 'STAFF' && (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => orderedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-700"
              >
                Đã gọi
              </button>
              <button
                type="button"
                onClick={() => productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-700"
              >
                Chọn món
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckoutSnapshot({
                    seconds,
                    playAmount: currentPlayAmount,
                    foodAmount,
                    capturedAt: new Date().toISOString(),
                  });
                  endingConfirmedRef.current = false;
                  setShowEndConfirm(true);
                }}
                className="rounded-lg bg-gray-900 py-2 text-xs font-semibold text-white"
              >
                Kết thúc
              </button>
            </div>
          )}
        </div>
      )}

      {completedForInvoice && (
        <InvoicePrint
          session={completedForInvoice}
          onClose={() => {
            setCompletedForInvoice(null);
            onClose();
          }}
        />
      )}
    </div>
  );
}

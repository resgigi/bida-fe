import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  HiOutlineViewGrid,
  HiOutlineCash,
  HiOutlineClipboardList,
  HiOutlineUserGroup,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineRefresh,
  HiOutlineTrash,
  HiOutlineExclamation,
} from 'react-icons/hi';
import api from '../../services/api';
import { formatVND } from '../../utils/format';
import Modal from '../../components/Modal';
import useAuthStore from '../../stores/authStore';

const PRESETS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'year', label: 'Năm nay' },
  { id: 'custom', label: 'Khoảng ngày' },
];

function buildParams(preset, customFrom, customTo, chartBucket) {
  const p = { preset };
  if (preset === 'custom' && customFrom && customTo) {
    p.from = customFrom;
    p.to = customTo;
  }
  if (chartBucket && chartBucket !== 'auto') p.bucket = chartBucket;
  return p;
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  const accents = {
    blue: 'from-slate-50 to-blue-50/90 border-blue-100 ring-blue-500/10',
    emerald: 'from-slate-50 to-emerald-50/90 border-emerald-100 ring-emerald-500/10',
    violet: 'from-slate-50 to-violet-50/90 border-violet-100 ring-violet-500/10',
    amber: 'from-slate-50 to-amber-50/90 border-amber-100 ring-amber-500/10',
    rose: 'from-slate-50 to-rose-50/90 border-rose-100 ring-rose-500/10',
  };
  const icons = {
    blue: 'bg-blue-600 text-white shadow-md shadow-blue-600/20',
    emerald: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
    violet: 'bg-violet-600 text-white shadow-md shadow-violet-600/20',
    amber: 'bg-amber-500 text-white shadow-md shadow-amber-500/25',
    rose: 'bg-rose-600 text-white shadow-md shadow-rose-600/20',
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm ring-1 ${accents[accent]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${icons[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function DeleteDataModal({ type, label, onClose }) {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const [useRange, setUseRange] = useState(false);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const isSessionDelete = type === 'sessions';
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.delete(`/admin/data/${type}`, {
        data: {
          password,
          confirmation,
          ...(isSessionDelete && useRange ? { from, to } : {}),
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries();
      onClose();
      toast.success(res.data.message || 'Đã xóa dữ liệu');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
        <HiOutlineExclamation className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
        <div>
          <p className="text-sm font-medium text-red-800">Hành động không thể hoàn tác!</p>
          <p className="mt-1 text-sm text-red-600">Bạn đang xóa: <strong>{label}</strong></p>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nhập mật khẩu xác nhận</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
      {!isSuperAdmin && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nhập &quot;XOA TAT CA&quot; để xác nhận</label>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
            placeholder="XOA TAT CA"
          />
        </div>
      )}
      {isSessionDelete && (
        <div className="rounded-lg border border-gray-200 p-3">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={useRange} onChange={(e) => setUseRange(e.target.checked)} className="rounded" />
            Xóa theo kỳ (không xóa toàn bộ)
          </label>
          {useRange && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Từ ngày</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Đến ngày</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending
            || (!isSuperAdmin && confirmation !== 'XOA TAT CA')
            || !password
            || (isSessionDelete && useRange && (!from || !to))
          }
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Đang xóa...' : 'Xóa'}
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const PRODUCT_PAGE_SIZE = 12;
  const SESSION_PAGE_SIZE = 10;
  const today = new Date().toISOString().split('T')[0];
  const defaultCustomStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  const [preset, setPreset] = useState('today');
  const [customFrom, setCustomFrom] = useState(defaultCustomStart);
  const [customTo, setCustomTo] = useState(today);
  const [draftFrom, setDraftFrom] = useState(defaultCustomStart);
  const [draftTo, setDraftTo] = useState(today);
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionPage, setSessionPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState(null);
  const deleteActions = [
    { type: 'sessions', label: 'Tất cả phiên chơi', desc: 'Xóa toàn bộ lịch sử phiên chơi và đơn hàng' },
    { type: 'products', label: 'Tất cả sản phẩm', desc: 'Xóa toàn bộ sản phẩm và danh mục' },
    { type: 'rooms', label: 'Tất cả phòng', desc: 'Xóa toàn bộ phòng bàn' },
    { type: 'all', label: 'TOÀN BỘ DỮ LIỆU', desc: 'Reset hệ thống về trạng thái ban đầu (trừ tài khoản, xóa luôn nhật ký thao tác)' },
  ];
  const statsParams = useMemo(
    () => buildParams(preset, customFrom, customTo, 'auto'),
    [preset, customFrom, customTo]
  );

  const { data: stats, isLoading: loadingStats, refetch: refetchAll, isFetching } = useQuery({
    queryKey: ['dashboard-stats', statsParams],
    queryFn: () => api.get('/dashboard/stats', { params: statsParams }).then((r) => r.data.data),
    refetchInterval: 45000,
  });

  const { data: allProducts } = useQuery({
    queryKey: ['dashboard-products-summary', statsParams],
    queryFn: () => api.get('/dashboard/top-products', { params: statsParams }).then((r) => r.data.data),
  });

  const { data: recentSessions } = useQuery({
    queryKey: ['dashboard-recent', statsParams],
    queryFn: () => api.get('/dashboard/recent-sessions', { params: { ...statsParams, limit: 200 } }).then((r) => r.data.data),
  });

  const delta = stats?.comparison?.revenueDeltaPercent;
  const showDelta = delta != null && !Number.isNaN(delta);
  const sortedProducts = useMemo(() => [...(allProducts || [])].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)), [allProducts]);
  const filteredProducts = useMemo(
    () => sortedProducts.filter((p) => (p.name || '').toLowerCase().includes(productSearch.trim().toLowerCase())),
    [sortedProducts, productSearch]
  );
  const productTotalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCT_PAGE_SIZE));
  const safeProductPage = Math.min(productPage, productTotalPages);
  const displayedProducts = filteredProducts.slice((safeProductPage - 1) * PRODUCT_PAGE_SIZE, safeProductPage * PRODUCT_PAGE_SIZE);

  const recentList = recentSessions || [];
  const filteredSessions = useMemo(
    () =>
      recentList.filter((s) => {
        const q = sessionSearch.trim().toLowerCase();
        if (!q) return true;
        return (
          (s.room?.name || '').toLowerCase().includes(q) ||
          (s.staff?.fullName || '').toLowerCase().includes(q) ||
          (s.status || '').toLowerCase().includes(q)
        );
      }),
    [recentList, sessionSearch]
  );
  const sessionTotalPages = Math.max(1, Math.ceil(filteredSessions.length / SESSION_PAGE_SIZE));
  const safeSessionPage = Math.min(sessionPage, sessionTotalPages);
  const displayedSessions = filteredSessions.slice((safeSessionPage - 1) * SESSION_PAGE_SIZE, safeSessionPage * SESSION_PAGE_SIZE);

  const applyCustomRange = () => {
    setCustomFrom(draftFrom);
    setCustomTo(draftTo);
    setProductPage(1);
    setSessionPage(1);
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-6 py-8 text-white shadow-xl shadow-slate-900/20">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-200">KARAOKE LASVEGAS 434 · Tổng quan</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Chọn khoảng thời gian để xem doanh thu, phiên chơi và hàng bán. Dữ liệu cập nhật định kỳ; bạn có thể làm mới thủ công.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="rounded-lg bg-white/10 px-3 py-1.5 font-medium text-slate-100">
                {stats?.range?.labelVi || 'Đang tải…'}
              </span>
              {showDelta && (
                <span className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium ${delta >= 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                  {delta >= 0 ? <HiOutlineTrendingUp className="h-4 w-4" /> : <HiOutlineTrendingDown className="h-4 w-4" />}
                  {delta >= 0 ? '+' : ''}{delta}% so với kỳ trước
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => refetchAll()}
              disabled={isFetching}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
            >
              <HiOutlineRefresh className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Làm mới số liệu
            </button>
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Thời gian</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  preset === p.id ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/10 text-slate-200 hover:bg-white/15'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur">
              <div>
                <label className="block text-xs font-medium text-slate-400">Từ ngày</label>
                <input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="mt-1 rounded-lg border border-white/20 bg-slate-900/50 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">Đến ngày</label>
                <input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="mt-1 rounded-lg border border-white/20 bg-slate-900/50 px-3 py-2 text-sm text-white"
                />
              </div>
              <button
                type="button"
                onClick={applyCustomRange}
                className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 hover:bg-teal-400"
              >
                Áp dụng
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="blue"
          icon={HiOutlineCash}
          label="Tổng tiền giờ trong kỳ"
          value={loadingStats ? '…' : formatVND(stats?.periodPlayRevenue || 0)}
          sub="Doanh thu tiền giờ"
        />
        <StatCard
          accent="emerald"
          icon={HiOutlineClipboardList}
          label="Tổng tiền món trong kỳ"
          value={loadingStats ? '…' : formatVND(stats?.periodFoodRevenue || 0)}
          sub={stats?.comparison?.prevPeriodRevenue != null ? `Kỳ trước: ${formatVND(stats.comparison.prevPeriodRevenue)}` : undefined}
        />
        <StatCard
          accent="violet"
          icon={HiOutlineCash}
          label="Tổng doanh thu kỳ chọn"
          value={loadingStats ? '…' : formatVND(stats?.periodRevenue || 0)}
          sub={`${stats?.periodCompletedSessions ?? 0} phiên hoàn thành`}
        />
        <StatCard
          accent="amber"
          icon={HiOutlineViewGrid}
          label="Phòng đang dùng"
          value={loadingStats ? '…' : `${stats?.roomsInUse ?? 0} / ${stats?.totalRooms ?? 0}`}
          sub="Luôn theo thời gian thực"
        />
        <StatCard
          accent="rose"
          icon={HiOutlineUserGroup}
          label="Đang phục vụ (live)"
          value={loadingStats ? '…' : stats?.customersServing ?? 0}
          sub="Phiên đang ACTIVE"
        />
        <StatCard
          accent="violet"
          icon={HiOutlineClipboardList}
          label="Phiên trong kỳ"
          value={loadingStats ? '…' : stats?.periodSessionsCount ?? 0}
          sub={`${stats?.periodCompletedSessions ?? 0} đã thanh toán · TB ${formatVND(stats?.avgOrderValue || 0)}/đơn`}
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
        <h3 className="text-base font-bold text-slate-900">Tất cả món trong kỳ</h3>
        <p className="mt-0.5 text-xs text-slate-500">Hiển thị số lượng bán và tổng tiền từng món theo khoảng thời gian đã chọn</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <input
            type="text"
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setProductPage(1);
            }}
            placeholder="Tìm món..."
            className="w-full sm:w-72 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p className="text-xs text-slate-500">Trang {safeProductPage}/{productTotalPages}</p>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/90 text-left">
                <th className="py-2.5 px-3 font-semibold text-slate-500">Món</th>
                <th className="py-2.5 px-3 text-right font-semibold text-slate-500">Số lượng</th>
                <th className="py-2.5 px-3 text-right font-semibold text-slate-500">Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((p) => (
                <tr key={p.productId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{p.name}</td>
                  <td className="py-2.5 px-3 text-right text-slate-700">{p.totalQuantity}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{formatVND(p.totalRevenue)}</td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr><td colSpan={3} className="py-10 text-center text-slate-400">Chưa có dữ liệu món trong khoảng này</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={safeProductPage <= 1}
            onClick={() => setProductPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Trước
          </button>
          <button
            type="button"
            disabled={safeProductPage >= productTotalPages}
            onClick={() => setProductPage((p) => Math.min(productTotalPages, p + 1))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="text-base font-bold text-slate-900">Phiên gần đây trong kỳ</h3>
          <p className="mt-0.5 text-xs text-slate-500">Tối đa 200 phiên mới nhất</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <input
              type="text"
              value={sessionSearch}
              onChange={(e) => {
                setSessionSearch(e.target.value);
                setSessionPage(1);
              }}
              placeholder="Tìm phòng / nhân viên / trạng thái..."
              className="w-full sm:w-80 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-xs text-slate-500">Trang {safeSessionPage}/{sessionTotalPages}</p>
          </div>
          {filteredSessions.length === 0 ? (
            <div className="mt-3 rounded-xl border border-slate-100 py-10 text-center text-slate-400">Không có phiên trong khoảng này</div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/90 text-left">
                    <th className="py-2.5 px-3 font-semibold text-slate-500">Phòng</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-500">NV</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-500">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-slate-500">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSessions.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{s.room?.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.staff?.fullName}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${s.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {s.status === 'ACTIVE' ? 'Đang chơi' : s.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{formatVND(s.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={safeSessionPage <= 1}
              onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={safeSessionPage >= sessionTotalPages}
              onClick={() => setSessionPage((p) => Math.min(sessionTotalPages, p + 1))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm ring-1 ring-red-100">
        <h3 className="mb-1 text-base font-semibold text-red-800">Xóa dữ liệu</h3>
        <p className="mb-4 text-sm text-red-600">Cẩn thận! Dữ liệu đã xóa không thể khôi phục.</p>
        <div className="space-y-3">
          {deleteActions.map((action) => (
            <div key={action.type} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{action.label}</p>
                <p className="text-xs text-gray-500">{action.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModal(action)}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                <HiOutlineTrash className="h-4 w-4" /> Xóa
              </button>
            </div>
          ))}
        </div>
      </div>

      {deleteModal && (
        <Modal isOpen onClose={() => setDeleteModal(null)} title={`Xóa ${deleteModal.label}`}>
          <DeleteDataModal type={deleteModal.type} label={deleteModal.label} onClose={() => setDeleteModal(null)} />
        </Modal>
      )}
    </div>
  );
}

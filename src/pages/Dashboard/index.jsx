import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HiOutlineViewGrid,
  HiOutlineCash,
  HiOutlineClipboardList,
  HiOutlineUserGroup,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineChartSquareBar,
  HiOutlineRefresh,
} from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from '../../services/api';
import { formatVND } from '../../utils/format';

const PRESETS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'year', label: 'Năm nay' },
  { id: 'custom', label: 'Khoảng ngày' },
];

const BUCKETS = [
  { id: 'auto', label: 'Tự động' },
  { id: 'hour', label: 'Theo giờ' },
  { id: 'day', label: 'Theo ngày' },
  { id: 'week', label: 'Theo tuần' },
  { id: 'month', label: 'Theo tháng' },
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

export default function DashboardPage() {
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
  const [chartBucket, setChartBucket] = useState('auto');

  const baseParams = useMemo(
    () => buildParams(preset, customFrom, customTo, chartBucket),
    [preset, customFrom, customTo, chartBucket]
  );
  const statsParams = useMemo(
    () => buildParams(preset, customFrom, customTo, 'auto'),
    [preset, customFrom, customTo]
  );

  const { data: stats, isLoading: loadingStats, refetch: refetchAll, isFetching } = useQuery({
    queryKey: ['dashboard-stats', statsParams],
    queryFn: () => api.get('/dashboard/stats', { params: statsParams }).then((r) => r.data.data),
    refetchInterval: 45000,
  });

  const { data: chartRes } = useQuery({
    queryKey: ['dashboard-chart', baseParams],
    queryFn: () => api.get('/dashboard/revenue-chart', { params: baseParams }).then((r) => r.data.data),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['dashboard-top', statsParams],
    queryFn: () => api.get('/dashboard/top-products', { params: statsParams }).then((r) => r.data.data),
  });

  const { data: recentSessions } = useQuery({
    queryKey: ['dashboard-recent', statsParams],
    queryFn: () => api.get('/dashboard/recent-sessions', { params: { ...statsParams, limit: 15 } }).then((r) => r.data.data),
  });

  const chartData = chartRes?.chart || [];
  const bucketUsed = chartRes?.bucket || 'day';

  const delta = stats?.comparison?.revenueDeltaPercent;
  const showDelta = delta != null && !Number.isNaN(delta);

  const applyCustomRange = () => {
    setCustomFrom(draftFrom);
    setCustomTo(draftTo);
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
          icon={HiOutlineViewGrid}
          label="Phòng đang dùng"
          value={loadingStats ? '…' : `${stats?.roomsInUse ?? 0} / ${stats?.totalRooms ?? 0}`}
          sub="Luôn theo thời gian thực"
        />
        <StatCard
          accent="emerald"
          icon={HiOutlineCash}
          label="Doanh thu kỳ chọn"
          value={loadingStats ? '…' : formatVND(stats?.periodRevenue)}
          sub={stats?.comparison?.prevPeriodRevenue != null ? `Kỳ trước: ${formatVND(stats.comparison.prevPeriodRevenue)}` : undefined}
        />
        <StatCard
          accent="violet"
          icon={HiOutlineClipboardList}
          label="Phiên trong kỳ"
          value={loadingStats ? '…' : stats?.periodSessionsCount ?? 0}
          sub={`${stats?.periodCompletedSessions ?? 0} đã thanh toán · TB ${formatVND(stats?.avgOrderValue || 0)}/đơn`}
        />
        <StatCard
          accent="amber"
          icon={HiOutlineUserGroup}
          label="Đang phục vụ (live)"
          value={loadingStats ? '…' : stats?.customersServing ?? 0}
          sub="Phiên đang ACTIVE"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <HiOutlineChartSquareBar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Biểu đồ doanh thu</h3>
                  <p className="text-xs text-slate-500">
                    Nhóm: <span className="font-medium text-slate-700">{BUCKETS.find((b) => b.id === (chartBucket === 'auto' ? bucketUsed : chartBucket))?.label || bucketUsed}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Chi tiết cột:</span>
                <select
                  value={chartBucket}
                  onChange={(e) => setChartBucket(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {BUCKETS.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 h-80">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-sm text-slate-400">
                  Chưa có phiên hoàn thành trong khoảng này
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`)} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)' }}
                      formatter={(v, name) => [formatVND(v), name === 'play' ? 'Tiền chơi' : 'Tiền món']}
                    />
                    <Legend formatter={(v) => (v === 'play' ? 'Tiền chơi' : v === 'food' ? 'Tiền món' : v)} />
                    <Bar dataKey="play" name="play" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} maxBarSize={48} />
                    <Bar dataKey="food" name="food" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
            <h3 className="text-base font-bold text-slate-900">Top món (theo kỳ)</h3>
            <p className="mt-0.5 text-xs text-slate-500">Theo doanh thu trong khoảng đã chọn</p>
            <ul className="mt-4 space-y-3">
              {(topProducts || []).map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-indigo-600 shadow-sm ring-1 ring-slate-200/80">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.totalQuantity} lượt · {formatVND(p.totalRevenue)}</p>
                  </div>
                </li>
              ))}
              {(!topProducts || topProducts.length === 0) && <li className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="text-base font-bold text-slate-900">Phân tách doanh thu kỳ chọn</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-blue-50/80 p-4 ring-1 ring-blue-100/80">
              <p className="text-xs font-medium text-blue-700/80">Tiền chơi</p>
              <p className="mt-1 text-lg font-bold text-blue-900">{loadingStats ? '…' : formatVND(stats?.periodPlayRevenue)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50/80 p-4 ring-1 ring-emerald-100/80">
              <p className="text-xs font-medium text-emerald-700/80">Tiền món</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{loadingStats ? '…' : formatVND(stats?.periodFoodRevenue)}</p>
            </div>
            <div className="rounded-xl bg-orange-50/80 p-4 ring-1 ring-orange-100/80">
              <p className="text-xs font-medium text-orange-700/80">Giảm giá</p>
              <p className="mt-1 text-lg font-bold text-orange-900">{loadingStats ? '…' : formatVND(stats?.periodDiscount)}</p>
            </div>
            <div className="rounded-xl bg-slate-100/80 p-4 ring-1 ring-slate-200/80">
              <p className="text-xs font-medium text-slate-600">Tổng thu</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{loadingStats ? '…' : formatVND(stats?.periodRevenue)}</p>
            </div>
          </div>
          {stats?.comparisonRange?.labelVi && (
            <p className="mt-4 text-xs text-slate-400">
              So sánh với kỳ: <span className="font-medium text-slate-600">{stats.comparisonRange.labelVi}</span>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="text-base font-bold text-slate-900">Phiên gần đây trong kỳ</h3>
          <p className="mt-0.5 text-xs text-slate-500">Tối đa 15 phiên mới nhất</p>
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
                {(recentSessions || []).map((s) => (
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
                {(!recentSessions || recentSessions.length === 0) && (
                  <tr><td colSpan={4} className="py-10 text-center text-slate-400">Không có phiên trong khoảng này</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

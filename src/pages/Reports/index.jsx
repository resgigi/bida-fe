import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { formatVND, formatDate, formatDateTime } from '../../utils/format';

function getIsoDate(daysAgo = 0) {
  return new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
}

function downloadCsv(filename, headers, rows) {
  const escapeCell = (value) => {
    const text = value == null ? '' : String(value);
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const csv = [headers.join(','), ...rows.map((row) => row.map(escapeCell).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState('revenue');
  const today = getIsoDate(0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const {
    data: revenue,
    isLoading: revenueLoading,
    isError: revenueError,
    error: revenueErrorObj,
  } = useQuery({
    queryKey: ['report-revenue', from, to],
    queryFn: () => api.get('/reports/revenue', { params: { from, to } }).then((r) => r.data.data),
    enabled: tab === 'revenue',
  });

  const chartData = useMemo(() => {
    const map = {};
    (revenue?.sessions || []).forEach((s) => {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + (s.totalAmount || 0);
    });
    return Object.entries(map).map(([date, total]) => ({ date, label: formatDate(date), total }));
  }, [revenue]);

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    isError: sessionsError,
    error: sessionsErrorObj,
  } = useQuery({
    queryKey: ['report-sessions', from, to],
    queryFn: () => api.get('/reports/sessions', { params: { from, to, limit: 100 } }).then((r) => r.data.data),
    enabled: tab === 'sessions',
  });

  const {
    data: soldItemsData,
    isLoading: soldItemsLoading,
    isError: soldItemsError,
    error: soldItemsErrorObj,
  } = useQuery({
    queryKey: ['report-sold-items', from, to],
    queryFn: () => api.get('/reports/sold-items', { params: { from, to } }).then((r) => r.data.data),
    enabled: tab === 'items',
  });

  const {
    data: dailyReport,
    isLoading: dailyLoading,
    isError: dailyError,
    error: dailyErrorObj,
  } = useQuery({
    queryKey: ['report-daily', today],
    queryFn: () => api.get('/reports/daily', { params: { date: today } }).then((r) => r.data.data),
    enabled: tab === 'daily',
  });

  const generateDaily = useMutation({
    mutationFn: () => api.post('/reports/daily/generate'),
    onSuccess: () => toast.success('Đã tạo báo cáo cuối ngày'),
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const tabs = [
    { key: 'revenue', label: 'Doanh thu' },
    { key: 'items', label: 'Món bán theo ngày' },
    { key: 'sessions', label: 'Lịch sử phiên' },
    { key: 'daily', label: 'Cuối ngày' },
  ];

  const setQuickRange = (type) => {
    if (type === 'today') {
      setFrom(today);
      setTo(today);
      return;
    }
    if (type === '7days') {
      setFrom(getIsoDate(6));
      setTo(today);
      return;
    }
    setFrom(monthStart);
    setTo(today);
  };

  const handleExportCsv = () => {
    if (tab === 'items') {
      const rows = (soldItemsData?.summary || []).map((item) => [
        item.productName,
        item.productCode,
        item.quantity,
        item.revenue,
      ]);
      downloadCsv(`bao-cao-mon-${from}-${to}.csv`, ['Mon', 'Ma', 'SoLuong', 'DoanhThu'], rows);
      return;
    }
    if (tab === 'sessions') {
      const rows = (sessionsData?.sessions || []).map((s) => [
        s.room?.name || '',
        s.staff?.fullName || '',
        formatDateTime(s.createdAt),
        s.totalPlayAmount || 0,
        s.totalFoodAmount || 0,
        s.totalAmount || 0,
      ]);
      downloadCsv(`bao-cao-phien-${from}-${to}.csv`, ['Phong', 'NhanVien', 'ThoiGian', 'TienGio', 'TienMon', 'Tong'], rows);
      return;
    }
    toast('Tab hiện tại chưa có dữ liệu xuất CSV');
  };

  const handlePrintPdf = () => window.print();

  return (
    <div id="report-print-area" className="space-y-4 sm:space-y-5">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Báo cáo</h2>

      <div className="grid grid-cols-2 sm:flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'revenue' || tab === 'sessions' || tab === 'items') && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Từ ngày</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" max={to} />
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Đến ngày</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" min={from} max={today} />
            </div>
            <div className="lg:col-span-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setQuickRange('today')} className="px-3 py-2 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Hôm nay</button>
              <button type="button" onClick={() => setQuickRange('7days')} className="px-3 py-2 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">7 ngày</button>
              <button type="button" onClick={() => setQuickRange('month')} className="px-3 py-2 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Tháng này</button>
            </div>
            <div className="lg:col-span-2 flex flex-wrap gap-2 justify-start sm:justify-end">
              <button type="button" onClick={handleExportCsv} className="px-3 py-2 text-xs rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50">Xuất CSV (Excel)</button>
              <button type="button" onClick={handlePrintPdf} className="px-3 py-2 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">In / Lưu PDF</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'revenue' && (
        <div className="space-y-4">
          {revenueLoading && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">Đang tải dữ liệu doanh thu...</div>}
          {revenueError && <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-500">{revenueErrorObj?.response?.data?.message || 'Không thể tải báo cáo doanh thu'}</div>}
          {!revenueLoading && !revenueError && (
            <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 text-center"><p className="text-xs text-gray-500 mb-1">Tổng phiên</p><p className="text-lg sm:text-xl font-bold">{revenue?.summary?.totalSessions || 0}</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 text-center"><p className="text-xs text-gray-500 mb-1">Doanh thu</p><p className="text-lg sm:text-xl font-bold text-green-600">{formatVND(revenue?.summary?.totalRevenue)}</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 text-center"><p className="text-xs text-gray-500 mb-1">Tiền giờ</p><p className="text-lg sm:text-xl font-bold text-blue-600">{formatVND(revenue?.summary?.totalPlayRevenue)}</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 text-center"><p className="text-xs text-gray-500 mb-1">Tiền món</p><p className="text-lg sm:text-xl font-bold text-purple-600">{formatVND(revenue?.summary?.totalFoodRevenue)}</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 text-center"><p className="text-xs text-gray-500 mb-1">Giảm giá</p><p className="text-lg sm:text-xl font-bold text-orange-600">{formatVND(revenue?.summary?.totalDiscount)}</p></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Biểu đồ doanh thu theo ngày</h3>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatVND(v)} />
                  <Bar dataKey="total" name="Doanh thu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {tab === 'items' && (
        <div className="space-y-4">
          {soldItemsLoading && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">Đang tải dữ liệu món bán...</div>}
          {soldItemsError && <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-500">{soldItemsErrorObj?.response?.data?.message || 'Không thể tải dữ liệu món bán'}</div>}
          {!soldItemsLoading && !soldItemsError && (
            <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Tổng SL món</p><p className="text-lg font-bold text-blue-700">{soldItemsData?.totals?.totalQty || 0}</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Doanh thu món</p><p className="text-lg font-bold text-green-700">{formatVND(soldItemsData?.totals?.totalRevenue)}</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 col-span-2 sm:col-span-1"><p className="text-xs text-gray-500">Khoảng ngày</p><p className="text-sm font-semibold">{formatDate(soldItemsData?.from)} - {formatDate(soldItemsData?.to)}</p></div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-semibold mb-3">Tổng hợp theo món</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left py-2 pr-3">Món</th>
                  <th className="text-right py-2 px-3">SL</th>
                  <th className="text-right py-2 pl-3">Doanh thu</th>
                </tr></thead>
                <tbody>
                  {(soldItemsData?.summary || []).map((item) => (
                    <tr key={item.productId} className="border-b border-gray-100">
                      <td className="py-2 pr-3"><p className="font-medium">{item.productName}</p><p className="text-xs text-gray-400">{item.productCode}</p></td>
                      <td className="text-right py-2 px-3 font-semibold">{item.quantity}</td>
                      <td className="text-right py-2 pl-3">{formatVND(item.revenue)}</td>
                    </tr>
                  ))}
                  {(soldItemsData?.summary || []).length === 0 && <tr><td colSpan={3} className="py-6 text-center text-gray-400">Không có dữ liệu món trong khoảng đã chọn</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-3">
          <p className="text-sm text-blue-700">
            <Link to="/session-history" className="font-medium underline hover:no-underline">Mở trang Lịch sử phiên chơi</Link>
            {' '}để lọc nâng cao, phân trang và xem chi tiết từng món / thanh toán.
          </p>
          <div className="md:hidden space-y-2">
            {sessionsLoading && <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-gray-400">Đang tải lịch sử phiên...</div>}
            {sessionsError && <div className="bg-white rounded-xl border border-red-200 p-5 text-center text-red-500">{sessionsErrorObj?.response?.data?.message || 'Không thể tải lịch sử phiên'}</div>}
            {!sessionsLoading && !sessionsError && (sessionsData?.sessions || []).map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800">{s.room?.name}</p>
                  <p className="text-sm font-semibold text-blue-700">{formatVND(s.totalAmount)}</p>
                </div>
                <p className="text-xs text-gray-500">NV: {s.staff?.fullName || '—'}</p>
                <p className="text-xs text-gray-500">{formatDateTime(s.createdAt)}</p>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <p className="text-gray-500">Tiền giờ: <span className="font-medium text-gray-700">{formatVND(s.totalPlayAmount)}</span></p>
                  <p className="text-gray-500">Tiền món: <span className="font-medium text-gray-700">{formatVND(s.totalFoodAmount)}</span></p>
                </div>
              </div>
            ))}
            {!sessionsLoading && !sessionsError && (!sessionsData?.sessions || sessionsData.sessions.length === 0) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-gray-400">Không có dữ liệu</div>
            )}
          </div>

          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Phòng</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Nhân viên</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Thời gian</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Tiền giờ</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Tiền món</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Tổng</th>
              </tr></thead>
              <tbody>
                {sessionsLoading && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Đang tải lịch sử phiên...</td></tr>}
                {sessionsError && <tr><td colSpan={6} className="py-8 text-center text-red-500">{sessionsErrorObj?.response?.data?.message || 'Không thể tải lịch sử phiên'}</td></tr>}
                {(sessionsData?.sessions || []).map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{s.room?.name}</td>
                    <td className="py-3 px-4 text-gray-500">{s.staff?.fullName}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{formatDateTime(s.createdAt)}</td>
                    <td className="py-3 px-4 text-right">{formatVND(s.totalPlayAmount)}</td>
                    <td className="py-3 px-4 text-right">{formatVND(s.totalFoodAmount)}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatVND(s.totalAmount)}</td>
                  </tr>
                ))}
                {!sessionsLoading && !sessionsError && (!sessionsData?.sessions || sessionsData.sessions.length === 0) && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Không có dữ liệu</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'daily' && (
        <div className="space-y-4">
          <button onClick={() => generateDaily.mutate()} disabled={generateDaily.isPending} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {generateDaily.isPending ? 'Đang tạo...' : 'Tạo báo cáo cuối ngày'}
          </button>
          {dailyLoading && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">Đang tải báo cáo ngày...</div>}
          {dailyError && <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-500">{dailyErrorObj?.response?.data?.message || 'Không thể tải báo cáo ngày'}</div>}
          {!dailyLoading && !dailyError && dailyReport ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
              <h3 className="text-base font-semibold mb-4">Báo cáo ngày {new Date(dailyReport.reportDate).toLocaleDateString('vi-VN')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="text-center"><p className="text-xs text-gray-500">Tổng phiên</p><p className="text-xl font-bold">{dailyReport.totalSessions}</p></div>
                <div className="text-center"><p className="text-xs text-gray-500">Doanh thu</p><p className="text-xl font-bold text-green-600">{formatVND(dailyReport.totalRevenue)}</p></div>
                <div className="text-center"><p className="text-xs text-gray-500">Tiền giờ</p><p className="text-xl font-bold text-blue-600">{formatVND(dailyReport.totalPlayRevenue)}</p></div>
                <div className="text-center"><p className="text-xs text-gray-500">Tiền món</p><p className="text-xl font-bold text-purple-600">{formatVND(dailyReport.totalFoodRevenue)}</p></div>
                <div className="text-center"><p className="text-xs text-gray-500">Giảm giá</p><p className="text-xl font-bold text-orange-600">{formatVND(dailyReport.totalDiscount)}</p></div>
              </div>
            </div>
          ) : !dailyLoading && !dailyError ? <p className="text-gray-400 text-sm">Chưa có báo cáo cho hôm nay. Nhấn "Tạo báo cáo cuối ngày" để tạo.</p> : null}
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area { position: absolute; inset: 0; background: white; padding: 16px; }
        }
      `}</style>
    </div>
  );
}

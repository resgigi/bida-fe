import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { formatVND, formatDate } from '../../utils/format';

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
    enabled: !!from && !!to,
  });

  const {
    data: soldItemsData,
    isLoading: soldItemsLoading,
    isError: soldItemsError,
    error: soldItemsErrorObj,
  } = useQuery({
    queryKey: ['report-sold-items', from, to],
    queryFn: () => api.get('/reports/sold-items', { params: { from, to } }).then((r) => r.data.data),
    enabled: !!from && !!to,
  });

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
    const rows = (soldItemsData?.summary || []).map((item) => [
      item.productName,
      item.productCode,
      item.quantity,
      item.revenue,
    ]);
    downloadCsv(`bao-cao-kho-mon-${from}-${to}.csv`, ['Mon', 'Ma', 'SoLuong', 'DoanhThu'], rows);
  };

  const handlePrintPdf = () => window.print();

  return (
    <div id="report-print-area" className="space-y-4 sm:space-y-5">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Báo cáo</h2>

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

      {(revenueLoading || soldItemsLoading) && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">Đang tải dữ liệu báo cáo...</div>}
      {(revenueError || soldItemsError) && (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-500">
          {revenueErrorObj?.response?.data?.message || soldItemsErrorObj?.response?.data?.message || 'Không thể tải báo cáo'}
        </div>
      )}
      {!revenueLoading && !soldItemsLoading && !revenueError && !soldItemsError && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Tổng tiền giờ</p><p className="text-lg font-bold text-blue-700">{formatVND(revenue?.summary?.totalPlayRevenue)}</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Tổng tiền món</p><p className="text-lg font-bold text-green-700">{formatVND(soldItemsData?.totals?.totalRevenue)}</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Tổng SL món</p><p className="text-lg font-bold text-purple-700">{soldItemsData?.totals?.totalQty || 0}</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">Khoảng ngày</p><p className="text-sm font-semibold">{formatDate(soldItemsData?.from)} - {formatDate(soldItemsData?.to)}</p></div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-semibold mb-3">Tất cả món theo kỳ</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left py-2 pr-3">Món</th>
                  <th className="text-right py-2 px-3">Số lượng</th>
                  <th className="text-right py-2 pl-3">Tổng tiền</th>
                </tr></thead>
                <tbody>
                  {(soldItemsData?.summary || []).map((item) => (
                    <tr key={item.productId} className="border-b border-gray-100">
                      <td className="py-2 pr-3"><p className="font-medium">{item.productName}</p><p className="text-xs text-gray-400">{item.productCode}</p></td>
                      <td className="text-right py-2 px-3 font-semibold">{item.quantity}</td>
                      <td className="text-right py-2 pl-3">{formatVND(item.revenue)}</td>
                    </tr>
                  ))}
                  {(soldItemsData?.summary || []).length === 0 && <tr><td colSpan={3} className="py-6 text-center text-gray-400">Không có dữ liệu món trong kỳ đã chọn</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
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

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HiOutlinePrinter, HiOutlineX, HiOutlineWifi,
  HiOutlineStatusOnline, HiOutlineChip,
} from 'react-icons/hi';
import api from '../services/api';
import { formatVND, formatDateTime } from '../utils/format';
import {
  isSunmiDevice, isBluetoothSupported,
  printSunmi, printBluetooth, printWifi,
  getConnectedDeviceName, disconnectBluetooth,
} from '../utils/posPrint';

const PAYMENT_LABEL = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', CARD: 'Thẻ' };

const S = {
  root: { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#111', lineHeight: '1.55', width: '100%' },
  center: { textAlign: 'center' },
  storeName: { fontSize: '17px', fontWeight: '900', letterSpacing: '0.5px', color: '#111' },
  storeInfo: { fontSize: '11px', color: '#333', marginTop: '1px' },
  hr: { border: 'none', borderTop: '1px solid #111', margin: '5px 0' },
  hrDash: { border: 'none', borderTop: '1px dashed #555', margin: '5px 0' },
  sessionLabel: { color: '#2563eb', fontSize: '12px' },
  sessionValue: { fontWeight: '700', color: '#111', fontSize: '12px' },
  sessionRow: { marginBottom: '1px' },
  th: { fontWeight: '700', color: '#111', padding: '3px 2px', borderBottom: '1px solid #111', fontSize: '12px' },
  td: { padding: '2px 2px', fontSize: '12px', color: '#111', verticalAlign: 'top' },
  rowFlex: { display: 'flex', justifyContent: 'space-between', padding: '1px 0', fontSize: '12px', color: '#111' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '15px', fontWeight: '900', color: '#111' },
  footer: { textAlign: 'center', fontSize: '11px', color: '#444', marginTop: '4px' },
};

function HR({ dashed }) {
  return <div style={dashed ? S.hrDash : S.hr} />;
}

function ReceiptBody({ session, storeName, storeAddr, storePhone }) {
  return (
    <div id="receipt-body" style={S.root}>
      <div style={S.center}>
        <div style={S.storeName}>{storeName}</div>
        {storeAddr && <div style={S.storeInfo}>{storeAddr}</div>}
        {storePhone && <div style={S.storeInfo}>ĐT: {storePhone}</div>}
        <div style={{ ...S.storeInfo, color: '#888', marginTop: '3px', fontSize: '10px' }}>
          Mã phiên: {session.id}
        </div>
      </div>

      <HR />

      <div>
        <div style={S.sessionRow}><span style={S.sessionLabel}>Phòng: </span><span style={S.sessionValue}>{session.room?.name}</span></div>
        <div style={S.sessionRow}><span style={S.sessionLabel}>NV phụ trách: </span><span style={S.sessionValue}>{session.staff?.fullName || '—'}</span></div>
        <div style={S.sessionRow}><span style={S.sessionLabel}>Bắt đầu: </span><span style={{ ...S.sessionValue, fontWeight: '400' }}>{formatDateTime(session.startTime)}</span></div>
        <div style={S.sessionRow}><span style={S.sessionLabel}>Kết thúc: </span><span style={{ ...S.sessionValue, fontWeight: '400' }}>{session.endTime ? formatDateTime(session.endTime) : '—'}</span></div>
      </div>

      <HR />

      {(session.orderItems || []).length > 0 && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign: 'left' }}>Món</th>
                <th style={{ ...S.th, textAlign: 'right' }}>SL</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Đơn</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {session.orderItems.map((row) => (
                <tr key={row.id}>
                  <td style={{ ...S.td, textAlign: 'left' }}>{row.product?.name}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>{row.quantity}</td>
                  <td style={{ ...S.td, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatVND(row.unitPrice)}</td>
                  <td style={{ ...S.td, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '600' }}>{formatVND(row.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <HR />
        </>
      )}

      <div style={{ ...S.rowFlex, color: '#555' }}>
        <span>Tiền giờ</span>
        <span style={{ color: '#111' }}>{formatVND(session.totalPlayAmount)}</span>
      </div>
      {(session.discountAmount ?? 0) > 0 && (
        <div style={{ ...S.rowFlex, color: '#dc2626' }}>
          <span>Giảm giá{session.discountPercent > 0 ? ` (${session.discountPercent}%)` : ''}</span>
          <span>-{formatVND(session.discountAmount)}</span>
        </div>
      )}

      <HR />

      <div style={S.totalRow}>
        <span>Tổng cộng</span>
        <span>{formatVND(session.totalAmount)}</span>
      </div>

      <HR />

      <div style={S.rowFlex}>
        <span style={{ color: '#555' }}>Thanh toán</span>
        <span>{PAYMENT_LABEL[session.paymentMethod] || session.paymentMethod}</span>
      </div>
      <div style={{ ...S.rowFlex, fontWeight: '700' }}>
        <span>Đã thu</span>
        <span>{formatVND(session.paidAmount)}</span>
      </div>
      {(session.paidAmount ?? 0) > (session.totalAmount ?? 0) && (
        <div style={{ ...S.rowFlex, color: '#16a34a' }}>
          <span>Tiền thừa</span>
          <span>{formatVND((session.paidAmount ?? 0) - (session.totalAmount ?? 0))}</span>
        </div>
      )}

      {session.note && (
        <>
          <HR dashed />
          <div style={{ fontSize: '11px', color: '#333' }}>
            <span style={{ fontWeight: '700' }}>Ghi chú:</span> {session.note}
          </div>
        </>
      )}

      <HR dashed />
      <div style={S.footer}>Cảm ơn quý khách và hẹn gặp lại!</div>
    </div>
  );
}

export default function InvoicePrint({ session, onClose }) {
  const [printStatus, setPrintStatus] = useState(''); // '', 'loading', 'ok', 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [wifiUrl, setWifiUrl] = useState(() => localStorage.getItem('pos_wifi_url') || 'ws://192.168.1.100:9100');
  const [showWifiInput, setShowWifiInput] = useState(false);
  const [connectedName, setConnectedName] = useState(() => getConnectedDeviceName());

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  if (!session) return null;

  const storeName = settings.storeName || 'KARAOKE LASVEGAS 434';
  const storeAddr = settings.storeAddress || '';
  const storePhone = settings.storePhone || '';

  const printArgs = { storeName, storeAddr, storePhone, session, formatVND, formatDT: formatDateTime };

  const withStatus = async (fn) => {
    setPrintStatus('loading');
    setStatusMsg('');
    try {
      await fn();
      setPrintStatus('ok');
      setStatusMsg('In thành công!');
      setTimeout(() => setPrintStatus(''), 3000);
    } catch (e) {
      setPrintStatus('error');
      setStatusMsg(e.message || 'Lỗi in');
    }
  };

  const handleBrowserPrint = () => window.print();

  const handleSunmiPrint = () => withStatus(() => printSunmi(printArgs));

  const handleBluetoothPrint = () => withStatus(async () => {
    await printBluetooth(printArgs);
    setConnectedName(getConnectedDeviceName());
  });

  const handleWifiPrint = () => {
    localStorage.setItem('pos_wifi_url', wifiUrl);
    withStatus(() => printWifi({ ...printArgs, wsUrl: wifiUrl }));
  };

  const sunmi = isSunmiDevice();
  const btSupported = isBluetoothSupported();

  const node = (
    <div
      id="invoice-print-portal"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 print:static print:inset-auto print:z-auto print:block print:p-0"
    >
      <div className="no-print absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        id="invoice-print-shell"
        className="relative flex max-h-[95vh] w-full max-w-sm flex-col rounded-2xl bg-white shadow-xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none print:overflow-visible"
      >
        {/* ── Toolbar ── */}
        <div className="no-print flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-800">Hóa đơn</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <HiOutlineX className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* ── Print method buttons ── */}
        <div className="no-print flex flex-col gap-2 border-b border-gray-200 px-4 py-3">
          {/* Standard browser print */}
          <button
            type="button"
            onClick={handleBrowserPrint}
            className="flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-95 transition-transform"
          >
            <HiOutlinePrinter className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-left">In (trình duyệt)</span>
            <span className="text-xs text-blue-200">Window.print()</span>
          </button>

          {/* Sunmi built-in printer */}
          {sunmi && (
            <button
              type="button"
              onClick={handleSunmiPrint}
              disabled={printStatus === 'loading'}
              className="flex items-center gap-3 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 active:scale-95 transition-transform disabled:opacity-60"
            >
              <HiOutlineChip className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">In máy Sunmi</span>
              <span className="text-xs text-orange-200">Built-in</span>
            </button>
          )}

          {/* Bluetooth */}
          {btSupported && (
            <button
              type="button"
              onClick={handleBluetoothPrint}
              disabled={printStatus === 'loading'}
              className="flex items-center gap-3 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 active:scale-95 transition-transform disabled:opacity-60"
            >
              <HiOutlineStatusOnline className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">
                In Bluetooth
                {connectedName && <span className="ml-2 text-xs text-indigo-200">• {connectedName}</span>}
              </span>
              <span className="text-xs text-indigo-200">BT</span>
            </button>
          )}

          {/* WiFi / LAN */}
          <div>
            <button
              type="button"
              onClick={() => setShowWifiInput((v) => !v)}
              className="flex w-full items-center gap-3 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 active:scale-95 transition-transform"
            >
              <HiOutlineWifi className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">In WiFi / LAN</span>
              <span className="text-xs text-emerald-200">WebSocket</span>
            </button>
            {showWifiInput && (
              <div className="mt-2 flex gap-2">
                <input
                  value={wifiUrl}
                  onChange={(e) => setWifiUrl(e.target.value)}
                  placeholder="ws://192.168.1.x:9100"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleWifiPrint}
                  disabled={printStatus === 'loading'}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  In
                </button>
              </div>
            )}
          </div>

          {/* Status message */}
          {printStatus && (
            <div className={`rounded-lg px-3 py-2 text-sm font-medium ${
              printStatus === 'loading' ? 'bg-gray-100 text-gray-600' :
              printStatus === 'ok'      ? 'bg-green-50 text-green-700' :
                                          'bg-red-50 text-red-700'
            }`}>
              {printStatus === 'loading' ? 'Đang in...' : statusMsg}
            </div>
          )}
        </div>

        {/* ── Receipt preview ── */}
        <div
          id="invoice-print-area"
          className="flex-1 overflow-y-auto print:max-h-none print:overflow-visible"
          style={{ padding: '14px' }}
        >
          <ReceiptBody session={session} storeName={storeName} storeAddr={storeAddr} storePhone={storePhone} />
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0; size: 80mm auto; }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          body > *:not(#invoice-print-portal) { display: none !important; }
          #invoice-print-portal {
            display: block !important;
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #invoice-print-shell {
            width: 80mm !important;
            max-width: 80mm !important;
            max-height: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          #invoice-print-area {
            width: 80mm !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            max-height: none !important;
            padding: 3mm 4mm !important;
          }
          #receipt-body, #receipt-body table { width: 100% !important; }
          #invoice-print-portal .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );

  return createPortal(node, document.body);
}

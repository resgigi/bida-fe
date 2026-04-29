import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  HiOutlinePrinter, HiOutlineX, HiOutlineWifi,
  HiOutlineStatusOnline, HiOutlineChip,
} from 'react-icons/hi';
import api from '../services/api';
import { formatVND, formatDateTime } from '../utils/format';
import {
  isSunmiDevice, isBluetoothSupported, isCapacitorAndroid,
  printSunmi, printBluetooth, printWifi, printAndroidThermalBluetooth,
  getConnectedDeviceName, disconnectBluetooth,
} from '../utils/posPrint';
import { thermalListPaired } from '../plugins/thermalPrinter';
import {
  PRINT_METHOD,
  getDefaultPrintMethod,
  defaultMethodLabel,
  getWifiPrinters,
  getSelectedWifiPrinterId,
  setSelectedWifiPrinterId,
} from '../utils/posPrintSettings';

const PAYMENT_LABEL = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', CARD: 'Thẻ' };

const S = {
  root: { fontFamily: 'Tahoma, Arial, sans-serif', fontSize: '13px', color: '#111', lineHeight: '1.55', width: '100%' },
  center: { textAlign: 'center' },
  storeName: { fontSize: '17px', fontWeight: '900', letterSpacing: '0.5px', color: '#111' },
  storeInfo: { fontSize: '11px', color: '#333', marginTop: '1px' },
  hr: { border: 'none', borderTop: '1px solid #111', margin: '5px 0' },
  hrDash: { border: 'none', borderTop: '1px dashed #555', margin: '5px 0' },
  sessionLabel: { fontWeight: '700', color: '#111', fontSize: '12px' },
  sessionValue: { fontWeight: '900', color: '#111', fontSize: '12px' },
  sessionRow: { marginBottom: '1px' },
  th: { fontWeight: '900', color: '#111', padding: '3px 2px', borderBottom: '1px solid #111', fontSize: '12px' },
  td: { padding: '2px 2px', fontSize: '12px', color: '#111', verticalAlign: 'top', fontWeight: '700' },
  rowFlex: { display: 'flex', justifyContent: 'space-between', padding: '1px 0', fontSize: '12px', color: '#111', fontWeight: '700' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '15px', fontWeight: '900', color: '#111' },
  footer: { textAlign: 'center', fontSize: '11px', color: '#444', marginTop: '4px' },
};

function HR({ dashed }) {
  return <div style={dashed ? S.hrDash : S.hr} />;
}

function ReceiptBody({ session, storeName, storeAddr, storePhone }) {
  const isTempReceipt = String(session.id || '').startsWith('TEMP-') || session.isTempReceipt;
  return (
    <div id="receipt-body" style={S.root}>
      <div style={S.center}>
        {isTempReceipt ? (
          <div style={{ ...S.storeName, marginBottom: '3px' }}>PHIẾU THU TẠM TÍNH</div>
        ) : (
          <>
            <div style={S.storeName}>{storeName}</div>
            {storeAddr && <div style={S.storeInfo}>{storeAddr}</div>}
            {storePhone && <div style={S.storeInfo}>ĐT: {storePhone}</div>}
            <div style={{ ...S.storeInfo, color: '#888', marginTop: '3px', fontSize: '10px' }}>
              Mã phiên: {session.id}
            </div>
          </>
        )}
      </div>

      <HR />

      <div>
        <div style={S.sessionRow}><span style={S.sessionLabel}>Phòng: </span><span style={S.sessionValue}>{session.room?.name}</span></div>
        <div style={S.sessionRow}><span style={S.sessionLabel}>NV phụ trách: </span><span style={S.sessionValue}>{session.staff?.fullName || '—'}</span></div>
        <div style={S.sessionRow}><span style={S.sessionLabel}>Bắt đầu: </span><span style={S.sessionValue}>{formatDateTime(session.startTime)}</span></div>
        <div style={S.sessionRow}><span style={S.sessionLabel}>Kết thúc: </span><span style={S.sessionValue}>{session.endTime ? formatDateTime(session.endTime) : '—'}</span></div>
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
                  <td style={{ ...S.td, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '700' }}>{formatVND(row.unitPrice)}</td>
                  <td style={{ ...S.td, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '900' }}>{formatVND(row.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <HR />
        </>
      )}

      <div style={{ ...S.rowFlex, fontWeight: '900', fontSize: '14px' }}>
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

      {!isTempReceipt && (
        <>
          <div style={S.rowFlex}>
            <span>Thanh toán</span>
            <span style={{ color: '#111' }}>{PAYMENT_LABEL[session.paymentMethod] || session.paymentMethod}</span>
          </div>
          <div style={{ ...S.rowFlex, fontWeight: '900' }}>
            <span>Đã thu</span>
            <span>{formatVND(session.paidAmount)}</span>
          </div>
          {(session.paidAmount ?? 0) > (session.totalAmount ?? 0) && (
            <div style={{ ...S.rowFlex, color: '#16a34a' }}>
              <span>Tiền thừa</span>
              <span>{formatVND((session.paidAmount ?? 0) - (session.totalAmount ?? 0))}</span>
            </div>
          )}
          <HR />
        </>
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
  const [wifiPrinters, setWifiPrinters] = useState(() => getWifiPrinters());
  const [wifiSelectedId, setWifiSelectedIdState] = useState(() => {
    const list = getWifiPrinters();
    const sid = getSelectedWifiPrinterId();
    return (list.find((p) => p.id === sid) || list[0])?.id || '';
  });
  const [connectedName, setConnectedName] = useState(() => getConnectedDeviceName());
  const [androidPickerOpen, setAndroidPickerOpen] = useState(false);
  const [androidDevices, setAndroidDevices] = useState([]);
  const [androidPickerLoading, setAndroidPickerLoading] = useState(false);
  const [savedAndroidPrinter, setSavedAndroidPrinter] = useState(
    () => localStorage.getItem('pos_bt_name') || localStorage.getItem('pos_bt_mac') || '',
  );

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const list = getWifiPrinters();
    setWifiPrinters(list);
    const sid = getSelectedWifiPrinterId();
    const pick = list.find((p) => p.id === sid) || list[0];
    if (pick) setWifiSelectedIdState(pick.id);
    else setWifiSelectedIdState('');
  }, [session?.id]);

  if (!session) return null;

  const storeName = settings.storeName || 'PHẦN MỀM TÍNH TIỀN';
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
    const list = getWifiPrinters();
    if (!list.length) {
      toast.error('Chưa có máy in WiFi. Vào Cài đặt → In hóa đơn để thêm.');
      return;
    }
    const pick = list.find((p) => p.id === wifiSelectedId) || list[0];
    withStatus(() => printWifi({ ...printArgs, wsUrl: pick.wsUrl }));
  };

  const onWifiSelectChange = (id) => {
    setWifiSelectedIdState(id);
    setSelectedWifiPrinterId(id);
  };

  const runDefaultPrint = () => {
    const m = getDefaultPrintMethod();
    if (m === PRINT_METHOD.BROWSER) {
      window.print();
      return;
    }
    if (m === PRINT_METHOD.SUNMI) {
      if (!sunmi) {
        toast.error('Không phát hiện máy Sunmi. Chọn cách in khác hoặc đổi mặc định trong Cài đặt.');
        return;
      }
      handleSunmiPrint();
      return;
    }
    if (m === PRINT_METHOD.BLUETOOTH_WEB) {
      if (!btSupported) {
        toast.error('Trình duyệt không hỗ trợ Web Bluetooth.');
        return;
      }
      handleBluetoothPrint();
      return;
    }
    if (m === PRINT_METHOD.WIFI) {
      const list = getWifiPrinters();
      if (!list.length) {
        toast.error('Chưa có máy in WiFi. Vào Cài đặt để thêm.');
        return;
      }
      const sid = getSelectedWifiPrinterId();
      const pick = list.find((p) => p.id === sid) || list[0];
      withStatus(() => printWifi({ ...printArgs, wsUrl: pick.wsUrl }));
      return;
    }
    if (m === PRINT_METHOD.ANDROID_THERMAL) {
      if (!capAndroid) {
        toast.error('In Bluetooth SPP chỉ dùng trên app Android (bản cài từ APK).');
        return;
      }
      handleAndroidThermalPrint();
    }
  };

  const loadAndroidPaired = async () => {
    setAndroidPickerLoading(true);
    setAndroidDevices([]);
    try {
      const list = await thermalListPaired();
      setAndroidDevices(Array.isArray(list) ? list : []);
    } catch (e) {
      setStatusMsg(e.message || 'Không đọc được máy Bluetooth');
      setPrintStatus('error');
    } finally {
      setAndroidPickerLoading(false);
    }
  };

  const openAndroidPrinterPicker = () => {
    setAndroidPickerOpen(true);
    loadAndroidPaired();
  };

  const handleAndroidThermalPrint = () => {
    const mac = localStorage.getItem('pos_bt_mac');
    if (!mac) {
      openAndroidPrinterPicker();
      return;
    }
    withStatus(() => printAndroidThermalBluetooth({ address: mac, ...printArgs }));
  };

  const pickAndroidDevice = (d) => {
    const name = d.name || d.address || '';
    localStorage.setItem('pos_bt_mac', d.address);
    localStorage.setItem('pos_bt_name', name);
    setSavedAndroidPrinter(name || d.address);
    setAndroidPickerOpen(false);
    withStatus(() => printAndroidThermalBluetooth({ address: d.address, ...printArgs }));
  };

  const sunmi = isSunmiDevice();
  const btSupported = isBluetoothSupported();
  const capAndroid = isCapacitorAndroid();
  const defaultMethod = getDefaultPrintMethod();

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

          {/* Bluetooth (Web Bluetooth — Chrome; trên WebView Android thường không dùng được) */}
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

          {/* Android POS — Bluetooth cổ điển (SPP), ghép đôi máy in trong Cài đặt hệ thống */}
          {capAndroid && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2">
              <button
                type="button"
                onClick={handleAndroidThermalPrint}
                disabled={printStatus === 'loading'}
                className="flex w-full items-center gap-3 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 active:scale-95 transition-transform disabled:opacity-60"
              >
                <HiOutlinePrinter className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">
                  In máy in nhiệt (Android)
                  {savedAndroidPrinter && (
                    <span className="ml-2 block text-xs font-normal text-amber-100">
                      Đang dùng: {savedAndroidPrinter}
                    </span>
                  )}
                </span>
                <span className="text-xs text-amber-100">SPP</span>
              </button>
              <button
                type="button"
                onClick={openAndroidPrinterPicker}
                className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50"
              >
                Chọn / đổi máy in đã ghép đôi
              </button>
              <p className="mt-1 px-1 text-[11px] leading-snug text-amber-900/80">
                Ghép đôi máy in (Bluetooth) trong Cài đặt Android trước. Hỗ trợ máy in nhiệt dùng Bluetooth cổ điển (Xprinter, Rongta…).
              </p>
            </div>
          )}

          {/* WiFi / LAN — danh sách lưu trong Cài đặt */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2">
            <div className="mb-2 flex items-center gap-2 text-emerald-900">
              <HiOutlineWifi className="h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold">In WiFi / LAN (WebSocket)</span>
            </div>
            {wifiPrinters.length === 0 ? (
              <p className="px-1 text-xs text-emerald-900/80">
                Chưa có máy in nào.{' '}
                <Link to="/settings" className="font-medium underline">Thêm tại Cài đặt</Link>.
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={wifiSelectedId}
                  onChange={(e) => onWifiSelectChange(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  {wifiPrinters.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.wsUrl}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleWifiPrint}
                  disabled={printStatus === 'loading'}
                  className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  In
                </button>
              </div>
            )}
            <p className="mt-1 px-1 text-[11px] text-emerald-900/70">
              Quản lý tên + URL: <Link to="/settings" className="underline">Cài đặt → In hóa đơn</Link>
            </p>
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

      {androidPickerOpen && (
        <div className="no-print fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[70vh] w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-800">Chọn máy in Bluetooth</h3>
              <button
                type="button"
                onClick={() => setAndroidPickerOpen(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {androidPickerLoading && (
                <p className="px-3 py-4 text-center text-sm text-gray-500">Đang tải danh sách…</p>
              )}
              {!androidPickerLoading && androidDevices.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-gray-600">
                  Chưa có thiết bị đã ghép đôi. Vào Cài đặt → Bluetooth → ghép đôi máy in, rồi mở lại.
                </p>
              )}
              {!androidPickerLoading &&
                androidDevices.map((d) => (
                  <button
                    key={d.address}
                    type="button"
                    onClick={() => pickAndroidDevice(d)}
                    className="mb-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-left text-sm hover:border-amber-400 hover:bg-amber-50"
                  >
                    <div className="font-medium text-gray-900">{d.name || 'Máy in'}</div>
                    <div className="text-xs text-gray-500">{d.address}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

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

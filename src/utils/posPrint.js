/**
 * POS Printing adapter — handles 4 print methods:
 *  1. Sunmi built-in printer (JS bridge inside Sunmi WebView)
 *  2. Web Bluetooth (Xprinter, Rongta, most BT thermal printers)
 *  3. WiFi / LAN (send ESC/POS via WebSocket to local print server)
 *  4. window.print() fallback (standard browser print dialog)
 */

import { Capacitor } from '@capacitor/core';
import { buildReceipt } from './escpos';
import { thermalConnect, thermalDisconnect, thermalWriteBytes } from '../plugins/thermalPrinter';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * True if running inside Sunmi WebView (has printer JS bridge).
 * Sunmi exposes either window.SunmiInnerPrinter or window.sunmiInternalPrinter.
 */
export function isSunmiDevice() {
  return (
    typeof window !== 'undefined' &&
    (!!window.SunmiInnerPrinter || !!window.sunmiInternalPrinter || !!window.printer?.printerInit)
  );
}

export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

/** Máy POS Android (Capacitor): in qua Bluetooth cổ điển SPP — ghép đôi máy in trong Cài đặt Android trước. */
export function isCapacitorAndroid() {
  return typeof Capacitor !== 'undefined' && Capacitor.getPlatform() === 'android';
}

/**
 * In ESC/POS qua plugin native (Bluetooth đã ghép đôi).
 * @param {string} address MAC, ví dụ "00:11:22:33:44:55"
 */
export async function printAndroidThermalBluetooth({ address, storeName, storeAddr, storePhone, session, formatVND, formatDT }) {
  if (!address) throw new Error('Chưa chọn máy in Bluetooth');
  const data = buildReceipt({ storeName, storeAddr, storePhone, session, formatVND, formatDT });
  await thermalConnect(address);
  try {
    await thermalWriteBytes(data);
  } finally {
    await thermalDisconnect();
  }
}

// Bluetooth service/characteristic UUIDs common to thermal receipt printers
const BT_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',   // Generic thermal (common in Vietnam)
  '0000ffe0-0000-1000-8000-00805f9b34fb',   // HM-10 / common BT serial
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',   // Epson/Zebra
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',   // Microchip BM70
  '00001101-0000-1000-8000-00805f9b34fb',   // SPP (some devices)
];

const BT_CHARS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '49535343-1e4d-4bd9-ba61-23c647249616',
];

// ─────────────────────────────────────────────────────────────
// 1. Sunmi built-in printer
// ─────────────────────────────────────────────────────────────

function getSunmiBridge() {
  return window.SunmiInnerPrinter || window.sunmiInternalPrinter || window.printer || null;
}

function formatVNDPlain(amount) {
  if (amount == null) return '0 d';
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' d';
}

function formatDTPlain(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export async function printSunmi({ storeName, storeAddr, storePhone, session }) {
  const bridge = getSunmiBridge();
  if (!bridge) throw new Error('Không tìm thấy máy in Sunmi');

  const PAYMENT_LABEL = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', CARD: 'Thẻ' };

  // Sunmi bridge API uses callbacks; wrap in Promise
  const call = (fn, ...args) =>
    new Promise((resolve, reject) => {
      try {
        bridge[fn](...args, resolve, reject);
      } catch (e) {
        // Some bridges are synchronous — no callbacks
        try { bridge[fn](...args); resolve(); } catch (e2) { reject(e2); }
      }
    });

  await call('printerInit');
  await call('setAlignment', 1); // center
  await call('printTextWithFont', storeName + '\n', '', 24);
  if (storeAddr) await call('printTextWithFont', storeAddr + '\n', '', 20);
  if (storePhone) await call('printTextWithFont', 'DT: ' + storePhone + '\n', '', 20);
  await call('setAlignment', 0); // left
  await call('printText', '----------------------------------------\n');
  await call('printText', 'Phong: '); await call('printTextWithFont', (session.room?.name || '') + '\n', 'bold', 22);
  await call('printText', 'NV: ');    await call('printTextWithFont', (session.staff?.fullName || '—') + '\n', 'bold', 22);
  await call('printText', 'Bat dau: ' + formatDTPlain(session.startTime) + '\n');
  await call('printText', 'Ket thuc: ' + (session.endTime ? formatDTPlain(session.endTime) : '—') + '\n');
  await call('printText', '----------------------------------------\n');

  if ((session.orderItems || []).length > 0) {
    await call('printColumnsText',
      ['Mon', 'SL', 'Don', 'Tien'],
      [20, 4, 9, 9], [0, 2, 2, 2]);
    await call('printText', '----------------------------------------\n');
    for (const row of session.orderItems) {
      await call('printColumnsText',
        [row.product?.name || '', String(row.quantity), formatVNDPlain(row.unitPrice), formatVNDPlain(row.totalPrice)],
        [20, 4, 9, 9], [0, 2, 2, 2]);
    }
    await call('printText', '----------------------------------------\n');
  }

  await call('printText', 'Tien gio: ' + formatVNDPlain(session.totalPlayAmount) + '\n');

  if ((session.discountAmount ?? 0) > 0) {
    await call('printText', 'Giam gia: -' + formatVNDPlain(session.discountAmount) + '\n');
  }

  await call('printText', '========================================\n');
  await call('setAlignment', 2); // right
  await call('printTextWithFont', 'TONG CONG: ' + formatVNDPlain(session.totalAmount) + '\n', 'bold', 26);
  await call('setAlignment', 0);
  await call('printText', '========================================\n');
  await call('printText', 'Thanh toan: ' + (PAYMENT_LABEL[session.paymentMethod] || '') + '\n');
  await call('printTextWithFont', 'Da thu: ' + formatVNDPlain(session.paidAmount) + '\n', 'bold', 22);

  if ((session.paidAmount ?? 0) > (session.totalAmount ?? 0)) {
    await call('printText', 'Tien thua: ' + formatVNDPlain((session.paidAmount ?? 0) - (session.totalAmount ?? 0)) + '\n');
  }

  await call('printText', '========================================\n');
  await call('setAlignment', 1);
  await call('printText', 'Cam on quy khach!\nHen gap lai!\n\n\n');
  await call('cutPaper');
}

// ─────────────────────────────────────────────────────────────
// 2. Web Bluetooth
// ─────────────────────────────────────────────────────────────

let btDevice = null;
let btChar   = null;

async function connectBluetooth() {
  btDevice = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: BT_SERVICES,
  });

  const server  = await btDevice.gatt.connect();
  let foundChar = null;

  for (const svcUUID of BT_SERVICES) {
    try {
      const service = await server.getPrimaryService(svcUUID);
      for (const charUUID of BT_CHARS) {
        try {
          const ch = await service.getCharacteristic(charUUID);
          if (ch.properties.write || ch.properties.writeWithoutResponse) {
            foundChar = ch;
            break;
          }
        } catch { /* try next */ }
      }
      if (foundChar) break;
    } catch { /* try next service */ }
  }

  // Fallback: enumerate all services/chars and pick first writable
  if (!foundChar) {
    const services = await server.getPrimaryServices();
    for (const svc of services) {
      const chars = await svc.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          foundChar = ch;
          break;
        }
      }
      if (foundChar) break;
    }
  }

  if (!foundChar) throw new Error('Không tìm thấy cổng in Bluetooth. Vui lòng thử lại hoặc kiểm tra máy in.');
  btChar = foundChar;
}

async function sendBluetooth(data) {
  if (!btChar) throw new Error('Chưa kết nối Bluetooth');
  const CHUNK = 512;
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK);
    if (btChar.properties.writeWithoutResponse) {
      await btChar.writeValueWithoutResponse(chunk);
    } else {
      await btChar.writeValue(chunk);
    }
  }
}

export async function printBluetooth({ storeName, storeAddr, storePhone, session, formatVND, formatDT }) {
  if (!btChar || !btDevice?.gatt?.connected) {
    await connectBluetooth();
  }
  const data = buildReceipt({ storeName, storeAddr, storePhone, session, formatVND, formatDT });
  await sendBluetooth(data);
}

export function disconnectBluetooth() {
  if (btDevice?.gatt?.connected) btDevice.gatt.disconnect();
  btDevice = null;
  btChar   = null;
}

export function getConnectedDeviceName() {
  return btDevice?.gatt?.connected ? (btDevice.name || 'Bluetooth Printer') : null;
}

// ─────────────────────────────────────────────────────────────
// 3. WiFi / LAN print server
//    Requires `scripts/wifi-print-server.js` running on a
//    computer on the same network as the thermal printer.
//    Usage:
//      1. Run `scripts/start-print-server.bat` on the PC
//      2. Enter the PC's LAN IP and port 9101
//      3. In app Settings → add printer with:
//         ws://<PC-LAN-IP>:9101
// ─────────────────────────────────────────────────────────────

export async function printWifi({ wsUrl, storeName, storeAddr, storePhone, session, formatVND, formatDT }) {
  const data = buildReceipt({ storeName, storeAddr, storePhone, session, formatVND, formatDT });

  if (!wsUrl) throw new Error('Chưa có địa chỉ máy in WiFi. Vào Cài đặt để thêm.');

  return new Promise((resolve, reject) => {
    let ws;
    let settled = false;
    const TIMEOUT = 8000;

    const finish = (err, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (ws) { ws.onerror = null; ws.onopen = null; ws.onmessage = null; try { ws.close(); } catch {} }
      if (err) reject(err);
      else resolve(val);
    };

    const timer = setTimeout(() => {
      finish(new Error(`Không kết nối được máy in WiFi (${wsUrl})\n\nKiểm tra:\n1. Print server đã bật chưa?\n2. Địa chỉ IP có đúng máy tính chạy server không?\n3. Tường lửa có chặn cổng WebSocket không?`), undefined);
    }, TIMEOUT);

    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      return finish(new Error(`Địa chỉ WebSocket không hợp lệ: ${wsUrl}`));
    }

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.debug('[printWifi] connected, sending', data.byteLength, 'bytes');
      try {
        ws.send(data.buffer);
      } catch (e) {
        finish(new Error('Lỗi gửi dữ liệu tới máy in'));
      }
    };

    ws.onmessage = (e) => {
      const msg = typeof e.data === 'string' ? e.data : '';
      console.debug('[printWifi] server reply:', msg);
      if (msg.startsWith('err')) {
        finish(new Error(`Máy in báo lỗi: ${msg}`));
      } else {
        finish(null, undefined);
      }
    };

    ws.onerror = () => {
      // onerror fires before onclose; give onclose a tick to fire first
      setTimeout(() => {
        if (!settled) {
          finish(new Error(`Không kết nối được ${wsUrl}\n\nHãy đảm bảo:\n• Print server đang chạy trên máy tính cùng mạng\n• Địa chỉ IP trong Cài đặt là IP của MÁY TÍNH (không phải máy in)\n• Tường lửa cho phép cổng WebSocket`), undefined);
        }
      }, 50);
    };

    ws.onclose = () => {
      // If we got here without settling, the server closed without reply — that's ok for raw TCP
      if (!settled) {
        setTimeout(() => finish(null, undefined), 200);
      }
    };
  });
}

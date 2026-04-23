/**
 * Cài đặt in bill (localStorage) — dùng chung Cài đặt + màn hóa đơn.
 */

export const PRINT_METHOD = {
  BROWSER: 'browser',
  SUNMI: 'sunmi',
  BLUETOOTH_WEB: 'bluetooth_web',
  WIFI: 'wifi',
  ANDROID_THERMAL: 'android_thermal',
};

const KEY_DEFAULT = 'pos_default_print_method';
const KEY_WIFI_LIST = 'pos_wifi_printers';
const KEY_WIFI_SELECTED = 'pos_wifi_selected_id';
const LEGACY_WIFI_URL = 'pos_wifi_url';

function safeParseList(raw) {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `wp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Danh sách máy in WiFi/LAN (WebSocket). */
export function getWifiPrinters() {
  const raw = localStorage.getItem(KEY_WIFI_LIST);
  let list = safeParseList(raw);
  // Chỉ migrate từ pos_wifi_url cũ khi chưa từng lưu danh sách (raw === null)
  if (raw === null && list.length === 0) {
    const legacy = localStorage.getItem(LEGACY_WIFI_URL);
    if (legacy) {
      list = [{ id: newId(), name: 'Máy in mạng', wsUrl: legacy.trim() }];
      saveWifiPrinters(list);
    }
  }
  return list.map((p) => ({
    id: p.id || newId(),
    name: String(p.name || '').trim() || 'Máy in',
    wsUrl: String(p.wsUrl || '').trim(),
  })).filter((p) => p.wsUrl);
}

export function saveWifiPrinters(list) {
  localStorage.setItem(KEY_WIFI_LIST, JSON.stringify(list));
  if (list.length === 0) {
    localStorage.removeItem(LEGACY_WIFI_URL);
    return;
  }
  if (list[0]?.wsUrl) localStorage.setItem(LEGACY_WIFI_URL, list[0].wsUrl);
}

export function addWifiPrinter({ name, wsUrl }) {
  const url = String(wsUrl || '').trim();
  if (!url) throw new Error('Chưa nhập địa chỉ WebSocket');
  const list = getWifiPrinters();
  list.push({ id: newId(), name: String(name || '').trim() || 'Máy in', wsUrl: url });
  saveWifiPrinters(list);
  return list;
}

export function removeWifiPrinter(id) {
  const list = getWifiPrinters().filter((p) => p.id !== id);
  saveWifiPrinters(list);
  if (getSelectedWifiPrinterId() === id) {
    localStorage.removeItem(KEY_WIFI_SELECTED);
    if (list[0]) setSelectedWifiPrinterId(list[0].id);
  }
  return list;
}

export function getSelectedWifiPrinterId() {
  return localStorage.getItem(KEY_WIFI_SELECTED) || '';
}

export function setSelectedWifiPrinterId(id) {
  if (id) localStorage.setItem(KEY_WIFI_SELECTED, id);
  else localStorage.removeItem(KEY_WIFI_SELECTED);
}

/** URL WebSocket đang chọn (hoặc máy đầu tiên). */
export function getActiveWifiUrl() {
  const list = getWifiPrinters();
  if (list.length === 0) return 'ws://192.168.1.100:9100';
  const sid = getSelectedWifiPrinterId();
  const pick = list.find((p) => p.id === sid) || list[0];
  return pick.wsUrl;
}

export function getDefaultPrintMethod() {
  const v = localStorage.getItem(KEY_DEFAULT);
  if (v && Object.values(PRINT_METHOD).includes(v)) return v;
  return PRINT_METHOD.BROWSER;
}

export function setDefaultPrintMethod(method) {
  if (!Object.values(PRINT_METHOD).includes(method)) return;
  localStorage.setItem(KEY_DEFAULT, method);
}

export function defaultMethodLabel(method) {
  switch (method) {
    case PRINT_METHOD.SUNMI: return 'Máy Sunmi (tích hợp)';
    case PRINT_METHOD.BLUETOOTH_WEB: return 'Bluetooth (trình duyệt Chrome)';
    case PRINT_METHOD.WIFI: return 'WiFi / LAN (WebSocket)';
    case PRINT_METHOD.ANDROID_THERMAL: return 'Máy in nhiệt Android (Bluetooth SPP)';
    default: return 'In trình duyệt';
  }
}

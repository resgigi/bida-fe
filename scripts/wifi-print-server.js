/**
 * WiFi Print Server — nhận lệnh in ESC/POS qua WebSocket,
 * chuyển thẳng tới máy in nhiệt qua cổng TCP (RAW) hoặc USB/Serial.
 *
 * Cách dùng:
 *   node wifi-print-server.js
 *
 * Tuỳ chọn (env):
 *   PRINTER_HOST   Địa chỉ IP máy in          (mặc định: 192.168.1.100)
 *   PRINTER_PORT   Cổng RAW của máy in        (mặc định: 9100)
 *   WS_PORT        Cổng WebSocket server       (mặc định: 9100)
 *
 * Ví dụ:
 *   set PRINTER_HOST=192.168.1.50
 *   node wifi-print-server.js
 *
 * Máy in thường dùng cổng RAW 9100 (Xprinter, Rongta, Sprt…).
 * Nếu máy in có USB: dùng phần mềm đi kèm tạo cổng RAW (vd "USB Virtual Port").
 */

const WebSocket = require('ws');
const net = require('net');

const PRINTER_HOST = process.env.PRINTER_HOST || '192.168.1.100';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10);
const WS_PORT = parseInt(process.env.WS_PORT || '9101', 10);

console.log('══════════════════════════════════════════');
console.log('  WiFi Print Server — PHẦN MỀM TÍNH TIỀN');
console.log('══════════════════════════════════════════');
console.log(`  Máy in TCP : ${PRINTER_HOST}:${PRINTER_PORT}`);
console.log(`  WebSocket  : ws://0.0.0.0:${WS_PORT}`);
console.log('  Trạng thái: Đang chạy...');
console.log('');
console.log('  App → ws://IP-MAY-TINH:9101 → máy in');
console.log('  Nhấn Ctrl+C để dừng');
console.log('══════════════════════════════════════════');

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress || '?';
  console.log(`[+] Kết nối từ ${ip}`);

  ws.on('message', (data) => {
    // data có thể là Buffer (nhị phân) hoặc string
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (buf.length === 0) {
      ws.send('err: no data');
      return;
    }

    console.log(`[>] Gửi ${buf.length} bytes tới ${PRINTER_HOST}:${PRINTER_PORT}...`);

    const client = new net.Socket();
    let responded = false;

    const respond = (err) => {
      if (responded) return;
      responded = true;
      client.destroy();
      if (err) {
        console.error(`[!] Lỗi máy in: ${err.message}`);
        ws.send(`err: ${err.message}`);
      } else {
        console.log(`[OK] In thành công`);
        ws.send('ok');
      }
    };

    client.setTimeout(8000);

    client.connect(PRINTER_PORT, PRINTER_HOST, () => {
      client.write(buf, () => {
        client.end();
      });
    });

    client.on('data', () => { /* máy in thường không reply */ });

    client.on('close', () => respond(null));

    client.on('timeout', () => respond(new Error('Timeout kết nối máy in (8s)')));

    client.on('error', (err) => respond(err));
  });

  ws.on('close', () => console.log(`[-] Ngắt kết nối ${ip}`));
  ws.on('error', (err) => console.error(`[!] Lỗi WebSocket: ${err.message}`));
});

wss.on('error', (err) => {
  console.error(`[!] Không thể khởi động WebSocket trên cổng ${WS_PORT}: ${err.message}`);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n[!] Đang dừng server...');
  wss.close(() => {
    console.log('[OK] Đã dừng.');
    process.exit(0);
  });
});

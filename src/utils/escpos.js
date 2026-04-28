/**
 * ESC/POS command builder for 80mm thermal printers.
 * Supports Vietnamese text via UTF-8 (most modern BT printers support it).
 * Paper width: 80mm → ~42 chars/line at font A, ~32 chars/line at font B.
 */

const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;
const COLS = 42; // characters per line at default font for 80mm

const CMD = {
  INIT:             [ESC, 0x40],
  ALIGN_LEFT:       [ESC, 0x61, 0x00],
  ALIGN_CENTER:     [ESC, 0x61, 0x01],
  ALIGN_RIGHT:      [ESC, 0x61, 0x02],
  BOLD_ON:          [ESC, 0x45, 0x01],
  BOLD_OFF:         [ESC, 0x45, 0x00],
  UNDERLINE_ON:     [ESC, 0x2d, 0x01],
  UNDERLINE_OFF:    [ESC, 0x2d, 0x00],
  // Double-strike: prints each line twice — makes thermal text visibly darker
  DOUBLE_STRIKE_ON:  [ESC, 0x47, 0x01],
  DOUBLE_STRIKE_OFF: [ESC, 0x47, 0x00],
  // Font size
  SIZE_NORMAL:      [GS,  0x21, 0x00],
  SIZE_2X_HEIGHT:  [GS,  0x21, 0x01],
  SIZE_2X_WIDTH:    [GS,  0x21, 0x10],
  SIZE_2X:          [GS,  0x21, 0x11],
  // Feed and partial cut
  CUT:              [GS,  0x56, 0x42, 0x04],
  FEED_LINES:       (n) => [ESC, 0x64, n],
};

const enc = new TextEncoder();

function bytes(...args) {
  const out = [];
  for (const a of args) {
    if (Array.isArray(a)) out.push(...a);
    else if (a instanceof Uint8Array) out.push(...a);
    else if (typeof a === 'number') out.push(a);
  }
  return out;
}

function textBytes(str) {
  return Array.from(enc.encode(str));
}

function line(char = '-') {
  return char.repeat(COLS);
}

function padEnd(str, len) {
  const vis = visLen(str);
  if (vis >= len) return str;
  return str + ' '.repeat(len - vis);
}

function padStart(str, len) {
  const vis = visLen(str);
  if (vis >= len) return str;
  return ' '.repeat(len - vis) + str;
}

function visLen(str) {
  return [...str].length;
}

/**
 * Build a two-column row: left text + right text
 */
function twoCol(left, right) {
  const rLen = visLen(right);
  const maxLeft = COLS - rLen - 1;
  const leftTrunc = [...left].slice(0, maxLeft).join('');
  return padEnd(leftTrunc, COLS - rLen) + right;
}

/**
 * Build a 4-column table row for order items:
 * name | qty | unitPrice | totalPrice
 */
function itemRow(name, qty, unit, total) {
  const qtyW  = 3;
  const unitW = 10;
  const totW  = 10;
  const nameW = COLS - qtyW - unitW - totW - 3;

  const nameTrunc = [...name].slice(0, nameW).join('');
  return (
    padEnd(nameTrunc, nameW) +
    ' ' + padStart(qty, qtyW) +
    ' ' + padStart(unit, unitW) +
    ' ' + padStart(total, totW)
  );
}

/**
 * Main builder — returns Uint8Array of ESC/POS commands.
 * ESC E (bold) + ESC G (double-strike) stay ON for the entire receipt
 * to maximize print darkness on thermal printers.
 */
export function buildReceipt({ storeName, storeAddr, storePhone, session, formatVND, formatDT }) {
  const buf = [];
  const w = (...a) => buf.push(...bytes(...a));
  const text = (s) => buf.push(...textBytes(s));
  const nl = (n = 1) => { for (let i = 0; i < n; i++) buf.push(LF); };

  // Init + keep ESC E (bold) + ESC G (double-strike) ON for entire bill
  w(CMD.INIT, CMD.BOLD_ON, CMD.DOUBLE_STRIKE_ON);

  // ── Store header ──────────────────────────────────────────
  w(CMD.ALIGN_CENTER, CMD.SIZE_2X);
  text(storeName); nl();
  w(CMD.SIZE_NORMAL);
  if (storeAddr) { text(storeAddr); nl(); }
  if (storePhone) { text('DT: ' + storePhone); nl(); }
  w(CMD.ALIGN_LEFT);

  // Divider
  text(line()); nl();

  // ── Session info ──────────────────────────────────────────
  text('Phong: '); text(session.room?.name || ''); nl();
  text('NV: ');    text(session.staff?.fullName || '—'); nl();
  text('Bat dau: ' + formatDT(session.startTime)); nl();
  text('Ket thuc: ' + (session.endTime ? formatDT(session.endTime) : '—')); nl();

  text(line()); nl();

  // ── Items table ───────────────────────────────────────────
  if ((session.orderItems || []).length > 0) {
    text(itemRow('Mon', 'SL', 'Don gia', 'T.tien')); nl();
    text(line('-')); nl();

    for (const row of session.orderItems) {
      const name  = row.product?.name || '';
      const qty   = String(row.quantity);
      const unit  = formatVND(row.unitPrice);
      const total = formatVND(row.totalPrice);

      const nameWords = [...name];
      if (nameWords.length > COLS - 25) {
        const firstLine = nameWords.slice(0, COLS - 25).join('');
        const rest = nameWords.slice(COLS - 25).join('');
        text(itemRow(firstLine, qty, unit, total)); nl();
        if (rest) { text('  ' + rest); nl(); }
      } else {
        text(itemRow(name, qty, unit, total)); nl();
      }
    }
    text(line('-')); nl();
  }

  // ── Totals ───────────────────────────────────────────────
  text(twoCol('Tien gio', formatVND(session.totalPlayAmount))); nl();

  if ((session.discountAmount ?? 0) > 0) {
    const label = 'Giam gia' + (session.discountPercent > 0 ? ` (${session.discountPercent}%)` : '');
    text(twoCol(label, '-' + formatVND(session.discountAmount))); nl();
  }

  text(line()); nl();

  // Total — double-height + underline for maximum emphasis
  w(CMD.SIZE_2X_HEIGHT, CMD.UNDERLINE_ON);
  text(twoCol('TONG CONG', formatVND(session.totalAmount))); nl();
  w(CMD.SIZE_NORMAL, CMD.UNDERLINE_OFF);

  text(line()); nl();

  const PAYMENT_LABEL = { CASH: 'Tien mat', TRANSFER: 'Chuyen khoan', CARD: 'The' };
  text(twoCol('Thanh toan', PAYMENT_LABEL[session.paymentMethod] || session.paymentMethod || '')); nl();
  text(twoCol('Da thu', formatVND(session.paidAmount))); nl();

  if ((session.paidAmount ?? 0) > (session.totalAmount ?? 0)) {
    text(twoCol('Tien thua', formatVND((session.paidAmount ?? 0) - (session.totalAmount ?? 0)))); nl();
  }

  if (session.note) {
    text(line('-')); nl();
    text('Ghi chu: ' + session.note); nl();
  }

  text(line('=')); nl();

  // Footer
  w(CMD.ALIGN_CENTER);
  text('Cam on quy khach!'); nl();
  text('Hen gap lai!'); nl();

  // Turn off enhanced modes, feed + cut
  w(CMD.BOLD_OFF, CMD.DOUBLE_STRIKE_OFF);
  w(CMD.FEED_LINES(3), CMD.CUT);

  return new Uint8Array(buf);
}

/**
 * generateOrderPDF
 * ينشئ سند إلكتروني PDF بتصميم "سريع" الرسمي
 * يُستدعى من AdminOrders و AdminWasalniRequests
 */

export interface OrderPDFItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderPDFData {
  orderNumber: string;
  invoiceNumber?: string;
  date?: string | Date;
  storeName?: string;
  items: OrderPDFItem[];
  subtotal?: number;
  deliveryFee?: number;
  total: number;
  driverName?: string;
  logoUrl?: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const ORANGE = '#E8681A';

function fmtNum(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '0';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '0';
  return num.toLocaleString('ar-YE');
}

// ─── HTML template ──────────────────────────────────────────────────────────

function buildHTML(data: OrderPDFData): string {
  const items = data.items || [];
  const MIN_ROWS = 10;
  const subtotal = data.subtotal ?? data.total;
  const total    = typeof data.total === 'string' ? parseFloat(data.total as string) || 0 : data.total ?? 0;

  const tdBorder = `border-bottom:1px solid #FDCBA8; border-left:1px solid ${ORANGE};`;

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:7px 10px; ${tdBorder} text-align:right; font-size:12px;">${item.name}</td>
        <td style="padding:7px; ${tdBorder} text-align:center; font-size:12px;">${item.quantity}</td>
        <td style="padding:7px; ${tdBorder} text-align:center; font-size:12px;">${fmtNum(item.price)}</td>
        <td style="padding:7px; border-bottom:1px solid #FDCBA8; text-align:center; font-size:12px;">${fmtNum(item.price * item.quantity)}</td>
      </tr>`
    )
    .join('');

  const emptyCount = Math.max(0, MIN_ROWS - items.length);
  const emptyRows = Array(emptyCount)
    .fill(
      `<tr style="height:27px;">
        <td style="${tdBorder}"></td>
        <td style="${tdBorder}"></td>
        <td style="${tdBorder}"></td>
        <td style="border-bottom:1px solid #FDCBA8;"></td>
      </tr>`
    )
    .join('');

  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString('ar-YE', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : new Date().toLocaleDateString('ar-YE', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // Styled text logo or image logo
  const logoHTML = (data.logoUrl && data.logoUrl.trim() !== '') ? `
    <div style="display:flex; justify-content:center; align-items:center; width:100%;">
      <img src="${data.logoUrl}" alt="Logo" style="max-height:70px; max-width:150px; object-fit:contain; border-radius:8px;" />
    </div>` : `
    <div style="
      display:inline-block;
      background:${ORANGE};
      border-radius:12px;
      padding:7px 24px;
      text-align:center;
      line-height:1.1;
      box-shadow:0 2px 6px rgba(232, 104, 26, 0.25);
    ">
      <div style="font-size:34px; font-weight:900; color:#ffffff; font-family:Tahoma,Arial,sans-serif; letter-spacing:1px;">سريع</div>
      <div style="font-size:12px; font-weight:bold; color:#ffffff; letter-spacing:3px; margin-top:2px; font-family:Arial,sans-serif;">SAREE</div>
    </div>`;

  return `
<div style="
  width: 555px;
  background: white;
  font-family: Arial,'Segoe UI',Tahoma,Geneva,sans-serif;
  direction: rtl;
  border: 4px solid ${ORANGE};
  border-radius: 16px;
  padding: 18px 20px;
  box-sizing: border-box;
  color: #1a1a1a;
">

  <!-- ═══ Header ═══ -->
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap:8px;">
    <!-- Right: App name -->
    <div style="flex:1; text-align:right;">
      <div style="color:${ORANGE}; font-weight:bold; font-size:15px; line-height:1.4;">تطبيق السريع</div>
      <div style="color:${ORANGE}; font-weight:bold; font-size:15px; line-height:1.4;">لتوصيل الطلبات</div>
    </div>
    <!-- Center: Logo -->
    <div style="flex:0 0 160px; display:flex; justify-content:center; align-items:center; text-align:center;">
      ${logoHTML}
    </div>
    <!-- Left: Date & Store -->
    <div style="flex:1; text-align:right; direction:rtl; font-size:12px; color:#333; line-height:1.8;">
      <div>التاريخ : ${dateStr}</div>
      <div>اسم المحل : ${data.storeName || '.................'}</div>
    </div>
  </div>

  <!-- ═══ Invoice / Order numbers ═══ -->
  <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:13px; font-weight:bold; color:#222; padding:0 2px;">
    <div>رقم الفاتورة : ${data.invoiceNumber || data.orderNumber || '1'}</div>
    <div>رقم الطلب : ${data.orderNumber || ''}</div>
  </div>

  <!-- ═══ Items Table ═══ -->
  <table style="width:100%; border-collapse:collapse; border:2px solid ${ORANGE};">
    <thead>
      <tr>
        <th style="background:${ORANGE}; color:white; padding:9px 10px; font-size:13px; text-align:right;  width:48%; border-left:1px solid rgba(255,255,255,0.35);">تفاصيل الطلبات</th>
        <th style="background:${ORANGE}; color:white; padding:9px;    font-size:13px; text-align:center; width:18%; border-left:1px solid rgba(255,255,255,0.35);">العدد</th>
        <th style="background:${ORANGE}; color:white; padding:9px;    font-size:13px; text-align:center; width:18%; border-left:1px solid rgba(255,255,255,0.35);">السعر</th>
        <th style="background:${ORANGE}; color:white; padding:9px;    font-size:13px; text-align:center; width:16%;">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${emptyRows}
    </tbody>
  </table>

  <!-- ═══ Totals ═══ -->
  <table style="width:100%; border-collapse:collapse; border:2px solid ${ORANGE}; border-top:0;">
    <tr>
      <td style="background:${ORANGE}; color:white; font-weight:bold; font-size:13px; padding:9px; text-align:center; width:50%; border-left:2px solid rgba(255,255,255,0.35);">إجمالي الفاتورة</td>
      <td style="background:${ORANGE}; color:white; font-weight:bold; font-size:13px; padding:9px; text-align:center; width:50%;">إجمالي الطلب</td>
    </tr>
    <tr>
      <td style="padding:14px; text-align:center; border-left:2px solid ${ORANGE}; border-top:2px solid ${ORANGE}; font-weight:bold; font-size:15px;">${fmtNum(total)}</td>
      <td style="padding:14px; text-align:center; border-top:2px solid ${ORANGE}; font-weight:bold; font-size:15px;">${fmtNum(subtotal)}</td>
    </tr>
  </table>

  <!-- ═══ Signature ═══ -->
  <div style="display:flex; justify-content:space-between; margin-top:18px; font-size:13px; font-weight:bold; color:#222; padding:0 2px;">
    <div>توقيع الكابتن : ............................................</div>
    <div>كابتن التوصيل : ............................................</div>
  </div>

  <!-- ═══ Disclaimer ═══ -->
  <div style="margin-top:14px; border:2px solid ${ORANGE}; border-radius:6px; padding:8px 12px; font-size:10.5px; text-align:center; color:#333; line-height:1.6; direction:rtl;">
    لا تقبل هذه الفاتورة اذا لم تكن مطابقة لنظام السريع وما لم يكن عليها ختم الشركة واسم وتوقيع الكابتن
  </div>
</div>`;
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function generateOrderPDF(data: OrderPDFData): Promise<void> {
  // Dynamic imports — keep initial bundle small
  const { default: jsPDF } = await import('jspdf');
  // html2canvas is a peer of jsPDF and is available in node_modules
  const { default: html2canvas } = await import('html2canvas');

  const html = buildHTML(data);

  // Mount a hidden container in the DOM so html2canvas can render it
  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:fixed; top:-9999px; left:-9999px; z-index:-9999; pointer-events:none;';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  const el = wrapper.firstElementChild as HTMLElement;

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Create PDF sized to match the rendered canvas (keeps aspect ratio)
    const pxW = canvas.width  / 2; // at scale=2, divide by 2 for CSS px
    const pxH = canvas.height / 2;

    // Convert px → mm (1px ≈ 0.2646 mm)
    const mmW = pxW * 0.2646;
    const mmH = pxH * 0.2646;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [mmW, mmH],
    });

    doc.addImage(imgData, 'JPEG', 0, 0, mmW, mmH);
    doc.save(`سند-${data.orderNumber || 'order'}.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}

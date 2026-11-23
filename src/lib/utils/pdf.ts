/**
 * Turn an on-screen element into a multi-page A4 PDF, keeping its links tappable
 * (UPI pay links, feedback, website). Then share it (phone share sheet) or download it.
 * Works in the installed iPhone app, where the browser's print dialog isn't available.
 * The libraries load only when someone taps the button.
 */
export async function elementToPdf(el: HTMLElement, fileName: string, background: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);

  // On a phone: narrow, phone-shaped pages with big text (readable without zooming).
  // Elsewhere: A4 at a document width.
  const phone = window.innerWidth < 640;
  const layout = phone
    ? { width: 440, format: [400, 760] as [number, number], margin: 14 }
    : { width: 760, format: 'a4' as const, margin: 24 };
  const prevWidth = el.style.width, prevMax = el.style.maxWidth;
  el.style.width = `${layout.width}px`;
  el.style.maxWidth = 'none';
  await new Promise((r) => setTimeout(r, 350)); // let charts re-measure
  try {
    return await render(el, fileName, background, html2canvas, jsPDF, layout);
  } finally {
    el.style.width = prevWidth;
    el.style.maxWidth = prevMax;
  }
}

async function render(
  el: HTMLElement, fileName: string, background: string,
  html2canvas: typeof import('html2canvas-pro').default, jsPDF: typeof import('jspdf').jsPDF,
  layout: { format: 'a4' | [number, number]; margin: number },
) {
  const canvas = await html2canvas(el, {
    width: el.scrollWidth,
    windowWidth: Math.max(window.innerWidth, el.scrollWidth),
    scale: 2,
    backgroundColor: background,
    useCORS: true,
    ignoreElements: (n) => n instanceof HTMLElement && n.classList.contains('no-print'),
  });

  const pdf = new jsPDF({ unit: 'pt', format: layout.format, compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = layout.margin;
  const contentW = pageW - margin * 2;
  const pxPerPt = canvas.width / contentW;              // canvas pixels per PDF point
  const sliceH = Math.floor((pageH - margin * 2) * pxPerPt); // canvas pixels per page
  const elScale = canvas.width / el.getBoundingClientRect().width; // canvas px per CSS px

  // Page breaks: avoid cutting through cards and table rows where possible
  const elTop = el.getBoundingClientRect().top;
  const blocks = [...el.querySelectorAll<HTMLElement>('.rounded-2xl, tr, li, h2')].map((b) => {
    const r = b.getBoundingClientRect();
    return { top: (r.top - elTop) * elScale, bottom: (r.bottom - elTop) * elScale };
  });
  const cuts: number[] = [0];
  while (cuts[cuts.length - 1] + sliceH < canvas.height) {
    const start = cuts[cuts.length - 1];
    let cut = start + sliceH;
    // Only keep together blocks that can fit on a page; tall cards may split between their rows
    const crossing = blocks.filter((b) => b.top < cut && b.bottom > cut && b.top > start + sliceH * 0.3 && b.bottom - b.top < sliceH * 0.6);
    if (crossing.length) cut = Math.min(...crossing.map((b) => b.top));
    cuts.push(Math.floor(cut));
  }
  cuts.push(canvas.height);

  // Links, in canvas pixels
  const links = [...el.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .filter((a) => !a.closest('.no-print'))
    .map((a) => {
      const r = a.getBoundingClientRect();
      return { href: a.href, x: (r.left - el.getBoundingClientRect().left) * elScale, y: (r.top - elTop) * elScale, w: r.width * elScale, h: r.height * elScale };
    });

  for (let i = 0; i < cuts.length - 1; i++) {
    const y0 = cuts[i], h = cuts[i + 1] - y0;
    const page = document.createElement('canvas');
    page.width = canvas.width;
    page.height = h;
    const ctx = page.getContext('2d')!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, page.width, page.height);
    ctx.drawImage(canvas, 0, y0, canvas.width, h, 0, 0, canvas.width, h);
    if (i > 0) pdf.addPage();
    pdf.setFillColor(background);
    pdf.rect(0, 0, pageW, pageH, 'F');
    pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentW, h / pxPerPt);
    for (const l of links) {
      if (l.y >= y0 && l.y + l.h <= y0 + h) {
        pdf.link(margin + l.x / pxPerPt, margin + (l.y - y0) / pxPerPt, l.w / pxPerPt, l.h / pxPerPt, { url: l.href });
      }
    }
  }

  const blob = pdf.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });
  // Phones: share sheet (Save to Files, WhatsApp…). Elsewhere: download.
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: fileName }); return; }
    catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

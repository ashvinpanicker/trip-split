'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** A UPI QR any UPI app can scan (GPay, PhonePe, Paytm…), with the amount filled in. */
export default function UpiQr({ link, label }: { link: string; label: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [link]);
  if (!svg) return null;
  return (
    <figure className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 border border-gray-200">
      {/* always black on white so phones can scan it, even in dark mode */}
      <div className="w-48 h-48 [&_svg]:w-full [&_svg]:h-full" style={{ background: '#fff' }} dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption className="text-xs text-gray-600 text-center">{label}</figcaption>
    </figure>
  );
}

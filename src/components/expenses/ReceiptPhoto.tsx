'use client';

import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

/** Shrink a photo to ≤1600px JPEG so it fits the 2 MB bucket limit and loads fast on mobile. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let max = 1600;
  for (let quality = 0.8; ; quality -= 0.15) {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not read image'))), 'image/jpeg', quality),
    );
    if (blob.size < 1_900_000 || quality < 0.4) return blob;
    max = Math.round(max * 0.8);
  }
}

interface Props {
  expenseId: string;
  groupId: string;
  path?: string | null;
  onChange?: () => void;
}

export default function ReceiptPhoto({ expenseId, groupId, path, onChange }: Props) {
  const supabase = createClient();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const blob = await compress(file);
      const key = `${groupId}/${expenseId}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('receipts')
        .upload(key, blob, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase.from('expenses').update({ receipt_path: key }).eq('id', expenseId);
      if (error) throw error;
      toast('Receipt attached');
      setUrl(null);
      onChange?.();
    } catch (e: any) {
      toast(e?.message || 'Could not upload receipt', 'error');
    }
    setBusy(false);
  }

  async function view() {
    if (!path) return;
    setBusy(true);
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 600);
    setBusy(false);
    if (error || !data) return toast('Could not open receipt', 'error');
    setUrl(data.signedUrl);
  }

  async function remove() {
    if (!path || !confirm('Remove this receipt photo?')) return;
    setBusy(true);
    await supabase.storage.from('receipts').remove([path]);
    const { error } = await supabase.from('expenses').update({ receipt_path: null }).eq('id', expenseId);
    setBusy(false);
    if (error) return toast('Could not remove receipt', 'error');
    setUrl(null);
    toast('Receipt removed');
    onChange?.();
  }

  return (
    <div className="mt-3">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) upload(f);
        }}
      />
      {path ? (
        <div className="flex items-center gap-3 text-xs">
          <button onClick={view} disabled={busy} className="flex items-center gap-1 text-blue-600 font-medium">
            <ImageIcon size={14} /> {busy ? 'Loading…' : 'View receipt'}
          </button>
          <button onClick={() => input.current?.click()} disabled={busy} className="text-gray-500">Replace</button>
          <button onClick={remove} disabled={busy} className="text-red-500">Remove</button>
        </div>
      ) : (
        <button
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex items-center gap-1 text-xs text-gray-500"
        >
          <Camera size={14} /> {busy ? 'Uploading…' : 'Attach receipt photo'}
        </button>
      )}

      {url && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setUrl(null)}>
          <button className="absolute top-4 right-4 text-white p-2" aria-label="Close receipt">
            <X size={24} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Receipt" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

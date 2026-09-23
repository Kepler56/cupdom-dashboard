'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

const MAX_BYTES = 2 * 1024 * 1024; // 2 Mo — matches the bucket's file_size_limit.
// Raster only. SVG is deliberately excluded: it can carry script and would be
// served from the Supabase origin the portal's CSP now allow-lists.
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/**
 * A client uploads their own sponsor logo (#8).
 *
 * This is the portal's FIRST client write path, and it is deliberately narrow:
 * the file goes to `sponsor-media/logos/{own contact_id}/…`, which the storage
 * policy (migration 0021) confines to the caller's own folder, and the URL is
 * recorded through `client_set_logo()` (migration 0020), which updates only
 * `current_client_contact()`'s row and accepts only a URL under our own bucket.
 * Validation here (type, size) is UX; the storage bucket limits are the real
 * boundary.
 */
export function LogoUpload({ contactId, current }: { contactId: string; current: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);

    const ext = EXT[file.type];
    if (!ext) {
      setError('Formats acceptés : PNG, JPEG ou WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Le logo doit peser moins de 2 Mo.');
      return;
    }

    setBusy(true);
    const supabase = createBrowserClient();
    // A random suffix, not a fixed name: it avoids a CDN serving a stale cached
    // logo after a replace, and keeps the object non-enumerable.
    const path = `logos/${contactId}/logo-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('sponsor-media')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setError('Envoi impossible. Réessayez.');
      setBusy(false);
      return;
    }

    const { data: pub } = supabase.storage.from('sponsor-media').getPublicUrl(path);
    const { error: setErr } = await supabase.rpc('client_set_logo', { p_url: pub.publicUrl });
    if (setErr) {
      setError('Enregistrement impossible. Réessayez.');
      setBusy(false);
      return;
    }

    setBusy(false);
    router.refresh(); // re-render the card with the new logo
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {current ? (
        <img
          src={current}
          alt="Votre logo"
          width={64}
          height={64}
          className="h-16 w-16 rounded-[var(--radius-card)] border border-border bg-canvas object-contain"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border text-xs text-text-muted">
          Aucun
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-fit rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? 'Envoi…' : current ? 'Remplacer le logo' : 'Ajouter un logo'}
        </button>
        <p className="text-xs text-text-muted">PNG, JPEG ou WebP, 2 Mo maximum.</p>
        {error && (
          <p role="alert" className="rounded-[var(--radius-pill)] bg-[#FEF3F2] px-3 py-1.5 text-sm text-[#B42318]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

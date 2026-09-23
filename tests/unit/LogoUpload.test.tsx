import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LogoUpload } from '@/components/organisms/LogoUpload';

const upload = vi.fn();
const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://uqkbvwyspeqwlbulgzkj.supabase.co/storage/v1/object/public/sponsor-media/logos/c1/logo-x.png' } }));
const rpc = vi.fn();
const refresh = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    storage: { from: () => ({ upload, getPublicUrl }) },
    rpc,
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

function fileOf(type: string, sizeBytes: number, name = 'logo') {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: sizeBytes });
  return f;
}
// The hidden file input is the only input in the component.
const input = () => document.querySelector('input[type="file"]') as HTMLInputElement;

beforeEach(() => {
  upload.mockReset().mockResolvedValue({ error: null });
  rpc.mockReset().mockResolvedValue({ error: null });
  refresh.mockReset();
});

describe('LogoUpload', () => {
  it('rejects a non-image type before uploading anything', async () => {
    render(<LogoUpload contactId="c1" current={null} />);
    fireEvent.change(input(), { target: { files: [fileOf('application/pdf', 1000)] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/PNG, JPEG ou WebP/i);
    expect(upload).not.toHaveBeenCalled();
  });

  it('rejects a file over 2 Mo before uploading anything', async () => {
    render(<LogoUpload contactId="c1" current={null} />);
    fireEvent.change(input(), { target: { files: [fileOf('image/png', 3 * 1024 * 1024)] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/moins de 2\s?Mo/i);
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads a valid image to the client’s OWN folder and records it via client_set_logo', async () => {
    render(<LogoUpload contactId="c1" current={null} />);
    fireEvent.change(input(), { target: { files: [fileOf('image/png', 1000)] } });

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    const [path, , opts] = upload.mock.calls[0];
    // The folder is the caller's own contact id — the storage policy's boundary.
    expect(path).toMatch(/^logos\/c1\/logo-[a-z0-9]+\.png$/);
    expect(opts).toMatchObject({ contentType: 'image/png' });
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith('client_set_logo', { p_url: expect.stringContaining('/sponsor-media/logos/') }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('shows the current logo and offers to replace it', () => {
    render(<LogoUpload contactId="c1" current="https://uqkbvwyspeqwlbulgzkj.supabase.co/storage/v1/object/public/sponsor-media/logos/c1/logo-y.png" />);
    expect(screen.getByRole('img', { name: 'Votre logo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remplacer le logo/i })).toBeInTheDocument();
  });
});

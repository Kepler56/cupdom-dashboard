import { Spinner } from '@/components/atoms/Spinner';

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
      <Spinner label="Chargement de vos contacts…" />
    </div>
  );
}

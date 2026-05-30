import { useMapStore, type MapStyle } from '../stores/mapStore';

const styles: {
  value: MapStyle;
  label: string;
  icon: 'streets' | 'satellite' | 'outdoor';
}[] = [
  { value: 'streets', label: 'Streets', icon: 'streets' },
  { value: 'satellite', label: 'Satellite', icon: 'satellite' },
  { value: 'outdoor', label: 'Outdoor', icon: 'outdoor' },
];

const StyleIcon = ({ icon }: { icon: 'streets' | 'satellite' | 'outdoor' }) => {
  if (icon === 'satellite') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 12 3 8l5-5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m12 17 5 4 4-4-5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m8 16 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="m14 6 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === 'outdoor') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m3 18 6-10 4 7 3-5 5 8H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 5v14M16 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
};

export default function LayerSwitcher() {
  const { style, setStyle } = useMapStore();

  return (
    <div className="absolute right-4 top-24 z-20 lg:right-8 lg:top-6">
      <div className="glass-panel-strong flex flex-col gap-1.5 rounded-2xl p-1.5 shadow-[0_18px_42px_rgba(23,27,41,0.13)]">
        {styles.map((item) => (
          <button
            key={item.value}
            onClick={() => setStyle(item.value)}
            className={`grid h-11 w-11 place-items-center rounded-xl transition-all ${
              style === item.value
                ? 'bg-primary-container text-on-primary shadow-[0_10px_22px_rgba(0,80,203,0.22)]'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container'
            }`}
            title={item.label}
            type="button"
          >
            <span className="sr-only">{item.label}</span>
            <span className="block h-5 w-5">
              <StyleIcon icon={item.icon} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

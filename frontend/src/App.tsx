import { Toaster } from 'react-hot-toast';
import MapCanvas from './components/MapCanvas';
import RouteInfoPanel from './components/RouteInfoPanel';
import LayerSwitcher from './components/LayerSwitcher';
import SearchBar from './components/SearchBar';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import { ElevationPanel } from './components/ElevationPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useMapStore } from './stores/mapStore';

function App() {
  const { setCenter, setZoom } = useMapStore();

  const handleSelectLocation = (lat: number, lng: number) => {
    setCenter([lng, lat]); // MapLibre uses [lng, lat] format
    setZoom(15);
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-surface text-on-surface">
      <header className="glass-panel-strong relative z-40 flex h-[78px] shrink-0 items-center border-b border-outline-variant/30 px-5 shadow-[0_12px_32px_rgba(23,27,41,0.08)] lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-10">
          <a className="text-[28px] font-extrabold leading-none tracking-normal text-primary-container" href="/">
            MeRute
          </a>
          <nav className="hidden items-center gap-7 md:flex lg:absolute lg:left-[360px] lg:top-0">
            <span className="relative flex h-[78px] items-center text-[15px] font-semibold tracking-[0.04em] text-primary-container after:absolute after:bottom-5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary-container">
              Route Planner
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="header-icon-button" type="button" aria-label="Layers">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m12 3 8 5-8 5-8-5 8-5Z" />
              <path d="m4 12 8 5 8-5" />
              <path d="m4 16 8 5 8-5" />
            </svg>
          </button>
          <button className="header-icon-button" type="button" aria-label="Locate">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v3" />
              <path d="M12 19v3" />
              <path d="M2 12h3" />
              <path d="M19 12h3" />
            </svg>
          </button>
          <button className="header-icon-button" type="button" aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
              <path d="m19.4 15 .2 2.2-2 1.2-1.9-1a8 8 0 0 1-1.7 1l-.2 2.1h-3.6l-.2-2.1a8 8 0 0 1-1.7-1l-1.9 1-2-1.2.2-2.2a7.7 7.7 0 0 1-.9-1.6L2 12l.7-1.4c.2-.6.5-1.1.9-1.6l-.2-2.2 2-1.2 1.9 1a8 8 0 0 1 1.7-1l.2-2.1h3.6l.2 2.1a8 8 0 0 1 1.7 1l1.9-1 2 1.2-.2 2.2c.4.5.7 1 .9 1.6L22 12l-.7 1.4c-.2.6-.5 1.1-.9 1.6Z" />
            </svg>
          </button>
          <div className="ml-1 hidden h-12 w-12 items-center justify-center rounded-full border-2 border-primary-container bg-[linear-gradient(145deg,#102033,#2a6f97)] text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,80,203,0.22)] sm:flex">
            MR
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside className="relative z-30 hidden w-[360px] shrink-0 lg:block">
          <RouteInfoPanel />
        </aside>

        <section className="relative min-w-0 flex-1 overflow-hidden">
          <ErrorBoundary>
            <MapCanvas />
            <SearchBar onSelectLocation={handleSelectLocation} />
            <LayerSwitcher />
          </ErrorBoundary>
        </section>
      </main>

      <ElevationPanel />

      <KeyboardShortcuts />

      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'glass-panel-strong',
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#171b29',
            backdropFilter: 'blur(16px)',
          },
        }}
      />
    </div>
  );
}

export default App;

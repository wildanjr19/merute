import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface SearchBarProps {
  onSelectLocation: (lat: number, lng: number) => void;
}

export default function SearchBar({ onSelectLocation }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const searchLocation = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: searchQuery,
          format: 'json',
          limit: 5,
          countrycodes: 'id', // Limit to Indonesia
        },
        headers: {
          'User-Agent': 'MeRute/1.0',
        },
      });

      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Debounce search
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      searchLocation(value);
    }, 500);
  };

  const handleSelectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onSelectLocation(lat, lng);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div
      ref={searchRef}
      className="absolute left-4 right-4 top-4 z-20 lg:left-1/2 lg:right-auto lg:w-[min(560px,calc(100%-280px))] lg:-translate-x-1/2"
    >
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM18 18l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search for locations or trails..."
          className="glass-panel-strong h-14 w-full rounded-full pl-14 pr-14 text-body-md text-on-surface shadow-[0_18px_42px_rgba(23,27,41,0.12)] outline-none transition-all placeholder:text-on-surface-variant/65 focus:border-primary-container/40 focus:ring-4 focus:ring-primary-container/15"
        />
        
        {isLoading && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-container border-t-transparent"></div>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="glass-panel-strong absolute top-full mt-3 max-h-80 w-full overflow-hidden rounded-2xl shadow-[0_20px_48px_rgba(23,27,41,0.14)]">
          <div className="overflow-y-auto max-h-80">
            {results.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleSelectResult(result)}
                className="w-full border-b border-outline-variant/30 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-surface-container-low"
              >
                <p className="text-body-sm font-medium text-on-surface">{result.display_name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {showResults && !isLoading && query && results.length === 0 && (
        <div className="glass-panel-strong absolute top-full mt-3 w-full rounded-2xl px-5 py-4 shadow-[0_18px_42px_rgba(23,27,41,0.12)]">
          <p className="text-body-sm text-on-surface-variant">Tidak ada hasil ditemukan</p>
        </div>
      )}
    </div>
  );
}

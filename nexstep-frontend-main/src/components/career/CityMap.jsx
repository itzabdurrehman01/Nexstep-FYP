import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { groupUniversitiesByCity, locateCity, sortCitiesNear } from '../../data/pakistanCities.js';

/**
 * OpenStreetMap of Pakistani cities. One pin per city; choosing a pin
 * lists the universities and programmes in that city.
 */
export function CityMap({ universities, studentCity, lang = 'en' }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const groups = useMemo(
    () => sortCitiesNear(groupUniversitiesByCity(universities), studentCity),
    [universities, studentCity],
  );
  const [selectedCity, setSelectedCity] = useState(null);
  const active = groups.find((group) => group.city === selectedCity) || groups[0] || null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let cancelled = false;

    (async () => {
      const leaflet = await import('leaflet');
      if (cancelled || !hostRef.current) return;
      const L = leaflet.default;

      if (!mapRef.current) {
        const origin = studentCity ? locateCity(studentCity) : { lat: 30.3753, lng: 69.3451 };
        mapRef.current = L.map(hostRef.current, { scrollWheelZoom: true }).setView([origin.lat, origin.lng], studentCity ? 7 : 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 18,
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }

      const map = mapRef.current;
      const layer = layerRef.current;
      layer.clearLayers();

      groups.forEach((group) => {
        const marker = L.marker([group.lat, group.lng], {
          icon: L.divIcon({
            className: 'ns-city-pin',
            html: `<span>${group.universities.length}</span>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
          title: `${group.city}: ${group.universities.length} universities`,
        });
        marker.on('click', () => setSelectedCity(group.city));
        marker.addTo(layer);
      });

      if (groups.length) {
        const bounds = L.latLngBounds(groups.map((group) => [group.lat, group.lng]));
        if (studentCity) {
          const origin = locateCity(studentCity);
          map.setView([origin.lat, origin.lng], 7);
        } else {
          map.fitBounds(bounds.pad(0.2));
        }
      }
      setTimeout(() => map.invalidateSize(), 80);
    })();

    return () => { cancelled = true; };
  }, [groups, studentCity]);

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
  }, []);

  return (
    <div className="ns-card p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <h2 className="font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{lang === 'ur' ? 'شہروں کا نقشہ' : 'City map'}</span>
        </h2>
        <span className="ns-badge ns-badge-subtle">{groups.length} {lang === 'ur' ? 'شہر' : 'cities'}</span>
      </div>

      {studentCity && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {lang === 'ur' ? 'آپ کے شہر کے قریب' : 'Near you'}: <strong>{studentCity}</strong>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)] gap-4 min-w-0">
        <div ref={hostRef} className="ns-city-map h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700" />

        <div className="space-y-3 min-w-0 max-h-[420px] overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {groups.slice(0, 8).map((group) => (
              <button
                key={group.city}
                type="button"
                onClick={() => setSelectedCity(group.city)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  active?.city === group.city
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                {group.city} · {group.universities.length}
              </button>
            ))}
          </div>

          {active && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {active.city}{active.province ? `, ${active.province}` : ''}
              </h3>
              {active.universities.map((uni) => (
                <article key={uni.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{uni.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {uni.type || uni.sector || 'Recognized'}
                    {uni.lastMeritCutoffPct ? ` · Merit ${uni.lastMeritCutoffPct}%` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(uni.programs || []).slice(0, 6).map((program) => (
                      <span key={program} className="ns-badge ns-badge-subtle">{program}</span>
                    ))}
                    {(uni.programs || []).length === 0 && (
                      <span className="text-xs text-slate-500">Programmes listed on the official site</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        .ns-city-map { z-index: 0; }
        .ns-city-pin { background: transparent; border: 0; }
        .ns-city-pin span {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 999px;
          background: #059669; color: white; font-weight: 800; font-size: 12px;
          border: 2px solid white; box-shadow: 0 4px 12px rgba(6, 78, 59, 0.35);
        }
      `}</style>
    </div>
  );
}

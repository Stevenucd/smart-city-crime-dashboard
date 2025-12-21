import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import './App.css'
import 'leaflet/dist/leaflet.css'

const CATEGORY_LIST = [
  'THEFT',
  'BURGLARY',
  'ROBBERY',
  'VEHICLE',
  'ASSAULT',
  'DOMESTIC',
  'SEX_CRIME',
  'CHILD_CRIME',
  'FRAUD_FORGERY',
  'VANDALISM_ARSON',
  'WEAPONS',
  'COURT_ORDER',
  'PUBLIC_ORDER',
  'KIDNAPPING_TRAFFICKING',
  'HOMICIDE',
  'OTHER',
] as const

const CATEGORY_LABELS: Record<IncidentType, string> = {
  THEFT: 'Theft',
  BURGLARY: 'Burglary',
  ROBBERY: 'Robbery',
  VEHICLE: 'Vehicle',
  ASSAULT: 'Assault',
  DOMESTIC: 'Domestic violence',
  SEX_CRIME: 'Sex crime',
  CHILD_CRIME: 'Child crime',
  FRAUD_FORGERY: 'Fraud / Forgery',
  VANDALISM_ARSON: 'Vandalism / Arson',
  WEAPONS: 'Weapons',
  COURT_ORDER: 'Court order',
  PUBLIC_ORDER: 'Public order',
  KIDNAPPING_TRAFFICKING: 'Kidnapping / Trafficking',
  HOMICIDE: 'Homicide',
  OTHER: 'Other',
}

type IncidentType = (typeof CATEGORY_LIST)[number]

type Incident = {
  id: string
  label: string
  type: IncidentType
  time: string
  street: string
  desc: string
  severity: 'Low' | 'Medium' | 'High'
  change: number
  lat: number
  lon: number
}

type CityDashboard = {
  dataset: string
  incidents: Incident[]
  monthlyTrend: { label: string; value: number }[]
  predictions: { title: string; area: string; metric: string; detail: string }[]
  mix: { type: IncidentType; value: number }[]
}

const laDashboard: CityDashboard = {
  dataset: 'LAPD Crime Data (data.lacity.org, Part I/II) + 311 safety incidents (static sample)',
  incidents: [
    {
      id: 'INC-001',
      label: 'Hollywood',
      type: 'THEFT',
      time: '20:15',
      street: 'Hollywood Blvd & N Highland Ave',
      desc: 'Pickpocket incident (sample).',
      severity: 'Medium',
      change: 11,
      lat: 34.1016,
      lon: -118.3269,
    },
    {
      id: 'INC-002',
      label: 'Downtown LA',
      type: 'ASSAULT',
      time: '22:40',
      street: '7th St & S Broadway',
      desc: 'Night fight, 3 people involved (sample).',
      severity: 'High',
      change: 8,
      lat: 34.0407,
      lon: -118.2468,
    },
    {
      id: 'INC-003',
      label: 'Koreatown',
      type: 'THEFT',
      time: '19:20',
      street: 'Wilshire Blvd & S Vermont Ave',
      desc: 'Convenience store theft (sample).',
      severity: 'Medium',
      change: 5,
      lat: 34.06,
      lon: -118.309,
    },
    {
      id: 'INC-004',
      label: 'South LA',
      type: 'ASSAULT',
      time: '21:55',
      street: 'S Figueroa St & W 92nd St',
      desc: 'Street assault, multiple witnesses (sample).',
      severity: 'High',
      change: 7,
      lat: 33.95,
      lon: -118.28,
    },
    {
      id: 'INC-005',
      label: 'Venice',
      type: 'VEHICLE',
      time: '23:10',
      street: 'Windward Ave Parking',
      desc: 'Car break-in at parking lot (sample).',
      severity: 'Medium',
      change: 9,
      lat: 33.985,
      lon: -118.469,
    },
    {
      id: 'INC-006',
      label: 'Van Nuys',
      type: 'BURGLARY',
      time: '18:05',
      street: 'Victory Blvd & Kester Ave',
      desc: 'Attempted residential burglary (sample).',
      severity: 'Low',
      change: -3,
      lat: 34.1867,
      lon: -118.4487,
    },
    {
      id: 'INC-007',
      label: 'Echo Park',
      type: 'VANDALISM_ARSON',
      time: '17:45',
      street: 'Sunset Blvd & Echo Park Ave',
      desc: 'Storefront glass broken (sample).',
      severity: 'Low',
      change: 2,
      lat: 34.0782,
      lon: -118.2606,
    },
    {
      id: 'INC-008',
      label: 'Silver Lake',
      type: 'THEFT',
      time: '09:30',
      street: 'Sunset Blvd & Micheltorena St',
      desc: 'Bike theft, possible crew (sample).',
      severity: 'Medium',
      change: 3,
      lat: 34.0875,
      lon: -118.274,
    },
    {
      id: 'INC-009',
      label: 'Westwood',
      type: 'VEHICLE',
      time: '14:15',
      street: 'Le Conte Ave & Westwood Blvd',
      desc: 'Vehicle break-in near campus (sample).',
      severity: 'Low',
      change: 1,
      lat: 34.0649,
      lon: -118.446,
    },
    {
      id: 'INC-010',
      label: 'Burbank',
      type: 'ASSAULT',
      time: '00:40',
      street: 'E Olive Ave & N Glenoaks Blvd',
      desc: 'Altercation outside bar (sample).',
      severity: 'Medium',
      change: 4,
      lat: 34.1816,
      lon: -118.309,
    },
  ],
  monthlyTrend: [
    { label: 'May', value: 612 },
    { label: 'Jun', value: 640 },
    { label: 'Jul', value: 702 },
    { label: 'Aug', value: 688 },
    { label: 'Sep', value: 715 },
    { label: 'Oct', value: 744 },
    { label: 'Nov', value: 731 },
  ],
  predictions: [
    {
      title: 'Hourly likelihood',
      area: 'Hollywood',
      metric: '0.34',
      detail: '19:00-23:00 theft pickpocketing most likely (sample)',
    },
    {
      title: 'Tomorrow total forecast',
      area: 'Downtown',
      metric: '128',
      detail: 'Block-level call volume estimate (sample)',
    },
    {
      title: 'Next 24h hotspot',
      area: 'Koreatown',
      metric: 'High risk',
      detail: 'Bus stops and bar areas at night (sample)',
    },
    {
      title: 'High-risk window',
      area: 'Venice',
      metric: '22:00-02:00',
      detail: 'Vehicle + beach parking peak risk (sample)',
    },
  ],
  mix: [
    { type: 'THEFT', value: 44 },
    { type: 'ASSAULT', value: 23 },
    { type: 'VEHICLE', value: 19 },
    { type: 'VANDALISM_ARSON', value: 8 },
    { type: 'BURGLARY', value: 6 },
  ],
}

const timeframes = ['Last 30 days', 'Last 90 days', 'Last 12 months']
const laCenter: [number, number] = [34.0522, -118.2437]
const dropIcon = L.icon({
  iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40" fill="none">
      <g transform="rotate(180 15 20)">
        <path d="M15 2C10 9 6 14.5 6 19.5C6 26.5 10.5 31 15 31C19.5 31 24 26.5 24 19.5C24 14.5 20 9 15 2Z" fill="#0D73FF"/>
        <circle cx="15" cy="20" r="4.5" fill="white" fill-opacity="0.9"/>
      </g>
    </svg>`,
  )}`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -32],
})

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells
}

const formatTime = (raw: string) => {
  const normalized = raw.trim().padStart(4, '0').slice(0, 4)
  return `${normalized.slice(0, 2)}:${normalized.slice(2, 4)}`
}

const categorize = (crimeDesc: string): IncidentType => {
  const desc = crimeDesc.toLowerCase()
  if (desc.includes('homicide') || desc.includes('murder')) return 'HOMICIDE'
  if (desc.includes('kidnap') || desc.includes('human trafficking')) return 'KIDNAPPING_TRAFFICKING'
  if (desc.includes('sexual') || desc.includes('rape') || desc.includes('sex')) return 'SEX_CRIME'
  if (desc.includes('child')) return 'CHILD_CRIME'
  if (desc.includes('domestic')) return 'DOMESTIC'
  if (desc.includes('assault') || desc.includes('battery') || desc.includes('threat')) return 'ASSAULT'
  if (desc.includes('robbery')) return 'ROBBERY'
  if (desc.includes('burglary from vehicle') || desc.includes('vehicle - stolen') || desc.includes('vehicle')) return 'VEHICLE'
  if (desc.includes('burglary')) return 'BURGLARY'
  if (desc.includes('vandal') || desc.includes('arson') || desc.includes('damage')) return 'VANDALISM_ARSON'
  if (desc.includes('weapon') || desc.includes('gun') || desc.includes('shots fired')) return 'WEAPONS'
  if (desc.includes('fraud') || desc.includes('forgery') || desc.includes('bunco') || desc.includes('counterfeit')) return 'FRAUD_FORGERY'
  if (desc.includes('court')) return 'COURT_ORDER'
  if (desc.includes('disturbing') || desc.includes('public order') || desc.includes('illegal dumping')) return 'PUBLIC_ORDER'
  if (desc.includes('theft')) return 'THEFT'
  return 'OTHER'
}

const deriveSeverity = (crimeDesc: string, weapon: string): Incident['severity'] => {
  const text = `${crimeDesc} ${weapon}`.toLowerCase()
  if (text.includes('deadly') || text.includes('weapon') || text.includes('assault')) return 'High'
  if (text.includes('burglary') || text.includes('robbery')) return 'Medium'
  return 'Low'
}

const buildMix = (data: Incident[]): { type: IncidentType; value: number }[] => {
  if (!data.length) return []
  const counts: Record<string, number> = {}
  data.forEach((item) => {
    counts[item.type] = (counts[item.type] ?? 0) + 1
  })

  const total = data.length || 1
  return CATEGORY_LIST.map((type) => ({
    type,
    value: counts[type] ? Math.round((counts[type] / total) * 100) : 0,
  })).filter((item) => item.value > 0)
}

const parseCsvToIncidents = (text: string): Incident[] => {
  const [headerLine, ...rows] = text.trim().split(/\r?\n/)
  const headers = parseCsvLine(headerLine)

  return rows
    .map((line) => {
      const cells = parseCsvLine(line)
      const record = headers.reduce<Record<string, string>>((acc, header, index) => {
        acc[header] = cells[index] ?? ''
        return acc
      }, {})

      const lat = Number(record.LAT)
      const lon = Number(record.LON)
      if (Number.isNaN(lat) || Number.isNaN(lon)) return null

      const crimeDesc = record['Crm Cd Desc'] ?? ''
      const weapon = record['Weapon Desc'] ?? ''
      const crmType = (record['Crm Type'] || '').trim().toUpperCase()
      const normalizedType: IncidentType = CATEGORY_LIST.includes(crmType as IncidentType)
        ? (crmType as IncidentType)
        : categorize(crimeDesc)
      const type = normalizedType || 'OTHER'

      return {
        id: record.DR_NO ?? crypto.randomUUID(),
        label: record['AREA NAME'] || 'Unknown',
        type,
        time: formatTime(record['TIME OCC'] ?? ''),
        street: (record.LOCATION || '').trim() || 'Unknown street',
        desc: `${crimeDesc || 'No description'} · ${record['Premis Desc'] || 'No premise noted'} · ${
          record['Status Desc'] || 'Status unknown'
        }`,
        severity: deriveSeverity(crimeDesc, weapon),
        change: 0,
        lat,
        lon,
      }
    })
    .filter((item): item is Incident => Boolean(item))
}

function App() {
  const [view, setView] = useState<'map' | 'predict'>('map')
  const [timeframe, setTimeframe] = useState<string>('Last 30 days')
  const [focusType, setFocusType] = useState<string>('All')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(laDashboard.incidents[0])
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const mapRef = useRef<L.Map | null>(null)
  const monthlyTrend = laDashboard.monthlyTrend
  const predictions = laDashboard.predictions
  const [datasetLabel, setDatasetLabel] = useState<string>(laDashboard.dataset)
  const [incidents, setIncidents] = useState<Incident[]>(laDashboard.incidents)
  const [mix, setMix] = useState<{ type: IncidentType; value: number }[]>(laDashboard.mix)
  const [focusOptions, setFocusOptions] = useState<string[]>(['All', ...CATEGORY_LIST])
  const categoryLabel = (type: string) => {
    if (type === 'All') return 'All categories'
    return CATEGORY_LABELS[type as IncidentType] ?? type
  }

  useEffect(() => {
    const loadCsv = async () => {
      try {
        const response = await fetch('/df_display.csv')
        if (!response.ok) return
        const text = await response.text()
        const parsedIncidents = parseCsvToIncidents(text)
        if (!parsedIncidents.length) return

        setIncidents(parsedIncidents)
        setMix(buildMix(parsedIncidents))
        setDatasetLabel('df_display.csv · live sample from provided database')
        setFocusOptions(['All', ...CATEGORY_LIST])
        setFocusType('All')
        setSelectedIncident(parsedIncidents[0] ?? null)
      } catch (error) {
        console.error('Failed to load CSV data', error)
      }
    }

    loadCsv()
  }, [])

  useEffect(() => {
    if (focusType !== 'All' && !mix.some((item) => item.type === focusType)) {
      setFocusType('All')
    }
  }, [mix, focusType])

  const filteredIncidents = useMemo(
    () =>
      focusType === 'All'
        ? incidents
        : incidents.filter((spot) => spot.type === focusType),
    [incidents, focusType],
  )

  useEffect(() => {
    if (selectedIncident && !filteredIncidents.find((s) => s.id === selectedIncident.id)) {
      setSelectedIncident(filteredIncidents[0] ?? null)
    }
  }, [filteredIncidents, selectedIncident])

  const maxTrendValue = useMemo(
    () => Math.max(...monthlyTrend.map((item) => item.value)),
    [monthlyTrend],
  )
  const maxMix = useMemo(() => (mix.length ? Math.max(...mix.map((item) => item.value)) : 0), [mix])

  return (
    <main className="page">
      <header className="topbar card">
        <div>
          <p className="eyebrow">Los Angeles Crime</p>
          <h1>Two views: Map & Forecasts</h1>
          <p className="muted">Tap markers for incident details, or switch to the forecast view.</p>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={`tab ${view === 'map' ? 'tab--active' : ''}`}
            onClick={() => setView('map')}
          >
            Map
          </button>
          <button
            type="button"
            className={`tab ${view === 'predict' ? 'tab--active' : ''}`}
            onClick={() => setView('predict')}
          >
            Forecast
          </button>
        </div>
      </header>

      {view === 'map' && (
        <>
          <section className={`card map-card ${isFullscreen ? 'map-shell--full' : ''}`}>
            <div className="panel__header">
              <div>
                <p className="eyebrow">LA incident map</p>
                <h3>Click markers to inspect</h3>
                <p className="muted">Filtered by type; coordinates from the provided dataset.</p>
              </div>
              <div className="controls">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                >
                  {isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
                </button>
                <div className="zoom">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => mapRef.current?.setView(laCenter, 11)}
                  >
                    Reset
                  </button>
                </div>
                <label className="control">
                  Timeframe
                  <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                    {timeframes.map((frame) => (
                      <option key={frame}>{frame}</option>
                    ))}
                  </select>
                </label>
                <label className="control">
                  Category
                  <select value={focusType} onChange={(e) => setFocusType(e.target.value)}>
                    {focusOptions.map((option) => (
                      <option key={option} value={option}>
                        {categoryLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="map">
              <MapContainer
                center={laCenter}
                zoom={11}
                scrollWheelZoom
                className="map__leaflet"
                ref={(instance) => {
                  if (instance) {
                    mapRef.current = instance
                    L.Icon.Default.mergeOptions({
                      iconRetinaUrl:
                        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    })
                  }
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredIncidents.map((spot) => (
                  <Marker
                    key={spot.id}
                    position={[spot.lat, spot.lon]}
                    icon={dropIcon}
                    eventHandlers={{
                      click: () => setSelectedIncident(spot),
                    }}
                  />
                ))}
              </MapContainer>
            </div>

            <div className="legend">
              <div>
                <p className="muted">Dataset</p>
                <p>{datasetLabel}</p>
              </div>
              <div>
                <p className="muted">Time window</p>
                <p>{timeframe}</p>
              </div>
            </div>

            {isFullscreen && selectedIncident && (
              <aside className="detail-panel">
                <div className="detail-panel__header">
                  <p className="eyebrow">Incident</p>
                  <button className="btn btn--ghost" type="button" onClick={() => setSelectedIncident(null)}>
                    Close
                  </button>
                </div>
                <h3>{selectedIncident.label}</h3>
                <p className="muted">
                  {categoryLabel(selectedIncident.type)} · {selectedIncident.time} · {selectedIncident.street}
                </p>
                <p className="muted">{selectedIncident.desc}</p>
                <div className="chip-row">
                  <span className="pill">Severity {selectedIncident.severity}</span>
                  <span className="pill">Lon {selectedIncident.lon.toFixed(3)}</span>
                  <span className="pill">Lat {selectedIncident.lat.toFixed(3)}</span>
                </div>
              </aside>
            )}
          </section>

          <section className="grid grid--two">
            <div className="card insights-card">
              <p className="eyebrow">Current incident</p>
              <h3>{selectedIncident ? selectedIncident.label : 'None selected'}</h3>
              {selectedIncident ? (
                <div>
                  <p className="muted">
                    {categoryLabel(selectedIncident.type)} · {selectedIncident.time} · {selectedIncident.street}
                  </p>
                  <p className="muted">{selectedIncident.desc}</p>
                  <div className="chip-row">
                    <span className="pill">Severity {selectedIncident.severity}</span>
                    <span className="pill">Lon {selectedIncident.lon.toFixed(3)}</span>
                    <span className="pill">Lat {selectedIncident.lat.toFixed(3)}</span>
                  </div>
                </div>
              ) : (
                <p className="muted">Click a map marker to view details.</p>
              )}
            </div>

            <div className="card">
              <p className="eyebrow">Type split</p>
              <h3>Key categories</h3>
              <div className="bars">
                {mix.map((item) => (
                  <div key={item.type} className="bar">
                    <div className="bar__label">
                      <span>{categoryLabel(item.type)}</span>
                      <span className="muted">{item.value}%</span>
                    </div>
                    <div className="bar__track">
                      <span
                        className="bar__fill"
                        style={{ width: `${maxMix ? (item.value / maxMix) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {view === 'predict' && (
        <section className="card">
          <p className="eyebrow">Forecast view</p>
          <h3>Four example tasks</h3>
          <p className="muted">Static placeholders — swap with backend results when ready.</p>
          <div className="prediction-list prediction-list--grid">
            {predictions.map((prediction) => (
              <div key={prediction.title} className="prediction prediction--block">
                <div>
                  <p className="list__title">{prediction.title}</p>
                  <p className="muted">{prediction.detail}</p>
                </div>
                <div className="prediction__stats">
                  <span className="pill">{prediction.area}</span>
                  <p className="prediction__value">{prediction.metric}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="trend-card mini-trend">
            <p className="muted">月度走势（示例）</p>
            <div className="trend">
              <svg viewBox="0 0 320 120" role="img" aria-label="Monthly trend">
                <defs>
                  <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0d73ff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#0d73ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="url(#trendGradient)"
                  stroke="#0d73ff"
                  strokeWidth="3"
                  points={monthlyTrend
                    .map((item, index) => {
                      const x = (index / (monthlyTrend.length - 1)) * 320
                      const y = 120 - (item.value / maxTrendValue) * 100 - 10
                      return `${x},${y}`
                    })
                    .join(' ')}
                />
              </svg>
              <div className="trend__labels">
                {monthlyTrend.map((item) => (
                  <span key={item.label}>{item.label}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

export default App

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import './App.css'
import 'leaflet/dist/leaflet.css'

const MAX_RESULTS = 1000
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

type ApiIncident = {
  id: number
  drNo: string
  areaName: string
  crimeDesc: string
  premiseDesc: string
  weaponDesc: string
  statusDesc: string
  location: string
  lat: number
  lon: number
  crimeType: string
  occurTime: string | null
}

type Incident = {
  id: string
  label: string
  type: IncidentType
  dateTime: string
  street: string
  desc: string
  severity: 'Low' | 'Medium' | 'High'
  lat: number
  lon: number
}

type Bounds = {
  minLat: number
  minLon: number
  maxLat: number
  maxLon: number
}

const monthlyTrend = [
  { label: 'May', value: 612 },
  { label: 'Jun', value: 640 },
  { label: 'Jul', value: 702 },
  { label: 'Aug', value: 688 },
  { label: 'Sep', value: 715 },
  { label: 'Oct', value: 744 },
  { label: 'Nov', value: 731 },
]

const predictions = [
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
]

const timeframes = ['Last 30 days', 'Last 90 days', 'Last 12 months', 'Custom range']
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

const formatOccurDateTime = (isoString: string | null): string => {
  if (!isoString) return 'Unknown'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${d} ${hh}:${mm}`
}

const formatLocalDate = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
  if (desc.includes('burglary from vehicle') || desc.includes('vehicle - stolen') || desc.includes('vehicle'))
    return 'VEHICLE'
  if (desc.includes('burglary')) return 'BURGLARY'
  if (desc.includes('vandal') || desc.includes('arson') || desc.includes('damage')) return 'VANDALISM_ARSON'
  if (desc.includes('weapon') || desc.includes('gun') || desc.includes('shots fired')) return 'WEAPONS'
  if (desc.includes('fraud') || desc.includes('forgery') || desc.includes('bunco') || desc.includes('counterfeit'))
    return 'FRAUD_FORGERY'
  if (desc.includes('court')) return 'COURT_ORDER'
  if (desc.includes('disturbing') || desc.includes('public order') || desc.includes('illegal dumping'))
    return 'PUBLIC_ORDER'
  if (desc.includes('theft')) return 'THEFT'
  return 'OTHER'
}

const normalizeCrimeType = (rawType: string, crimeDesc: string): IncidentType => {
  const trimmed = rawType.trim().toUpperCase()
  if (CATEGORY_LIST.includes(trimmed as IncidentType)) {
    return trimmed as IncidentType
  }
  return categorize(crimeDesc)
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

const mapRecordToIncident = (record: ApiIncident): Incident => {
  const type = normalizeCrimeType(record.crimeType || '', record.crimeDesc || '')
  const descriptionPieces = [
    record.crimeDesc || 'No description',
    record.premiseDesc || 'No premise noted',
    record.statusDesc || 'Status unknown',
  ]
  return {
    id: `${record.id}`,
    label: record.areaName || 'Unknown',
    type,
    dateTime: formatOccurDateTime(record.occurTime),
    street: record.location || 'Unknown street',
    desc: descriptionPieces.join(' · '),
    severity: deriveSeverity(record.crimeDesc || '', record.weaponDesc || ''),
    lat: record.lat,
    lon: record.lon,
  }
}

const categoryLabel = (type: string) => {
  if (type === 'All') return 'All categories'
  return CATEGORY_LABELS[type as IncidentType] ?? type
}

const buildRangeFromTimeframe = (label: string) => {
  const today = new Date()
  let days = 30
  if (label === 'Last 90 days') days = 90
  if (label === 'Last 12 months') days = 365
  const start = new Date(today)
  start.setDate(today.getDate() - days)
  const endExclusive = new Date(today)
  endExclusive.setDate(today.getDate() + 1)
  return { from: formatLocalDate(start), to: formatLocalDate(endExclusive) }
}

function MapBoundsTracker({ onBoundsChange }: { onBoundsChange: (bounds: Bounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds()
      onBoundsChange({
        minLat: bounds.getSouth(),
        minLon: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLon: bounds.getEast(),
      })
    },
    zoomend: () => {
      const bounds = map.getBounds()
      onBoundsChange({
        minLat: bounds.getSouth(),
        minLon: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLon: bounds.getEast(),
      })
    },
  })

  useEffect(() => {
    const bounds = map.getBounds()
    onBoundsChange({
      minLat: bounds.getSouth(),
      minLon: bounds.getWest(),
      maxLat: bounds.getNorth(),
      maxLon: bounds.getEast(),
    })
  }, [map, onBoundsChange])

  return null
}

function App() {
  const [view, setView] = useState<'map' | 'predict'>('map')
  const [timeframe, setTimeframe] = useState<string>('Last 30 days')
  const [focusType, setFocusType] = useState<string>('All')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const mapRef = useRef<L.Map | null>(null)
  const today = useMemo(() => new Date(), [])
  const defaultFromDate = useMemo(() => {
    const copy = new Date(today)
    copy.setDate(copy.getDate() - 30)
    return copy
  }, [today])
  const [fromDate, setFromDate] = useState<string>(formatLocalDate(defaultFromDate))
  const [toDate, setToDate] = useState<string>(formatLocalDate(today))
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [mix, setMix] = useState<{ type: IncidentType; value: number }[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [debouncedBounds, setDebouncedBounds] = useState<Bounds | null>(null)
  const handleBoundsChange = useCallback((nextBounds: Bounds) => setBounds(nextBounds), [])

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedBounds(bounds), 300)
    return () => clearTimeout(handle)
  }, [bounds])

  const computeRange = useCallback(() => {
    if (timeframe === 'Custom range') {
      if (!fromDate || !toDate) return null
      const normalize = (value: string) => value.replaceAll('.', '-')
      const start = new Date(`${normalize(fromDate)}T00:00:00`)
      const endExclusive = new Date(`${normalize(toDate)}T00:00:00`)
      endExclusive.setDate(endExclusive.getDate() + 1) // make upper bound exclusive
      if (Number.isNaN(start.getTime()) || Number.isNaN(endExclusive.getTime()) || start >= endExclusive)
        return null
      return { from: formatLocalDate(start), to: formatLocalDate(endExclusive) }
    }
    return buildRangeFromTimeframe(timeframe)
  }, [timeframe, fromDate, toDate])

  const fetchIncidents = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError(null)

    const range = computeRange()
    if (!range) {
      setError('请选择有效的起止日期')
      setLoading(false)
      return
    }
    const { from, to } = range
    const baseParams = new URLSearchParams({ from, to })
    if (focusType !== 'All') baseParams.set('crimeType', focusType)
    if (debouncedBounds) {
      baseParams.set('minLat', debouncedBounds.minLat.toString())
      baseParams.set('minLon', debouncedBounds.minLon.toString())
      baseParams.set('maxLat', debouncedBounds.maxLat.toString())
      baseParams.set('maxLon', debouncedBounds.maxLon.toString())
    }

    try {
      const countResponse = await fetch(`/api/incidents/count?${baseParams.toString()}`, {
        signal,
      })
      if (!countResponse.ok) {
        throw new Error(`Count request failed with status ${countResponse.status}`)
      }
      const countData = await countResponse.json()
      setTotalCount(countData.count ?? 0)

      const incidentParams = new URLSearchParams(baseParams)
      incidentParams.set('limit', MAX_RESULTS.toString())

      const incidentsResponse = await fetch(`/api/incidents?${incidentParams.toString()}`, {
        signal,
      })
      if (!incidentsResponse.ok) {
        throw new Error(`Incidents request failed with status ${incidentsResponse.status}`)
      }
      const payload = await incidentsResponse.json()
      const mapped = (payload.records ?? []).map((record: ApiIncident) => mapRecordToIncident(record))

      setIncidents(mapped)
      setMix(buildMix(mapped))
      setSelectedIncident((current) => {
        if (current) {
          const found = mapped.find((item) => item.id === current.id)
          if (found) return found
        }
        return mapped[0] ?? null
      })
    } catch (err) {
      if (signal.aborted) return
      console.error(err)
      setError('Failed to load incidents. Please adjust filters and try again.')
      setIncidents([])
      setMix([])
      setSelectedIncident(null)
      setTotalCount(null)
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }, [computeRange, focusType, debouncedBounds])

  useEffect(() => {
    const controller = new AbortController()
    fetchIncidents(controller.signal)
    return () => controller.abort()
  }, [fetchIncidents])

  useEffect(() => {
    if (selectedIncident && !incidents.find((s) => s.id === selectedIncident.id)) {
      setSelectedIncident(incidents[0] ?? null)
    }
  }, [incidents, selectedIncident])

  const maxTrendValue = useMemo(
    () => Math.max(...monthlyTrend.map((item) => item.value)),
    [],
  )
  const maxMix = useMemo(() => (mix.length ? Math.max(...mix.map((item) => item.value)) : 0), [mix])
  const overLimit = totalCount !== null && totalCount > MAX_RESULTS

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
          {overLimit && (
            <div className="alert alert--warn">
              当前结果 {totalCount} 条，超过 1000 条，仅显示前 1000 条，请缩小时间范围或增加筛选
            </div>
          )}
          {error && (
            <div className="alert alert--error">
              {error}
            </div>
          )}
          <section className={`card map-card ${isFullscreen ? 'map-shell--full' : ''}`}>
            <div className="panel__header">
              <div>
                <p className="eyebrow">LA incident map</p>
                <h3>Click markers to inspect</h3>
                <p className="muted">Live incidents pulled from PostgreSQL via Flask API.</p>
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
                {timeframe === 'Custom range' && (
                  <>
                    <label className="control">
                      From (YYYY-MM-DD 或 YYYY.MM.DD)
                      <input
                        type="text"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        placeholder="2024-02-03"
                      />
                    </label>
                    <label className="control">
                      To (YYYY-MM-DD 或 YYYY.MM.DD)
                      <input
                        type="text"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        placeholder="2024-03-03"
                      />
                    </label>
                  </>
                )}
                <label className="control">
                  Category
                  <select value={focusType} onChange={(e) => setFocusType(e.target.value)}>
                    {['All', ...CATEGORY_LIST].map((option) => (
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
                <MapBoundsTracker onBoundsChange={handleBoundsChange} />
                {incidents.map((spot) => (
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
                <p>PostgreSQL · incidents table</p>
              </div>
              <div>
                <p className="muted">Time window</p>
                <p>
                  {timeframe === 'Custom range' ? `${fromDate} → ${toDate}` : timeframe}
                </p>
              </div>
              <div>
                <p className="muted">Matched</p>
                <p>{loading ? 'Loading…' : totalCount ?? '--'} {totalCount ? 'records' : ''}</p>
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
                  {categoryLabel(selectedIncident.type)} · {selectedIncident.dateTime} · {selectedIncident.street}
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
                    {categoryLabel(selectedIncident.type)} · {selectedIncident.dateTime} · {selectedIncident.street}
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

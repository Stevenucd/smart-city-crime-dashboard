import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import './App.css'
import 'leaflet/dist/leaflet.css'

type Incident = {
  id: string
  label: string
  type: string
  time: string
  street: string
  desc: string
  severity: '低' | '中' | '高'
  change: number
  lat: number
  lon: number
}

type CityDashboard = {
  dataset: string
  incidents: Incident[]
  monthlyTrend: { label: string; value: number }[]
  predictions: { title: string; area: string; metric: string; detail: string }[]
  mix: { type: string; value: number }[]
}

const laDashboard: CityDashboard = {
  dataset: 'LAPD Crime Data (data.lacity.org, Part I/II) + 311 公共安全事件（静态示例）',
  incidents: [
    {
      id: 'INC-001',
      label: 'Hollywood',
      type: '盗窃',
      time: '20:15',
      street: 'Hollywood Blvd & N Highland Ave',
      desc: '游客手机被扒，报警后 5 分钟内锁定嫌疑人轨迹（示例）。',
      severity: '中',
      change: 11,
      lat: 34.1016,
      lon: -118.3269,
    },
    {
      id: 'INC-002',
      label: 'Downtown LA',
      type: '暴力',
      time: '22:40',
      street: '7th St & S Broadway',
      desc: '夜间斗殴，涉及 3 人，现场救护已介入（示例）。',
      severity: '高',
      change: 8,
      lat: 34.0407,
      lon: -118.2468,
    },
    {
      id: 'INC-003',
      label: 'Koreatown',
      type: '盗窃',
      time: '19:20',
      street: 'Wilshire Blvd & S Vermont Ave',
      desc: '便利店扒窃，嫌疑人逃向地铁站（示例）。',
      severity: '中',
      change: 5,
      lat: 34.06,
      lon: -118.309,
    },
    {
      id: 'INC-004',
      label: 'South LA',
      type: '暴力',
      time: '21:55',
      street: 'S Figueroa St & W 92nd St',
      desc: '街头袭击报警，多名目击者（示例）。',
      severity: '高',
      change: 7,
      lat: 33.95,
      lon: -118.28,
    },
    {
      id: 'INC-005',
      label: 'Venice',
      type: '车辆',
      time: '23:10',
      street: 'Windward Ave Parking',
      desc: '停车场车窗砸车，财物被盗（示例）。',
      severity: '中',
      change: 9,
      lat: 33.985,
      lon: -118.469,
    },
    {
      id: 'INC-006',
      label: 'Van Nuys',
      type: '入室',
      time: '18:05',
      street: 'Victory Blvd & Kester Ave',
      desc: '住宅入室未遂，邻居报警（示例）。',
      severity: '低',
      change: -3,
      lat: 34.1867,
      lon: -118.4487,
    },
    {
      id: 'INC-007',
      label: 'Echo Park',
      type: '破坏',
      time: '17:45',
      street: 'Sunset Blvd & Echo Park Ave',
      desc: '商铺玻璃被砸，CCTV 可用（示例）。',
      severity: '低',
      change: 2,
      lat: 34.0782,
      lon: -118.2606,
    },
    {
      id: 'INC-008',
      label: 'Silver Lake',
      type: '盗窃',
      time: '09:30',
      street: 'Sunset Blvd & Micheltorena St',
      desc: '自行车被盗，疑似团伙踩点（示例）。',
      severity: '中',
      change: 3,
      lat: 34.0875,
      lon: -118.274,
    },
    {
      id: 'INC-009',
      label: 'Westwood',
      type: '车辆',
      time: '14:15',
      street: 'Le Conte Ave & Westwood Blvd',
      desc: '校园周边车辆被撬，白天高发（示例）。',
      severity: '低',
      change: 1,
      lat: 34.0649,
      lon: -118.446,
    },
    {
      id: 'INC-010',
      label: 'Burbank',
      type: '暴力',
      time: '00:40',
      street: 'E Olive Ave & N Glenoaks Blvd',
      desc: '酒吧外冲突，警方已到场（示例）。',
      severity: '中',
      change: 4,
      lat: 34.1816,
      lon: -118.309,
    },
  ],
  monthlyTrend: [
    { label: '5月', value: 612 },
    { label: '6月', value: 640 },
    { label: '7月', value: 702 },
    { label: '8月', value: 688 },
    { label: '9月', value: 715 },
    { label: '10月', value: 744 },
    { label: '11月', value: 731 },
  ],
  predictions: [
    {
      title: '每小时发生概率',
      area: 'Hollywood',
      metric: '0.34',
      detail: '19:00-23:00 盗窃/扒窃概率最高（示例）',
    },
    {
      title: '次日总量预测',
      area: 'Downtown',
      metric: '128',
      detail: '按街区级估算次日报警总数（示例）',
    },
    {
      title: '未来 24 小时热点',
      area: 'Koreatown',
      metric: '高风险',
      detail: '夜间公交站与酒吧区为主要聚集点（示例）',
    },
    {
      title: '高风险时段',
      area: 'Venice',
      metric: '22:00-02:00',
      detail: '车辆与海滩停车场风险最高的时间窗（示例）',
    },
  ],
  mix: [
    { type: '盗窃', value: 44 },
    { type: '暴力', value: 23 },
    { type: '车辆', value: 19 },
    { type: '破坏', value: 8 },
    { type: '入室', value: 6 },
  ],
}

const focusOptions = ['全部', '盗窃', '暴力', '车辆', '破坏', '入室']
const timeframes = ['最近 30 天', '最近 90 天', '最近一年']
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

function App() {
  const [view, setView] = useState<'map' | 'predict'>('map')
  const [timeframe, setTimeframe] = useState<string>('最近 30 天')
  const [focusType, setFocusType] = useState<string>('全部')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(laDashboard.incidents[0])
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const mapRef = useRef<L.Map | null>(null)
  const cityData = laDashboard

  useEffect(() => {
    if (focusType !== '全部' && !cityData.mix.some((mix) => mix.type === focusType)) {
      setFocusType('全部')
    }
  }, [cityData.mix, focusType])

  const filteredIncidents = useMemo(
    () =>
      focusType === '全部'
        ? cityData.incidents
        : cityData.incidents.filter((spot) => spot.type === focusType),
    [cityData.incidents, focusType],
  )

  useEffect(() => {
    if (selectedIncident && !filteredIncidents.find((s) => s.id === selectedIncident.id)) {
      setSelectedIncident(filteredIncidents[0] ?? null)
    }
  }, [filteredIncidents, selectedIncident])

  const maxTrendValue = useMemo(
    () => Math.max(...cityData.monthlyTrend.map((item) => item.value)),
    [cityData.monthlyTrend],
  )
  const maxMix = useMemo(() => Math.max(...cityData.mix.map((item) => item.value)), [cityData.mix])

  return (
    <main className="page">
      <header className="topbar card">
        <div>
          <p className="eyebrow">Los Angeles Crime</p>
          <h1>两页：地图与预测</h1>
          <p className="muted">只保留关键可视化：点击地图看详情，或切到预测页。</p>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={`tab ${view === 'map' ? 'tab--active' : ''}`}
            onClick={() => setView('map')}
          >
            地图
          </button>
          <button
            type="button"
            className={`tab ${view === 'predict' ? 'tab--active' : ''}`}
            onClick={() => setView('predict')}
          >
            预测
          </button>
        </div>
      </header>

      {view === 'map' && (
        <>
          <section className={`card map-card ${isFullscreen ? 'map-shell--full' : ''}`}>
            <div className="panel__header">
              <div>
                <p className="eyebrow">洛杉矶热点地图</p>
                <h3>点击标记查看具体信息</h3>
                <p className="muted">静态示例：真实经纬度投射，可按类型过滤。</p>
              </div>
              <div className="controls">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                >
                  {isFullscreen ? '退出全屏' : '全屏地图'}
                </button>
                <div className="zoom">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => mapRef.current?.setView(laCenter, 11)}
                  >
                    重置
                  </button>
                </div>
                <label className="control">
                  时间范围
                  <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                    {timeframes.map((frame) => (
                      <option key={frame}>{frame}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="chip-row chip-row--wrap">
              {focusOptions.map((option) => (
                <button
                  key={option}
                  className={`chip chip--clickable ${focusType === option ? 'chip--active' : ''}`}
                  onClick={() => setFocusType(option)}
                >
                  {option}
                </button>
              ))}
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
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> 贡献者'
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
                <p className="muted">数据源</p>
                <p>{cityData.dataset}</p>
                </div>
              <div>
                <p className="muted">时间范围</p>
                <p>{timeframe}</p>
              </div>
            </div>

            {isFullscreen && selectedIncident && (
              <aside className="detail-panel">
                <div className="detail-panel__header">
                  <p className="eyebrow">事件详情</p>
                  <button className="btn btn--ghost" type="button" onClick={() => setSelectedIncident(null)}>
                    关闭
                  </button>
                </div>
                <h3>{selectedIncident.label}</h3>
                <p className="muted">
                  {selectedIncident.type} · {selectedIncident.time} · {selectedIncident.street}
                </p>
                <p className="muted">{selectedIncident.desc}</p>
                <div className="chip-row">
                  <span className="pill">严重度 {selectedIncident.severity}</span>
                  <span className="pill">经度 {selectedIncident.lon.toFixed(3)}</span>
                  <span className="pill">纬度 {selectedIncident.lat.toFixed(3)}</span>
                </div>
              </aside>
            )}
          </section>

          <section className="grid grid--two">
            <div className="card insights-card">
              <p className="eyebrow">当前事件</p>
              <h3>{selectedIncident ? selectedIncident.label : '未选中'}</h3>
              {selectedIncident ? (
                <div>
                  <p className="muted">
                    {selectedIncident.type} · {selectedIncident.time} · {selectedIncident.street}
                  </p>
                  <p className="muted">{selectedIncident.desc}</p>
                  <div className="chip-row">
                    <span className="pill">严重度 {selectedIncident.severity}</span>
                    <span className="pill">经度 {selectedIncident.lon.toFixed(3)}</span>
                    <span className="pill">纬度 {selectedIncident.lat.toFixed(3)}</span>
                  </div>
                </div>
              ) : (
                <p className="muted">点击地图上的标记查看详情。</p>
              )}
            </div>

            <div className="card">
              <p className="eyebrow">类型占比</p>
              <h3>重点类型</h3>
              <div className="bars">
                {cityData.mix.map((item) => (
                  <div key={item.type} className="bar">
                    <div className="bar__label">
                      <span>{item.type}</span>
                      <span className="muted">{item.value}%</span>
                    </div>
                    <div className="bar__track">
                      <span
                        className="bar__fill"
                        style={{ width: `${(item.value / maxMix) * 100}%` }}
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
          <p className="eyebrow">预测页面</p>
          <h3>四个核心预测任务</h3>
          <p className="muted">静态例子，后端接入后即可替换为真实输出。</p>
          <div className="prediction-list prediction-list--grid">
            {cityData.predictions.map((prediction) => (
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
                  points={cityData.monthlyTrend
                    .map((item, index) => {
                      const x = (index / (cityData.monthlyTrend.length - 1)) * 320
                      const y = 120 - (item.value / maxTrendValue) * 100 - 10
                      return `${x},${y}`
                    })
                    .join(' ')}
                />
              </svg>
              <div className="trend__labels">
                {cityData.monthlyTrend.map((item) => (
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

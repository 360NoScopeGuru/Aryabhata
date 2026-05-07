import { useEffect } from 'react'
import { useAppStore, MIXING_MODELS, IMAGE_MODELS, getActiveModel, isBlendMode, type SamplingPreset } from '@/store/appStore'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import PersonaGallery from './PersonaGallery'

const SIZES = [
  { label: '1:1',  w: 1024, h: 1024 },
  { label: '16:9', w: 1344, h: 768  },
  { label: '9:16', w: 768,  h: 1344 },
  { label: '4:3',  w: 1152, h: 896  },
]
const QUALITY = [
  { label: 'Draft', steps: 20 },
  { label: 'Std',   steps: 35 },
  { label: 'HD',    steps: 50 },
]
const LANGUAGES = ['python', 'javascript', 'typescript', 'rust', 'go', 'java', 'c', 'cpp', 'bash', 'sql', 'html', 'css']

const PRESETS: { id: SamplingPreset; label: string }[] = [
  { id: 'precise',  label: 'PRECISE'  },
  { id: 'balanced', label: 'BALANCED' },
  { id: 'creative', label: 'CREATIVE' },
  { id: 'forensic', label: 'FORENSIC' },
]

export default function RightRail() {
  const {
    mode,
    telemetry, sessionTokens,
    selectedModels,
    samplingPreset, setSamplingPreset, resetSamplingParams,
    temperature, setTemperature,
    topP, setTopP,
    topK, setTopK,
    frequencyPenalty, setFrequencyPenalty,
    presencePenalty, setPresencePenalty,
    maxTokens, setMaxTokens,
    autoRoute, setAutoRoute,
    selectedImageModel, setSelectedImageModel,
    imageWidth, imageHeight, imageSteps, setImageSize, setImageSteps,
    codeLanguage, setCodeLanguage,
    systemPrompt, setSystemPrompt,
    leaderboard, setLeaderboard,
  } = useAppStore()
  const authFetch = useAuthFetch()

  useEffect(() => {
    authFetch('/api/arena/leaderboard')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setLeaderboard(data) })
      .catch(() => {})
  }, [])

  const blend = isBlendMode(selectedModels)
  const activeModelId = mode !== 'image' ? getActiveModel(selectedModels) : null
  const activeModel = activeModelId ? MIXING_MODELS.find(m => m.id === activeModelId) : null

  const contextMax = 128000
  const contextFill = Math.min(1, sessionTokens / contextMax)
  const spark = telemetry.spark

  return (
    <aside className="rail-right">
      {/* Persona + System Prompt */}
      {mode !== 'image' && (
        <div className="tele-block">
          <div className="tele-block-label">Persona</div>
          <PersonaGallery systemPrompt={systemPrompt} onSelect={setSystemPrompt} />
          <textarea
            className="system-prompt-input"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="Select a persona above or write custom instructions…"
            rows={3}
          />
        </div>
      )}

      <div className="tele-header">
        <h3>Telemetry</h3>
        {telemetry.streaming && (
          <div className="streaming-badge"><i />Live</div>
        )}
      </div>

      {/* TPOT / TTFT */}
      <div className="tele-block">
        <div className="tele-numbers">
          <div className="tele-num">
            <div className="tn-val">
              {telemetry.tpot > 0 ? telemetry.tpot.toFixed(1) : '—'}
              {telemetry.tpot > 0 && <span>t/s</span>}
            </div>
            <div className="tn-key">TPOT</div>
          </div>
          <div className="tele-num">
            <div className="tn-val">
              {telemetry.ttft > 0 ? telemetry.ttft : '—'}
              {telemetry.ttft > 0 && <span>ms</span>}
            </div>
            <div className="tn-key">TTFT</div>
          </div>
        </div>
        <div className="spark-chart" style={{ marginTop: '10px' }}>
          {spark.map((v, i) => (
            <div key={i} className="spark-bar" style={{ height: `${Math.max(8, v)}%` }} />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="tele-block">
        <div className="tele-row">
          <div className="tele-kv">
            <span className="tk">Tokens</span>
            <span className="tv">{telemetry.outputTokens.toLocaleString()}</span>
          </div>
          <div className="tele-kv">
            <span className="tk">CO₂ <span style={{ opacity: 0.5, fontSize: '8px' }}>est.</span></span>
            <span className="tv">{telemetry.carbon.toFixed(1)}<sub>g</sub></span>
          </div>
          <div className="tele-kv">
            <span className="tk">Session</span>
            <span className="tv">{sessionTokens.toLocaleString()}</span>
          </div>
        </div>

        <div className="ctx-bar-wrap">
          <div className="ctx-bar-label">
            <span>Context</span>
            <span>{(contextFill * 100).toFixed(1)}%</span>
          </div>
          <div className="ctx-bar">
            <div className="ctx-bar-fill" style={{ width: `${contextFill * 100}%`, background: contextFill > 0.8 ? 'var(--warn)' : undefined }} />
          </div>
          <div className="ctx-row">
            <span>{sessionTokens.toLocaleString()} used</span>
            <span>128K max</span>
          </div>
        </div>
      </div>

      {/* Active engine (or blend indicator) */}
      {mode !== 'image' && (
        <div className="tele-block">
          <div className="tele-block-label">{blend ? 'Blend' : 'Active Engine'}</div>
          {blend ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {selectedModels.map(id => {
                const m = MIXING_MODELS.find(x => x.id === id)
                if (!m) return null
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 7px', border: `.5px solid ${m.color}55`, borderRadius: '999px', fontFamily: 'var(--mono)', fontSize: '9px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: m.color }} />
                    <span style={{ color: 'var(--ink-dim)' }}>{m.label}</span>
                  </div>
                )
              })}
            </div>
          ) : activeModel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeModel.color, boxShadow: `0 0 8px ${activeModel.color}88`, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink)' }}>{activeModel.label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>{activeModel.speed}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Sampling */}
      <div className="tele-block">
        <div className="tele-block-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Sampling Preset</span>
          <button className="reset-params-btn" onClick={resetSamplingParams} title="Reset to defaults">↺</button>
        </div>
        <div className="sampling-presets">
          {PRESETS.map(p => (
            <button key={p.id} className={`preset-btn ${samplingPreset === p.id ? 'active' : ''}`} onClick={() => setSamplingPreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        {[
          { label: 'Temp',     val: temperature.toFixed(2), min: 0,   max: 2,     step: 0.01, set: setTemperature,     cur: temperature },
          { label: 'Top P',    val: topP.toFixed(2),        min: 0,   max: 1,     step: 0.01, set: setTopP,            cur: topP },
          { label: 'Top K',    val: topK ?? 40,             min: 1,   max: 200,   step: 1,    set: setTopK,            cur: topK ?? 40 },
          { label: 'Freq Pen', val: frequencyPenalty.toFixed(2), min: 0, max: 2,  step: 0.01, set: setFrequencyPenalty, cur: frequencyPenalty },
          { label: 'Pres Pen', val: presencePenalty.toFixed(2),  min: 0, max: 2,  step: 0.01, set: setPresencePenalty,  cur: presencePenalty },
          { label: 'Max Tok',  val: maxTokens,              min: 256, max: 16384, step: 256,  set: setMaxTokens,       cur: maxTokens },
        ].map(p => (
          <div key={p.label} className="sampling-param">
            <div className="param-label">
              <span>{p.label}</span>
              <span className="pv">{p.val}</span>
            </div>
            <input type="range" className="param-slider" min={p.min} max={p.max} step={p.step}
              value={p.cur} onChange={e => p.set(Number(e.target.value) as any)} />
          </div>
        ))}
      </div>

      {/* Code language */}
      {mode === 'code' && (
        <div className="tele-block">
          <div className="tele-block-label">Language</div>
          <div className="chip-row">
            {LANGUAGES.map(l => (
              <button key={l} className={`chip ${codeLanguage === l ? 'on' : ''}`} onClick={() => setCodeLanguage(l)}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {/* Image controls */}
      {mode === 'image' && (
        <>
          <div className="tele-block">
            <div className="tele-block-label">Model</div>
            {IMAGE_MODELS.map(m => (
              <div key={m.id} className={`model-entry ${selectedImageModel === m.id ? 'selected' : ''}`} onClick={() => setSelectedImageModel(m.id)}>
                <span className="mn">{m.label}</span>
                <span className="mb">{m.badge}</span>
              </div>
            ))}
          </div>
          <div className="tele-block">
            <div className="tele-block-label">Size</div>
            <div className="chip-row">
              {SIZES.map(s => (
                <button key={s.label} className={`chip ${imageWidth === s.w && imageHeight === s.h ? 'on' : ''}`} onClick={() => setImageSize(s.w, s.h)}>{s.label}</button>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--ink-faint)', marginTop: '6px' }}>{imageWidth} × {imageHeight} px</div>
          </div>
          <div className="tele-block">
            <div className="tele-block-label">Quality</div>
            <div className="chip-row">
              {QUALITY.map(q => (
                <button key={q.label} className={`chip ${imageSteps === q.steps ? 'on' : ''}`} onClick={() => setImageSteps(q.steps)}>{q.label}</button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="tele-block" style={{ marginTop: 'auto' }}>
        <div className="toggle-row" style={{ borderTop: 0 }}>
          <span className="lbl">Auto-Route</span>
          <button className={`tswitch ${autoRoute ? 'on' : ''}`} onClick={() => setAutoRoute(!autoRoute)}><i /></button>
        </div>
      </div>

      {/* Arena Leaderboard */}
      <div className="tele-block">
        <div className="tele-block-label">Arena · Personal Rankings</div>
        {leaderboard.length === 0 ? (
          <div className="lb-empty">Use Blend mode and vote to rank models</div>
        ) : (
          leaderboard.slice(0, 8).map((e, i) => {
            const info = MIXING_MODELS.find(m => m.id === e.model_id)
            return (
              <div key={e.model_id} className="lb-row">
                <span className="lb-rank">#{i + 1}</span>
                <span className="lb-name">{info?.label ?? e.model_id.split('/').pop()}</span>
                <div className="lb-bar-wrap">
                  <div className="lb-bar" style={{ width: `${e.win_rate * 100}%`, background: info?.color ?? 'var(--accent)' }} />
                </div>
                <span className="lb-pct">{(e.win_rate * 100).toFixed(0)}%</span>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}

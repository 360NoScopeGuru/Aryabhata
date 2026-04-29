import { useAppStore, CHAT_MODELS, CODE_MODELS, IMAGE_MODELS, type Mode } from '@/store/appStore'

const THEMES = [
  { id: 'astronomical', label: 'Astro',  accent: '#7ad7ff', bg: '#0a1428' },
  { id: 'void',         label: 'Void',   accent: '#b87fff', bg: '#080810' },
  { id: 'solar',        label: 'Solar',  accent: '#ffb84d', bg: '#130d00' },
  { id: 'matrix',       label: 'Matrix', accent: '#00ff41', bg: '#010c01' },
  { id: 'aurora',       label: 'Aurora', accent: '#48dcc3', bg: '#060f18' },
]

const FONTS = [
  { id: 'system',     label: 'System'  },
  { id: 'instrument', label: 'Mono'    },
  { id: 'modern',     label: 'Inter'   },
  { id: 'technical',  label: 'Plex'    },
  { id: 'space',      label: 'Grotesk' },
]

const SIZES = [
  { label: '1:1',    w: 1024, h: 1024 },
  { label: '1:1 HD', w: 1344, h: 1344 },
  { label: '16:9',   w: 1344, h: 768  },
  { label: '9:16',   w: 768,  h: 1344 },
  { label: '4:3',    w: 1152, h: 896  },
]

const QUALITY = [
  { label: 'Draft',    steps: 20 },
  { label: 'Std',      steps: 35 },
  { label: 'HD',       steps: 50 },
]

const LANGUAGES = ['python', 'javascript', 'typescript', 'rust', 'go', 'java', 'c', 'cpp', 'bash', 'sql', 'html', 'css', 'json']

export default function RightRail() {
  const {
    mode, setMode,
    autoRoute, setAutoRoute,
    selectedChatModel, setSelectedChatModel,
    selectedCodeModel, setSelectedCodeModel,
    selectedImageModel, setSelectedImageModel,
    codeLanguage, setCodeLanguage,
    imageWidth, imageHeight, imageSteps,
    setImageSize, setImageSteps,
    sessionTokens,
    conversations,
    theme, setTheme,
    font, setFont,
  } = useAppStore()

  const activeModes: Mode[] = ['chat', 'code', 'image']
  const models = mode === 'chat' ? CHAT_MODELS : mode === 'code' ? CODE_MODELS : IMAGE_MODELS
  const selectedModel = mode === 'chat' ? selectedChatModel : mode === 'code' ? selectedCodeModel : selectedImageModel
  const setModel = mode === 'chat' ? setSelectedChatModel : mode === 'code' ? setSelectedCodeModel : setSelectedImageModel

  const currentSize = SIZES.find((s) => s.w === imageWidth && s.h === imageHeight) ?? SIZES[0]
  const currentQuality = QUALITY.find((q) => q.steps === imageSteps) ?? QUALITY[1]

  const tokenEstimate = Math.round(sessionTokens * 1.15)

  return (
    <aside className="rail-right">
      {/* Mode selector */}
      <div className="mode-tabs">
        {activeModes.map((m) => (
          <button
            key={m}
            className={`mode-tab ${mode === m ? 'active' : ''}`}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Model */}
      <div className="tele-block">
        <div className="tele-head">
          <h3>Model</h3>
        </div>
        {models.map((m) => (
          <div
            key={m.id}
            className={`model-entry ${selectedModel === m.id ? 'selected' : ''}`}
            onClick={() => setModel(m.id)}
          >
            <span className="mn">{m.label}</span>
            <span className="mb">{m.badge}</span>
          </div>
        ))}
      </div>

      {/* Auto-route */}
      <div className="tele-block">
        <div className="tele-head">
          <h3>Routing</h3>
          {autoRoute && (
            <span className="live-dot">
              <i />
              Live
            </span>
          )}
        </div>
        <div className="toggle-row" style={{ borderTop: 0 }}>
          <span className="lbl">Auto-route mode</span>
          <button
            className={`tswitch ${autoRoute ? 'on' : ''}`}
            onClick={() => setAutoRoute(!autoRoute)}
          >
            <i />
          </button>
        </div>
        {autoRoute && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', color: 'var(--ink-faint)', marginTop: '8px', lineHeight: 1.6 }}>
            Task type detected automatically — switches between chat, code &amp; image.
          </p>
        )}
      </div>

      {/* Code: language */}
      {mode === 'code' && (
        <div className="tele-block">
          <div className="tele-head"><h3>Language</h3></div>
          <div className="chip-row">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                className={`chip ${codeLanguage === l ? 'on' : ''}`}
                onClick={() => setCodeLanguage(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image: size + quality */}
      {mode === 'image' && (
        <>
          <div className="tele-block">
            <div className="tele-head"><h3>Image size</h3></div>
            <div className="chip-row">
              {SIZES.map((s) => (
                <button
                  key={s.label}
                  className={`chip ${currentSize.label === s.label ? 'on' : ''}`}
                  onClick={() => setImageSize(s.w, s.h)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--ink-faint)', marginTop: '8px', letterSpacing: '.1em' }}>
              {imageWidth} × {imageHeight} px
            </div>
          </div>
          <div className="tele-block">
            <div className="tele-head"><h3>Quality</h3></div>
            <div className="chip-row">
              {QUALITY.map((q) => (
                <button
                  key={q.label}
                  className={`chip ${currentQuality.label === q.label ? 'on' : ''}`}
                  onClick={() => setImageSteps(q.steps)}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--ink-faint)', marginTop: '8px', letterSpacing: '.1em' }}>
              {imageSteps} inference steps
            </div>
          </div>
        </>
      )}

      {/* Appearance */}
      <div className="tele-block">
        <div className="tele-head"><h3>Theme</h3></div>
        <div className="swatch-row" style={{ marginBottom: '12px' }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`swatch ${theme === t.id ? 'on' : ''}`}
              title={t.label}
              onClick={() => setTheme(t.id)}
              style={{ background: t.bg, boxShadow: theme === t.id ? `0 0 0 2px ${t.accent}` : 'none' }}
            />
          ))}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '8.5px', letterSpacing: '.18em', color: 'var(--ink-faint)', textTransform: 'uppercase', marginBottom: '10px' }}>
          {THEMES.find((t) => t.id === theme)?.label ?? theme}
        </div>

        <div className="tele-head" style={{ marginTop: '6px' }}><h3>Font</h3></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {FONTS.map((f) => (
            <button
              key={f.id}
              className={`font-chip ${font === f.id ? 'on' : ''}`}
              onClick={() => setFont(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="tele-block" style={{ marginTop: 'auto' }}>
        <div className="tele-head">
          <h3>Session</h3>
        </div>
        <div className="kv-grid">
          <div className="kv">
            <span className="k">Tokens</span>
            <span className="v">{tokenEstimate.toLocaleString()}<small>est</small></span>
          </div>
          <div className="kv">
            <span className="k">Sessions</span>
            <span className="v">{conversations.length}</span>
          </div>
        </div>
        {tokenEstimate > 0 && (
          <div className="spark" style={{ marginTop: '12px' }}>
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} style={{ height: `${Math.max(10, Math.random() * 100)}%` }} />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

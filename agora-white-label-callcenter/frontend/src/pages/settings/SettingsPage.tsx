import { useState, useEffect } from 'react'
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'

const API = 'http://localhost:8000'

interface Settings {
  DATABASE_URL: string
  ANTHROPIC_API_KEY: string
  AGORA_API_KEY: string
  AGORA_PIPELINE_ID: string
  AGORA_PHONE_NUMBER: string
  VOICE_AGENT_BASE_URL: string
  VOICE_AGENT_API_KEY: string
  WEBHOOK_SECRET: string
  POLL_INTERVAL_SECONDS: string
  MAX_CONCURRENT_CALLS: string
}

const DEFAULTS: Settings = {
  DATABASE_URL: 'sqlite+aiosqlite:///./dev.db',
  ANTHROPIC_API_KEY: '',
  AGORA_API_KEY: '',
  AGORA_PIPELINE_ID: '',
  AGORA_PHONE_NUMBER: '',
  VOICE_AGENT_BASE_URL: '',
  VOICE_AGENT_API_KEY: '',
  WEBHOOK_SECRET: '',
  POLL_INTERVAL_SECONDS: '5',
  MAX_CONCURRENT_CALLS: '10',
}

function Field({
  label, desc, value, onChange, placeholder, type = 'text',
}: {
  label: string; desc?: string; value: string
  onChange: (v: string) => void; placeholder?: string
  type?: 'text' | 'password' | 'url' | 'number'
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {desc && <p className="text-xs text-slate-400 mb-1.5">{desc}</p>}
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">{title}</h2>
      {children}
    </div>
  )
}

export function SettingsPage() {
  const [cfg, setCfg] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/api/settings`)
      .then(r => r.json())
      .then(data => setCfg(prev => ({ ...prev, ...data })))
      .catch(() => setError('无法加载配置，请检查后端是否运行'))
      .finally(() => setLoading(false))
  }, [])

  function set(key: keyof Settings) {
    return (v: string) => setCfg(prev => ({ ...prev, [key]: v }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const resp = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      if (!resp.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">加载配置中...</span>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Settings</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-5">

        {/* Agora Call Agent */}
        <Section title="Agora Call Agent API">
          <Field
            label="API Key"
            desc="Authorization header 里的 Base64 编码 Key"
            value={cfg.AGORA_API_KEY}
            onChange={set('AGORA_API_KEY')}
            placeholder="NWFl..."
            type="password"
          />
          <Field
            label="Pipeline ID"
            desc="创建 Campaign 时绑定的 Pipeline"
            value={cfg.AGORA_PIPELINE_ID}
            onChange={set('AGORA_PIPELINE_ID')}
            placeholder="d2936d99..."
          />
          <Field
            label="Phone Number（主叫号码）"
            desc="外呼时使用的主叫电话号码"
            value={cfg.AGORA_PHONE_NUMBER}
            onChange={set('AGORA_PHONE_NUMBER')}
            placeholder="031186778285"
          />
        </Section>

        {/* Claude AI */}
        <Section title="Claude AI（Anthropic）">
          <Field
            label="Anthropic API Key"
            desc="用于 AI 生成问卷脚本和配额建议"
            value={cfg.ANTHROPIC_API_KEY}
            onChange={set('ANTHROPIC_API_KEY')}
            placeholder="sk-ant-..."
            type="password"
          />
        </Section>

        {/* Database */}
        <Section title="数据库">
          <Field
            label="DATABASE_URL"
            desc="SQLAlchemy 异步连接字符串，开发用 SQLite，生产换 PostgreSQL"
            value={cfg.DATABASE_URL}
            onChange={set('DATABASE_URL')}
            placeholder="sqlite+aiosqlite:///./dev.db"
          />
        </Section>

        {/* Voice Agent */}
        <Section title="Voice Agent（语音平台）">
          <Field
            label="Endpoint URL"
            desc="语音平台 REST API 地址"
            value={cfg.VOICE_AGENT_BASE_URL}
            onChange={set('VOICE_AGENT_BASE_URL')}
            placeholder="https://voice-agent.example.com"
            type="url"
          />
          <Field
            label="API Key"
            value={cfg.VOICE_AGENT_API_KEY}
            onChange={set('VOICE_AGENT_API_KEY')}
            placeholder="va_sk_..."
            type="password"
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="最大并发通话数"
              desc="同时外呼的最大路数"
              value={cfg.MAX_CONCURRENT_CALLS}
              onChange={set('MAX_CONCURRENT_CALLS')}
              type="number"
            />
            <Field
              label="轮询间隔（秒）"
              desc="向语音平台查询通话状态的频率"
              value={cfg.POLL_INTERVAL_SECONDS}
              onChange={set('POLL_INTERVAL_SECONDS')}
              type="number"
            />
          </div>
        </Section>

        {/* Webhook */}
        <Section title="Webhook">
          <Field
            label="Webhook Secret"
            desc="HMAC-SHA256 签名密钥，用于结果回调验签"
            value={cfg.WEBHOOK_SECRET}
            onChange={set('WEBHOOK_SECRET')}
            placeholder="whsec_..."
            type="password"
          />
        </Section>

        {/* Save */}
        <div className="flex items-center justify-between pt-1">
          {saved && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle2 size={15} />
              已保存到 .env 文件
            </div>
          )}
          <div className="ml-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

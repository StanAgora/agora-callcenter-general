import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Loader2, PlusCircle, Trash2, Bot, X, Pencil, ChevronDown, ChevronRight, FileText, MessageCircle, AlertCircle,
  Mic, SlidersHorizontal, AudioLines, Sparkles, type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { bcp47ForI18n } from '../../i18n'

const API = 'http://localhost:8000'
const SENSITIVE_PLACEHOLDER = '****'

// ── Types ─────────────────────────────────────────────────────────
export interface Agent {
  id: number
  agent_id: string
  agent_name: string
  app_id: string
  system_content: string | null
  greeting_message: string | null
  failure_message: string | null
  voice_id: string | null
  properties: Record<string, unknown> | null
  created_at: string | null
}

// ── Props form state (maps to properties JSON structure) ──────────
export interface PropsForm {
  // LLM
  llm_system_content: string
  llm_greeting_message: string
  llm_failure_message: string
  llm_model: string
  llm_api_key: string
  llm_max_history: number
  llm_url: string
  // TTS
  tts_vendor: string
  tts_voice_id: string
  tts_model: string
  tts_key: string
  tts_url: string
  tts_language_boost: string
  tts_sample_rate: number
  // ASR
  asr_vendor: string
  asr_language: string
  // Parameters
  idle_timeout: number
  silence_timeout_ms: number
  data_channel: string
  audio_scenario: string
  enable_dump: boolean
  enable_metrics: boolean
  enable_flexible: boolean
  enable_error_message: boolean
  // Turn detection
  interrupt_duration_ms: number
  speaking_interrupt_duration_ms: number
  prefix_padding_ms: number
  silence_duration_ms: number
  max_wait_ms: number
  // Advanced features
  enable_rtm: boolean
  enable_sal: boolean
  enable_tools: boolean
}

export function propsToForm(props: Record<string, unknown>): PropsForm {
  const llm = (props.llm as Record<string, unknown>) ?? {}
  const sysMsgs = (llm.system_messages as Array<Record<string, unknown>>) ?? []
  const systemContent = sysMsgs.find(m => m.role === 'system')?.content as string ?? ''
  const llmParams = (llm.params as Record<string, unknown>) ?? {}

  const tts = (props.tts as Record<string, unknown>) ?? {}
  const ttsParams = (tts.params as Record<string, unknown>) ?? {}
  const voiceSetting = (ttsParams.voice_setting as Record<string, unknown>) ?? {}

  const asr = (props.asr as Record<string, unknown>) ?? {}

  const parameters = (props.parameters as Record<string, unknown>) ?? {}
  const silenceCfg = (parameters.silence_config as Record<string, unknown>) ?? {}

  const turnDet = (props.turn_detection as Record<string, unknown>) ?? {}
  const tdConfig = (turnDet.config as Record<string, unknown>) ?? {}
  const startSpeech = (tdConfig.start_of_speech as Record<string, unknown>) ?? {}
  const vadConfig = (startSpeech.vad_config as Record<string, unknown>) ?? {}
  const endSpeech = (tdConfig.end_of_speech as Record<string, unknown>) ?? {}
  const semConfig = (endSpeech.semantic_config as Record<string, unknown>) ?? {}

  const adv = (props.advanced_features as Record<string, unknown>) ?? {}

  return {
    llm_system_content: systemContent,
    llm_greeting_message: llm.greeting_message as string ?? '',
    llm_failure_message: llm.failure_message as string ?? '',
    llm_model: llmParams.model as string ?? 'gpt-5.4-nano',
    llm_api_key: llm.api_key as string ?? SENSITIVE_PLACEHOLDER,
    llm_max_history: llm.max_history as number ?? 32,
    llm_url: llm.url as string ?? '',
    tts_vendor: tts.vendor as string ?? 'minimax',
    tts_voice_id: voiceSetting.voice_id as string ?? '',
    tts_model: ttsParams.model as string ?? '',
    tts_key: ttsParams.key as string ?? SENSITIVE_PLACEHOLDER,
    tts_url: ttsParams.url as string ?? '',
    tts_language_boost: ttsParams.language_boost as string ?? 'Chinese',
    tts_sample_rate: voiceSetting.sample_rate as number ?? 8000,
    asr_vendor: asr.vendor as string ?? 'ares',
    asr_language: asr.language as string ?? 'zh-CN',
    idle_timeout: props.idle_timeout as number ?? 120,
    silence_timeout_ms: silenceCfg.timeout_ms as number ?? 4000,
    data_channel: parameters.data_channel as string ?? 'rtm',
    audio_scenario: parameters.audio_scenario as string ?? 'default',
    enable_dump: parameters.enable_dump as boolean ?? true,
    enable_metrics: parameters.enable_metrics as boolean ?? true,
    enable_flexible: parameters.enable_flexible as boolean ?? true,
    enable_error_message: parameters.enable_error_message as boolean ?? true,
    interrupt_duration_ms: vadConfig.interrupt_duration_ms as number ?? 160,
    speaking_interrupt_duration_ms: vadConfig.speaking_interrupt_duration_ms as number ?? 160,
    prefix_padding_ms: vadConfig.prefix_padding_ms as number ?? 800,
    silence_duration_ms: semConfig.silence_duration_ms as number ?? 240,
    max_wait_ms: semConfig.max_wait_ms as number ?? 3000,
    enable_rtm: adv.enable_rtm as boolean ?? true,
    enable_sal: adv.enable_sal as boolean ?? false,
    enable_tools: adv.enable_tools as boolean ?? true,
  }
}

export function formToProps(f: PropsForm, original: Record<string, unknown>): Record<string, unknown> {
  // Deep clone original as base to preserve any unlisted fields
  const base = JSON.parse(JSON.stringify(original)) as Record<string, unknown>

  const llm = (base.llm as Record<string, unknown>) ?? {}
  const sysMsgs = (llm.system_messages as Array<Record<string, unknown>>) ?? []
  const sysIdx = sysMsgs.findIndex(m => m.role === 'system')
  if (sysIdx >= 0) sysMsgs[sysIdx].content = f.llm_system_content
  else sysMsgs.push({ role: 'system', content: f.llm_system_content })
  llm.system_messages = sysMsgs
  llm.greeting_message = f.llm_greeting_message
  llm.failure_message = f.llm_failure_message
  llm.url = f.llm_url
  llm.api_key = f.llm_api_key
  llm.max_history = f.llm_max_history
  ;(llm.params as Record<string, unknown>).model = f.llm_model
  base.llm = llm

  const tts = (base.tts as Record<string, unknown>) ?? {}
  tts.vendor = f.tts_vendor
  const ttsParams = (tts.params as Record<string, unknown>) ?? {}
  ttsParams.key = f.tts_key
  ttsParams.url = f.tts_url
  ttsParams.model = f.tts_model
  ttsParams.language_boost = f.tts_language_boost
  const vs = (ttsParams.voice_setting as Record<string, unknown>) ?? {}
  vs.voice_id = f.tts_voice_id
  vs.sample_rate = f.tts_sample_rate
  ttsParams.voice_setting = vs
  tts.params = ttsParams
  base.tts = tts

  base.asr = { vendor: f.asr_vendor, language: f.asr_language }
  base.idle_timeout = f.idle_timeout

  const parameters = (base.parameters as Record<string, unknown>) ?? {}
  parameters.data_channel = f.data_channel
  parameters.audio_scenario = f.audio_scenario
  parameters.enable_dump = f.enable_dump
  parameters.enable_metrics = f.enable_metrics
  parameters.enable_flexible = f.enable_flexible
  parameters.enable_error_message = f.enable_error_message
  const silenceCfg = (parameters.silence_config as Record<string, unknown>) ?? {}
  silenceCfg.timeout_ms = f.silence_timeout_ms
  parameters.silence_config = silenceCfg
  base.parameters = parameters

  const td = (base.turn_detection as Record<string, unknown>) ?? {}
  const tdCfg = (td.config as Record<string, unknown>) ?? {}
  const startSpeech = (tdCfg.start_of_speech as Record<string, unknown>) ?? {}
  const vadCfg = (startSpeech.vad_config as Record<string, unknown>) ?? {}
  vadCfg.interrupt_duration_ms = f.interrupt_duration_ms
  vadCfg.speaking_interrupt_duration_ms = f.speaking_interrupt_duration_ms
  vadCfg.prefix_padding_ms = f.prefix_padding_ms
  startSpeech.vad_config = vadCfg
  tdCfg.start_of_speech = startSpeech
  const endSpeech = (tdCfg.end_of_speech as Record<string, unknown>) ?? {}
  const semCfg = (endSpeech.semantic_config as Record<string, unknown>) ?? {}
  semCfg.silence_duration_ms = f.silence_duration_ms
  semCfg.max_wait_ms = f.max_wait_ms
  endSpeech.semantic_config = semCfg
  tdCfg.end_of_speech = endSpeech
  td.config = tdCfg
  base.turn_detection = td

  base.advanced_features = { enable_rtm: f.enable_rtm, enable_sal: f.enable_sal, enable_tools: f.enable_tools }

  return base
}

// ── UI primitives ─────────────────────────────────────────────────
function Modal({ title, onClose, children, wide = false }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className={cn('bg-white rounded-2xl shadow-xl flex flex-col max-h-[92vh]', wide ? 'w-full max-w-3xl' : 'w-full max-w-lg')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SectionHeader({ color, title, open, toggle }: {
  color: string; title: string; open: boolean; toggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn('w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors', color)}
    >
      {title}
      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
    </button>
  )
}

function SettingsSectionCard({
  title,
  description,
  open,
  onToggle,
  icon: Icon,
  accentBar,
  iconWrap,
  children,
}: {
  title: string
  description: string
  open: boolean
  onToggle: () => void
  icon: LucideIcon
  accentBar: string
  iconWrap: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden',
        'border-l-4',
        accentBar,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3.5 py-3.5 text-left transition-colors hover:bg-gray-50"
      >
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconWrap)}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900 leading-tight">
            {title}
          </div>
          <div className="text-xs text-gray-500 mt-1 leading-snug">
            {description}
          </div>
        </div>
        {open ? (
          <ChevronDown className="shrink-0 text-gray-400" size={18} />
        ) : (
          <ChevronRight className="shrink-0 text-gray-400" size={18} />
        )}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 border-t border-gray-100">
          <div className="pt-3">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, sensitive, children }: { label: string; sensitive?: boolean; children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
        {label}
        {sensitive && (
          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">
            {t('common.sensitive')}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function LlmPromptBlock({
  kind,
  value,
  onChange,
  rows,
  showRequired,
  placeholder: placeholderProp,
}: {
  kind: 'system' | 'greeting' | 'failure'
  value: string
  onChange: (v: string) => void
  rows: number
  showRequired?: boolean
  placeholder?: string
}) {
  const { t } = useTranslation()
  const isSystem = kind === 'system'
  const isGreeting = kind === 'greeting'
  const isFailure = kind === 'failure'
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border shadow-sm transition-shadow focus-within:shadow-md',
        isSystem
          ? 'border-indigo-200 bg-white focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/15'
          : isGreeting
            ? 'border-emerald-200 bg-white focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/15'
            : 'border-red-200 bg-white focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-500/15',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b px-3 py-2',
          isSystem
            ? 'border-indigo-100 bg-indigo-50'
            : isGreeting
              ? 'border-emerald-100 bg-emerald-50'
              : 'border-red-100 bg-red-50',
        )}
      >
        {isSystem ? (
          <FileText className="h-4 w-4 flex-shrink-0 text-indigo-600" />
        ) : isGreeting ? (
          <MessageCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
        )}
        <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-gray-800">
          {isSystem ? 'System Prompt' : isGreeting ? 'Greeting Message' : 'Failure Message'}
          {showRequired && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
          <span className="ml-2 font-normal text-[10px] text-gray-500">
            {isSystem
              ? `· ${t('agents.llm_h_system')}`
              : isGreeting
                ? `· ${t('agents.llm_h_greeting')}`
                : `· ${t('agents.llm_h_failure')}`}
          </span>
        </p>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className={cn(
          'w-full resize-y border-0 bg-transparent px-3 py-2 text-sm leading-relaxed text-gray-800 placeholder:text-gray-300 focus:ring-0',
          isSystem ? 'font-mono' : 'font-sans',
        )}
        placeholder={
          placeholderProp
            ? placeholderProp
            : (isSystem
              ? 'You are a helpful assistant...'
              : isGreeting
                ? t('agents.ph_greeting')
                : t('agents.ph_failure')
            )
        }
      />
    </div>
  )
}

function TextInput({ value, onChange, placeholder, mono }: {
  value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn('w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white', mono && 'font-mono')}
    />
  )
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
    />
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', value ? 'bg-indigo-600' : 'bg-gray-200')}
      >
        <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform', value ? 'translate-x-4' : 'translate-x-1')} />
      </button>
    </label>
  )
}

function SecretInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  const [replaceMode, setReplaceMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingUncommitted, setEditingUncommitted] = useState(false)
  const fromPlaceholderRef = useRef('')

  const isUnset = !value || value === SENSITIVE_PLACEHOLDER

  const maskDisplay = (v: string) => {
    if (v.length > 15) {
      return `${v.slice(0, 15)}...`
    }
    return '•'.repeat(v.length)
  }

  const displayWhileEditing = (value && value !== SENSITIVE_PLACEHOLDER)
    ? value
    : fromPlaceholderRef.current

  const handleValueChange = (next: string) => {
    if (next === '') {
      fromPlaceholderRef.current = ''
      onChange(SENSITIVE_PLACEHOLDER)
      setEditingUncommitted(false)
      return
    }
    if (isUnset && next !== SENSITIVE_PLACEHOLDER) {
      fromPlaceholderRef.current = next
      flushSync(() => {
        setEditingUncommitted(true)
      })
    }
    onChange(next)
  }

  if (replaceMode) {
    return (
      <input
        type="password"
        autoFocus
        autoComplete="off"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          onChange(draft || SENSITIVE_PLACEHOLDER)
          setReplaceMode(false)
          setDraft('')
          fromPlaceholderRef.current = ''
          setEditingUncommitted(false)
        }}
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        placeholder={t('common.secret_new_ph')}
      />
    )
  }

  if (editingUncommitted) {
    return (
      <input
        type="password"
        autoComplete="off"
        value={displayWhileEditing}
        onChange={e => {
          fromPlaceholderRef.current = e.target.value
          onChange(e.target.value)
        }}
        onBlur={() => {
          fromPlaceholderRef.current = ''
          setEditingUncommitted(false)
        }}
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
      />
    )
  }

  if (!isUnset) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={maskDisplay(value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono bg-gray-50 text-gray-500 cursor-not-allowed"
        />
        <button
          type="button"
          onClick={() => {
            setDraft('')
            setReplaceMode(true)
          }}
          className="shrink-0 text-xs text-indigo-600 hover:underline"
        >
          {t('common.replace')}
        </button>
      </div>
    )
  }

  return (
    <input
      type="text"
      autoComplete="off"
      value={value || SENSITIVE_PLACEHOLDER}
      onChange={e => handleValueChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
      placeholder={t('common.secret_keep_ph')}
    />
  )
}

// ── Properties GUI form ───────────────────────────────────────────
export function PropsEditor({ form, onChange }: {
  form: PropsForm
  onChange: (patch: Partial<PropsForm>) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState({ llm: true, tts: true, asr: false, params: false, turn: false, adv: false })
  const toggle = (k: keyof typeof open) => setOpen(o => ({ ...o, [k]: !o[k] }))

  return (
    <div className="space-y-3">
      {/* ── LLM ── */}
      <div>
        <SectionHeader color="bg-indigo-50 text-indigo-700 hover:bg-indigo-100" title="LLM" open={open.llm} toggle={() => toggle('llm')} />
        {open.llm && (
          <div className="mt-2 space-y-2.5 pl-1">
            <LlmPromptBlock
              kind="system"
              value={form.llm_system_content}
              onChange={v => onChange({ llm_system_content: v })}
              rows={20}
            />
            <LlmPromptBlock
              kind="greeting"
              value={form.llm_greeting_message}
              onChange={v => onChange({ llm_greeting_message: v })}
              rows={5}
            />
            <LlmPromptBlock
              kind="failure"
              value={form.llm_failure_message}
              onChange={v => onChange({ llm_failure_message: v })}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Model">
                <TextInput value={form.llm_model} onChange={v => onChange({ llm_model: v })} placeholder="gpt-5.4-nano" mono />
              </Field>
              <Field label="Max History">
                <NumberInput value={form.llm_max_history} onChange={v => onChange({ llm_max_history: v })} />
              </Field>
            </div>
            <Field label="LLM URL">
              <TextInput value={form.llm_url} onChange={v => onChange({ llm_url: v })} mono />
            </Field>
            <Field label="API Key" sensitive>
              <SecretInput value={form.llm_api_key} onChange={v => onChange({ llm_api_key: v })} />
            </Field>
          </div>
        )}
      </div>

      {/* ── TTS ── */}
      <div>
        <SectionHeader color="bg-gray-50 text-gray-700 hover:bg-gray-100" title="TTS" open={open.tts} toggle={() => toggle('tts')} />
        {open.tts && (
          <div className="mt-2 space-y-3 pl-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vendor">
                <TextInput value={form.tts_vendor} onChange={v => onChange({ tts_vendor: v })} />
              </Field>
              <Field label="Voice ID">
                <TextInput value={form.tts_voice_id} onChange={v => onChange({ tts_voice_id: v })} placeholder="ai_assistant_008" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Model">
                <TextInput value={form.tts_model} onChange={v => onChange({ tts_model: v })} mono />
              </Field>
              <Field label="Sample Rate (Hz)">
                <NumberInput value={form.tts_sample_rate} onChange={v => onChange({ tts_sample_rate: v })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Language Boost">
                <TextInput value={form.tts_language_boost} onChange={v => onChange({ tts_language_boost: v })} />
              </Field>
            </div>
            <Field label="TTS WebSocket URL">
              <TextInput value={form.tts_url} onChange={v => onChange({ tts_url: v })} mono />
            </Field>
            <Field label="TTS Key" sensitive>
              <SecretInput value={form.tts_key} onChange={v => onChange({ tts_key: v })} />
            </Field>
          </div>
        )}
      </div>

      <SettingsSectionCard
        title="ASR"
        description={t('agents.asr_desc')}
        open={open.asr}
        onToggle={() => toggle('asr')}
        icon={Mic}
        accentBar="border-l-emerald-500"
        iconWrap="bg-emerald-50 text-emerald-700"
      >
        <div className="grid grid-cols-2 gap-3 pl-0.5">
          <Field label="Vendor">
            <TextInput value={form.asr_vendor} onChange={v => onChange({ asr_vendor: v })} />
          </Field>
          <Field label="Language">
            <TextInput value={form.asr_language} onChange={v => onChange({ asr_language: v })} placeholder="zh-CN" />
          </Field>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Parameters"
        description={t('agents.params_desc')}
        open={open.params}
        onToggle={() => toggle('params')}
        icon={SlidersHorizontal}
        accentBar="border-l-amber-500"
        iconWrap="bg-amber-50 text-amber-700"
      >
        <div className="space-y-3 pl-0.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Idle Timeout (s)">
              <NumberInput value={form.idle_timeout} onChange={v => onChange({ idle_timeout: v })} />
            </Field>
            <Field label="Silence Timeout (ms)">
              <NumberInput value={form.silence_timeout_ms} onChange={v => onChange({ silence_timeout_ms: v })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data Channel">
              <TextInput value={form.data_channel} onChange={v => onChange({ data_channel: v })} />
            </Field>
            <Field label="Audio Scenario">
              <TextInput value={form.audio_scenario} onChange={v => onChange({ audio_scenario: v })} />
            </Field>
          </div>
          <div className="border border-gray-100 rounded-lg px-3 py-1.5 space-y-0.5 bg-gray-50">
            <Toggle label="Enable Dump" value={form.enable_dump} onChange={v => onChange({ enable_dump: v })} />
            <Toggle label="Enable Metrics" value={form.enable_metrics} onChange={v => onChange({ enable_metrics: v })} />
            <Toggle label="Enable Flexible" value={form.enable_flexible} onChange={v => onChange({ enable_flexible: v })} />
            <Toggle
              label="Enable Error Message"
              value={form.enable_error_message}
              onChange={v => onChange({ enable_error_message: v })}
            />
          </div>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Turn Detection"
        description={t('agents.turn_desc')}
        open={open.turn}
        onToggle={() => toggle('turn')}
        icon={AudioLines}
        accentBar="border-l-blue-500"
        iconWrap="bg-blue-50 text-blue-700"
      >
        <div className="space-y-3 pl-0.5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Start of Speech (VAD)</p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Interrupt (ms)">
              <NumberInput value={form.interrupt_duration_ms} onChange={v => onChange({ interrupt_duration_ms: v })} />
            </Field>
            <Field label="Speaking Interrupt (ms)">
              <NumberInput
                value={form.speaking_interrupt_duration_ms}
                onChange={v => onChange({ speaking_interrupt_duration_ms: v })}
              />
            </Field>
            <Field label="Prefix Padding (ms)">
              <NumberInput value={form.prefix_padding_ms} onChange={v => onChange({ prefix_padding_ms: v })} />
            </Field>
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">End of Speech (Semantic)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Silence Duration (ms)">
              <NumberInput value={form.silence_duration_ms} onChange={v => onChange({ silence_duration_ms: v })} />
            </Field>
            <Field label="Max Wait (ms)">
              <NumberInput value={form.max_wait_ms} onChange={v => onChange({ max_wait_ms: v })} />
            </Field>
          </div>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Advanced Features"
        description={t('agents.adv_desc')}
        open={open.adv}
        onToggle={() => toggle('adv')}
        icon={Sparkles}
        accentBar="border-l-gray-400"
        iconWrap="bg-gray-100 text-gray-600"
      >
        <div className="border border-gray-100 rounded-lg px-3 py-1.5 space-y-0.5 bg-gray-50">
          <Toggle label="Enable RTM" value={form.enable_rtm} onChange={v => onChange({ enable_rtm: v })} />
          <Toggle label="Enable SAL" value={form.enable_sal} onChange={v => onChange({ enable_sal: v })} />
          <Toggle label="Enable Tools" value={form.enable_tools} onChange={v => onChange({ enable_tools: v })} />
        </div>
      </SettingsSectionCard>
    </div>
  )
}

// ── Create form defaults ──────────────────────────────────────────
const defaultCreateForm = { agent_name: '', system_content: '', greeting_message: '', failure_message: '', voice_id: '' }

// ── Main page ─────────────────────────────────────────────────────
export function AgentsPage() {
  const { t, i18n } = useTranslation()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ ...defaultCreateForm })
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')

  const [textModal, setTextModal] = useState<{ title: string; content: string } | null>(null)

  const [propsModal, setPropsModal] = useState<{
    agent: Agent
    original: Record<string, unknown>
    form: PropsForm
  } | null>(null)
  const [propsError, setPropsError] = useState('')
  const [updating, setUpdating] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadAgents() {
    try {
      const dbData = await fetch(`${API}/api/agents`).then(r => r.json())
      setAgents(dbData)
      setLoading(false)
      const synced = await fetch(`${API}/api/agents/sync`, { method: 'POST' }).then(r => r.json())
      setAgents(synced)
    } catch {
      setError(t('agents.server_error'))
      setLoading(false)
    }
  }

  useEffect(() => { loadAgents() }, [])

  // ── Create ──────────────────────────────────────────────────────
  function resetCreate() { setShowCreate(false); setCreateForm({ ...defaultCreateForm }); setCreateError('') }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    if (!createForm.agent_name.trim() || !createForm.system_content.trim() || !createForm.greeting_message.trim()) {
      setCreateError(t('agents.create_error_required'))
      return
    }
    setSubmitting(true)
    try {
      const resp = await fetch(`${API}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: createForm.agent_name.trim(),
          system_content: createForm.system_content.trim(),
          greeting_message: createForm.greeting_message.trim(),
          failure_message: createForm.failure_message.trim(),
          voice_id: createForm.voice_id.trim() || 'ai_assistant_008',
        }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }))
        throw new Error(err.detail || 'Request failed')
      }
      const newAgent = await resp.json()
      setAgents(prev => [newAgent, ...prev])
      resetCreate()
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────
  async function handleDelete(agentId: string) {
    if (!confirm(t('agents.delete_confirm'))) return
    setDeletingId(agentId)
    try {
      const resp = await fetch(`${API}/api/agents/${agentId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error()
      setAgents(prev => prev.filter(a => a.agent_id !== agentId))
    } catch {
      alert(t('common.delete_failed'))
    } finally {
      setDeletingId(null)
    }
  }

  // ── Open properties modal ────────────────────────────────────────
  function openPropsModal(agent: Agent) {
    setPropsError('')
    const original = agent.properties ?? {}
    setPropsModal({ agent, original, form: propsToForm(original) })
  }

  // ── Update properties ────────────────────────────────────────────
  async function handleUpdate() {
    if (!propsModal) return
    setPropsError('')
    const rebuilt = formToProps(propsModal.form, propsModal.original)
    setUpdating(true)
    try {
      const resp = await fetch(`${API}/api/agents/${propsModal.agent.agent_id}/properties`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rebuilt),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }))
        throw new Error(err.detail || 'Request failed')
      }
      const updated = await resp.json()
      setAgents(prev => prev.map(a => a.agent_id === updated.agent_id ? updated : a))
      setPropsModal(null)
    } catch (err: unknown) {
      setPropsError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setUpdating(false)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────
  function getLlmModel(agent: Agent): string | null {
    try {
      const llm = agent.properties?.llm as Record<string, unknown> | undefined
      const params = llm?.params as Record<string, unknown> | undefined
      return (params?.model as string) || null
    } catch { return null }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(bcp47ForI18n(i18n.language), {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  }

  function TextCell({ label, content, kind }: { label: string; content: string | null; kind: 'system' | 'greeting' }) {
    if (!content) {
      return <span className="text-gray-300 text-xs">—</span>
    }
    const isSystem = kind === 'system'
    return (
      <button
        type="button"
        onClick={() => setTextModal({ title: label, content })}
        className="group w-full max-w-[min(300px,100%)] text-left"
        title={t('common.view_full')}
      >
        <div
          className={cn(
            'flex items-start gap-1.5 rounded-md border py-0.5 pl-1 pr-1.5 transition-colors',
            isSystem
              ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
              : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
          )}
        >
          <span
            className={cn(
              'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center self-start rounded',
              isSystem ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600',
            )}
          >
            {isSystem ? <FileText className="h-2.5 w-2.5" /> : <MessageCircle className="h-2.5 w-2.5" />}
          </span>
          <p
            className={cn(
              'line-clamp-2 min-h-0 min-w-0 max-w-full flex-1 text-[11px] leading-snug text-gray-600',
              isSystem && 'font-mono',
            )}
          >
            {content}
          </p>
        </div>
      </button>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('agents.page_subtitle')}</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError('') }}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <PlusCircle size={16} />
          Create Agent
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">{t('agents.loading')}</span>
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        agents.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-400 shadow-sm">
            <Bot size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('agents.empty')}</p>
            <p className="text-xs mt-1">{t('agents.empty_hint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            {agents.map(a => (
              <div
                key={a.agent_id}
                className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
              >
                {/* Top accent */}
                <div className="h-0.5 bg-indigo-500" />

                {/* Header */}
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Bot size={16} className="text-indigo-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">{a.agent_name}</h3>
                    </div>
                    {getLlmModel(a) && (
                      <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                        {getLlmModel(a)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5">{a.agent_id}</p>
                </div>

                {/* Prompt previews — Greeting first, then System Prompt */}
                <div className="px-5 pb-4 space-y-2 flex-1">
                  {a.greeting_message ? (
                    <button
                      type="button"
                      onClick={() => setTextModal({ title: 'Greeting Message', content: a.greeting_message! })}
                      className="w-full text-left group"
                    >
                      <div className="flex items-start gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2 hover:bg-emerald-100 transition-colors">
                        <MessageCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-gray-600 line-clamp-2 leading-snug">{a.greeting_message}</p>
                      </div>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2">
                      <MessageCircle size={12} className="text-gray-300 flex-shrink-0" />
                      <p className="text-[11px] text-gray-300">No greeting message</p>
                    </div>
                  )}

                  {a.system_content ? (
                    <button
                      type="button"
                      onClick={() => setTextModal({ title: 'System Prompt', content: a.system_content! })}
                      className="w-full text-left group"
                    >
                      <div className="flex items-start gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-2 hover:bg-indigo-100 transition-colors">
                        <FileText size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] font-mono text-gray-600 line-clamp-2 leading-snug">{a.system_content}</p>
                      </div>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2">
                      <FileText size={12} className="text-gray-300 flex-shrink-0" />
                      <p className="text-[11px] text-gray-300">No system prompt</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-3">
                  <p className="text-[11px] text-gray-400">{formatDate(a.created_at)}</p>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-100 grid grid-cols-2">
                  <button
                    onClick={() => openPropsModal(a)}
                    className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-r border-gray-100"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a.agent_id)}
                    disabled={deletingId === a.agent_id}
                    className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                  >
                    {deletingId === a.agent_id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Text viewer modal ──────────────────────────────────── */}
      {textModal && (
        <Modal title={textModal.title} onClose={() => setTextModal(null)}>
          <div className="px-6 py-5 overflow-y-auto">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 font-sans">
                {textModal.content}
              </pre>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Properties GUI modal ───────────────────────────────── */}
      {propsModal && (
        <Modal title={`Edit Properties — ${propsModal.agent.agent_name}`} onClose={() => setPropsModal(null)} wide>
          <div className="px-6 pt-3 pb-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-medium mr-1">
                {t('common.sensitive')}
              </span>
              {t('agents.props_sensitive_hint')}
            </p>
            <button
              onClick={handleUpdate}
              disabled={updating}
              className={cn('flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors',
                updating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700')}
            >
              {updating && <Loader2 size={14} className="animate-spin" />}
              {updating ? 'Updating...' : 'UPDATE'}
            </button>
          </div>
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {propsError && (
              <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{propsError}</p>
            )}
            <PropsEditor
              form={propsModal.form}
              onChange={patch => setPropsModal(m => m ? { ...m, form: { ...m.form, ...patch } } : null)}
            />
          </div>
        </Modal>
      )}

      {/* ── Create Agent modal ─────────────────────────────────── */}
      {showCreate && (
        <Modal title="Create Agent" onClose={resetCreate}>
          <form onSubmit={handleCreate} className="space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Agent Name <span className="text-red-500">*</span></label>
              <input type="text" value={createForm.agent_name} onChange={e => setCreateForm(f => ({ ...f, agent_name: e.target.value }))}
                placeholder="stantest2" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
            </div>
            <LlmPromptBlock
              kind="system"
              value={createForm.system_content}
              onChange={v => setCreateForm(f => ({ ...f, system_content: v }))}
              rows={20}
              showRequired
            />
            <LlmPromptBlock
              kind="greeting"
              value={createForm.greeting_message}
              onChange={v => setCreateForm(f => ({ ...f, greeting_message: v }))}
              rows={5}
              showRequired
            />
            <LlmPromptBlock
              kind="failure"
              value={createForm.failure_message}
              onChange={v => setCreateForm(f => ({ ...f, failure_message: v }))}
              rows={2}
              placeholder={t('agents.ph_failure')}
            />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Voice ID{' '}
                <span className="text-gray-400 font-normal ml-1">(ai_assistant_008)</span>
              </label>
              <input type="text" value={createForm.voice_id} onChange={e => setCreateForm(f => ({ ...f, voice_id: e.target.value }))}
                placeholder="ai_assistant_008" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
            </div>
            {createError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{createError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={resetCreate} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors', submitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700')}>
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

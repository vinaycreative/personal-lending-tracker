'use client'

import { useState } from "react"
import {
  Bell,
  CalendarClock,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Globe2,
  LifeBuoy,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react"

type ToggleSetting = {
  id: string
  label: string
  description: string
  defaultOn?: boolean
}

const preferenceSettings: ToggleSetting[] = [
  {
    id: "daily-digest",
    label: "Daily interest digest",
    description: "Morning summary at 8:00 AM with totals to collect.",
    defaultOn: true,
  },
  {
    id: "weekly-report",
    label: "Weekly PDF report",
    description: "Email-ready snapshot every Monday with key metrics.",
    defaultOn: true,
  },
  {
    id: "auto-lock",
    label: "Auto-lock after 5 minutes",
    description: "Protects the app if you step away from your phone.",
    defaultOn: true,
  },
  {
    id: "borrower-notes",
    label: "Show borrower quick notes",
    description: "Surface borrower notes on lists for faster context.",
    defaultOn: true,
  },
]

const notificationSettings: ToggleSetting[] = [
  {
    id: "payment-reminders",
    label: "Borrower payment reminders",
    description: "Send a polite reminder 2 days before monthly interest.",
    defaultOn: true,
  },
  {
    id: "overdue-alerts",
    label: "Overdue alerts",
    description: "Immediate notification the moment a due date is missed.",
    defaultOn: true,
  },
  {
    id: "mark-paid-confirmation",
    label: "Confirm before marking paid",
    description: "Ask for confirmation to avoid accidental updates.",
    defaultOn: true,
  },
  {
    id: "device-notifications",
    label: "Allow notifications on this device",
    description: "Keep push and SMS alerts active on your phone.",
    defaultOn: true,
  },
]

const reminderSettings: ToggleSetting[] = [
  {
    id: "call-followups",
    label: "Call follow-ups",
    description: "Set call reminders for overdue borrowers you want to nudge.",
    defaultOn: true,
  },
  {
    id: "backup-reminders",
    label: "Monthly backup reminder",
    description: "Prompt to export your ledger at the end of each month.",
    defaultOn: false,
  },
  {
    id: "maturity-prompts",
    label: "Loan maturity prompts",
    description: "Notify 15 days before principal end date.",
    defaultOn: true,
  },
]

const initialToggleState: Record<string, boolean> = [...preferenceSettings, ...notificationSettings, ...reminderSettings].reduce(
  (acc, setting) => {
    acc[setting.id] = setting.defaultOn ?? true
    return acc
  },
  {} as Record<string, boolean>
)

function ToggleRow({
  setting,
  isOn,
  onToggle,
}: {
  setting: ToggleSetting
  isOn: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-900">{setting.label}</p>
        <p className="text-xs text-zinc-600">{setting.description}</p>
      </div>
      <button
        type="button"
        onClick={() => onToggle(setting.id)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          isOn ? "bg-brand-600" : "bg-zinc-200"
        }`}
        aria-pressed={isOn}
        aria-label={setting.label}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
            isOn ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(initialToggleState)

  const handleToggle = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <main className="relative w-full overflow-auto px-4 pb-32 pt-6 space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">Settings</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Fine-tune your lending workspace</h1>
        <p className="text-sm text-zinc-600">
          Control reminders, data safety, and the way the app looks on your phone.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
                Owner profile
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <ShieldCheck className="h-4 w-4" /> Verified
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-800 shadow-inner ring-1 ring-brand-200">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-900">Your lending account</p>
                <p className="text-xs text-zinc-600">Keep contact info and device trusted.</p>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100">
            Edit profile
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Smartphone className="h-4 w-4 text-brand-700" />
              Trusted device
            </div>
            <p className="text-xs text-zinc-600">iPhone • Last active 2 mins ago</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Globe2 className="h-4 w-4 text-brand-700" />
              Timezone
            </div>
            <p className="text-xs text-zinc-600">Asia/Kolkata (IST)</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <CalendarClock className="h-4 w-4 text-brand-700" />
              Reminder window
            </div>
            <p className="text-xs text-zinc-600">Notify borrowers 2 days before due</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <MessageSquare className="h-4 w-4 text-brand-700" />
              Primary contact
            </div>
            <p className="text-xs text-zinc-600">+91 • WhatsApp enabled</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Preferences</p>
            <p className="text-sm text-zinc-600">Daily summaries and how information shows up.</p>
          </div>
          <Bell className="h-5 w-5 text-brand-700" />
        </div>
        <div className="grid gap-3">
          {preferenceSettings.map((setting) => (
            <ToggleRow
              key={setting.id}
              setting={setting}
              isOn={toggles[setting.id]}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Notifications</p>
              <p className="text-sm text-zinc-600">Control alerts sent to you and borrowers.</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-brand-700" />
          </div>
          <div className="grid gap-3">
            {notificationSettings.map((setting) => (
              <ToggleRow
                key={setting.id}
                setting={setting}
                isOn={toggles[setting.id]}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Reminders</p>
              <p className="text-sm text-zinc-600">Gentle nudges for you to stay on top.</p>
            </div>
            <CalendarClock className="h-5 w-5 text-brand-700" />
          </div>
          <div className="grid gap-3">
            {reminderSettings.map((setting) => (
              <ToggleRow
                key={setting.id}
                setting={setting}
                isOn={toggles[setting.id]}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Data & safety</p>
              <p className="text-sm text-zinc-600">Export snapshots and keep backups handy.</p>
            </div>
            <Database className="h-5 w-5 text-brand-700" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 px-4 py-3">
              <p className="text-sm font-semibold text-brand-900">Last backup</p>
              <p className="text-xs text-brand-800">Synced 2 days ago • 12.4 MB</p>
              <button className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700">
                <Database className="h-4 w-4" />
                Backup now
              </button>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-900">Export ledger</p>
              <p className="text-xs text-zinc-600">Download CSV/PDF for accountants or auditors.</p>
              <div className="mt-3 flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export CSV
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50">
                  <Database className="h-4 w-4" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Help</p>
              <p className="text-sm text-zinc-600">Get answers or speak with us.</p>
            </div>
            <LifeBuoy className="h-5 w-5 text-brand-700" />
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-900">Support chat</p>
              <p className="text-xs text-zinc-600">We respond within 15 minutes during business hours.</p>
              <button className="mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800">
                <MessageSquare className="h-4 w-4" />
                Start a chat
              </button>
            </div>
            <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 px-4 py-3">
              <p className="text-sm font-semibold text-brand-900">Need a custom export?</p>
              <p className="text-xs text-brand-800">Share your requirement and we will prepare it.</p>
              <button className="mt-3 inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-800 shadow-sm transition hover:bg-brand-50">
                <ChevronRight className="h-4 w-4" />
                Request support
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

import { useEffect, useState } from 'react'
import {
  Archive,
  CalendarDays,
  Home,
  Plus,
  Settings,
  StickyNote,
  Wallet,
} from 'lucide-react'
import { AddChooser } from './components/AddChooser'
import { ArchiveList } from './components/ArchiveList'
import { formatToday } from './utils/format'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RecoveryScreen } from './components/RecoveryScreen'
import { OfflineStatus } from './components/OfflineStatus'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { EventForm } from './components/EventForm'
import { EventList } from './components/EventList'
import { HomeView } from './components/HomeView'
import { Modal } from './components/Modal'
import { NoteForm } from './components/NoteForm'
import { NoteList } from './components/NoteList'
import { SettingsPanel } from './components/SettingsPanel'
import { BackupReminderBanner } from './components/BackupReminderBanner'
import { hasBackupableData } from './utils/backup'
import { shouldShowBackupReminder } from './utils/backupReminder'
import { NavBadge } from './components/NavBadge'
import { useNavSectionCounts } from './hooks/useNavSectionCounts'
import { useOverdueCounts } from './hooks/useOverdueCounts'
import { type Event, type Expense, type Note } from './db'
import type { NoteKind } from './utils/noteKind'
import { resolveNoteKind } from './utils/noteKind'

type Section = 'home' | 'notes' | 'events' | 'expenses' | 'archive'

const sections: Record<
  Section,
  { label: string; icon: typeof Home; title: string; description: string }
> = {
  home: {
    label: 'Home',
    icon: Home,
    title: 'Home',
    description: '',
  },
  notes: {
    label: 'Note',
    icon: StickyNote,
    title: 'Note e liste',
    description: 'Appunti testuali e liste to-do con spunte.',
  },
  events: {
    label: 'Impegni',
    icon: CalendarDays,
    title: 'Impegni e abbonamenti',
    description: 'Catalogo completo — tutti gli impegni.',
  },
  expenses: {
    label: 'Spese',
    icon: Wallet,
    title: 'Spese e pagamenti',
    description: 'Movimenti, carte e totali per metodo.',
  },
  archive: {
    label: 'Archivio',
    icon: Archive,
    title: 'Archivio',
    description: 'Elementi archiviati, recuperabili in qualsiasi momento.',
  },
}

function App() {
  const [activeSection, setActiveSection] = useState<Section>('home')
  const [showEventForm, setShowEventForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showBackupReminder, setShowBackupReminder] = useState(false)
  const [showAddChooser, setShowAddChooser] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | undefined>()
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>()
  const [editingNote, setEditingNote] = useState<Note | undefined>()
  const [newNoteKind, setNewNoteKind] = useState<NoteKind>('text')
  const [defaultAreaName, setDefaultAreaName] = useState<string | undefined>()

  const current = sections[activeSection]
  const CurrentIcon = current.icon
  const overdueCounts = useOverdueCounts()
  const navCounts = useNavSectionCounts()

  function navBadgeCount(section: Section): number {
    return navCounts[section]
  }

  function navBadgeUrgent(section: Section): boolean {
    return (
      overdueCounts.impegni > 0 &&
      (section === 'home' || section === 'events')
    )
  }

  function clearDefaultArea() {
    setDefaultAreaName(undefined)
  }

  function openNewEvent() {
    setEditingEvent(undefined)
    setShowEventForm(true)
  }

  function openEditEvent(event: Event) {
    setEditingEvent(event)
    setShowEventForm(true)
  }

  function openNewExpense() {
    setEditingExpense(undefined)
    setShowExpenseForm(true)
  }

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense)
    setShowExpenseForm(true)
  }

  function openNewNote(kind: NoteKind = 'text') {
    setEditingNote(undefined)
    setNewNoteKind(kind)
    setShowNoteForm(true)
  }

  function openEditNote(note: Note) {
    setEditingNote(note)
    setNewNoteKind(resolveNoteKind(note))
    setShowNoteForm(true)
  }

  function openAddChooser() {
    setShowAddChooser(true)
  }

  function closeAddChooser() {
    setShowAddChooser(false)
    if (!showNoteForm && !showEventForm && !showExpenseForm) {
      clearDefaultArea()
    }
  }

  function openAddInArea(
    areaName: string,
    kind?: 'note' | 'event' | 'expense',
  ) {
    setDefaultAreaName(areaName)
    if (kind === 'note') openNewNote()
    else if (kind === 'event') openNewEvent()
    else if (kind === 'expense') openNewExpense()
    else setShowAddChooser(true)
  }

  function addFromChooser(
    kind: 'note' | 'checklist' | 'event' | 'expense',
  ) {
    setShowAddChooser(false)
    if (kind === 'note') openNewNote('text')
    else if (kind === 'checklist') openNewNote('checklist')
    else if (kind === 'event') openNewEvent()
    else openNewExpense()
  }

  function closeNoteForm() {
    setShowNoteForm(false)
    setEditingNote(undefined)
    clearDefaultArea()
  }

  function closeEventForm() {
    setShowEventForm(false)
    setEditingEvent(undefined)
    clearDefaultArea()
  }

  function closeExpenseForm() {
    setShowExpenseForm(false)
    setEditingExpense(undefined)
    clearDefaultArea()
  }

  function handleAddClick() {
    if (activeSection === 'expenses') openNewExpense()
    else if (activeSection === 'notes') openNewNote()
    else if (activeSection === 'home') {
      openAddChooser()
    } else {
      openNewEvent()
    }
  }

  const showAddButton = activeSection !== 'archive'

  useEffect(() => {
    let cancelled = false
    async function checkBackupReminder() {
      if (!shouldShowBackupReminder()) {
        if (!cancelled) setShowBackupReminder(false)
        return
      }
      const hasData = await hasBackupableData()
      if (!cancelled) setShowBackupReminder(hasData)
    }
    void checkBackupReminder()
    return () => {
      cancelled = true
    }
  }, [showSettings])

  function dismissBackupReminder() {
    setShowBackupReminder(false)
  }

  function openSettingsFromBackup() {
    setShowSettings(true)
  }

  return (
    <ErrorBoundary
      fallback={(error) => (
        <RecoveryScreen
          title="Qualcosa è andato storto"
          detail={error.message}
        />
      )}
    >
      <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-slate-50">
        <OfflineStatus />
        {showBackupReminder && (
          <BackupReminderBanner
            onOpenSettings={openSettingsFromBackup}
            onDismiss={dismissBackupReminder}
          />
        )}

        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Note Personali
              </h1>
              <p className="text-xs capitalize text-slate-500">{formatToday()}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Impostazioni"
              >
                <Settings className="h-5 w-5" />
              </button>
              {showAddButton && (
                <button
                  type="button"
                  onClick={handleAddClick}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 active:scale-95"
                  aria-label="Aggiungi"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </header>

        <main className={`flex-1 px-4 ${activeSection === 'home' ? 'py-4' : 'py-6'}`}>
          {activeSection !== 'home' && (
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <CurrentIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-slate-900">
                  {current.title}
                </h2>
                {current.description ? (
                  <p className="text-sm text-slate-500">{current.description}</p>
                ) : null}
              </div>
            </div>
          )}

          {activeSection === 'home' && (
            <HomeView
              onEditEvent={openEditEvent}
              onEditNote={openEditNote}
              onEditExpense={openEditExpense}
              onOpenEventFromExpense={(event) => {
                setActiveSection('events')
                openEditEvent(event)
              }}
              onGoToEvents={() => setActiveSection('events')}
              onGoToExpenses={() => setActiveSection('expenses')}
              onAddInArea={openAddInArea}
            />
          )}
          {activeSection === 'notes' && (
            <NoteList onEdit={openEditNote} />
          )}
          {activeSection === 'events' && (
            <EventList onEdit={openEditEvent} onEditNote={openEditNote} />
          )}
          {activeSection === 'expenses' && (
            <ExpenseList
              onEdit={openEditExpense}
              onOpenEvent={(event) => {
                setActiveSection('events')
                openEditEvent(event)
              }}
            />
          )}
          {activeSection === 'archive' && <ArchiveList />}
        </main>

        <nav
          className="sticky bottom-0 border-t border-slate-200/80 bg-white/95 px-0.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
          aria-label="Navigazione principale"
        >
          <ul className="flex items-center justify-between">
            {(Object.keys(sections) as Section[]).map((key) => {
              const section = sections[key]
              const Icon = section.icon
              const isActive = activeSection === key

              return (
                <li key={key} className="flex-1">
                  <button
                    type="button"
                    onClick={() => setActiveSection(key)}
                    className={`flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-medium transition ${
                      isActive
                        ? 'text-indigo-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="relative">
                      <Icon
                        className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`}
                      />
                      <NavBadge
                        count={navBadgeCount(key)}
                        urgent={navBadgeUrgent(key)}
                      />
                    </span>
                    {section.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {showAddChooser && (
        <Modal
          title={defaultAreaName ? `Aggiungi in ${defaultAreaName}` : 'Aggiungi'}
          onClose={closeAddChooser}
        >
          <AddChooser
            areaName={defaultAreaName}
            onAddNote={() => addFromChooser('note')}
            onAddChecklist={() => addFromChooser('checklist')}
            onAddEvent={() => addFromChooser('event')}
            onAddExpense={() => addFromChooser('expense')}
          />
        </Modal>
      )}

      {showEventForm && (
        <Modal
          title={editingEvent ? 'Modifica impegno' : 'Nuovo impegno'}
          onClose={closeEventForm}
        >
          <EventForm
            event={editingEvent}
            defaultAreaName={editingEvent ? undefined : defaultAreaName}
            onSave={closeEventForm}
            onClose={closeEventForm}
          />
        </Modal>
      )}

      {showSettings && (
        <Modal title="Impostazioni" onClose={() => setShowSettings(false)}>
          <SettingsPanel onBackupDone={dismissBackupReminder} />
        </Modal>
      )}

      {showNoteForm && (
        <Modal
          title={
            editingNote
              ? resolveNoteKind(editingNote) === 'checklist'
                ? 'Modifica lista'
                : 'Modifica nota'
              : newNoteKind === 'checklist'
                ? 'Nuova lista'
                : 'Nuova nota'
          }
          onClose={closeNoteForm}
        >
          <NoteForm
            note={editingNote}
            defaultKind={newNoteKind}
            defaultAreaName={editingNote ? undefined : defaultAreaName}
            onSave={closeNoteForm}
            onClose={closeNoteForm}
          />
        </Modal>
      )}

      {showExpenseForm && (
        <Modal
          title={editingExpense ? 'Modifica spesa' : 'Nuova spesa'}
          onClose={closeExpenseForm}
        >
          <ExpenseForm
            expense={editingExpense}
            defaultAreaName={editingExpense ? undefined : defaultAreaName}
            onSave={closeExpenseForm}
            onClose={closeExpenseForm}
          />
        </Modal>
      )}
    </ErrorBoundary>
  )
}

export default App

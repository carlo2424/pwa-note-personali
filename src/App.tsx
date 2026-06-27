import { useState } from 'react'
import {
  Archive,
  CalendarDays,
  CreditCard,
  Home,
  Plus,
  Settings,
  StickyNote,
  Wallet,
} from 'lucide-react'
import { AddChooser } from './components/AddChooser'
import { ArchiveList } from './components/ArchiveList'
import { formatToday } from './utils/format'
import { CardSummary } from './components/CardSummary'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineStatus } from './components/OfflineStatus'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { EventForm } from './components/EventForm'
import { EventList } from './components/EventList'
import { HomeView } from './components/HomeView'
import { MiniMonthCalendar } from './components/MiniMonthCalendar'
import { Modal } from './components/Modal'
import { NoteForm } from './components/NoteForm'
import { NoteList } from './components/NoteList'
import { SettingsPanel } from './components/SettingsPanel'
import { NavBadge } from './components/NavBadge'
import { useOverdueCounts } from './hooks/useOverdueCounts'
import { resetDB, type Event, type Expense, type Note } from './db'

type Section = 'home' | 'notes' | 'events' | 'expenses' | 'cards' | 'archive'

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
    title: 'Note libere',
    description: 'Appunti e promemoria testuali.',
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
    title: 'Gestione spese',
    description: 'Spese, entrate e pagamenti.',
  },
  cards: {
    label: 'Carte',
    icon: CreditCard,
    title: 'Promemoria carte',
    description: 'Nome, cifre e scadenza delle tue carte.',
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
  const [showAddChooser, setShowAddChooser] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | undefined>()
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>()
  const [editingNote, setEditingNote] = useState<Note | undefined>()
  const [defaultAreaName, setDefaultAreaName] = useState<string | undefined>()

  const current = sections[activeSection]
  const CurrentIcon = current.icon
  const overdueCounts = useOverdueCounts()

  function navBadgeCount(section: Section): number {
    if (section === 'home' || section === 'events') return overdueCounts.impegni
    return 0
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

  function openNewNote() {
    setEditingNote(undefined)
    setShowNoteForm(true)
  }

  function openEditNote(note: Note) {
    setEditingNote(note)
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

  function addFromChooser(kind: 'note' | 'event' | 'expense') {
    setShowAddChooser(false)
    if (kind === 'note') openNewNote()
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
    else if (activeSection === 'cards') {
      document.querySelector<HTMLButtonElement>('[data-add-card]')?.click()
    } else if (activeSection === 'home') {
      openAddChooser()
    } else {
      openNewEvent()
    }
  }

  const showAddButton = activeSection !== 'archive'

  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-semibold text-slate-800">
            Qualcosa è andato storto
          </p>
          <p className="text-sm text-slate-500">
            Potrebbe esserci un problema con il database locale.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white"
          >
            Ricarica
          </button>
          <button
            type="button"
            onClick={resetDB}
            className="text-xs text-rose-500 underline"
          >
            Reset database (cancella tutti i dati)
          </button>
        </div>
      }
    >
      <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-slate-50">
        <OfflineStatus />

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

        <main className="flex-1 px-4 py-6">
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
            {activeSection === 'home' && (
              <div className="flex shrink-0 items-center gap-1.5">
                <MiniMonthCalendar />
              </div>
            )}
          </div>

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
              onGoToNotes={() => setActiveSection('notes')}
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
          {activeSection === 'cards' && <CardSummary />}
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
                      <NavBadge count={navBadgeCount(key)} />
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
          <SettingsPanel />
        </Modal>
      )}

      {showNoteForm && (
        <Modal
          title={editingNote ? 'Modifica nota' : 'Nuova nota'}
          onClose={closeNoteForm}
        >
          <NoteForm
            note={editingNote}
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

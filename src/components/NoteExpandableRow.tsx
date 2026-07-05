import { useState } from 'react'
import type { Note } from '../db'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { archiveConfirmCopy } from '../utils/confirmMessages'
import { isPastDue } from '../utils/countdown'
import { deadlineLabel, noteDateUrgency } from '../utils/homeSpotlight'
import { toggleTask, parseTaskLines } from '../utils/eventTasks'
import { formatDate, formatDateRange, formatIsoDate, formatModifiedAt, sentenceCase } from '../utils/format'
import { isNoteImpegno } from '../utils/impegno'
import { isNoteChecklist } from '../utils/noteKind'
import { resolveNoteIcon } from '../utils/noteIcon'
import { archiveNote } from '../utils/noteArchive'
import {
  isNoteImpegnoMarkedDone,
  toggleNoteImpegnoDone,
} from '../utils/impegnoDone'
import { ITEM_TYPE_STYLE } from '../constants/itemColors'
import { shareNote } from '../utils/share'
import {
  summarizeChecklistTasks,
  summarizeText,
} from '../utils/textSummary'
import { ConfirmDialog } from './ConfirmDialog'
import { ExpandableCard } from './ExpandableCard'
import { ImpegnoDoneToggle } from './ImpegnoDoneToggle'
import { ItemIconCircle } from './ItemIconCircle'
import { ItemActions } from './ItemActions'
import { TaskRow } from './TaskRow'

interface NoteExpandableRowProps {
  note: Note
  onEdit: () => void
  areaName?: string
  /** Nome membro area quando il titolo è il gruppo (es. Lorenzo sotto Famiglia) */
  areaMember?: string
  compact?: boolean
  /** In Home globale: mostra l'area (es. Lorenzo) come titolo per le liste */
  promoteAreaTitle?: boolean
  /** Etichetta tipo sopra l'icona (Nota, Lista, Impegno, Spesa) */
  showTypeLabel?: boolean
}

export function NoteExpandableRow({
  note,
  onEdit,
  areaName,
  areaMember,
  compact = false,
  promoteAreaTitle = true,
  showTypeLabel = false,
}: NoteExpandableRowProps) {
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const archiveKind = isNoteImpegno(note) ? 'impegno' : 'nota'
  const archiveCopy = archiveConfirmCopy(archiveKind, note.title)
  const checklistNote = isNoteChecklist(note)

  const checklistTasks = useDexieLiveQuery(
    async () => {
      if (!note.id || !checklistNote) return []
      return db.tasks.where('noteId').equals(note.id).sortBy('createdAt')
    },
    [note.id, checklistNote],
  )

  const contentLines =
    checklistNote && note.content ? parseTaskLines(note.content) : []
  const effectiveTotal =
    (checklistTasks?.length ?? 0) > 0
      ? (checklistTasks?.length ?? 0)
      : contentLines.length
  const hasChecklist = checklistNote && effectiveTotal > 0

  const displayContent =
    !checklistNote && note.content ? sentenceCase(note.content) : ''
  const photoUrl =
    !checklistNote && note.photoBlob
      ? URL.createObjectURL(note.photoBlob)
      : null
  const overdue =
    isPastDue(note.endDate) &&
    !isNoteImpegnoMarkedDone(note, checklistTasks ?? [])
  const dateRange = formatDateRange(note.startDate, note.endDate)

  const doneCount = checklistTasks?.filter((t) => t.done).length ?? 0
  const totalCount = effectiveTotal

  const checklistPreview =
    hasChecklist && totalCount > 0
      ? `${doneCount}/${totalCount} completate`
      : checklistNote
        ? 'Lista vuota'
        : null

  const contentExcerpt = checklistNote
    ? summarizeChecklistTasks(
        checklistTasks?.length
          ? checklistTasks
          : contentLines.map((line) => ({ title: line, done: false })),
      )
    : summarizeText(displayContent)

  const titleNorm = sentenceCase(note.title.trim()).toLowerCase()
  const showContentExcerpt =
    !!contentExcerpt &&
    contentExcerpt.toLowerCase() !== titleNorm &&
    !contentExcerpt.toLowerCase().startsWith(`${titleNorm}…`)

  const dateUrg = noteDateUrgency(note)
  const soon =
    dateUrg === 'today' || dateUrg === 'soon'
  const keyDate = note.endDate ?? note.startDate
  const soonLabel = keyDate ? deadlineLabel(keyDate) : ''
  const dueDateLabel =
    note.endDate && note.startDate && note.endDate !== note.startDate
      ? formatDateRange(note.startDate, note.endDate)
      : keyDate
        ? formatIsoDate(keyDate)
        : null

  const showAreaAsTitle = Boolean(areaName && promoteAreaTitle && !(compact && showTypeLabel))
  const homeCard = compact && showTypeLabel

  let primaryTitle: string
  let resolvedSubtitle: string | undefined
  let detailLine: string | undefined

  if (homeCard) {
    primaryTitle = note.title

    const line2Parts: string[] = []
    if (areaName) {
      line2Parts.push(areaMember ? `${areaName} · ${areaMember}` : areaName)
    }
    if (checklistNote && totalCount > 0) {
      line2Parts.push(`${totalCount} ${totalCount === 1 ? 'elemento' : 'elementi'}`)
    } else if (checklistPreview) {
      line2Parts.push(checklistPreview)
    }
    resolvedSubtitle = line2Parts.length > 0 ? line2Parts.join(' · ') : undefined

    const line3Parts: string[] = []
    if (keyDate) {
      const countdown = deadlineLabel(keyDate)
      if (overdue) {
        line3Parts.push(`Scaduta · ${formatIsoDate(keyDate)}`)
      } else if (countdown) {
        line3Parts.push(`${countdown} · ${formatIsoDate(keyDate)}`)
      } else {
        line3Parts.push(formatIsoDate(keyDate))
      }
    } else if (soonLabel && (soon || overdue)) {
      line3Parts.push(soonLabel)
    }
    if (showContentExcerpt) line3Parts.push(contentExcerpt)
    detailLine = line3Parts.length > 0 ? line3Parts.join(' · ') : undefined
  } else if (showAreaAsTitle) {
    const areaLabel = areaMember ? `${areaName} · ${areaMember}` : areaName!
    const homeParts: string[] = []
    if (dueDateLabel) {
      homeParts.push(overdue ? `Scadenza ${dueDateLabel}` : dueDateLabel)
    } else if (soonLabel && (soon || overdue)) {
      homeParts.push(soonLabel)
    }
    homeParts.push(sentenceCase(note.title))
    if (checklistPreview) homeParts.push(checklistPreview)
    if (showContentExcerpt) homeParts.push(contentExcerpt)
    if (compact) homeParts.push(formatModifiedAt(note.updatedAt))

    primaryTitle = areaLabel
    resolvedSubtitle = homeParts.join(' · ')
  } else {
    primaryTitle = sentenceCase(note.title)

    const subtitleParts: string[] = []
    if (checklistPreview) subtitleParts.push(checklistPreview)
    if (dueDateLabel) {
      subtitleParts.push(
        overdue ? `Scadenza ${dueDateLabel}` : dueDateLabel,
      )
    } else if (soonLabel && (soon || overdue)) {
      subtitleParts.push(soonLabel)
    }
    if (showContentExcerpt) {
      subtitleParts.push(contentExcerpt)
    } else if (!compact && !checklistNote && !displayContent && !dueDateLabel && !dateRange) {
      subtitleParts.push(`Aggiornata ${formatDate(note.updatedAt)}`)
    }
    if (compact) subtitleParts.push(formatModifiedAt(note.updatedAt))
    if (areaName) subtitleParts.unshift(areaName)

    resolvedSubtitle =
      subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined
  }

  const typeBadge = checklistNote && !showAreaAsTitle ? (
    <span
      className={`shrink-0 rounded-full bg-emerald-100 font-semibold text-emerald-700 ${
        compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'
      }`}
    >
      Lista
    </span>
  ) : null

  const noteIcon = resolveNoteIcon(note, checklistNote ? 'checklist' : 'text')
  const typeLabel = showTypeLabel
    ? isNoteImpegno(note)
      ? 'Impegno'
      : checklistNote
        ? 'Lista'
        : 'Nota'
    : undefined

  const noteCardStyle = (() => {
    if (isNoteImpegno(note)) return ITEM_TYPE_STYLE.event.card
    if (compact) {
      return checklistNote
        ? ITEM_TYPE_STYLE.checklist.card
        : ITEM_TYPE_STYLE.note.card
    }
    if (overdue || dateUrg === 'expired') return ITEM_TYPE_STYLE.note.cardExpired
    if (soon) return ITEM_TYPE_STYLE.note.cardSoon
    return checklistNote
      ? ITEM_TYPE_STYLE.checklist.card
      : ITEM_TYPE_STYLE.note.card
  })()

  const noteImpegno = isNoteImpegno(note)
  const markedDone = isNoteImpegnoMarkedDone(note, checklistTasks ?? [])

  return (
    <>
    <div className={`flex items-stretch gap-0.5 ${noteImpegno ? '' : 'contents'}`}>
      {noteImpegno ? (
        <ImpegnoDoneToggle
          compact={compact}
          done={markedDone}
          onToggle={() =>
            void toggleNoteImpegnoDone(note, checklistTasks ?? [])
          }
        />
      ) : null}
      <div className={noteImpegno ? 'min-w-0 flex-1' : 'contents'}>
    <ExpandableCard
      compact={compact}
      homeLayout={homeCard}
      detailLine={detailLine}
      subtitleMultiline={compact && !homeCard}
      typeLabel={typeLabel}
      containerClassName={noteCardStyle}
      icon={
        <ItemIconCircle
          icon={noteIcon}
          color={note.color ?? 'indigo'}
          compact={compact}
        />
      }
      title={primaryTitle}
      titleClassName={
        markedDone && noteImpegno
          ? 'text-slate-900'
          : overdue || dateUrg === 'expired'
          ? 'text-rose-900'
          : soon
            ? 'text-amber-900'
            : 'text-slate-900'
      }
      subtitle={resolvedSubtitle}
      badge={
        homeCard
          ? undefined
          : overdue || dateUrg === 'expired' ? (
          <span className={`shrink-0 rounded-full bg-rose-600 font-bold text-white ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            Scaduta
          </span>
        ) : soon ? (
          <span className={`shrink-0 rounded-full bg-amber-500 font-bold text-white ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            {soonLabel === 'Oggi' ? 'Oggi' : 'Presto'}
          </span>
        ) : markedDone && noteImpegno ? (
          <span className={`shrink-0 rounded-full bg-emerald-100 font-semibold text-emerald-700 ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            Fatto
          </span>
        ) : hasChecklist && totalCount > 0 && doneCount === totalCount ? (
          <span className={`shrink-0 rounded-full bg-emerald-100 font-semibold text-emerald-700 ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            Fatto
          </span>
        ) : showTypeLabel ? undefined : (
          typeBadge
        )
      }
      actions={
        homeCard ? undefined : (
          <ItemActions
            onEdit={onEdit}
            onShare={() => void shareNote(note, areaName)}
            onArchive={() => setShowArchiveConfirm(true)}
          />
        )
      }
    >
      {photoUrl && (
        <img
          src={photoUrl}
          alt=""
          className={`w-full object-cover ${compact ? 'max-h-24 rounded-lg' : 'max-h-40 rounded-xl'}`}
        />
      )}
      {hasChecklist && checklistTasks && checklistTasks.length > 0 ? (
        <ul className={compact ? 'space-y-0.5' : 'space-y-1'}>
          {checklistTasks.map((task) =>
            task.id ? (
              <li key={task.id}>
                <TaskRow
                  compact={compact}
                  nested
                  done={task.done}
                  title={task.title}
                  onToggle={() => void toggleTask(task.id!, task.done)}
                />
              </li>
            ) : null,
          )}
        </ul>
      ) : hasChecklist && contentLines.length > 0 ? (
        <ul className={compact ? 'space-y-0.5' : 'space-y-1'}>
          {contentLines.map((line) => (
            <li key={line}>
              <TaskRow compact={compact} nested done={false} title={line} onToggle={() => {}} />
            </li>
          ))}
        </ul>
      ) : (
        displayContent && (
          <p className={`whitespace-pre-wrap text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>
            {displayContent}
          </p>
        )
      )}
      {dateRange && (
        <p
          className={`font-medium ${overdue ? 'text-rose-600' : 'text-indigo-600'} ${compact ? 'text-[10px]' : 'text-xs'}`}
        >
          {overdue ? 'Scaduta · ' : ''}
          {dateRange}
        </p>
      )}
      <p className={`text-slate-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        Aggiornata {formatDate(note.updatedAt)}
      </p>
      {homeCard && (
        <div className={`border-t border-slate-100 ${compact ? 'pt-1.5' : 'pt-2'}`}>
          <ItemActions
            onEdit={onEdit}
            onShare={() => void shareNote(note, areaName)}
            onArchive={() => setShowArchiveConfirm(true)}
          />
        </div>
      )}
    </ExpandableCard>
      </div>
    </div>

    {showArchiveConfirm && (
      <ConfirmDialog
        title={archiveCopy.title}
        message={archiveCopy.message}
        confirmLabel={archiveCopy.confirmLabel}
        variant="danger"
        onConfirm={() => void archiveNote(note)}
        onClose={() => setShowArchiveConfirm(false)}
      />
    )}
    </>
  )
}

import { useRef, useState } from 'react'
import { ChevronDown, FileUp, Loader2 } from 'lucide-react'
import { IMPORT_ACCEPT, parseImportFile } from '../utils/fileImport'
import { saveImportedNotes } from '../utils/importNotes'

const FORMATS = [
  {
    ext: 'Excel / CSV',
    files: '.xlsx · .xls · .csv',
    rule: 'Prima pagina del foglio. Ogni riga diventa una nota.',
    ok: true,
  },
  {
    ext: 'Word',
    files: '.docx',
    rule: 'Un file = una nota. Titolo = prima riga del testo.',
    ok: true,
  },
  {
    ext: 'PDF',
    files: '.pdf',
    rule: 'Un file = una nota. Solo PDF con testo selezionabile.',
    ok: true,
  },
  {
    ext: 'Word vecchio',
    files: '.doc',
    rule: 'Non supportato. Salva come .docx da Word.',
    ok: false,
  },
  {
    ext: 'PDF scansionato',
    files: 'immagine',
    rule: 'Non supportato. Usa la fotocamera nella nota.',
    ok: false,
  },
] as const

function ExampleTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[240px] text-left text-[10px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {headers.map((h) => (
              <th
                key={h}
                className="px-2 py-1.5 font-semibold text-slate-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1.5 text-slate-500">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FileImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return

    setLoading(true)
    setLastResult(null)

    try {
      const drafts = await parseImportFile(file)
      if (drafts.length === 0) {
        alert('Nessun contenuto trovato nel file.')
        return
      }

      const preview = drafts
        .slice(0, 5)
        .map((d) => `• ${d.title}`)
        .join('\n')
      const more =
        drafts.length > 5 ? `\n… e altre ${drafts.length - 5} note` : ''

      const ok = window.confirm(
        `Trovate ${drafts.length} note da importare:\n\n${preview}${more}\n\nProcedere?`,
      )
      if (!ok) return

      const { imported, skipped } = await saveImportedNotes(drafts)
      setLastResult(
        skipped > 0
          ? `Importate ${imported} note (${skipped} righe saltate).`
          : `Importate ${imported} note.`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore durante l\'import.'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
          <FileUp className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Importa file</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Trasforma Excel, Word o PDF in note. I file restano sul dispositivo,
            non vengono caricati online.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-3 text-sm font-medium text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Lettura file…
          </>
        ) : (
          <>
            <FileUp className="h-4 w-4" />
            Scegli file
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="hidden"
        onChange={(e) => void handleFile(e)}
      />

      {lastResult && (
        <p className="mt-2 text-xs font-medium text-emerald-700">{lastResult}</p>
      )}

      <button
        type="button"
        onClick={() => setShowGuide((v) => !v)}
        className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left text-xs font-medium text-indigo-600"
      >
        <span>Modelli e formati importabili</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${showGuide ? 'rotate-180' : ''}`}
        />
      </button>

      {showGuide && (
        <div className="mt-2 space-y-4 border-t border-slate-200/80 pt-3">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Formati
            </p>
            <ul className="space-y-2">
              {FORMATS.map((f) => (
                <li
                  key={f.ext}
                  className={`rounded-lg px-2.5 py-2 text-[11px] ${
                    f.ok
                      ? 'bg-white text-slate-600 ring-1 ring-slate-100'
                      : 'bg-slate-100/80 text-slate-400'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-slate-700">{f.ext}</span>
                    <span className="text-[10px] text-slate-400">{f.files}</span>
                  </div>
                  <p className="mt-0.5">{f.rule}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
              Modello Excel consigliato
            </p>
            <p className="mb-2 text-[10px] text-slate-400">
              Prima riga = intestazioni (riconosciute automaticamente). Una riga
              = una nota. Con data inizio e fine la nota compare anche tra gli
              impegni.
            </p>
            <ExampleTable
              headers={['Titolo', 'Contenuto', 'Area', 'Data inizio', 'Data fine']}
              rows={[
                ['Wifi casa', 'Password 12345', 'Casa', '2026-06-27', '2026-07-27'],
                ['Dentista', 'Controllo annuale', 'Salute', '', ''],
              ]}
            />
            <p className="mt-1.5 text-[10px] text-slate-400">
              Intestazioni accettate: Titolo, Contenuto, Testo, Area, Data inizio,
              Data fine, ecc.
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
              Modello Excel semplice
            </p>
            <p className="mb-2 text-[10px] text-slate-400">
              Senza intestazioni: 1 colonna = solo titolo · 2 colonne = titolo +
              contenuto · più colonne = prima colonna titolo, resto contenuto.
            </p>
            <ExampleTable
              headers={['Titolo', 'Contenuto']}
              rows={[
                ['Spesa supermercato', 'Latte, pane, uova'],
                ['Idea regalo', 'Libro o cuffie'],
              ]}
            />
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
              Word (.docx)
            </p>
            <p className="text-[10px] leading-relaxed text-slate-500">
              Incolla o scrivi il testo nel documento. La{' '}
              <span className="font-medium text-slate-600">prima riga</span>{' '}
              diventa titolo, il resto contenuto. Un documento = una nota
              (generalmente una pagina).
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-slate-700">PDF</p>
            <p className="text-[10px] leading-relaxed text-slate-500">
              Funziona se riesci a{' '}
              <span className="font-medium text-slate-600">
                selezionare il testo
              </span>{' '}
              con il mouse. Se il PDF è una foto/scansione, usa{' '}
              <span className="font-medium text-slate-600">
                fotocamera nella nota
              </span>{' '}
              per allegare l&apos;immagine.
            </p>
          </div>

          <div className="rounded-lg bg-indigo-50 px-2.5 py-2 text-[10px] text-indigo-800">
            <span className="font-semibold">CSV da Excel:</span> in Excel usa
            File → Salva con nome → CSV. Stesse regole del modello Excel.
          </div>
        </div>
      )}
    </section>
  )
}

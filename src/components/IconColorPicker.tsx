import { ICON_COLOR_OPTIONS, iconColorClass } from '../constants/itemColors'
import { EventIcon } from './EventIcon'

interface IconColorPickerProps {
  value: string
  onChange: (color: string) => void
  /** Anteprima icona nel selettore colore */
  previewIcon?: string
}

export function IconColorPicker({
  value,
  onChange,
  previewIcon,
}: IconColorPickerProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        Colore icona
      </label>
      <div className="flex gap-2">
        {ICON_COLOR_OPTIONS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              value === c.value
                ? `ring-2 ring-offset-2 ${c.ring}`
                : 'opacity-60 hover:opacity-100'
            } ${c.swatch}`}
            aria-label={c.label}
          >
            {previewIcon ? (
              <EventIcon
                name={previewIcon}
                className={`h-4 w-4 text-white drop-shadow-sm`}
              />
            ) : null}
          </button>
        ))}
      </div>
      {previewIcon && (
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          Anteprima:
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-white">
            <EventIcon
              name={previewIcon}
              className={`h-3.5 w-3.5 ${iconColorClass(value)}`}
            />
          </span>
        </p>
      )}
    </div>
  )
}

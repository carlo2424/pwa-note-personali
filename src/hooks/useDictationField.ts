import { useRef, type Dispatch, type SetStateAction } from 'react'
import { sentenceCase } from '../utils/format'
import { mergeDictationIntoContent } from '../utils/speechText'

/** Dettatura su un campo testo: evita ripetizioni e preserva testo già scritto */
export function useDictationField(
  setValue: Dispatch<SetStateAction<string>>,
  multiline = false,
) {
  const prefixRef = useRef('')

  function onListeningChange(listening: boolean) {
    if (listening) {
      setValue((prev: string) => {
        prefixRef.current = prev.trim()
        return prev
      })
    } else {
      prefixRef.current = ''
    }
  }

  function onTranscript(sessionText: string) {
    const prefix = prefixRef.current
    const merged = prefix
      ? mergeDictationIntoContent(prefix, sessionText, multiline)
      : sessionText.trim()
    setValue(sentenceCase(merged))
  }

  return { onListeningChange, onTranscript }
}

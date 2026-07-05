import { sentenceCase } from './format'

type ItemKind = 'nota' | 'impegno' | 'spesa'

const KIND_LABEL: Record<ItemKind, string> = {
  nota: 'la nota',
  impegno: "l'impegno",
  spesa: 'la spesa',
}

export function archiveConfirmCopy(kind: ItemKind, title: string) {
  const name = sentenceCase(title)
  return {
    title: `Archiviare ${KIND_LABEL[kind]}?`,
    message: `"${name}" andrà in archivio. Potrai recuperarlo dalla sezione Archivio in qualsiasi momento.`,
    confirmLabel: 'Archivia',
  }
}

export function markImpegnoDoneConfirmCopy(
  title: string,
  options?: { recurring?: boolean },
) {
  const name = sentenceCase(title)
  if (options?.recurring) {
    return {
      title: 'Convalidare il periodo?',
      message: `"${name}": confermando segni il periodo come completato, aggiorni la prossima scadenza e la voce esce da «In ritardo». Se hai cliccato per errore, annulla ora.`,
      confirmLabel: 'Convalida',
    }
  }
  return {
    title: 'Segnare come fatto?',
    message: `"${name}" verrà segnato come completato e non comparirà più tra gli impegni in ritardo. Puoi deselezionare la spunta in seguito se era un errore.`,
    confirmLabel: 'Segna fatto',
  }
}

export function deletePermanentlyConfirmCopy(title: string) {
  const name = sentenceCase(title)
  return {
    title: 'Eliminare definitivamente?',
    message: `"${name}" verrà cancellato per sempre. Questa azione non si può annullare.`,
    confirmLabel: 'Elimina',
  }
}

export function deleteAreaConfirmCopy(name: string, linkedCount: number) {
  const label = sentenceCase(name)
  const linked =
    linkedCount > 0
      ? ` ${linkedCount} ${linkedCount === 1 ? 'elemento resterà' : 'elementi resteranno'} senza area.`
      : ''
  return {
    title: `Eliminare l'area "${label}"?`,
    message: `L'area verrà rimossa.${linked} Potrai riassegnare un'area modificando ogni voce.`,
    confirmLabel: 'Elimina',
  }
}

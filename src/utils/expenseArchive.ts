import { db, type Expense } from '../db'
import { addToArchive } from './archive'

export async function archiveExpense(expense: Expense, onDone?: () => void) {
  if (!expense.id) return
  try {
    await addToArchive({
      originalId: expense.id,
      type: 'expense',
      title: expense.description,
      data: JSON.stringify(expense),
      archivedAt: Date.now(),
    })
    await db.expenses.delete(expense.id)
    onDone?.()
  } catch {
    // errore già mostrato
  }
}

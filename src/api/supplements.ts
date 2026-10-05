import { SUPPLEMENT_SEED } from '../data/supplementSeed'
import type { Lang } from '../i18n'
import { currentUserId, supabase } from './supabase'

/** Copies the starter list into the user's own supplements. Does nothing if they have any. */
export async function seedSupplements(lang: Lang): Promise<void> {
  const user_id = await currentUserId()

  const { count, error: countError } = await supabase
    .from('supplements')
    .select('id', { count: 'exact', head: true })
  if (countError) throw countError
  if (count) return

  const rows = SUPPLEMENT_SEED.map((seed, position) => ({
    id: crypto.randomUUID(),
    user_id,
    name: seed.name[lang],
    dose: seed.dose,
    unit: seed.unit,
    timing: seed.timing,
    active: seed.active,
    position,
    caffeine_mg: seed.caffeineMg ?? null,
  }))
  const { error } = await supabase.from('supplements').insert(rows)
  if (error) throw error
}

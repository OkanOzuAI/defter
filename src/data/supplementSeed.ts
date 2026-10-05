import type { Lang } from '../i18n'
import type { SupplementTiming, SupplementUnit } from '../api/types'

export type SupplementSeed = {
  name: Record<Lang, string>
  dose: number
  unit: SupplementUnit
  timing: SupplementTiming
  active: boolean
  caffeineMg?: number
}

const s = (
  tr: string,
  en: string,
  dose: number,
  unit: SupplementUnit,
  timing: SupplementTiming,
  active = false,
  caffeineMg?: number,
): SupplementSeed => ({ name: { tr, en }, dose, unit, timing, active, caffeineMg })

/**
 * Copied into each user's own supplement list at onboarding.
 * Doses are editable placeholders taken from common label serving sizes, not advice.
 */
export const SUPPLEMENT_SEED: SupplementSeed[] = [
  s('Whey protein', 'Whey protein', 30, 'g', 'post_workout', true),
  s('Kreatin monohidrat', 'Creatine monohydrate', 5, 'g', 'any', true),
  s('D3 vitamini', 'Vitamin D3', 1000, 'IU', 'with_meal', true),
  s('K2 vitamini (MK-7)', 'Vitamin K2 (MK-7)', 100, 'mcg', 'with_meal', true),
  s('Omega-3 (EPA/DHA)', 'Omega-3 (EPA/DHA)', 1, 'capsule', 'with_meal', true),
  s('Magnezyum (glisinat)', 'Magnesium (glycinate)', 200, 'mg', 'evening', true),
  s('Çinko', 'Zinc', 15, 'mg', 'evening', true),
  s('Multivitamin', 'Multivitamin', 1, 'tablet', 'morning', true),
  s('Kafein / pre-workout', 'Caffeine / pre-workout', 1, 'scoop', 'pre_workout', true, 200),

  s('Kazein', 'Casein', 30, 'g', 'evening'),
  s('C vitamini', 'Vitamin C', 500, 'mg', 'morning'),
  s('B12 vitamini', 'Vitamin B12', 1000, 'mcg', 'morning'),
  s('B kompleks', 'B-complex', 1, 'capsule', 'morning'),
  s('Demir', 'Iron', 1, 'tablet', 'with_meal'),
  s('Kalsiyum', 'Calcium', 500, 'mg', 'with_meal'),
  s('Selenyum', 'Selenium', 100, 'mcg', 'with_meal'),
  s('ZMA', 'ZMA', 3, 'capsule', 'evening'),
  s('Elektrolit', 'Electrolytes', 1, 'scoop', 'any'),
  s('Beta-alanin', 'Beta-alanine', 3.2, 'g', 'pre_workout'),
  s('Sitrülin malat', 'Citrulline malate', 6, 'g', 'pre_workout'),
  s('EAA', 'EAA', 10, 'g', 'any'),
  s('BCAA', 'BCAA', 5, 'g', 'any'),
  s('Glutamin', 'Glutamine', 5, 'g', 'post_workout'),
  s('Taurin', 'Taurine', 1, 'g', 'pre_workout'),
  s('L-karnitin', 'L-carnitine', 1, 'g', 'pre_workout'),
  s('Glisin', 'Glycine', 3, 'g', 'evening'),
  s('Ashwagandha', 'Ashwagandha', 1, 'capsule', 'evening'),
  s('Melatonin', 'Melatonin', 1, 'mg', 'evening'),
  s('Kolajen', 'Collagen', 10, 'g', 'morning'),
  s('Probiyotik', 'Probiotic', 1, 'capsule', 'morning'),
  s('Psyllium lifi', 'Psyllium fiber', 5, 'g', 'with_meal'),
  s('CoQ10', 'CoQ10', 100, 'mg', 'with_meal'),
  s('Mass gainer / karbonhidrat tozu', 'Mass gainer / carb powder', 1, 'scoop', 'post_workout'),
]

<script setup>
/**
 * Critères d'un nouveau mot de passe, cochés au fil de la saisie :
 * les critères exigés, puis des conseils et une robustesse indicative.
 */
import { computed } from 'vue'
import { CONSEILS_MOT_DE_PASSE, CRITERES_MOT_DE_PASSE } from '../../utils/validation'

const props = defineProps({
  motDePasse: { type: String, default: '' },
})

const criteres = computed(() => CRITERES_MOT_DE_PASSE.map((c) => ({ ...c, ok: c.test(props.motDePasse) })))
const conseils = computed(() => CONSEILS_MOT_DE_PASSE.map((c) => ({ ...c, ok: c.test(props.motDePasse) })))

// Robustesse indicative : longueur et variété des caractères
const robustesse = computed(() => {
  const v = props.motDePasse
  if (!v) return null
  if (!criteres.value.every((c) => c.ok)) return { libelle: 'Insuffisant', classe: 'text-red-500', barres: 1 }
  const score = conseils.value.filter((c) => c.ok).length + (v.length >= 12 ? 1 : 0)
  if (score <= 1) return { libelle: 'Moyen', classe: 'text-amber-600', barres: 2 }
  if (score <= 3) return { libelle: 'Fort', classe: 'text-emerald-600', barres: 3 }
  return { libelle: 'Très fort', classe: 'text-emerald-600', barres: 4 }
})
</script>

<template>
  <div class="@container rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 font-['Plus_Jakarta_Sans']">
    <div v-if="robustesse" class="mb-3 flex items-center gap-3">
      <div class="flex flex-1 gap-1" aria-hidden="true">
        <span
          v-for="i in 4" :key="i"
          class="h-1.5 flex-1 rounded-full"
          :class="i <= robustesse.barres ? (robustesse.barres === 1 ? 'bg-red-400' : robustesse.barres === 2 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-200'"
        ></span>
      </div>
      <span class="text-xs font-semibold" :class="robustesse.classe">{{ robustesse.libelle }}</span>
    </div>

    <ul class="grid gap-1.5 @md:grid-cols-2">
      <li
        v-for="c in criteres" :key="c.libelle"
        class="flex items-center gap-2 text-xs font-medium"
        :class="c.ok ? 'text-emerald-600' : 'text-slate-600'"
      >
        <i :class="c.ok ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'" class="text-[11px]"></i>
        {{ c.libelle }}
      </li>
      <li
        v-for="c in conseils" :key="c.libelle"
        class="flex items-center gap-2 text-xs"
        :class="c.ok ? 'text-emerald-600' : 'text-slate-400'"
      >
        <i :class="c.ok ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'" class="text-[11px]"></i>
        {{ c.libelle }} <span class="text-slate-400">(conseillé)</span>
      </li>
    </ul>
  </div>
</template>

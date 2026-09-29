<script setup>
/**
 * FormulaireEvaluation — évaluer (ou réévaluer) un rendu.
 *
 * Une ligne par compétence visée (Acquis / Non acquis) et un commentaire
 * général.
 * - Déjà acquis lors de la précédente évaluation : verrouillé (définitif).
 * - Aucun dépôt : tout est « non acquis ».
 *
 * Props :
 *   - cible       : { assignation, nom } — rendu évalué ; null = fermé
 *   - brief       : brief (competences_visees)
 *   - precedente  : dernière évaluation de ce rendu (ou null)
 *   - sansDepot   : aucun dépôt pour ce rendu
 *
 * Émet : fermer, evalue (évaluation créée)
 */
import { ref, watch } from 'vue'
import AppButton from '../ui/AppButton.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { evaluer } from '../../services/activites'

const props = defineProps({
  cible:      { type: Object, default: null },
  brief:      { type: Object, required: true },
  precedente: { type: Object, default: null },
  sansDepot:  { type: Boolean, default: false },
})
const emit = defineEmits(['fermer', 'evalue'])

const authStore   = useAuthStore()
const lignes      = ref([])
const commentaire = ref('')
const erreur      = ref('')
const envoi       = ref(false)

// Réinitialisé à chaque ouverture ; on repart de la précédente évaluation
watch(() => props.cible, (c) => {
  if (!c) return
  const avant = new Map((props.precedente?.competences ?? []).map((l) => [l.competence_niveau, l]))
  lignes.value = (props.brief.competences_visees ?? []).map((cv) => {
    const p = avant.get(cv.id)
    return {
      ...cv,
      acquis: props.sansDepot ? false : !!p?.acquis,
      verrouille: !!p?.acquis,
    }
  })
  commentaire.value = ''
  erreur.value = ''
}, { immediate: true })

const envoyer = async () => {
  envoi.value = true
  erreur.value = ''
  try {
    const evaluation = await evaluer(authStore.tenantCourant?.id, {
      assignation: props.cible.assignation,
      commentaire: commentaire.value,
      competences: lignes.value.map((l) => ({
        competence_niveau: l.id,
        acquis: l.acquis,
      })),
    })
    emit('evalue', evaluation)
  } catch (e) {
    const d = e.response?.data
    const premier = (v) => (Array.isArray(v) ? v[0] : v)
    erreur.value = d?.detail || premier(d?.competences) || premier(d?.assignation) || premier(d?.non_field_errors)
      || "L'évaluation n'a pas pu être enregistrée."
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="cible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      @click.self="emit('fermer')"
    >
      <form class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl" @submit.prevent="envoyer">
        <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div class="min-w-0">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
              {{ precedente ? 'Réévaluer' : 'Évaluer' }} · {{ cible.nom }}
            </h2>
            <p class="mt-0.5 truncate font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">{{ brief.titre }}</p>
          </div>
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100" aria-label="Fermer" @click="emit('fermer')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <InfoBanner
            v-if="sansDepot"
            variant="warning"
            message="Aucun dépôt pour ce rendu : toutes les compétences sont considérées comme non acquises."
          />

          <p v-if="!lignes.length" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
            Ce brief ne vise aucune compétence : laissez simplement un commentaire.
          </p>

          <div v-for="l in lignes" :key="l.id" class="rounded-xl border border-slate-200 px-4 py-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1 font-['Plus_Jakarta_Sans']">
                <p class="text-sm font-semibold text-gray-900">{{ l.competence }}</p>
                <p class="text-xs text-zinc-500">
                  Niveau {{ l.niveau }}<template v-if="l.description"> — {{ l.description }}</template>
                </p>
              </div>
              <div class="flex shrink-0 rounded-xl border border-slate-200 p-0.5 font-['Plus_Jakarta_Sans'] text-xs font-semibold" role="radiogroup" :aria-label="l.competence">
                <button
                  type="button"
                  role="radio"
                  :aria-checked="l.acquis"
                  class="rounded-lg px-3 py-1.5 transition disabled:cursor-not-allowed"
                  :class="l.acquis ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:bg-slate-50'"
                  :disabled="sansDepot || l.verrouille"
                  @click="l.acquis = true"
                >
                  <i class="fa-solid fa-check mr-1"></i>Acquis
                </button>
                <button
                  type="button"
                  role="radio"
                  :aria-checked="!l.acquis"
                  class="rounded-lg px-3 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40"
                  :class="!l.acquis ? 'bg-rose-600 text-white' : 'text-zinc-500 hover:bg-slate-50'"
                  :disabled="sansDepot || l.verrouille"
                  @click="l.acquis = false"
                >
                  <i class="fa-solid fa-xmark mr-1"></i>Non acquis
                </button>
              </div>
            </div>
            <p v-if="l.verrouille" class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-emerald-700">
              <i class="fa-solid fa-lock mr-1"></i>Acquis lors de la précédente évaluation : c'est définitif.
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <label class="font-['Plus_Jakarta_Sans'] text-xs font-semibold text-zinc-700" for="commentaire-general">Commentaire général</label>
            <textarea
              id="commentaire-general"
              v-model="commentaire"
              rows="3"
              placeholder="Points forts, axes de progrès…"
              class="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            ></textarea>
          </div>

          <InfoBanner v-if="erreur" variant="error" :message="erreur" />
        </div>

        <div class="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">L'apprenant la voit tout de suite et reçoit un email.</p>
          <div class="flex gap-3">
            <AppButton variant="secondary" :disabled="envoi" @click="emit('fermer')">Annuler</AppButton>
            <AppButton type="submit" icon="fa-solid fa-clipboard-check" :loading="envoi">Enregistrer l'évaluation</AppButton>
          </div>
        </div>
      </form>
    </div>
  </Teleport>
</template>

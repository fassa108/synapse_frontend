<script setup>
/**
 * SuspensionMembreModal — suspendre / réactiver l'accès d'un membre
 * à l'organisme (MembreTenant.actif).
 *
 * Le compte de l'utilisateur n'est pas touché : s'il est membre
 * d'autres organismes, il y garde son accès.
 *
 * Props :
 *   - membre   : membre concerné (null = fermé)
 *   - tenantId : organisme courant
 *   - libelle  : 'formateur' | 'apprenant' (texte affiché)
 * Émet :
 *   - close
 *   - updated (membre mis à jour)
 */
import { ref, computed, watch } from 'vue'
import AppButton from '../ui/AppButton.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import { modifierMembre } from '../../services/membres'

const props = defineProps({
  membre:   { type: Object, default: null },
  tenantId: { type: [Number, String], required: true },
  libelle:  { type: String, default: 'membre' },
})

const emit = defineEmits(['close', 'updated'])

const loading = ref(false)
const error   = ref('')

watch(() => props.membre, () => { error.value = '' })

const suspendre = computed(() => props.membre?.actif)

// Promotions en cours (inscriptions actives ou affectations) :
// la suspension reste possible, mais l'admin est averti.
const promotions = computed(() => props.membre?.promotions_en_cours ?? [])

const avertissement = computed(() => {
  if (!suspendre.value || promotions.value.length === 0) return ''

  const noms = promotions.value.map((p) => p.nom).join(', ')
  const pluriel = promotions.value.length > 1

  if (props.membre.role === 'FORMATEUR') {
    return `Ce formateur est affecté ${pluriel ? 'aux promotions' : 'à la promotion'} ${noms}. `
      + `Il ne pourra plus y intervenir (briefs, évaluations) tant qu'il est suspendu.`
  }
  return `Cet apprenant est inscrit dans la promotion ${noms}. `
    + `Il ne pourra plus consulter ses briefs ni déposer de livrables tant qu'il est suspendu.`
})

const nomComplet = computed(() =>
  props.membre?.utilisateur_prenom
    ? `${props.membre.utilisateur_prenom} ${props.membre.utilisateur_nom}`
    : props.membre?.utilisateur_email
)

const fermer = () => {
  if (!loading.value) emit('close')
}

const confirmer = async () => {
  loading.value = true
  error.value   = ''
  try {
    const membre = await modifierMembre(props.tenantId, props.membre.id, {
      actif: !props.membre.actif,
    })
    emit('updated', membre)
  } catch (e) {
    const data = e.response?.data
    const premier = (v) => (Array.isArray(v) ? v[0] : v)
    error.value =
      premier(data?.non_field_errors) ||
      premier(data?.actif) ||
      data?.detail ||
      'Impossible de modifier l’accès de ce membre.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="membre"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      @click.self="fermer"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
            {{ suspendre ? `Suspendre ce ${libelle}` : `Réactiver ce ${libelle}` }}
          </h2>
          <button
            type="button"
            @click="fermer"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
            aria-label="Fermer"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="flex flex-col gap-4 px-6 py-5">
          <InfoBanner v-if="error" variant="error" :message="error" />
          <InfoBanner v-if="avertissement" variant="warning" :message="avertissement" />

          <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
            <template v-if="suspendre">
              <strong>{{ nomComplet }}</strong> n'aura plus accès à l'organisme.
              Ses données (inscriptions, groupes, travaux) sont conservées
              et il pourra être réactivé à tout moment.
            </template>
            <template v-else>
              <strong>{{ nomComplet }}</strong> retrouvera son accès à l'organisme.
            </template>
          </p>

          <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <AppButton variant="secondary" :disabled="loading" @click="fermer">
              Annuler
            </AppButton>
            <AppButton
              :variant="suspendre ? 'danger' : 'primary'"
              :loading="loading"
              @click="confirmer"
            >
              {{ suspendre ? 'Suspendre' : 'Réactiver' }}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

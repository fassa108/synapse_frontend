<script setup>
/**
 * DepotCarte — un dépôt (« Dépôt n°X ») : date, retard, déposant,
 * commentaire, fichiers (consultation dans la plateforme ou téléchargement)
 * et liens.
 *
 * Props :
 *   - depot         : livrable renvoyé par l'API
 *   - afficherCible : affiche l'apprenant / le groupe visé (vue formateur, pairs)
 */
import { ref, computed } from 'vue'
import VisionneuseFichier from '../fichiers/VisionneuseFichier.vue'
import { useAuthStore } from '../../stores/auth'
import { telechargerFichierLivrable } from '../../services/activites'

defineProps({
  depot:         { type: Object, required: true },
  afficherCible: { type: Boolean, default: false },
})

const authStore = useAuthStore()
const erreur    = ref('')

const consulte = ref(null) // élément affiché dans la visionneuse
const fichierConsulte = computed(() =>
  consulte.value && {
    chemin: `fichiers-livrables/${consulte.value.id}`,
    nom: consulte.value.nom,
    extension: consulte.value.extension,
  }
)

const ouvrir = (element) => {
  erreur.value = ''
  if (element.type === 'lien') {
    window.open(element.url, '_blank', 'noopener')
    return
  }
  consulte.value = element
}

const telecharger = async (element) => {
  erreur.value = ''
  try {
    await telechargerFichierLivrable(authStore.tenantCourant?.id, element)
  } catch {
    erreur.value = 'Impossible de télécharger ce fichier.'
  }
}

const formatDate = (iso) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="flex flex-wrap items-center gap-2 font-['Plus_Jakarta_Sans']">
      <span class="text-sm font-semibold text-gray-900">Dépôt n°{{ depot.numero }}</span>
      <span
        v-if="depot.en_retard"
        class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200"
      >
        En retard
      </span>
      <span class="text-xs text-zinc-400">· {{ formatDate(depot.date_depot) }}</span>
      <span class="ml-auto text-xs text-zinc-500">
        <template v-if="afficherCible && depot.cible?.type === 'groupe'">
          Groupe {{ depot.cible.nom }} · déposé par {{ depot.deposant_nom }}
        </template>
        <template v-else>{{ depot.deposant_nom }}</template>
      </span>
    </div>

    <p v-if="depot.commentaire" class="mt-2 whitespace-pre-line font-['Plus_Jakarta_Sans'] text-sm text-zinc-600">
      {{ depot.commentaire }}
    </p>

    <ul class="mt-3 flex flex-col gap-1.5">
      <li v-for="el in depot.fichiers" :key="el.id" class="flex items-center gap-2">
        <button
          type="button"
          class="flex min-w-0 items-center gap-2 text-left font-['Plus_Jakarta_Sans'] text-sm text-indigo-600 hover:underline"
          :title="el.type === 'lien' ? 'Ouvrir le lien' : 'Consulter'"
          @click="ouvrir(el)"
        >
          <i :class="el.type === 'lien' ? 'fa-solid fa-link' : 'fa-solid fa-eye'" class="text-xs"></i>
          <span class="truncate">{{ el.nom }}</span>
        </button>
        <button
          v-if="el.type === 'fichier'"
          type="button"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-slate-100 hover:text-zinc-600"
          title="Télécharger"
          aria-label="Télécharger"
          @click="telecharger(el)"
        >
          <i class="fa-solid fa-download text-xs"></i>
        </button>
      </li>
    </ul>
    <p v-if="erreur" class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-red-600">{{ erreur }}</p>

    <VisionneuseFichier
      :fichier="fichierConsulte"
      :telecharger="() => telechargerFichierLivrable(authStore.tenantCourant?.id, consulte)"
      @fermer="consulte = null"
    />
  </div>
</template>

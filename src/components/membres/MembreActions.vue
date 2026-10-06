<script setup>
/**
 * MembreActions — boutons icône d'une ligne de membre
 * (libellé affiché au survol).
 *
 * - Renvoyer l'invitation : seulement si le compte est « En attente »
 * - Suspendre / Réactiver l'accès à l'organisme
 *
 * Émet : 'renvoyer', 'suspendre'
 */
defineProps({
  membre:  { type: Object, required: true },
  renvoi:  { type: Boolean, default: false }, // renvoi en cours
})

defineEmits(['renvoyer', 'suspendre'])

const bouton = 'group/action relative flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-wait disabled:opacity-60'
const bulle = "pointer-events-none absolute right-full top-1/2 mr-1.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 font-['Plus_Jakarta_Sans'] text-xs font-medium text-white opacity-0 shadow transition group-hover/action:opacity-100"
</script>

<template>
  <div class="flex items-center justify-end gap-1">
    <button
      v-if="!membre.utilisateur_actif"
      type="button"
      :class="[bouton, 'text-indigo-600 hover:bg-indigo-50']"
      :disabled="renvoi"
      aria-label="Renvoyer l'invitation"
      @click.stop="$emit('renvoyer')"
    >
      <i :class="renvoi ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'" class="text-xs"></i>
      <span :class="bulle">Renvoyer l'invitation</span>
    </button>

    <button
      type="button"
      :class="[bouton, membre.actif ? 'text-red-600 hover:bg-red-50' : 'text-indigo-600 hover:bg-indigo-50']"
      :aria-label="membre.actif ? 'Suspendre' : 'Réactiver'"
      @click.stop="$emit('suspendre')"
    >
      <i :class="membre.actif ? 'fa-solid fa-pause' : 'fa-solid fa-play'" class="text-xs"></i>
      <span :class="bulle">{{ membre.actif ? 'Suspendre' : 'Réactiver' }}</span>
    </button>
  </div>
</template>

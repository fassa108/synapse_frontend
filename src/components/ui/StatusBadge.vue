<script setup>
import { computed } from 'vue'

/**
 * StatusBadge — badge de statut coloré.
 *
 * Props :
 *   - value  : valeur brute (true/false, 'PUBLIE', etc.)
 *   - type   : 'boolean' | 'compte' | 'organisme' | 'membre' | 'promotion' | 'brief' | 'livrable'
 *
 * Types :
 *   - 'boolean' : Actif / Inactif     → MembreTenant.actif (appartenance à l'organisme)
 *   - 'compte'  : Activé / En attente → Utilisateur.actif (compte utilisateur activé)
 *   - 'organisme': Actif / Suspendu   → Tenant.statut
 *   - 'membre'   : Actif / Suspendu   → MembreTenant.actif (accès à l'organisme)
 *   - 'promotion': Ouverte / Clôturée → Promotion.actif
 *   - 'brief'   : statuts BROUILLON / PUBLIE / TERMINE / ARCHIVE
 *   - 'livrable': statuts SOUMIS / INVALIDE / RETENU
 */
const props = defineProps({
  value: {
    required: true,
  },
  type: {
    type: String,
    default: 'boolean',
  },
})

const config = computed(() => {
  if (props.type === 'boolean') {
    return props.value
      ? { label: 'Actif',   classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' }
      : { label: 'Inactif', classes: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200' }
  }

  if (props.type === 'compte') {
    return props.value
      ? { label: 'Activé',     classes: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' }
      : { label: 'En attente', classes: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' }
  }

  if (props.type === 'organisme' || props.type === 'membre') {
    return props.value
      ? { label: 'Actif',    classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' }
      : { label: 'Suspendu', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' }
  }

  if (props.type === 'promotion') {
    return props.value
      ? { label: 'Ouverte',   classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' }
      : { label: 'Clôturée',  classes: 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200' }
  }

  if (props.type === 'brief') {
    const map = {
      BROUILLON: { label: 'Brouillon', classes: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200' },
      PUBLIE:    { label: 'Publié',    classes: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
      TERMINE:   { label: 'Terminé',  classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
      ARCHIVE:   { label: 'Archivé',  classes: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200' },
    }
    return map[props.value] ?? { label: props.value, classes: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200' }
  }

  if (props.type === 'livrable') {
    const map = {
      SOUMIS:   { label: 'Soumis',   classes: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
      INVALIDE: { label: 'Invalide', classes: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
      RETENU:   { label: 'Retenu',   classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
    }
    return map[props.value] ?? { label: props.value, classes: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200' }
  }

  return { label: String(props.value), classes: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200' }
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-medium leading-4"
    :class="config.classes"
  >
    {{ config.label }}
  </span>
</template>

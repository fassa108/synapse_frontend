<script setup>
/**
 * FormField — wrapper d'un champ de formulaire.
 * Gère le label, l'indication obligatoire et l'affichage d'erreur.
 *
 * Props :
 *   - label    : libellé du champ
 *   - error    : message d'erreur (string)
 *   - required : bool
 *   - hint     : texte d'aide sous le champ
 */
defineProps({
  label: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  hint: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-if="label"
      class="font-['Plus_Jakarta_Sans'] text-xs font-semibold leading-4 text-zinc-700"
    >
      {{ label }}
      <span v-if="required" class="ml-0.5 text-red-500" aria-hidden="true">*</span>
    </label>

    <!-- Slot pour l'input réel -->
    <slot />

    <p
      v-if="error"
      class="font-['Plus_Jakarta_Sans'] text-xs text-red-600"
      role="alert"
    >
      {{ error }}
    </p>

    <p
      v-else-if="hint"
      class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400"
    >
      {{ hint }}
    </p>
  </div>
</template>

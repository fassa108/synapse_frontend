<script setup>
/**
 * TextInput / Textarea — input texte réutilisable.
 *
 * Props :
 *   - modelValue
 *   - type       : 'text' | 'email' | 'date' | 'number' | 'textarea'
 *   - placeholder
 *   - disabled
 *   - rows       : pour textarea
 */
defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  placeholder: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  rows: {
    type: Number,
    default: 4,
  },
})

defineEmits(['update:modelValue'])

const baseClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-4 font-[\'Plus_Jakarta_Sans\'] text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-zinc-400 disabled:cursor-not-allowed transition aria-invalid:border-red-300 aria-invalid:focus:border-red-500 aria-invalid:focus:ring-red-500/5'
</script>

<template>
  <textarea
    v-if="type === 'textarea'"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :rows="rows"
    @input="$emit('update:modelValue', $event.target.value)"
    class="py-3"
    :class="baseClasses"
  ></textarea>

  <input
    v-else
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="$emit('update:modelValue', $event.target.value)"
    class="h-11"
    :class="baseClasses"
  />
</template>

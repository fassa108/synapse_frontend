<script setup>
/**
 * AppPagination — pagination simple.
 *
 * Props :
 *   - page       : page courante (1-indexed)
 *   - total      : nombre total d'éléments
 *   - pageSize   : éléments par page (défaut 20)
 *
 * Émits : update:page
 */
import { computed } from 'vue'

const props = defineProps({
  page: {
    type: Number,
    default: 1,
  },
  total: {
    type: Number,
    default: 0,
  },
  pageSize: {
    type: Number,
    default: 20,
  },
})

const emit = defineEmits(['update:page'])

const totalPages = computed(() => Math.ceil(props.total / props.pageSize) || 1)

const from = computed(() => (props.page - 1) * props.pageSize + 1)
const to = computed(() => Math.min(props.page * props.pageSize, props.total))

const canPrev = computed(() => props.page > 1)
const canNext = computed(() => props.page < totalPages.value)

const prev = () => canPrev.value && emit('update:page', props.page - 1)
const next = () => canNext.value && emit('update:page', props.page + 1)
</script>

<template>
  <div
    v-if="total > 0"
    class="flex items-center justify-between px-1"
  >
    <span class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
      {{ from }}–{{ to }} sur {{ total }}
    </span>

    <div class="flex items-center gap-1">
      <button
        type="button"
        :disabled="!canPrev"
        @click="prev"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-zinc-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page précédente"
      >
        <i class="fa-solid fa-chevron-left text-xs"></i>
      </button>

      <span
        class="min-w-[2.5rem] text-center font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900"
      >
        {{ page }} / {{ totalPages }}
      </span>

      <button
        type="button"
        :disabled="!canNext"
        @click="next"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-zinc-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page suivante"
      >
        <i class="fa-solid fa-chevron-right text-xs"></i>
      </button>
    </div>
  </div>
</template>

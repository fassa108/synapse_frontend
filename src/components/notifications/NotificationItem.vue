<script setup>
import { computed } from 'vue'
import { ilYa } from '../../utils/dates'
import { apparenceNotification } from '../../utils/notifications'

const props = defineProps({
  notification: { type: Object, required: true },
  // Menu de la cloche : textes sur une ligne
  compact: { type: Boolean, default: false },
})

defineEmits(['ouvrir'])

const apparence = computed(() => apparenceNotification(props.notification.type))
</script>

<template>
  <button
    type="button"
    class="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
    :class="notification.lue ? '' : 'bg-indigo-50/40'"
    @click="$emit('ouvrir', notification)"
  >
    <span
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      :class="apparence.classes"
      aria-hidden="true"
    >
      <i class="fa-solid text-xs" :class="apparence.icone"></i>
    </span>

    <span class="min-w-0 flex-1">
      <span
        class="block font-['Plus_Jakarta_Sans'] text-sm leading-5 text-gray-900"
        :class="[notification.lue ? 'font-normal' : 'font-semibold', compact ? 'truncate' : '']"
      >
        {{ notification.titre }}
      </span>
      <span
        v-if="notification.message"
        class="block font-['Plus_Jakarta_Sans'] text-xs leading-4 text-zinc-500"
        :class="compact ? 'line-clamp-2' : ''"
      >
        {{ notification.message }}
      </span>
      <span class="mt-1 block font-['Plus_Jakarta_Sans'] text-[11px] text-zinc-400">
        {{ ilYa(notification.date_creation) }}
      </span>
    </span>

    <span
      v-if="!notification.lue"
      class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
      aria-label="Non lue"
    ></span>
  </button>
</template>

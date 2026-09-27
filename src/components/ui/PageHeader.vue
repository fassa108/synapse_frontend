<script setup>
defineProps({
  titre: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 class="font-['Sora'] text-xl font-semibold leading-7 text-gray-900">
        {{ titre }}
      </h1>
      <p
        v-if="description"
        class="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500"
      >
        {{ description }}
      </p>
    </div>

    <div
      v-if="$slots.actions"
      class="mt-3 flex shrink-0 items-center gap-2 sm:mt-0"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

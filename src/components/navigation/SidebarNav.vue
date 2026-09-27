<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <nav class="flex flex-col gap-0.5" aria-label="Navigation principale">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      custom
      v-slot="{ isActive, navigate }"
    >
      <a
        @click="navigate"
        class="flex items-center gap-3 rounded-lg px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium transition-colors"
        :class="
          isActive
            ? 'bg-indigo-500 text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        "
      >
        <i
          :class="[
            item.icon,
            'w-4 shrink-0 text-center text-sm',
            isActive ? 'text-white' : 'text-gray-400',
          ]"
        ></i>
        <span>{{ item.label }}</span>
      </a>
    </RouterLink>
  </nav>
</template>

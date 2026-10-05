<script setup>
import { useRoute } from 'vue-router'

defineProps({
  items: {
    type: Array,
    required: true,
  },
  // Sidebar réduite (desktop) : icônes seules, libellé en infobulle
  reduite: {
    type: Boolean,
    default: false,
  },
})

const route = useRoute()

// Actif aussi sur les sous-pages : /promotions/4 ou /promotions/creer
// gardent « Promotions » sélectionné (les routes ne sont pas imbriquées).
const estActif = (to) => route.path === to || route.path.startsWith(`${to}/`)
</script>

<template>
  <nav class="flex flex-col gap-0.5" aria-label="Navigation principale">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      custom
      v-slot="{ href, navigate }"
    >
      <a
        :href="href"
        @click="navigate"
        :title="reduite ? item.label : undefined"
        class="flex items-center gap-3 rounded-lg px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium transition-colors"
        :class="[
          estActif(item.to)
            ? 'bg-indigo-500 text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          reduite ? 'lg:justify-center lg:px-0' : '',
        ]"
      >
        <i
          :class="[
            item.icon,
            'w-4 shrink-0 text-center text-sm',
            estActif(item.to) ? 'text-white' : 'text-gray-400',
          ]"
        ></i>
        <span :class="reduite ? 'lg:hidden' : ''">{{ item.label }}</span>
      </a>
    </RouterLink>
  </nav>
</template>

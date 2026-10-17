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
    <template v-for="item in items" :key="item.to ?? item.rubrique">
    <!-- Titre de rubrique ; sidebar réduite : simple séparateur -->
    <p
      v-if="item.rubrique"
      class="mt-4 mb-1 px-3 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold uppercase tracking-wider text-gray-400"
      :class="reduite ? 'lg:mx-2 lg:mt-3 lg:mb-2 lg:h-px lg:overflow-hidden lg:bg-gray-200 lg:p-0 lg:text-transparent' : ''"
    >
      {{ item.rubrique }}
    </p>
    <RouterLink
      v-else
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
    </template>
  </nav>
</template>

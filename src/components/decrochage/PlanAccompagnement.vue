<script setup>
/**
 * Plan d'accompagnement destiné à l'apprenant : message d'encouragement
 * et étapes numérotées (reliées à un brief quand l'IA l'indique).
 */
defineProps({
  plan: { type: Object, required: true },
})
</script>

<template>
  <div>
    <p class="font-['Plus_Jakarta_Sans'] text-sm leading-6 text-zinc-700">{{ plan.message }}</p>
    <ol class="mt-3 flex flex-col gap-3">
      <li v-for="(etape, i) in plan.etapes" :key="i" class="flex gap-3">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-['Plus_Jakarta_Sans'] text-xs font-bold text-indigo-600">
          {{ i + 1 }}
        </span>
        <div class="min-w-0">
          <p class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">{{ etape.titre }}</p>
          <p class="font-['Plus_Jakarta_Sans'] text-sm leading-5 text-zinc-600">{{ etape.detail }}</p>
          <p v-if="etape.brief" class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
            <i class="fa-solid fa-clipboard-list mr-1 text-[10px]"></i>{{ etape.brief }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>

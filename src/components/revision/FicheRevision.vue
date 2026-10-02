<script setup>
/**
 * FicheRevision — affichage d'une fiche de révision
 * ({ titre, resume, sections: [{ titre, points }], a_retenir }).
 * Texte simple uniquement (aucun HTML interprété).
 */
defineProps({
  contenu: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <article class="flex flex-col gap-5 font-['Plus_Jakarta_Sans']">
    <p class="text-sm leading-relaxed text-zinc-600">{{ contenu.resume }}</p>

    <section v-for="(section, i) in contenu.sections" :key="i">
      <h3 class="font-['Sora'] text-sm font-semibold text-gray-900">{{ section.titre }}</h3>
      <ul class="mt-2 flex flex-col gap-1.5">
        <li v-for="(point, j) in section.points" :key="j" class="flex gap-2 text-sm leading-relaxed text-zinc-700">
          <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400"></span>
          <span>{{ point }}</span>
        </li>
      </ul>
    </section>

    <section class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
      <h3 class="flex items-center gap-2 font-['Sora'] text-sm font-semibold text-indigo-700">
        <i class="fa-solid fa-lightbulb"></i> À retenir
      </h3>
      <ul class="mt-2 flex flex-col gap-1.5">
        <li v-for="(point, j) in contenu.a_retenir" :key="j" class="flex gap-2 text-sm leading-relaxed text-indigo-900">
          <i class="fa-solid fa-check mt-1 text-xs text-indigo-500"></i>
          <span>{{ point }}</span>
        </li>
      </ul>
    </section>
  </article>
</template>

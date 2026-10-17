<script setup>
/**
 * GraphiquesRapport — graphiques d'un rapport, à partir des chiffres figés
 * par le backend (rapport.donnees) ; mêmes couleurs que le PDF.
 *
 * Rapport de promotion : état des rendus, apprenants par niveau de
 * progression, femmes et hommes (répartition et résultats), bilan par brief.
 * Bilan individuel : état des rendus, compétences acquises par module.
 * Un rapport ancien, sans ces chiffres, n'affiche rien.
 *
 * Props : donnees (rapport.donnees), bilan (bilan individuel)
 */
import { computed } from 'vue'
import Graphique from '../progression/Graphique.vue'

const props = defineProps({
  donnees: { type: Object, required: true },
  bilan: { type: Boolean, default: false },
})

const ETATS = [
  { cle: 'VALIDE', libelle: 'Validés', couleur: '#10b981' },
  { cle: 'NON_VALIDE', libelle: 'Non validés', couleur: '#ef4444' },
  { cle: 'A_EVALUER', libelle: 'À évaluer', couleur: '#0ea5e9' },
  { cle: 'NON_RENDU', libelle: 'Non rendus (échus)', couleur: '#f59e0b' },
  { cle: 'A_RENDRE', libelle: 'À rendre', couleur: '#cbd5e1' },
]
const GENRES = { F: '#8b5cf6', H: '#14b8a6', '': '#94a3b8' }
const TRANCHES = ['#f87171', '#fbbf24', '#60a5fa', '#34d399']

const legendeBas = { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } }
const pourcent = { min: 0, max: 100, ticks: { stepSize: 25, callback: (v) => `${v} %` }, grid: { color: '#f1f5f9' } }

// ─── État des rendus ─────────────────────────────────────────────────────────

const etats = computed(() => {
  const e = props.donnees.etats
  if (!e) return null
  const presents = ETATS.filter((s) => e[s.cle])
  return presents.length ? { segments: presents.map((s) => ({ ...s, valeur: e[s.cle] })), total: presents.reduce((t, s) => t + e[s.cle], 0) } : null
})

const anneau = (segments, unite) => ({
  data: {
    labels: segments.map((s) => s.libelle),
    datasets: [{ data: segments.map((s) => s.valeur), backgroundColor: segments.map((s) => s.couleur), borderWidth: 0 }],
  },
  options: {
    cutout: '68%',
    plugins: {
      legend: { ...legendeBas, position: 'right' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((t, v) => t + v, 0)
            return ` ${ctx.raw} ${unite} (${Math.round((100 * ctx.raw) / total)} %)`
          },
        },
      },
    },
  },
})

const anneauEtats = computed(() => etats.value && anneau(etats.value.segments, 'rendus'))

// ─── Apprenants par niveau de progression ────────────────────────────────────

const histogramme = computed(() => {
  const t = props.donnees.tranches
  if (!t?.some((x) => x.nb)) return null
  return {
    data: {
      labels: t.map((x) => x.tranche),
      datasets: [{ label: 'Apprenants', data: t.map((x) => x.nb), backgroundColor: TRANCHES, borderRadius: 6, maxBarThickness: 48 }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } },
    },
  }
})

// ─── Femmes et hommes ─────────────────────────────────────────────────────────

const genre = computed(() => props.donnees.genre ?? [])
const genreRenseigne = computed(() => genre.value.some((g) => g.code))

const anneauGenre = computed(() =>
  genreRenseigne.value
    ? anneau(genre.value.map((g) => ({ libelle: g.libelle, valeur: g.nb, couleur: GENRES[g.code] })), 'apprenants')
    : null,
)

const comparaisonGenre = computed(() => {
  if (!genreRenseigne.value) return null
  return {
    data: {
      labels: ['Progression', 'Taux de rendu', 'Taux de validation'],
      datasets: genre.value.map((g) => ({
        label: `${g.libelle} (${g.nb})`,
        data: [g.progression_pct, g.taux_rendu, g.taux_validation],
        backgroundColor: GENRES[g.code],
        borderRadius: 4,
        maxBarThickness: 28,
      })),
    },
    options: {
      plugins: { legend: legendeBas, tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label} : ${ctx.raw} %` } } },
      scales: { y: pourcent, x: { grid: { display: false } } },
    },
  }
})

// ─── Bilan par brief (barres empilées) ────────────────────────────────────────

const bilanBriefs = computed(() => {
  const lignes = props.donnees.bilan_briefs
  if (!lignes?.length) return null
  const valeur = {
    VALIDE: (l) => l.valides,
    NON_VALIDE: (l) => l.non_valides,
    A_EVALUER: (l) => l.a_evaluer,
    NON_RENDU: (l) => (l.echu ? l.non_rendus : 0),
    A_RENDRE: (l) => (l.echu ? 0 : l.non_rendus),
  }
  return {
    hauteur: `${Math.max(10, lignes.length * 2.6 + 4)}rem`,
    data: {
      labels: lignes.map((l) => (l.titre.length > 32 ? `${l.titre.slice(0, 31)}…` : l.titre)),
      datasets: ETATS.map((s) => ({
        label: s.libelle,
        data: lignes.map(valeur[s.cle]),
        backgroundColor: s.couleur,
        maxBarThickness: 22,
      })),
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: legendeBas,
        tooltip: { callbacks: { title: (items) => lignes[items[0].dataIndex].titre } },
      },
      scales: {
        x: { stacked: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
        y: { stacked: true, grid: { display: false } },
      },
    },
  }
})

// ─── Bilan individuel : compétences par module ────────────────────────────────

const parModule = computed(() => {
  const modules = props.donnees.par_module
  if (!modules?.length) return null
  return {
    hauteur: `${Math.max(8, modules.length * 2.4 + 3)}rem`,
    data: {
      labels: modules.map((m) => m.nom),
      datasets: [{
        label: 'Compétences acquises',
        data: modules.map((m) => m.pct),
        backgroundColor: '#6366f1',
        borderRadius: 4,
        maxBarThickness: 20,
      }],
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${modules[ctx.dataIndex].acquises} / ${modules[ctx.dataIndex].total} (${ctx.raw} %)` } },
      },
      scales: { x: pourcent, y: { grid: { display: false } } },
    },
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Vue d'ensemble -->
    <div v-if="anneauEtats || histogramme || parModule" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section v-if="anneauEtats" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">État des rendus</h2>
        <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ etats.total }} rendus attendus</p>
        <div class="mt-3 h-52"><Graphique type="doughnut" :data="anneauEtats.data" :options="anneauEtats.options" /></div>
      </section>

      <section v-if="histogramme" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Apprenants par niveau de progression</h2>
        <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Part du référentiel validée</p>
        <div class="mt-3 h-52"><Graphique type="bar" :data="histogramme.data" :options="histogramme.options" /></div>
      </section>

      <section v-if="parModule" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Compétences acquises par module</h2>
        <div class="mt-3" :style="{ height: parModule.hauteur }">
          <Graphique type="bar" :data="parModule.data" :options="parModule.options" />
        </div>
      </section>
    </div>

    <!-- Femmes et hommes -->
    <section v-if="!bilan && genre.length" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Femmes et hommes</h2>
      <p v-if="!genreRenseigne" class="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
        <i class="fa-solid fa-circle-info mr-1 text-zinc-400"></i>
        Genre non renseigné pour les apprenants de cette promotion : il se complète depuis la fiche de chaque apprenant.
      </p>
      <div v-else class="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div class="h-52 lg:col-span-2"><Graphique type="doughnut" :data="anneauGenre.data" :options="anneauGenre.options" /></div>
        <div class="h-60 lg:col-span-3"><Graphique type="bar" :data="comparaisonGenre.data" :options="comparaisonGenre.options" /></div>
      </div>
    </section>

    <!-- Bilan par brief -->
    <section v-if="bilanBriefs" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Bilan par brief</h2>
      <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Rendus attendus de chaque brief, par état</p>
      <div class="mt-3" :style="{ height: bilanBriefs.hauteur }">
        <Graphique type="bar" :data="bilanBriefs.data" :options="bilanBriefs.options" />
      </div>
    </section>
  </div>
</template>

<script setup>
/**
 * FinancesPage — Admin SaaS : flux d'argent de la plateforme.
 *
 * Encaissements PayDunya (inscriptions et renouvellements) sur 12 mois,
 * tentatives par statut, abonnements des organismes et échéances proches,
 * dernières transactions (filtrables, export Excel). Les paiements de test
 * (sandbox) et de production sont séparés.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import Graphique from '../../components/progression/Graphique.vue'
import { exporterTransactions, getFinances } from '../../services/abonnement'

const router = useRouter()

const donnees = ref(null)
const chargement = ref(true)
const erreur = ref('')
const mode = ref('')
const statut = ref('')
const type = ref('')
const exportEnCours = ref(false)

const fcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(n ?? 0)} FCFA`
const formatDate = (iso) =>
  iso ? new Date(`${iso}`.length === 10 ? `${iso}T00:00` : iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const params = () => {
  const p = {}
  if (mode.value) p.mode = mode.value
  if (statut.value) p.statut = statut.value
  if (type.value) p.type = type.value
  return p
}

const charger = async () => {
  erreur.value = ''
  try {
    donnees.value = await getFinances(params())
    mode.value = donnees.value.mode
  } catch {
    erreur.value = 'Impossible de charger les finances.'
  } finally {
    chargement.value = false
  }
}

onMounted(charger)
watch([mode, statut, type], (nouveau, ancien) => {
  if (ancien[0] !== '' || nouveau[0] === ancien[0]) charger()
})

const exporter = async () => {
  exportEnCours.value = true
  try {
    await exporterTransactions(params())
  } catch {
    erreur.value = 'L’export a échoué.'
  } finally {
    exportEnCours.value = false
  }
}

const i = computed(() => donnees.value?.indicateurs ?? {})

const cartes = computed(() => [
  {
    libelle: 'Encaissé ce mois-ci',
    valeur: fcfa(i.value.ce_mois),
    detail: i.value.evolution_pct === null || i.value.evolution_pct === undefined
      ? `Mois précédent : ${fcfa(i.value.mois_precedent)}`
      : `${i.value.evolution_pct >= 0 ? '+' : ''}${i.value.evolution_pct} % vs mois précédent`,
    tendance: i.value.evolution_pct > 0 ? 'hausse' : i.value.evolution_pct < 0 ? 'baisse' : '',
    icone: 'fa-solid fa-sack-dollar',
    couleur: 'bg-emerald-50 text-emerald-600',
  },
  {
    libelle: 'Revenu mensuel attendu',
    valeur: fcfa(i.value.revenu_mensuel_attendu),
    detail: 'Abonnements actifs ou en grâce',
    icone: 'fa-solid fa-arrows-rotate',
    couleur: 'bg-indigo-50 text-indigo-600',
  },
  {
    libelle: 'Total encaissé',
    valeur: fcfa(i.value.total),
    detail: `${i.value.nb_reussis ?? 0} paiements · moyenne ${fcfa(i.value.montant_moyen)}`,
    icone: 'fa-solid fa-coins',
    couleur: 'bg-violet-50 text-violet-600',
  },
  {
    libelle: 'Conversion des inscriptions',
    valeur: `${i.value.taux_conversion ?? 0} %`,
    detail: 'Inscriptions déposées puis payées',
    icone: 'fa-solid fa-filter',
    couleur: 'bg-sky-50 text-sky-600',
  },
])

// ─── Graphiques ───────────────────────────────────────────────────────────────

const donneesMois = computed(() => ({
  labels: (donnees.value?.par_mois ?? []).map((m) => m.mois),
  datasets: [
    { label: 'Inscriptions', data: donnees.value?.par_mois.map((m) => m.inscriptions) ?? [], backgroundColor: '#6366f1', borderRadius: 6, stack: 'a' },
    { label: 'Renouvellements', data: donnees.value?.par_mois.map((m) => m.renouvellements) ?? [], backgroundColor: '#10b981', borderRadius: 6, stack: 'a' },
  ],
}))

const optionsMois = {
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
    tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${fcfa(c.raw)}` } },
  },
  scales: {
    x: { stacked: true, grid: { display: false } },
    y: { stacked: true, ticks: { callback: (v) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v) } },
  },
}

const STATUTS = {
  REUSSI: { libelle: 'Réussis', couleur: '#10b981', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  EN_ATTENTE: { libelle: 'En attente', couleur: '#6366f1', classes: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  ANNULE: { libelle: 'Annulés', couleur: '#cbd5e1', classes: 'bg-slate-100 text-slate-600 ring-slate-200' },
  ECHEC: { libelle: 'Échecs', couleur: '#ef4444', classes: 'bg-red-50 text-red-700 ring-red-200' },
}

const totalTentatives = computed(() => Object.values(donnees.value?.repartition ?? {}).reduce((s, n) => s + n, 0))

const donneesRepartition = computed(() => ({
  labels: Object.keys(STATUTS).map((s) => STATUTS[s].libelle),
  datasets: [{
    data: Object.keys(STATUTS).map((s) => donnees.value?.repartition[s] ?? 0),
    backgroundColor: Object.keys(STATUTS).map((s) => STATUTS[s].couleur),
    borderWidth: 0,
  }],
}))
const optionsRepartition = { cutout: '72%', plugins: { legend: { display: false } } }

const ABONNEMENTS = [
  { cle: 'ACTIF', libelle: 'Actifs', classes: 'text-emerald-600' },
  { cle: 'EN_GRACE', libelle: 'En grâce', classes: 'text-amber-600' },
  { cle: 'EXPIRE', libelle: 'Expirés', classes: 'text-red-600' },
]

const echeance = (e) => {
  if (e.suspendu) return { texte: 'Suspendu', classes: 'bg-red-50 text-red-700' }
  if (e.jours_restants < 0) return { texte: `Échu depuis ${-e.jours_restants} j`, classes: 'bg-amber-50 text-amber-700' }
  if (e.jours_restants === 0) return { texte: 'Aujourd’hui', classes: 'bg-amber-50 text-amber-700' }
  return { texte: `Dans ${e.jours_restants} j`, classes: 'bg-slate-100 text-slate-600' }
}

const optionsStatut = [
  { value: 'REUSSI', label: 'Réussis' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'ANNULE', label: 'Annulés' },
  { value: 'ECHEC', label: 'Échecs' },
]
const optionsType = [
  { value: 'INSCRIPTION', label: 'Inscriptions' },
  { value: 'RENOUVELLEMENT', label: 'Renouvellements' },
]
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader titre="Finances" description="Le flux d’argent de la plateforme : encaissements PayDunya, abonnements et transactions.">
        <template #actions>
          <div class="flex rounded-xl bg-slate-100 p-1 font-['Plus_Jakarta_Sans'] text-sm font-semibold">
            <button
              v-for="m in [{ v: 'test', l: 'Test' }, { v: 'live', l: 'Production' }]"
              :key="m.v"
              type="button"
              class="rounded-lg px-3 py-1.5 transition"
              :class="mode === m.v ? 'bg-white text-gray-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'"
              @click="mode = m.v"
            >
              <i v-if="m.v === 'test'" class="fa-solid fa-flask mr-1 text-xs"></i>{{ m.l }}
            </button>
          </div>
        </template>
      </PageHeader>

      <div v-if="chargement" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>
      <InfoBanner v-else-if="!donnees" variant="error" :message="erreur" class="mt-6" />

      <template v-else>
        <InfoBanner v-if="erreur" variant="error" :message="erreur" class="mt-6" />
        <InfoBanner
          v-if="mode === 'test'"
          variant="warning"
          message="Paiements de test (sandbox PayDunya) : aucun argent réel. Les revenus de production sont dans l’onglet « Production »."
          class="mt-6"
        />

        <!-- Indicateurs -->
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div v-for="c in cartes" :key="c.libelle" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <p class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">{{ c.libelle }}</p>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg" :class="c.couleur"><i :class="c.icone" class="text-sm"></i></span>
            </div>
            <p class="mt-3 font-['Sora'] text-2xl font-semibold text-gray-900">{{ c.valeur }}</p>
            <p
              class="mt-1 font-['Plus_Jakarta_Sans'] text-xs"
              :class="c.tendance === 'hausse' ? 'text-emerald-600' : c.tendance === 'baisse' ? 'text-red-600' : 'text-zinc-500'"
            >
              <i v-if="c.tendance" :class="c.tendance === 'hausse' ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'" class="mr-1"></i>{{ c.detail }}
            </p>
          </div>
        </div>

        <!-- Graphiques -->
        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Encaissements par mois</h2>
            <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">12 derniers mois, paiements réussis</p>
            <div class="mt-4 h-64"><Graphique type="bar" :data="donneesMois" :options="optionsMois" /></div>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Tentatives de paiement</h2>
            <div class="relative mx-auto mt-4 h-40 w-40">
              <Graphique type="doughnut" :data="donneesRepartition" :options="optionsRepartition" />
              <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span class="font-['Sora'] text-2xl font-semibold text-gray-900">{{ totalTentatives }}</span>
                <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">tentatives</span>
              </div>
            </div>
            <ul class="mt-4 grid grid-cols-2 gap-2 font-['Plus_Jakarta_Sans'] text-sm">
              <li v-for="(s, cle) in STATUTS" :key="cle" class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: s.couleur }"></span>
                <span class="text-zinc-600">{{ s.libelle }}</span>
                <span class="ml-auto font-semibold tabular-nums text-gray-900">{{ donnees.repartition[cle] }}</span>
              </li>
            </ul>
          </section>
        </div>

        <!-- Abonnements -->
        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Abonnements</h2>
            <dl class="mt-4 grid grid-cols-3 gap-3 text-center">
              <div v-for="a in ABONNEMENTS" :key="a.cle" class="rounded-xl bg-slate-50 py-3">
                <dd class="font-['Sora'] text-2xl font-semibold" :class="a.classes">{{ donnees.abonnements[a.cle] }}</dd>
                <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">{{ a.libelle }}</dt>
              </div>
            </dl>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Échéances des 14 prochains jours</h2>
            <p v-if="!donnees.echeances.length" class="mt-3 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
              <i class="fa-solid fa-circle-check mr-1 text-emerald-500"></i>Aucun abonnement à échéance.
            </p>
            <ul v-else class="mt-3 divide-y divide-slate-100">
              <li v-for="e in donnees.echeances" :key="e.organisme_id" class="flex items-center justify-between gap-3 py-2.5 font-['Plus_Jakarta_Sans'] text-sm">
                <button type="button" class="truncate text-left font-medium text-gray-900 hover:text-indigo-600" @click="router.push(`/admin/organismes/${e.organisme_id}`)">
                  {{ e.organisme }}
                </button>
                <span class="flex shrink-0 items-center gap-3">
                  <span class="text-zinc-500">{{ formatDate(e.date_fin) }}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="echeance(e).classes">{{ echeance(e).texte }}</span>
                </span>
              </li>
            </ul>
          </section>
        </div>

        <!-- Transactions -->
        <section class="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Transactions</h2>
            <div class="flex flex-wrap items-center gap-2">
              <div class="w-40"><AppSelect v-model="type" :options="optionsType" placeholder="Tous les types" placeholder-selectable /></div>
              <div class="w-40"><AppSelect v-model="statut" :options="optionsStatut" placeholder="Tous les statuts" placeholder-selectable /></div>
              <AppButton variant="secondary" icon="fa-solid fa-file-excel" :loading="exportEnCours" @click="exporter">Exporter</AppButton>
            </div>
          </div>
          <p v-if="!donnees.transactions.length" class="px-6 py-8 text-center font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
            Aucune transaction.
          </p>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[52rem] font-['Plus_Jakarta_Sans'] text-sm">
              <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th class="px-6 py-2.5">Date</th>
                  <th class="px-3 py-2.5">Organisme</th>
                  <th class="px-3 py-2.5">Type</th>
                  <th class="px-3 py-2.5">Statut</th>
                  <th class="px-3 py-2.5 text-right">Montant</th>
                  <th class="px-3 py-2.5">Référence</th>
                  <th class="px-6 py-2.5">Reçu</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="t in donnees.transactions" :key="t.id">
                  <td class="whitespace-nowrap px-6 py-3 text-zinc-600">{{ formatDate(t.date) }}</td>
                  <td class="px-3 py-3 font-medium text-gray-900">{{ t.organisme || '—' }}</td>
                  <td class="px-3 py-3 text-zinc-600">{{ t.type_libelle }}</td>
                  <td class="px-3 py-3">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ring-1" :class="STATUTS[t.statut]?.classes">{{ t.statut_libelle }}</span>
                  </td>
                  <td class="px-3 py-3 text-right font-semibold tabular-nums" :class="t.statut === 'REUSSI' ? 'text-gray-900' : 'text-zinc-400'">
                    {{ fcfa(t.montant) }}
                  </td>
                  <td class="max-w-[10rem] truncate px-3 py-3 font-mono text-xs text-zinc-500" :title="t.reference_transaction">{{ t.reference_transaction }}</td>
                  <td class="px-6 py-3">
                    <a v-if="t.url_recu" :href="t.url_recu" target="_blank" rel="noopener noreferrer" class="font-semibold text-indigo-600 hover:text-indigo-700">
                      <i class="fa-solid fa-receipt text-xs"></i>
                    </a>
                    <span v-else class="text-zinc-300">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </AppLayout>
</template>

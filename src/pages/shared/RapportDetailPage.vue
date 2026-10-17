<script setup>
/**
 * RapportDetailPage — un rapport de promotion ou un bilan individuel.
 *
 * Formateur de la promotion / admin : relit et modifie le brouillon rédigé
 * par l'IA, le valide, partage un bilan validé avec l'apprenant, relance un
 * rapport en échec, télécharge le PDF. Apprenant : lit son bilan partagé.
 * Les chiffres et tableaux viennent du backend (figés à la demande).
 * Un rapport en cours de génération est relu toutes les 4 s.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import CourbeEvolution from '../../components/progression/CourbeEvolution.vue'
import GraphiquesRapport from '../../components/rapports/GraphiquesRapport.vue'
import { useAuthStore } from '../../stores/auth'
import {
  getRapport,
  modifierRapport,
  partagerRapport,
  relancerRapport,
  supprimerRapport,
  telechargerPdf,
  validerRapport,
} from '../../services/rapports'
import { miseEnForme } from '../../utils/miseEnForme'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id

const rapport = ref(null)
const chargement = ref(true)
const erreur = ref('')
const action = ref('') // action en cours : 'valider', 'partager', 'pdf'…
let minuterie = null

const estApprenant = computed(() => authStore.role === 'APPRENANT')
const d = computed(() => rapport.value?.donnees ?? {})
const estBilan = computed(() => rapport.value?.type === 'APPRENANT')
const statut = computed(() => rapport.value?.statut)
const pret = computed(() => ['BROUILLON', 'VALIDE'].includes(statut.value))

const titre = computed(() => {
  if (!rapport.value) return 'Rapport'
  return estBilan.value ? `Bilan de ${rapport.value.apprenant_nom}` : `Rapport — ${rapport.value.promotion_nom}`
})
const description = computed(() => {
  if (!rapport.value) return ''
  const morceaux = [d.value.formation, d.value.promotion, d.value.periode]
  return morceaux.filter(Boolean).join(' · ')
})

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

// ─── Chargement et suivi de la génération ────────────────────────────────────

const arreter = () => {
  clearInterval(minuterie)
  minuterie = null
}

const charger = async () => {
  rapport.value = await getRapport(tenantId, route.params.id)
  if (statut.value === 'EN_COURS') suivre()
  else arreter()
}

const suivre = () => {
  if (minuterie) return
  minuterie = setInterval(async () => {
    try {
      await charger()
    } catch {
      arreter()
    }
  }, 4000)
}

onMounted(async () => {
  try {
    await charger()
  } catch {
    erreur.value = 'Rapport introuvable.'
  } finally {
    chargement.value = false
  }
})
onUnmounted(arreter)

// ─── Édition du brouillon ─────────────────────────────────────────────────────

const edition = ref(false)
const brouillon = ref('')
const apercu = ref(false)

const commencerEdition = () => {
  brouillon.value = rapport.value.contenu
  apercu.value = false
  edition.value = true
}

const modifie = computed(() => edition.value && brouillon.value !== rapport.value?.contenu)

const executer = async (nom, appel, messageErreur) => {
  action.value = nom
  erreur.value = ''
  try {
    return await appel()
  } catch (e) {
    erreur.value = e.response?.data?.detail ?? e.response?.data?.contenu ?? messageErreur
    return null
  } finally {
    action.value = ''
  }
}

const enregistrer = async () => {
  const maj = await executer('enregistrer', () => modifierRapport(tenantId, rapport.value.id, brouillon.value),
    "Impossible d'enregistrer le texte.")
  if (maj) {
    rapport.value = maj
    edition.value = false
  }
}

const valider = async () => {
  if (modifie.value) {
    await enregistrer()
    if (edition.value) return
  }
  const maj = await executer('valider', () => validerRapport(tenantId, rapport.value.id), 'Impossible de valider le rapport.')
  if (maj) {
    rapport.value = maj
    edition.value = false
  }
}

const partager = async () => {
  const maj = await executer('partager', () => partagerRapport(tenantId, rapport.value.id), 'Impossible de partager le bilan.')
  if (maj) rapport.value = maj
}

const relancer = async () => {
  const maj = await executer('relancer', () => relancerRapport(tenantId, rapport.value.id), 'Impossible de relancer la génération.')
  if (maj) {
    rapport.value = maj
    suivre()
  }
}

const pdf = () => executer('pdf', () => telechargerPdf(tenantId, rapport.value.id), 'Le PDF n’a pas pu être généré.')

// ─── Suppression ──────────────────────────────────────────────────────────────

const confirmation = ref(false)
const supprimer = async () => {
  const ok = await executer('supprimer', () => supprimerRapport(tenantId, rapport.value.id), 'Impossible de supprimer le rapport.')
  confirmation.value = false
  if (ok !== null) router.push('/rapports')
}

const peutSupprimer = computed(
  () => !estApprenant.value && (statut.value !== 'VALIDE' || authStore.role === 'ADMINISTRATEUR'),
)

// ─── Affichage ────────────────────────────────────────────────────────────────

const serieEvolution = computed(() => [
  { label: estBilan.value ? 'Progression' : 'Moyenne de la promotion', points: d.value.evolution ?? [] },
])

const classeNiveau = (niveau) => (niveau?.includes('risque') ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-700 ring-amber-200')

const etatBrief = {
  Validé: 'text-emerald-700',
  'Non validé': 'text-red-600',
  'À évaluer': 'text-sky-700',
  'Non rendu': 'text-red-600',
  'À rendre': 'text-zinc-500',
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <div v-if="chargement" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>
      <InfoBanner v-else-if="!rapport" variant="error" :message="erreur" />

      <template v-else>
        <PageHeader :titre="titre" :description="description">
          <template #actions>
            <AppButton variant="secondary" icon="fa-solid fa-arrow-left" @click="router.push('/rapports')">
              Rapports
            </AppButton>
            <AppButton
              v-if="pret"
              :variant="statut === 'VALIDE' ? 'primary' : 'secondary'"
              icon="fa-solid fa-file-pdf"
              :loading="action === 'pdf'"
              @click="pdf"
            >
              PDF
            </AppButton>
            <AppButton
              v-if="peutSupprimer && statut !== 'EN_COURS'"
              variant="ghost"
              icon="fa-solid fa-trash-can"
              aria-label="Supprimer le rapport"
              @click="confirmation = true"
            />
          </template>
        </PageHeader>

        <!-- ── Statut ─────────────────────────────────────────────────────── -->
        <div
          v-if="statut === 'EN_COURS'"
          class="mt-6 flex items-center gap-4 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5"
        >
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
            <i class="fa-solid fa-wand-magic-sparkles animate-pulse"></i>
          </span>
          <div>
            <p class="font-['Sora'] text-sm font-semibold text-gray-900">L'IA rédige le {{ estBilan ? 'bilan' : 'rapport' }}…</p>
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
              À partir des chiffres calculés par EduHub, sans données personnelles. Cela prend quelques secondes.
            </p>
          </div>
        </div>

        <div
          v-else-if="statut === 'ECHEC'"
          class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-5"
        >
          <p class="font-['Plus_Jakarta_Sans'] text-sm text-red-800">
            <i class="fa-solid fa-circle-xmark mr-1.5 text-red-500"></i>{{ rapport.erreur || 'La génération a échoué.' }}
          </p>
          <AppButton icon="fa-solid fa-rotate-right" :loading="action === 'relancer'" @click="relancer">Relancer</AppButton>
        </div>

        <div
          v-else-if="statut === 'BROUILLON' && !estApprenant"
          class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5"
        >
          <div class="flex items-start gap-3">
            <i class="fa-solid fa-pen-to-square mt-0.5 text-amber-500"></i>
            <div>
              <p class="font-['Sora'] text-sm font-semibold text-amber-900">Brouillon rédigé par l'IA</p>
              <p class="font-['Plus_Jakarta_Sans'] text-sm text-amber-800">
                Relisez et ajustez le texte, puis validez-le. Une fois validé, il n'est plus modifiable.
              </p>
            </div>
          </div>
          <AppButton icon="fa-solid fa-check" :loading="action === 'valider' || action === 'enregistrer'" @click="valider">
            Valider
          </AppButton>
        </div>

        <div
          v-else-if="statut === 'VALIDE'"
          class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <p class="font-['Plus_Jakarta_Sans'] text-sm text-emerald-800">
            <i class="fa-solid fa-circle-check mr-1.5 text-emerald-500"></i>
            Validé<template v-if="rapport.valide_par_nom"> par <strong>{{ rapport.valide_par_nom }}</strong></template>
            le {{ formatDate(rapport.date_validation) }}
          </p>
          <template v-if="estBilan && !estApprenant">
            <span v-if="rapport.partage" class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-emerald-700">
              <i class="fa-solid fa-share-nodes mr-1"></i>Partagé avec l'apprenant
            </span>
            <AppButton v-else icon="fa-solid fa-share-nodes" :loading="action === 'partager'" @click="partager">
              Partager avec l'apprenant
            </AppButton>
          </template>
        </div>

        <InfoBanner v-if="erreur" variant="error" :message="erreur" class="mt-4" />

        <!-- ── Texte et chiffres ──────────────────────────────────────────── -->
        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
                {{ estBilan ? 'Bilan' : 'Rapport' }}
              </h2>
              <div v-if="statut === 'BROUILLON' && !estApprenant" class="flex items-center gap-2">
                <template v-if="edition">
                  <div class="flex rounded-lg bg-slate-100 p-0.5 font-['Plus_Jakarta_Sans'] text-xs font-semibold">
                    <button
                      type="button"
                      class="rounded-md px-2.5 py-1 transition"
                      :class="!apercu ? 'bg-white text-gray-900 shadow-sm' : 'text-zinc-500'"
                      @click="apercu = false"
                    >Texte</button>
                    <button
                      type="button"
                      class="rounded-md px-2.5 py-1 transition"
                      :class="apercu ? 'bg-white text-gray-900 shadow-sm' : 'text-zinc-500'"
                      @click="apercu = true"
                    >Aperçu</button>
                  </div>
                  <AppButton variant="ghost" @click="edition = false">Annuler</AppButton>
                  <AppButton :loading="action === 'enregistrer'" :disabled="!modifie" @click="enregistrer">Enregistrer</AppButton>
                </template>
                <AppButton v-else variant="secondary" icon="fa-solid fa-pen" @click="commencerEdition">Modifier</AppButton>
              </div>
            </div>

            <div v-if="statut === 'EN_COURS'" class="space-y-3">
              <div v-for="n in 6" :key="n" class="h-3.5 animate-pulse rounded bg-slate-100" :style="{ width: `${100 - (n % 3) * 15}%` }"></div>
            </div>
            <p v-else-if="statut === 'ECHEC'" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
              Aucun texte : relancez la génération. Les chiffres ci-contre restent disponibles.
            </p>
            <template v-else-if="edition && !apercu">
              <textarea
                v-model="brouillon"
                class="min-h-[28rem] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-[13px] leading-6 text-gray-800 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                maxlength="30000"
              ></textarea>
              <p class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                <code>## Titre</code> · <code>- puce</code> · <code>1. étape</code> · <code>**gras**</code>
              </p>
            </template>
            <!-- Texte échappé puis mis en forme (utils/miseEnForme.js) : aucun HTML n'est interprété -->
            <div
              v-else
              class="rapport font-['Plus_Jakarta_Sans'] text-sm leading-7 text-zinc-700"
              v-html="miseEnForme(edition ? brouillon : rapport.contenu)"
            ></div>
          </section>

          <aside class="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto lg:-mx-1 lg:px-1 lg:pb-1">
            <div v-if="d.niveau" class="rounded-2xl border p-4 ring-1" :class="classeNiveau(d.niveau)">
              <p class="font-['Sora'] text-sm font-semibold capitalize">{{ d.niveau }}</p>
              <ul class="mt-1 list-disc pl-5 font-['Plus_Jakarta_Sans'] text-xs">
                <li v-for="s in d.signaux" :key="s">{{ s }}</li>
              </ul>
            </div>

            <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Chiffres clés</h2>
              <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Données au {{ d.date }}</p>
              <dl class="mt-4 grid grid-cols-2 gap-2.5">
                <div v-for="i in d.indicateurs" :key="i.libelle" class="rounded-xl bg-slate-50 px-3 py-2.5">
                  <dd class="font-['Sora'] text-lg font-semibold text-gray-900">{{ i.valeur }}</dd>
                  <dt class="font-['Plus_Jakarta_Sans'] text-[11px] leading-4 text-zinc-500">{{ i.libelle }}</dt>
                </div>
              </dl>
            </section>

            <section v-if="(d.evolution ?? []).length > 1" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-3 font-['Sora'] text-sm font-semibold text-gray-900">Évolution</h2>
              <CourbeEvolution :series="serieEvolution" hauteur="11rem" />
            </section>
          </aside>
        </div>

        <!-- ── Graphiques ─────────────────────────────────────────────────── -->
        <GraphiquesRapport :donnees="d" :bilan="estBilan" class="mt-6" />

        <!-- ── Tableaux ───────────────────────────────────────────────────── -->
        <section v-if="d.apprenants?.length" class="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 class="px-6 pt-5 font-['Sora'] text-base font-semibold text-gray-900">Apprenants</h2>
          <div class="mt-3 overflow-x-auto">
            <table class="w-full min-w-[44rem] font-['Plus_Jakarta_Sans'] text-sm">
              <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th class="px-6 py-2.5">Apprenant</th>
                  <th class="px-3 py-2.5">Progression</th>
                  <th class="px-3 py-2.5 text-right">Rendus</th>
                  <th class="px-3 py-2.5 text-right">Validés</th>
                  <th class="px-3 py-2.5 text-right">Retards</th>
                  <th class="px-3 py-2.5">Dernier dépôt</th>
                  <th class="px-6 py-2.5">Suivi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="a in d.apprenants" :key="a.reference">
                  <td class="px-6 py-3">
                    <p class="font-semibold text-gray-900">{{ a.nom }}</p>
                    <p class="text-xs text-zinc-400">{{ a.email }}</p>
                  </td>
                  <td class="px-3 py-3">
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div class="h-full rounded-full bg-indigo-500" :style="{ width: `${a.progression_pct}%` }"></div>
                      </div>
                      <span class="tabular-nums text-zinc-700">{{ a.progression_pct }} %</span>
                    </div>
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">{{ a.rendus }} / {{ a.attendus }}</td>
                  <td class="px-3 py-3 text-right tabular-nums">
                    <template v-if="a.valides !== undefined">
                      <span class="text-emerald-700">{{ a.valides }}</span>
                      <span v-if="a.non_valides" class="text-xs text-red-600"> · {{ a.non_valides }} non</span>
                    </template>
                    <span v-else class="text-zinc-300">—</span>
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums" :class="a.retards ? 'font-semibold text-red-600' : 'text-zinc-500'">{{ a.retards }}</td>
                  <td class="px-3 py-3 text-zinc-600">{{ a.dernier_depot || '—' }}</td>
                  <td class="px-6 py-3">
                    <span v-if="a.niveau" class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1" :class="classeNiveau(a.niveau)">
                      {{ a.niveau }}
                    </span>
                    <span v-else class="text-zinc-300">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="d.competences?.length" class="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="px-6 pt-5">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Compétences travaillées</h2>
            <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              Visées par des briefs échus, de la moins acquise à la plus acquise.
            </p>
          </div>
          <div class="mt-3 overflow-x-auto">
            <table class="w-full min-w-[36rem] font-['Plus_Jakarta_Sans'] text-sm">
              <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th class="px-6 py-2.5">Compétence</th>
                  <th class="px-3 py-2.5">Module</th>
                  <th class="px-3 py-2.5 text-right">Apprenants</th>
                  <th class="px-6 py-2.5">Acquise par</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="c in d.competences" :key="`${c.competence}-${c.niveau}-${c.module}`">
                  <td class="px-6 py-3 text-gray-900">{{ c.competence }} <span class="text-xs text-zinc-400">({{ c.niveau }})</span></td>
                  <td class="px-3 py-3 text-zinc-600">{{ c.module }}</td>
                  <td class="px-3 py-3 text-right tabular-nums">{{ c.apprenants }}</td>
                  <td class="px-6 py-3">
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div class="h-full rounded-full" :class="c.pct < 50 ? 'bg-amber-500' : 'bg-emerald-500'" :style="{ width: `${c.pct}%` }"></div>
                      </div>
                      <span class="tabular-nums text-zinc-700">{{ c.pct }} %</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div v-if="d.modules?.length || d.briefs?.length" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section v-if="d.modules?.length" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Compétences du référentiel</h2>
            <div v-for="m in d.modules" :key="m.nom" class="mt-4">
              <p class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">{{ m.nom }}</p>
              <ul class="mt-2 space-y-1.5">
                <li
                  v-for="c in m.competences"
                  :key="`${c.competence}-${c.niveau}`"
                  class="flex items-center justify-between gap-3 font-['Plus_Jakarta_Sans'] text-sm"
                >
                  <span class="min-w-0 text-gray-800">
                    <i :class="c.valide ? 'fa-solid fa-circle-check text-emerald-500' : 'fa-regular fa-circle text-zinc-300'" class="mr-2"></i>
                    {{ c.competence }} <span class="text-xs text-zinc-400">({{ c.niveau }})</span>
                  </span>
                  <span class="shrink-0 text-xs" :class="c.valide ? 'text-emerald-700' : 'text-zinc-400'">
                    {{ c.valide ? `Acquise le ${c.date_validation}` : 'Non acquise' }}
                  </span>
                </li>
              </ul>
            </div>
          </section>

          <section v-if="d.briefs?.length" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Briefs</h2>
            <ul class="mt-4 divide-y divide-slate-100">
              <li v-for="b in d.briefs" :key="`${b.titre}-${b.date_limite}`" class="flex items-start justify-between gap-3 py-2.5 font-['Plus_Jakarta_Sans'] text-sm">
                <div class="min-w-0">
                  <p class="font-medium text-gray-900">{{ b.titre }}</p>
                  <p class="text-xs text-zinc-500">
                    Échéance {{ b.date_limite }}
                    <template v-if="b.date_rendu"> · rendu le {{ b.date_rendu }}</template>
                    <span v-if="b.en_retard" class="text-red-600"> · en retard</span>
                  </p>
                </div>
                <span class="shrink-0 text-xs font-semibold" :class="etatBrief[b.statut] ?? 'text-zinc-500'">{{ b.statut }}</span>
              </li>
            </ul>
          </section>
        </div>
      </template>

      <!-- Confirmation de suppression -->
      <div v-if="confirmation" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" @click.self="confirmation = false">
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
          <h3 class="font-['Sora'] text-base font-semibold text-gray-900">Supprimer ce rapport ?</h3>
          <p class="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">Le texte et les chiffres enregistrés seront perdus.</p>
          <div class="mt-5 flex justify-end gap-2">
            <AppButton variant="secondary" @click="confirmation = false">Annuler</AppButton>
            <AppButton variant="danger" :loading="action === 'supprimer'" @click="supprimer">Supprimer</AppButton>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.rapport :deep(p.font-semibold) {
  margin-top: 1.25rem;
  margin-bottom: 0.25rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
  color: #4338ca;
}
.rapport :deep(p.font-semibold:first-child) {
  margin-top: 0;
}
.rapport :deep(ul),
.rapport :deep(ol) {
  margin-top: 0.25rem;
}
.rapport :deep(li::marker) {
  color: #818cf8;
}
.rapport :deep(strong) {
  font-weight: 600;
  color: #111827;
}
</style>

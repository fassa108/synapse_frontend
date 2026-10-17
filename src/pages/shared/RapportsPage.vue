<script setup>
/**
 * RapportsPage — rapports de promotion et bilans individuels.
 *
 * Formateur / admin : liste filtrable, et demande d'un nouveau rapport
 * (le texte est rédigé par l'IA, puis relu et validé sur sa page).
 * Apprenant : ses bilans validés et partagés par son formateur.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import FormField from '../../components/ui/FormField.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getInscriptions, getPromotions } from '../../services/pedagogie'
import { demanderRapport, getRapports } from '../../services/rapports'
import { ilYa } from '../../utils/dates'

const router = useRouter()
const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id
const estApprenant = computed(() => authStore.role === 'APPRENANT')

const rapports = ref([])
const promotions = ref([])
const chargement = ref(true)
const erreur = ref('')
const filtreType = ref('')
const filtrePromotion = ref('')
let minuterie = null

const STATUTS = {
  EN_COURS: { label: 'En cours', classes: 'bg-indigo-50 text-indigo-600 ring-indigo-200', icon: 'fa-solid fa-circle-notch animate-spin' },
  BROUILLON: { label: 'Brouillon', classes: 'bg-amber-50 text-amber-700 ring-amber-200', icon: 'fa-solid fa-pen' },
  VALIDE: { label: 'Validé', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: 'fa-solid fa-check' },
  ECHEC: { label: 'Échec', classes: 'bg-red-50 text-red-700 ring-red-200', icon: 'fa-solid fa-xmark' },
}

const charger = async () => {
  const params = {}
  if (filtreType.value) params.type = filtreType.value
  if (filtrePromotion.value) params.promotion = filtrePromotion.value
  rapports.value = await getRapports(tenantId, params)
  // Un rapport en cours : la liste se met à jour toute seule
  clearInterval(minuterie)
  minuterie = rapports.value.some((r) => r.statut === 'EN_COURS') ? setInterval(() => charger().catch(() => {}), 5000) : null
}

onMounted(async () => {
  try {
    await charger()
    if (!estApprenant.value) promotions.value = await getPromotions(tenantId)
  } catch {
    erreur.value = 'Impossible de charger les rapports.'
  } finally {
    chargement.value = false
  }
})
onUnmounted(() => clearInterval(minuterie))

watch([filtreType, filtrePromotion], () => charger().catch(() => (erreur.value = 'Impossible de charger les rapports.')))

const optionsPromotions = computed(() =>
  promotions.value.map((p) => ({ value: String(p.id), label: p.actif ? p.nom : `${p.nom} (clôturée)` })),
)

const titreRapport = (r) => (r.type === 'APPRENANT' ? r.apprenant_nom : r.promotion_nom)

// ─── Nouveau rapport ──────────────────────────────────────────────────────────

const modal = ref(false)
const type = ref('PROMOTION')
const promotionChoisie = ref('')
const apprenantChoisi = ref('')
const inscrits = ref([])
const envoi = ref(false)
const erreurModal = ref('')

const ouvrir = () => {
  type.value = 'PROMOTION'
  promotionChoisie.value = filtrePromotion.value || (promotions.value.find((p) => p.actif)?.id?.toString() ?? '')
  apprenantChoisi.value = ''
  erreurModal.value = ''
  modal.value = true
}

watch(promotionChoisie, async (id) => {
  inscrits.value = []
  apprenantChoisi.value = ''
  if (!id) return
  try {
    const liste = await getInscriptions(tenantId, id)
    inscrits.value = liste.filter((i) => i.actif || i.fermee_par_cloture)
  } catch {
    inscrits.value = []
  }
})

const optionsApprenants = computed(() =>
  inscrits.value
    .map((i) => ({ value: String(i.apprenant), label: `${i.apprenant_prenom} ${i.apprenant_nom}` }))
    .sort((a, b) => a.label.localeCompare(b.label)),
)

const peutDemander = computed(
  () => promotionChoisie.value && (type.value === 'PROMOTION' || apprenantChoisi.value),
)

const demander = async () => {
  envoi.value = true
  erreurModal.value = ''
  try {
    const rapport = await demanderRapport(tenantId, {
      type: type.value,
      promotion: Number(promotionChoisie.value),
      apprenant: type.value === 'APPRENANT' ? Number(apprenantChoisi.value) : null,
    })
    router.push(`/rapports/${rapport.id}`)
  } catch (e) {
    erreurModal.value = e.response?.data?.detail ?? 'Impossible de demander le rapport.'
  } finally {
    envoi.value = false
  }
}

const TYPES = [
  {
    valeur: 'PROMOTION',
    titre: 'Rapport de promotion',
    texte: 'Synthèse, points forts, vigilance, apprenants à suivre et recommandations.',
    icon: 'fa-solid fa-users',
  },
  {
    valeur: 'APPRENANT',
    titre: 'Bilan individuel',
    texte: 'Acquis, axes de progrès et conseils pour un apprenant, à partager avec lui.',
    icon: 'fa-solid fa-user-graduate',
  },
]
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader
        :titre="estApprenant ? 'Mes bilans' : 'Rapports'"
        :description="
          estApprenant
            ? 'Les bilans que vos formateurs ont partagés avec vous.'
            : 'Rédigés par l’IA à partir des chiffres de la plateforme, relus et validés par vos soins.'
        "
      >
        <template v-if="!estApprenant" #actions>
          <AppButton icon="fa-solid fa-plus" @click="ouvrir">Nouveau rapport</AppButton>
        </template>
      </PageHeader>

      <div v-if="!estApprenant" class="mt-6 flex flex-wrap items-center gap-3">
        <div class="flex rounded-xl bg-slate-100 p-1 font-['Plus_Jakarta_Sans'] text-sm font-semibold">
          <button
            v-for="f in [{ v: '', l: 'Tous' }, { v: 'PROMOTION', l: 'Promotions' }, { v: 'APPRENANT', l: 'Bilans' }]"
            :key="f.v"
            type="button"
            class="rounded-lg px-3 py-1.5 transition"
            :class="filtreType === f.v ? 'bg-white text-gray-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'"
            @click="filtreType = f.v"
          >
            {{ f.l }}
          </button>
        </div>
        <div class="w-60">
          <AppSelect v-model="filtrePromotion" :options="optionsPromotions" placeholder="Toutes les promotions" placeholder-selectable />
        </div>
      </div>

      <InfoBanner v-if="erreur" variant="error" :message="erreur" class="mt-4" />

      <div v-if="chargement" class="flex h-48 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <div
        v-else-if="!rapports.length"
        class="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center"
      >
        <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <i class="fa-solid fa-file-lines text-lg"></i>
        </span>
        <p class="mt-4 font-['Sora'] text-sm font-semibold text-gray-900">
          {{ estApprenant ? 'Aucun bilan pour le moment' : 'Aucun rapport' }}
        </p>
        <p class="mt-1 max-w-sm font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
          {{
            estApprenant
              ? 'Votre formateur pourra partager ici un bilan de votre parcours.'
              : 'Demandez un rapport de promotion ou le bilan d’un apprenant : l’IA en rédige un brouillon en quelques secondes.'
          }}
        </p>
        <AppButton v-if="!estApprenant" class="mt-5" icon="fa-solid fa-plus" @click="ouvrir">Nouveau rapport</AppButton>
      </div>

      <ul v-else class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <li v-for="r in rapports" :key="r.id">
          <RouterLink
            :to="`/rapports/${r.id}`"
            class="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <div class="flex items-start justify-between gap-3">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                :class="r.type === 'APPRENANT' ? 'bg-violet-50 text-violet-500' : 'bg-indigo-50 text-indigo-500'"
              >
                <i :class="r.type === 'APPRENANT' ? 'fa-solid fa-user-graduate' : 'fa-solid fa-users'"></i>
              </span>
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-medium ring-1"
                :class="STATUTS[r.statut]?.classes"
              >
                <i :class="STATUTS[r.statut]?.icon" class="text-[10px]"></i>{{ STATUTS[r.statut]?.label }}
              </span>
            </div>
            <p class="mt-4 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {{ r.type_libelle }}
            </p>
            <p class="mt-0.5 truncate font-['Sora'] text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
              {{ titreRapport(r) }}
            </p>
            <p class="truncate font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
              {{ r.formation_nom }} · {{ r.promotion_nom }}
            </p>
            <div class="mt-auto flex items-center justify-between gap-2 pt-4 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
              <span class="truncate">{{ r.auteur_nom || '—' }} · {{ ilYa(r.date_creation) }}</span>
              <span v-if="r.partage" class="shrink-0 text-emerald-600"><i class="fa-solid fa-share-nodes mr-1"></i>Partagé</span>
            </div>
          </RouterLink>
        </li>
      </ul>

      <!-- Nouveau rapport -->
      <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" @click.self="modal = false">
        <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-['Sora'] text-base font-semibold text-gray-900">Nouveau rapport</h3>
              <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
                L'IA rédige un brouillon que vous pourrez modifier avant de le valider.
              </p>
            </div>
            <button type="button" class="text-zinc-400 hover:text-zinc-600" aria-label="Fermer" @click="modal = false">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              v-for="t in TYPES"
              :key="t.valeur"
              type="button"
              class="rounded-xl border p-4 text-left transition"
              :class="type === t.valeur ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-500/15' : 'border-slate-200 hover:border-slate-300'"
              @click="type = t.valeur"
            >
              <i :class="[t.icon, type === t.valeur ? 'text-indigo-500' : 'text-zinc-400']"></i>
              <p class="mt-2 font-['Sora'] text-sm font-semibold text-gray-900">{{ t.titre }}</p>
              <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs leading-5 text-zinc-500">{{ t.texte }}</p>
            </button>
          </div>

          <div class="mt-5 flex flex-col gap-4">
            <FormField label="Promotion">
              <AppSelect v-model="promotionChoisie" :options="optionsPromotions" placeholder="Choisir une promotion" />
            </FormField>
            <FormField v-if="type === 'APPRENANT'" label="Apprenant">
              <AppSelect
                v-model="apprenantChoisi"
                :options="optionsApprenants"
                :disabled="!promotionChoisie"
                :placeholder="promotionChoisie && !optionsApprenants.length ? 'Aucun apprenant inscrit' : 'Choisir un apprenant'"
              />
            </FormField>
          </div>

          <InfoBanner v-if="erreurModal" variant="error" :message="erreurModal" class="mt-4" />

          <div class="mt-6 flex justify-end gap-2">
            <AppButton variant="secondary" @click="modal = false">Annuler</AppButton>
            <AppButton icon="fa-solid fa-wand-magic-sparkles" :loading="envoi" :disabled="!peutDemander" @click="demander">
              Générer
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

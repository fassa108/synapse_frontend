<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import DataTable from '../../components/ui/DataTable.vue'
import AppPagination from '../../components/ui/AppPagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import SuspensionMembreModal from '../../components/membres/SuspensionMembreModal.vue'
import AjoutMembreModal from '../../components/membres/AjoutMembreModal.vue'
import MembreActions from '../../components/membres/MembreActions.vue'
import { useRenvoiInvitation } from '../../composables/useRenvoiInvitation'
import { getMembres } from '../../services/membres'
import { getPromotions, getInscriptions } from '../../services/pedagogie'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const apprenants     = ref([])
const promotions     = ref([])
const inscriptionMap = ref({}) // utilisateurId → { promotionNom, formationNom }
const loading        = ref(true)
const error          = ref('')
const search         = ref('')
const page           = ref(1)
const PAGE_SIZE      = 20

// L'inscription en promotion se fait depuis le détail de la promotion.
const showModal       = ref(false)

const columns = [
  { key: 'nom',              label: 'Apprenant' },
  { key: 'email',            label: 'Email' },
  { key: 'promotion',        label: 'Promotion' },
  { key: 'formation',        label: 'Formation' },
  { key: 'statut_organisme', label: 'Accès',  width: '110px' },
  { key: 'statut_compte',    label: 'Compte',     width: '120px' },
  { key: 'actions', label: 'Actions', width: '110px' },
]

// ─── Suspension d'accès ───────────────────────────────────────────────────────
const membreCible = ref(null)

const handleMembreModifie = (membre) => {
  apprenants.value = apprenants.value.map((m) => (m.id === membre.id ? membre : m))
  membreCible.value = null
}

// ─── Invitation ───────────────────────────────────────────────────────────────
const { enCours: renvoiEnCours, retour: retourRenvoi, renvoyer } = useRenvoiInvitation(tenantId)

const rechargerMembres = async () => {
  const membres = await getMembres(tenantId)
  apprenants.value = membres.filter((m) => m.role === 'APPRENANT')
}

onMounted(async () => {
  try {
    const [membres, proms] = await Promise.all([
      getMembres(tenantId),
      getPromotions(tenantId),
    ])
    apprenants.value = membres.filter((m) => m.role === 'APPRENANT')
    promotions.value = proms

    // Construire la map inscription : utilisateurId → { promotionNom, formationNom }
    // On charge les inscriptions actives pour chaque promotion en parallèle.
    const inscritsParPromo = await Promise.all(
      proms.map((p) =>
        getInscriptions(tenantId, p.id, { actif: 'true' })
          .then((ins) => ({ promo: p, ins }))
          .catch(() => ({ promo: p, ins: [] }))
      )
    )

    // Charger les formations une seule fois pour les noms
    let formationNoms = {}
    try {
      const { getFormations } = await import('../../services/pedagogie')
      const forms = await getFormations(tenantId)
      forms.forEach((f) => { formationNoms[f.id] = f.nom })
    } catch { /* non bloquant */ }

    inscritsParPromo.forEach(({ promo, ins }) => {
      ins.forEach((i) => {
        inscriptionMap.value[i.apprenant] = {
          promotionNom: promo.nom,
          formationNom: formationNoms[promo.formation] ?? '—',
          promotionId:  promo.id,
          formationId:  promo.formation,
        }
      })
    })
  } catch {
    error.value = 'Impossible de charger les apprenants.'
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  if (!search.value.trim()) return apprenants.value
  const q = search.value.toLowerCase()
  return apprenants.value.filter(
    (a) =>
      (a.utilisateur_prenom ?? '').toLowerCase().includes(q) ||
      (a.utilisateur_nom    ?? '').toLowerCase().includes(q) ||
      (a.utilisateur_email  ?? '').toLowerCase().includes(q)
  )
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const statsApp = computed(() => ({
  total:  apprenants.value.length,
  // Apprenants avec compte activé (Utilisateur.actif = true)
  actifs: apprenants.value.filter((a) => a.utilisateur_actif === true).length,
}))

const nomApprenant = (m) =>
  m.utilisateur_prenom
    ? `${m.utilisateur_prenom} ${m.utilisateur_nom}`
    : `Apprenant #${m.utilisateur}`

</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader titre="Apprenants" description="Gérez les apprenants de votre organisme.">
        <template #actions>
          <AppButton variant="primary" icon="fa-solid fa-user-plus" @click="showModal = true">
            Ajouter un apprenant
          </AppButton>
        </template>
      </PageHeader>

      <!-- KPI -->
      <div class="mt-5 grid grid-cols-2 gap-3">
        <StatCard
          label="Total apprenants"
          :value="loading ? '—' : statsApp.total"
          icon="fa-solid fa-user-graduate"
          icon-background="bg-indigo-50"
          icon-color="text-indigo-700"
        />
        <StatCard
          label="Comptes activés"
          :value="loading ? '—' : statsApp.actifs"
          icon="fa-solid fa-circle-check"
          icon-background="bg-emerald-50"
          icon-color="text-emerald-700"
        />
      </div>

      <div class="mt-5 mb-4">
        <SearchInput v-model="search" placeholder="Rechercher un apprenant…" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mb-4" />
      <InfoBanner v-if="retourRenvoi" :variant="retourRenvoi.variant" :message="retourRenvoi.message" class="mb-4" />

      <DataTable
        :columns="columns"
        :rows="paginated"
        :loading="loading"
        @row-click="(row) => router.push(`/apprenants/${row.utilisateur}`)"
      >
        <template #cell-nom="{ row }">
          <div class="flex items-center gap-3">
            <div
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-indigo-700"
            >
              {{ (row.utilisateur_prenom?.[0] ?? '?') + (row.utilisateur_nom?.[0] ?? '') }}
            </div>
            <span class="font-medium text-gray-900">{{ nomApprenant(row) }}</span>
          </div>
        </template>

        <template #cell-email="{ row }">
          <span class="text-zinc-500">{{ row.utilisateur_email ?? '—' }}</span>
        </template>

        <template #cell-promotion="{ row }">
          <span class="text-zinc-600">{{ inscriptionMap[row.utilisateur]?.promotionNom ?? '—' }}</span>
        </template>

        <template #cell-formation="{ row }">
          <span class="text-zinc-500">{{ inscriptionMap[row.utilisateur]?.formationNom ?? '—' }}</span>
        </template>

        <template #cell-statut_organisme="{ row }">
          <!-- MembreTenant.actif : appartenance active à l'organisme -->
          <StatusBadge :value="row.actif" type="membre" />
        </template>
        <template #cell-actions="{ row }">
          <MembreActions
            :membre="row"
            :renvoi="renvoiEnCours === row.id"
            @renvoyer="renvoyer(row)"
            @suspendre="membreCible = row"
          />
        </template>

        <template #cell-statut_compte="{ row }">
          <!-- Utilisateur.actif : compte utilisateur activé -->
          <StatusBadge :value="row.utilisateur_actif" type="compte" />
        </template>

        <template #empty>
          <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
            <i class="fa-solid fa-user-graduate text-2xl"></i>
            <span class="text-sm">
              {{ search ? 'Aucun résultat.' : 'Aucun apprenant pour le moment.' }}
            </span>
            <AppButton
              v-if="!search"
              variant="secondary"
              icon="fa-solid fa-user-plus"
              @click="showModal = true"
            >
              Ajouter le premier apprenant
            </AppButton>
          </div>
        </template>
      </DataTable>

      <div class="mt-4">
        <AppPagination v-model:page="page" :total="filtered.length" :page-size="PAGE_SIZE" />
      </div>

    </div>

    <AjoutMembreModal
      v-if="showModal"
      :tenant-id="tenantId"
      role="APPRENANT"
      libelle="apprenant"
      @fermer="showModal = false"
      @ajoute="rechargerMembres"
    />


    <SuspensionMembreModal
      :membre="membreCible"
      :tenant-id="tenantId"
      libelle="apprenant"
      @close="membreCible = null"
      @updated="handleMembreModifie"
    />

  </AppLayout>
</template>

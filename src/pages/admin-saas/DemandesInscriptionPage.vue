<script setup>
/**
 * DemandesInscriptionPage — Admin SaaS
 *
 * Historique des inscriptions déposées depuis la page d'accueil.
 * Le paiement (simulé) valide l'inscription : l'organisme est alors créé
 * automatiquement, sans action de l'admin SaaS.
 */
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import FilterSelect from '../../components/ui/FilterSelect.vue'
import DataTable from '../../components/ui/DataTable.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { recupererDemandesInscription } from '../../services/tenants'

const router = useRouter()

const inscriptions = ref([])
const chargement = ref(false)
const erreurChargement = ref('')
const filtreStatut = ref('')

const statutOptions = [
  { value: 'PAYEE', label: 'Payées' },
  { value: 'EN_ATTENTE_PAIEMENT', label: 'Paiement en attente' },
]

const columns = [
  { key: 'nom_organisme', label: 'Organisme' },
  { key: 'responsable', label: 'Responsable' },
  { key: 'paiement', label: 'Paiement', width: '190px' },
  { key: 'date_creation', label: 'Inscrit le', width: '120px' },
  { key: 'statut', label: 'Statut', width: '170px' },
]

const charger = async () => {
  chargement.value = true
  erreurChargement.value = ''
  try {
    inscriptions.value = await recupererDemandesInscription(filtreStatut.value)
  } catch {
    erreurChargement.value = 'Impossible de charger les inscriptions.'
  } finally {
    chargement.value = false
  }
}

onMounted(charger)
watch(filtreStatut, charger)

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—')
const fcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`

const selection = ref(null)
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Inscriptions"
        description="Organismes inscrits depuis la page d'accueil. Le paiement de l'abonnement crée l'organisme automatiquement."
      />

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <FilterSelect v-model="filtreStatut" :options="statutOptions" placeholder="Toutes les inscriptions" />
      </div>

      <InfoBanner v-if="erreurChargement" variant="error" :message="erreurChargement" class="mt-4" />

      <div class="mt-4">
        <DataTable :columns="columns" :rows="inscriptions" :loading="chargement" @row-click="selection = $event">
          <template #cell-nom_organisme="{ row }">
            <span class="font-semibold text-gray-900">{{ row.nom_organisme }}</span>
          </template>
          <template #cell-responsable="{ row }">
            <div class="min-w-0">
              <p class="truncate text-zinc-700">{{ row.responsable_prenom }} {{ row.responsable_nom }}</p>
              <p class="truncate text-xs text-zinc-400">{{ row.email }}</p>
            </div>
          </template>
          <template #cell-paiement="{ row }">
            <div v-if="row.paiement">
              <p class="text-zinc-700">{{ fcfa(row.paiement.montant) }}</p>
              <p class="text-xs text-zinc-400">{{ row.paiement.moyen_libelle }}</p>
            </div>
            <span v-else class="text-zinc-400">—</span>
          </template>
          <template #cell-date_creation="{ row }">
            <span class="text-zinc-500">{{ formatDate(row.date_creation) }}</span>
          </template>
          <template #cell-statut="{ row }">
            <StatusBadge :value="row.statut" type="demande" />
          </template>
          <template #empty>
            <div class="flex flex-col items-center gap-2 py-8 text-zinc-400">
              <i class="fa-solid fa-inbox text-2xl"></i>
              <span class="font-['Plus_Jakarta_Sans'] text-sm">Aucune inscription.</span>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- Fiche d'une inscription -->
      <div
        v-if="selection"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="selection = null"
      >
        <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div class="min-w-0">
              <h2 class="truncate font-['Sora'] text-base font-semibold text-gray-900">{{ selection.nom_organisme }}</h2>
              <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">Inscrit le {{ formatDate(selection.date_creation) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <StatusBadge :value="selection.statut" type="demande" />
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
                aria-label="Fermer"
                @click="selection = null"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-5 px-6 py-5 font-['Plus_Jakarta_Sans']">
            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs text-zinc-400">Responsable</dt>
                <dd class="text-sm text-zinc-800">{{ selection.responsable_prenom }} {{ selection.responsable_nom }}</dd>
              </div>
              <div>
                <dt class="text-xs text-zinc-400">Téléphone de l'organisme</dt>
                <dd class="text-sm text-zinc-800">{{ selection.telephone || '—' }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs text-zinc-400">Email</dt>
                <dd class="break-all text-sm text-zinc-800">{{ selection.email }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs text-zinc-400">Message</dt>
                <dd class="whitespace-pre-line break-words text-sm text-zinc-800">{{ selection.message || '—' }}</dd>
              </div>
            </dl>

            <div v-if="selection.paiement" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-zinc-400">Paiement</p>
              <dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt class="text-xs text-zinc-400">Montant</dt>
                  <dd class="font-semibold text-zinc-900">{{ fcfa(selection.paiement.montant) }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-zinc-400">Moyen</dt>
                  <dd class="text-zinc-800">{{ selection.paiement.moyen_libelle }} · {{ selection.paiement.telephone }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-zinc-400">Référence</dt>
                  <dd class="font-mono text-zinc-800">{{ selection.paiement.reference_transaction }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-zinc-400">Payé le</dt>
                  <dd class="text-zinc-800">{{ formatDate(selection.paiement.date_paiement) }}</dd>
                </div>
              </dl>
            </div>
            <p v-else class="text-sm text-zinc-500">
              Le formulaire a été rempli, mais le paiement n'a pas été effectué : aucun organisme n'a été créé.
            </p>

            <div v-if="selection.tenant" class="flex justify-end border-t border-slate-100 pt-4">
              <AppButton variant="secondary" icon="fa-solid fa-building" @click="router.push(`/admin/organismes/${selection.tenant}`)">
                Voir l'organisme
              </AppButton>
            </div>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

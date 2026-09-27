<script setup>
/**
 * OrganismeDetailPage — Admin SaaS
 *
 * Fiche d'un organisme : informations, indicateurs, administrateurs.
 * Actions : suspendre / réactiver, supprimer (uniquement si vide).
 */
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import {
  recupererOrganisme,
  changerStatutOrganisme,
  supprimerOrganisme,
} from '../../services/tenants'

const route  = useRoute()
const router = useRouter()

const organisme = ref(null)
const loading   = ref(true)
const error     = ref('')

// Action en attente de confirmation : 'statut' | 'suppression' | null
const confirmation  = ref(null)
const actionLoading = ref(false)
const actionError   = ref('')
const actionSuccess = ref('')

onMounted(async () => {
  try {
    organisme.value = await recupererOrganisme(route.params.id)
  } catch {
    error.value = "Impossible de charger l'organisme."
  } finally {
    loading.value = false
  }
})

const demander = (action) => {
  actionError.value   = ''
  actionSuccess.value = ''
  confirmation.value  = action
}

const annuler = () => {
  confirmation.value = null
}

const handleChangerStatut = async () => {
  actionLoading.value = true
  actionError.value   = ''
  try {
    const nouveauStatut = !organisme.value.statut
    organisme.value = await changerStatutOrganisme(organisme.value.id, nouveauStatut)
    actionSuccess.value = nouveauStatut
      ? 'Organisme réactivé.'
      : 'Organisme suspendu. Ses membres ne peuvent plus y accéder.'
    confirmation.value = null
  } catch (e) {
    actionError.value = e.response?.data?.detail ?? 'Impossible de modifier le statut.'
  } finally {
    actionLoading.value = false
  }
}

const handleSupprimer = async () => {
  actionLoading.value = true
  actionError.value   = ''
  try {
    await supprimerOrganisme(organisme.value.id)
    router.push('/admin/organismes')
  } catch (e) {
    actionError.value = e.response?.data?.detail ?? 'Impossible de supprimer cet organisme.'
    confirmation.value = null
  } finally {
    actionLoading.value = false
  }
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

const initiales = (a) =>
  ((a.prenom?.[0] ?? '?') + (a.nom?.[0] ?? '')).toUpperCase()
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <InfoBanner v-else-if="error" variant="error" :message="error" />

      <template v-else-if="organisme">

        <PageHeader :titre="organisme.nom" :description="organisme.code">
          <template #actions>
            <AppButton variant="secondary" icon="fa-solid fa-arrow-left" @click="router.push('/admin/organismes')">
              Retour
            </AppButton>
          </template>
        </PageHeader>

        <InfoBanner v-if="actionSuccess" variant="success" :message="actionSuccess" class="mt-4" />
        <InfoBanner v-if="actionError" variant="error" :message="actionError" class="mt-4" />

        <!-- Indicateurs -->
        <div class="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Administrateurs" :value="organisme.indicateurs.nb_administrateurs"
            icon="fa-solid fa-user-shield" icon-background="bg-slate-100" icon-color="text-slate-600" />
          <StatCard label="Formateurs" :value="organisme.indicateurs.nb_formateurs"
            icon="fa-solid fa-chalkboard-user" icon-background="bg-indigo-50" icon-color="text-indigo-600" />
          <StatCard label="Apprenants" :value="organisme.indicateurs.nb_apprenants"
            icon="fa-solid fa-user-graduate" icon-background="bg-violet-50" icon-color="text-violet-600" />
          <StatCard label="Formations" :value="organisme.indicateurs.nb_formations"
            icon="fa-solid fa-book-open" icon-background="bg-sky-50" icon-color="text-sky-600" />
          <StatCard label="Promotions" :value="organisme.indicateurs.nb_promotions"
            icon="fa-solid fa-users" icon-background="bg-emerald-50" icon-color="text-emerald-700" />
        </div>

        <div class="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">

          <!-- Informations -->
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Informations</h2>
              <StatusBadge :value="organisme.statut" type="organisme" />
            </div>
            <dl class="flex flex-col gap-3">
              <div v-for="[label, valeur] in [
                ['Email', organisme.email],
                ['Téléphone', organisme.telephone],
                ['Adresse', organisme.adresse],
                ['Site web', organisme.site_web],
                ['Créé le', formatDate(organisme.date_creation)],
              ]" :key="label">
                <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ label }}</dt>
                <dd class="break-words font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">{{ valeur || '—' }}</dd>
              </div>
            </dl>
          </div>

          <div class="flex flex-col gap-5 lg:col-span-2">

            <!-- Administrateurs -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-sm font-semibold text-gray-900">Administrateurs</h2>

              <p v-if="organisme.administrateurs.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                Aucun administrateur.
              </p>

              <ul v-else class="flex flex-col divide-y divide-slate-100">
                <li
                  v-for="admin in organisme.administrateurs"
                  :key="admin.email"
                  class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-['Sora'] text-xs font-bold text-indigo-700">
                    {{ initiales(admin) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">
                      {{ admin.prenom }} {{ admin.nom }}
                    </p>
                    <p class="truncate font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">{{ admin.email }}</p>
                  </div>
                  <StatusBadge :value="admin.compte_active" type="compte" />
                </li>
              </ul>
            </div>

            <!-- Actions -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-sm font-semibold text-gray-900">Gestion de l'organisme</h2>

              <!-- Confirmation -->
              <div
                v-if="confirmation"
                class="rounded-xl border px-4 py-4"
                :class="confirmation === 'suppression' || organisme.statut
                  ? 'border-red-200 bg-red-50'
                  : 'border-emerald-200 bg-emerald-50'"
              >
                <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-800">
                  <template v-if="confirmation === 'suppression'">
                    Supprimer définitivement <strong>{{ organisme.nom }}</strong> ?
                    Seul un organisme sans données ni membres (hors administrateurs) peut être supprimé.
                  </template>
                  <template v-else-if="organisme.statut">
                    Suspendre <strong>{{ organisme.nom }}</strong> ?
                    Ses membres pourront se connecter mais n'auront plus accès à l'organisme.
                  </template>
                  <template v-else>
                    Réactiver <strong>{{ organisme.nom }}</strong> ? Ses membres retrouveront leur accès.
                  </template>
                </p>
                <div class="mt-4 flex justify-end gap-3">
                  <AppButton variant="secondary" :disabled="actionLoading" @click="annuler">
                    Annuler
                  </AppButton>
                  <AppButton
                    v-if="confirmation === 'suppression'"
                    variant="danger"
                    :loading="actionLoading"
                    @click="handleSupprimer"
                  >
                    Supprimer
                  </AppButton>
                  <AppButton
                    v-else
                    :variant="organisme.statut ? 'danger' : 'primary'"
                    :loading="actionLoading"
                    @click="handleChangerStatut"
                  >
                    {{ organisme.statut ? 'Suspendre' : 'Réactiver' }}
                  </AppButton>
                </div>
              </div>

              <div v-else class="flex flex-wrap gap-3">
                <AppButton
                  :variant="organisme.statut ? 'secondary' : 'primary'"
                  :icon="organisme.statut ? 'fa-solid fa-pause' : 'fa-solid fa-play'"
                  @click="demander('statut')"
                >
                  {{ organisme.statut ? "Suspendre l'organisme" : "Réactiver l'organisme" }}
                </AppButton>
                <AppButton variant="ghost" icon="fa-solid fa-trash" @click="demander('suppression')">
                  Supprimer
                </AppButton>
              </div>
            </div>

          </div>
        </div>

      </template>
    </div>
  </AppLayout>
</template>

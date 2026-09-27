<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getMembres } from '../../services/membres'
import { getPromotions, getGroupes, getInscriptions } from '../../services/pedagogie'

const route  = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tenantId    = authStore.tenantCourant?.id
const utilisateurId = route.params.id
const isAdmin = computed(() => authStore.role === 'ADMINISTRATEUR')

const membre          = ref(null)
const promotionActive = ref(null)
const groupes         = ref([])
const loading         = ref(true)
const error           = ref('')

onMounted(async () => {
  try {
    // 1. Promotions visibles (admin : toutes ; formateur : les siennes) + groupes
    const [promotions, tousGroupes] = await Promise.all([
      getPromotions(tenantId),
      getGroupes(tenantId),
    ])

    // 2. Chercher la promotion active : requêtes parallèles sur les promotions
    const inscritsParPromo = await Promise.all(
      promotions.map((p) =>
        getInscriptions(tenantId, p.id, { actif: 'true' })
          .then((ins) => ({ promo: p, ins }))
          .catch(() => ({ promo: p, ins: [] }))
      )
    )
    let inscription = null
    for (const { promo, ins } of inscritsParPromo) {
      const trouvee = ins.find((i) => String(i.apprenant) === String(utilisateurId))
      if (trouvee) {
        promotionActive.value = promo
        inscription = trouvee
        break
      }
    }

    // 3. Identité : fiche membre pour l'admin (seul autorisé à lister les
    //    membres), sinon l'inscription dans une promotion du formateur.
    if (isAdmin.value) {
      const membres = await getMembres(tenantId)
      membre.value = membres.find(
        (m) => String(m.utilisateur) === String(utilisateurId) && m.role === 'APPRENANT'
      ) ?? null
    } else if (inscription) {
      membre.value = {
        utilisateur: inscription.apprenant,
        utilisateur_prenom: inscription.apprenant_prenom,
        utilisateur_nom: inscription.apprenant_nom,
        utilisateur_email: inscription.apprenant_email,
        actif: true,
        date_ajout: inscription.date_inscription,
      }
    }

    if (!membre.value) {
      error.value = 'Apprenant introuvable.'
      return
    }

    // 4. Groupes contenant cet apprenant
    groupes.value = tousGroupes.filter((g) =>
      g.membres?.some((gm) => gm.actif && String(gm.apprenant) === String(utilisateurId))
    )
  } catch {
    error.value = "Impossible de charger les données de l'apprenant."
  } finally {
    loading.value = false
  }
})

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

// Le serializer expose maintenant utilisateur_prenom/nom/email
const nomComplet = (m) =>
  m?.utilisateur_prenom && m?.utilisateur_nom
    ? `${m.utilisateur_prenom} ${m.utilisateur_nom}`
    : `Apprenant #${m?.utilisateur}`

const initiales = (m) =>
  ((m?.utilisateur_prenom?.[0] ?? '?') + (m?.utilisateur_nom?.[0] ?? '')).toUpperCase()
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <InfoBanner v-else-if="error" variant="error" :message="error" />

      <template v-else-if="membre">

        <PageHeader :titre="nomComplet(membre)">
          <template #actions>
            <AppButton variant="secondary" icon="fa-solid fa-arrow-left" @click="isAdmin ? router.push('/apprenants') : router.back()">
              Retour
            </AppButton>
          </template>
        </PageHeader>

        <div class="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">

          <!-- Profil -->
          <div class="lg:col-span-1">
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-5 flex flex-col items-center gap-3">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 font-['Sora'] text-xl font-bold text-indigo-700">
                  {{ initiales(membre) }}
                </div>
                <div class="text-center">
                  <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
                    {{ nomComplet(membre) }}
                  </h2>
                  <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
                    {{ membre.utilisateur_email ?? '—' }}
                  </p>
                </div>
                <StatusBadge :value="membre.actif" type="membre" />
              </div>

              <dl class="flex flex-col gap-3 border-t border-slate-100 pt-4">
                <div>
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Rôle</dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">Apprenant</dd>
                </div>
                <div>
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Inscrit le</dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">{{ formatDate(membre.date_ajout) }}</dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- Colonne droite -->
          <div class="lg:col-span-2 flex flex-col gap-5">

            <!-- Promotion active -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-sm font-semibold text-gray-900">
                Promotion active
              </h2>

              <div v-if="!promotionActive" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                Cet apprenant n'est inscrit dans aucune promotion active.
              </div>

              <div
                v-else
                class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
              >
                <div>
                  <RouterLink
                    :to="`/promotions/${promotionActive.id}`"
                    class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    {{ promotionActive.nom }}
                  </RouterLink>
                  <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
                    Du {{ formatDate(promotionActive.date_debut) }}
                    {{ promotionActive.date_fin ? '→ ' + formatDate(promotionActive.date_fin) : '' }}
                  </p>
                </div>
                <StatusBadge :value="promotionActive.actif" type="promotion" />
              </div>
            </div>

            <!-- Groupes -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-sm font-semibold text-gray-900">
                Groupes ({{ groupes.length }})
              </h2>

              <div v-if="groupes.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                Cet apprenant n'appartient à aucun groupe.
              </div>

              <ul v-else class="flex flex-col divide-y divide-slate-100">
                <li
                  v-for="groupe in groupes"
                  :key="groupe.id"
                  class="flex items-center justify-between py-2.5"
                >
                  <RouterLink
                    :to="`/groupes/${groupe.id}`"
                    class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-indigo-600 hover:underline"
                  >
                    {{ groupe.nom }}
                  </RouterLink>
                  <div class="flex items-center gap-3">
                    <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                      {{ groupe.nb_membres }} membre{{ groupe.nb_membres !== 1 ? 's' : '' }}
                    </span>
                    <StatusBadge :value="groupe.actif" type="boolean" />
                  </div>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </template>
    </div>
  </AppLayout>
</template>

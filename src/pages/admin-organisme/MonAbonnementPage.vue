<script setup>
/**
 * MonAbonnementPage — Admin d'organisme : échéance de l'abonnement mensuel,
 * renouvellement via PayDunya et historique des paiements (reçus).
 *
 * Accessible même quand l'organisme est suspendu faute de paiement : le
 * renouvellement rétablit l'accès. Au retour de PayDunya (/abonnement/retour
 * ?token=…), le paiement est vérifié par le backend auprès de PayDunya.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { useAbonnement } from '../../composables/useAbonnement'
import { confirmerRenouvellement, getAbonnement, renouvelerAbonnement } from '../../services/abonnement'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id
const { mettreAJour } = useAbonnement()

const donnees = ref(null)
const chargement = ref(true)
const erreur = ref('')
const succes = ref('')
const enCours = ref(false)
const verification = ref(false)
const info = ref(route.query.annule ? 'Paiement annulé : aucun montant n’a été débité.' : '')

const a = computed(() => donnees.value?.abonnement)
const fcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`
const formatDate = (iso) =>
  iso ? new Date(`${iso}`.length === 10 ? `${iso}T00:00` : iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const apparence = computed(() => {
  if (!a.value) return {}
  if (a.value.suspendu_pour_impaye || a.value.statut === 'EXPIRE') {
    return { classes: 'from-red-500 to-rose-600', icone: 'fa-solid fa-lock', titre: 'Abonnement expiré', badge: 'Accès suspendu' }
  }
  if (a.value.statut === 'EN_GRACE') {
    return { classes: 'from-amber-500 to-orange-500', icone: 'fa-solid fa-hourglass-half', titre: 'Période de grâce', badge: 'À renouveler' }
  }
  if (a.value.jours_restants <= 7) {
    return { classes: 'from-amber-400 to-amber-500', icone: 'fa-solid fa-bell', titre: 'Échéance proche', badge: 'Actif' }
  }
  return { classes: 'from-indigo-500 to-violet-600', icone: 'fa-solid fa-circle-check', titre: 'Abonnement actif', badge: 'Actif' }
})

const sousTitre = computed(() => {
  if (!a.value) return ''
  if (a.value.suspendu_pour_impaye) return 'Renouvelez pour rétablir immédiatement l’accès de tous les membres.'
  if (a.value.statut === 'EN_GRACE') return `Accès maintenu jusqu’au ${formatDate(a.value.fin_grace)}, puis l’organisme sera suspendu.`
  if (a.value.jours_restants === 0) return 'Expire aujourd’hui.'
  if (a.value.jours_restants === 1) return 'Expire demain.'
  return `Encore ${a.value.jours_restants} jours.`
})

// Part du mois en cours déjà écoulée (barre de progression)
const progression = computed(() => {
  if (!a.value || a.value.statut !== 'ACTIF') return 100
  return Math.max(4, Math.min(100, Math.round(100 - (a.value.jours_restants / 31) * 100)))
})

const appliquer = (reponse) => {
  donnees.value = reponse
  mettreAJour(reponse.abonnement)
  if (!reponse.abonnement.suspendu_pour_impaye && authStore.tenantCourant?.statut === false && authStore.tenantCourant?.abonnement_expire) {
    authStore.marquerAbonnementRenouvele()
  }
}

// ─── Retour de PayDunya ───────────────────────────────────────────────────────

const token = route.query.token
let minuterie = null
let essais = 0

const verifier = async () => {
  clearTimeout(minuterie)
  verification.value = true
  try {
    const reponse = await confirmerRenouvellement(tenantId, token)
    appliquer(reponse)
    const statut = reponse.paiement.statut
    if (statut === 'REUSSI') {
      verification.value = false
      succes.value = `Paiement confirmé : abonnement valable jusqu’au ${formatDate(reponse.abonnement.date_fin)}.`
      router.replace({ name: 'abonnement' })
    } else if (statut === 'EN_ATTENTE' && ++essais < 20) {
      minuterie = setTimeout(verifier, 5000)
    } else {
      verification.value = false
      info.value = statut === 'ANNULE' ? 'Paiement annulé : aucun montant n’a été débité.' : 'Le paiement n’a pas abouti. Vous pouvez réessayer.'
      router.replace({ name: 'abonnement' })
    }
  } catch {
    if (++essais < 20) minuterie = setTimeout(verifier, 5000)
    else verification.value = false
  }
}

onMounted(async () => {
  try {
    appliquer(await getAbonnement(tenantId))
  } catch {
    erreur.value = 'Impossible de charger l’abonnement.'
  } finally {
    chargement.value = false
  }
  if (token) verifier()
})
onUnmounted(() => clearTimeout(minuterie))

const renouveler = async () => {
  enCours.value = true
  erreur.value = ''
  try {
    const { url } = await renouvelerAbonnement(tenantId)
    window.location.assign(url)
  } catch (e) {
    enCours.value = false
    erreur.value = e.response?.status === 429
      ? 'Trop de tentatives. Réessayez dans une heure.'
      : e.response?.data?.detail ?? 'Le paiement est impossible pour le moment.'
  }
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader titre="Abonnement" description="Échéance, renouvellement mensuel et historique de vos paiements." />

      <div v-if="chargement" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>
      <InfoBanner v-else-if="!donnees" variant="error" :message="erreur" class="mt-6" />

      <template v-else>
        <InfoBanner v-if="succes" variant="success" :message="succes" class="mt-6" />
        <InfoBanner v-if="info" variant="info" :message="info" class="mt-6" />
        <InfoBanner v-if="erreur" variant="error" :message="erreur" class="mt-6" />

        <div
          v-if="verification"
          class="mt-6 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 font-['Plus_Jakarta_Sans'] text-sm text-indigo-800"
        >
          <i class="fa-solid fa-circle-notch animate-spin"></i>
          Vérification de votre paiement auprès de PayDunya…
        </div>

        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <!-- Échéance -->
          <section class="overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-sm lg:col-span-2" :class="apparence.classes">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                  <i :class="apparence.icone"></i>
                </span>
                <div>
                  <p class="font-['Sora'] text-lg font-semibold">{{ apparence.titre }}</p>
                  <p class="font-['Plus_Jakarta_Sans'] text-sm text-white/80">{{ donnees.organisme }}</p>
                </div>
              </div>
              <span class="rounded-full bg-white/20 px-3 py-1 font-['Plus_Jakarta_Sans'] text-xs font-semibold">{{ apparence.badge }}</span>
            </div>

            <div class="mt-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-wide text-white/70">Valable jusqu’au</p>
                <p class="font-['Sora'] text-3xl font-bold">{{ formatDate(a.date_fin) }}</p>
                <p class="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-white/85">{{ sousTitre }}</p>
              </div>
              <div class="text-right">
                <p class="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-wide text-white/70">Mensuel</p>
                <p class="font-['Sora'] text-xl font-semibold">{{ fcfa(a.montant_mensuel) }}</p>
              </div>
            </div>

            <div class="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div class="h-full rounded-full bg-white transition-all" :style="{ width: `${progression}%` }"></div>
            </div>
          </section>

          <!-- Renouvellement -->
          <section class="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Renouveler</h2>
            <p class="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
              Un mois de plus, ajouté à la suite de votre échéance : payer en avance ne fait perdre aucun jour.
            </p>
            <div
              v-if="donnees.mode_test"
              class="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-['Plus_Jakarta_Sans'] text-xs text-amber-800"
            >
              <i class="fa-solid fa-flask mt-0.5"></i> Mode test PayDunya : rien n’est débité.
            </div>
            <div class="mt-auto pt-5">
              <AppButton class="w-full" icon="fa-solid fa-lock" :loading="enCours" :disabled="verification" @click="renouveler">
                Payer {{ fcfa(a.montant_mensuel) }}
              </AppButton>
              <p class="mt-2 text-center font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Orange Money, Wave, Free Money ou carte, via PayDunya
              </p>
            </div>
          </section>
        </div>

        <!-- Historique -->
        <section class="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 class="px-6 pt-5 font-['Sora'] text-base font-semibold text-gray-900">Historique des paiements</h2>
          <p v-if="!donnees.paiements.length" class="px-6 pb-6 pt-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
            Aucun paiement enregistré pour le moment.
          </p>
          <div v-else class="mt-3 overflow-x-auto">
            <table class="w-full min-w-[40rem] font-['Plus_Jakarta_Sans'] text-sm">
              <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th class="px-6 py-2.5">Date</th>
                  <th class="px-3 py-2.5">Objet</th>
                  <th class="px-3 py-2.5">Période</th>
                  <th class="px-3 py-2.5 text-right">Montant</th>
                  <th class="px-6 py-2.5">Reçu</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="p in donnees.paiements" :key="p.reference_transaction">
                  <td class="px-6 py-3 text-zinc-700">{{ formatDate(p.date_confirmation || p.date_paiement) }}</td>
                  <td class="px-3 py-3 text-gray-900">{{ p.type_libelle }}</td>
                  <td class="px-3 py-3 text-zinc-600">
                    <template v-if="p.periode_fin">Jusqu’au {{ formatDate(p.periode_fin) }}</template>
                    <template v-else>—</template>
                  </td>
                  <td class="px-3 py-3 text-right font-semibold tabular-nums text-gray-900">{{ fcfa(p.montant) }}</td>
                  <td class="px-6 py-3">
                    <a
                      v-if="p.url_recu"
                      :href="p.url_recu"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <i class="fa-solid fa-receipt text-xs"></i> Reçu
                    </a>
                    <span v-else class="font-mono text-xs text-zinc-400">{{ p.reference_transaction }}</span>
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

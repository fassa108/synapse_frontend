<template>
  <main class="grid min-h-screen w-full grid-cols-1 bg-slate-50 lg:grid-cols-2">

    <!-- Partie gauche -->
    <AuthBrandPanel />

    <!-- Partie droite -->
    <section
      class="flex lg:min-h-screen items-start lg:items-center justify-center bg-slate-50 px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div class="w-full max-w-[480px] py-6 font-['Plus_Jakarta_Sans']">

        <!-- Chargement -->
        <div v-if="etat === 'chargement'" class="flex justify-center py-16 text-zinc-400">
          <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
        </div>

        <!-- Lien invalide -->
        <div v-else-if="etat === 'introuvable'" class="flex flex-col gap-6">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 shadow-sm">
            <i class="fa-solid fa-link-slash text-[20px] text-red-500"></i>
          </div>
          <div class="flex flex-col gap-3">
            <h1 class="text-3xl font-bold leading-9 text-gray-900">Lien invalide</h1>
            <p class="text-sm leading-6 text-zinc-700">
              Ce lien de paiement n'existe pas. Recommencez l'inscription de votre organisme.
            </p>
          </div>
          <RouterLink to="/inscription" :class="boutonPrincipal">
            Recommencer l'inscription <i class="fa-solid fa-arrow-right text-xs"></i>
          </RouterLink>
        </div>

        <!-- Retour de PayDunya : vérification du paiement -->
        <div v-else-if="etat === 'verification' || etat === 'en_attente'" class="flex flex-col gap-6">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 shadow-sm">
            <i class="fa-solid fa-circle-notch animate-spin text-[20px] text-indigo-600"></i>
          </div>
          <div class="flex flex-col gap-3">
            <h1 class="text-3xl font-bold leading-9 text-gray-900">
              {{ etat === 'verification' ? 'Vérification du paiement…' : 'Paiement en cours de validation' }}
            </h1>
            <p class="text-sm leading-6 text-zinc-700">
              <template v-if="etat === 'verification'">Nous confirmons votre paiement auprès de PayDunya.</template>
              <template v-else>
                PayDunya n'a pas encore confirmé votre paiement. Validez-le sur votre téléphone si on vous le demande :
                cette page se met à jour toute seule.
              </template>
            </p>
          </div>
          <button v-if="etat === 'en_attente'" type="button" :class="[boutonSecondaire, 'w-full']" @click="verifier">
            <i class="fa-solid fa-rotate-right text-xs"></i> Vérifier maintenant
          </button>
        </div>

        <!-- Paiement confirmé (ou déjà réglé) -->
        <div v-else-if="etat === 'paye'" class="flex flex-col gap-6">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 shadow-sm">
            <i class="fa-solid fa-check text-[20px] text-emerald-600"></i>
          </div>
          <div class="flex flex-col gap-3">
            <h1 class="text-3xl font-bold leading-9 text-gray-900">
              {{ recu ? 'Paiement confirmé' : 'Inscription déjà réglée' }}
            </h1>
            <p class="text-sm leading-6 text-zinc-700">
              L'espace de <strong>{{ inscription.nom_organisme }}</strong> est créé.
              Un email a été envoyé à <strong>{{ inscription.email }}</strong> pour activer le compte
              administrateur. Si vous avez déjà un compte EduHub, connectez-vous directement.
            </p>
          </div>

          <dl v-if="recu" class="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <div>
              <dt class="text-xs text-zinc-400">Montant</dt>
              <dd class="font-semibold text-zinc-900">{{ fcfa(recu.montant) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-zinc-400">Payé via</dt>
              <dd class="font-semibold text-zinc-900">{{ recu.moyen_libelle }}</dd>
            </div>
            <div class="col-span-2">
              <dt class="text-xs text-zinc-400">Référence de la transaction</dt>
              <dd class="break-all font-mono font-semibold text-zinc-900">{{ recu.reference_transaction }}</dd>
            </div>
            <a
              v-if="recu.url_recu"
              :href="recu.url_recu"
              target="_blank"
              rel="noopener noreferrer"
              class="col-span-2 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <i class="fa-solid fa-receipt text-xs"></i> Télécharger le reçu PayDunya
            </a>
          </dl>

          <div class="flex flex-wrap gap-3">
            <RouterLink to="/login" :class="boutonPrincipal">
              Se connecter <i class="fa-solid fa-arrow-right text-xs"></i>
            </RouterLink>
            <RouterLink to="/" class="flex h-[50px] items-center rounded-xl px-5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
              Accueil
            </RouterLink>
          </div>
        </div>

        <!-- Paiement à effectuer -->
        <div v-else class="flex flex-col gap-7">
          <div class="flex flex-col gap-3">
            <p class="text-xs font-semibold uppercase tracking-wider text-indigo-600">Étape 2 sur 2</p>
            <h1 class="text-3xl font-bold leading-9 text-gray-900">Paiement de l'abonnement</h1>
          </div>

          <!-- Mode test (sandbox PayDunya) -->
          <div
            v-if="inscription.mode_test"
            class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            <i class="fa-solid fa-flask mt-0.5"></i>
            <p><strong>Mode test</strong> : paiement PayDunya en environnement de test, rien n'est débité.</p>
          </div>

          <!-- Retour après annulation ou échec -->
          <div
            v-if="messageRetour"
            class="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-zinc-700"
          >
            <i class="fa-solid fa-circle-info mt-0.5 text-xs text-indigo-500"></i>
            <span>{{ messageRetour }}</span>
          </div>

          <!-- Récapitulatif -->
          <div class="rounded-2xl border border-slate-200 bg-white p-5">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-xs text-zinc-400">Organisme</p>
                <p class="truncate font-semibold text-zinc-900">{{ inscription.nom_organisme }}</p>
                <p class="truncate text-xs text-zinc-500">{{ inscription.email }}</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-xs text-zinc-400">Abonnement mensuel</p>
                <p class="text-xl font-bold text-zinc-900">{{ fcfa(inscription.montant) }}</p>
                <p class="text-xs text-zinc-500">par mois</p>
              </div>
            </div>
          </div>

          <!-- Moyens acceptés -->
          <div class="flex flex-col gap-2.5">
            <p class="text-[13px] font-semibold text-zinc-900">Paiement sécurisé par PayDunya</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="m in moyens"
                :key="m.libelle"
                class="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
              >
                <span class="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white" :style="{ backgroundColor: m.couleur }">
                  {{ m.sigle }}
                </span>
                {{ m.libelle }}
              </span>
            </div>
            <p class="text-xs leading-5 text-zinc-500">
              Vous choisirez votre moyen de paiement sur la page PayDunya, puis vous reviendrez automatiquement sur EduHub.
              Le lien de cette page vous a aussi été envoyé par email : il permet de vérifier votre paiement à tout moment.
            </p>
          </div>

          <div
            v-if="errorMessage"
            class="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <i class="fa-solid fa-circle-exclamation mt-0.5 text-xs"></i>
            <span>{{ errorMessage }}</span>
          </div>

          <button type="button" :disabled="enCours" :class="[boutonPrincipal, 'w-full disabled:cursor-not-allowed disabled:opacity-70']" @click="payer">
            <template v-if="enCours">
              <i class="fa-solid fa-spinner fa-spin text-xs"></i>
              Redirection vers PayDunya…
            </template>
            <template v-else>
              <i class="fa-solid fa-lock text-xs"></i>
              Payer {{ fcfa(inscription.montant) }} avec PayDunya
            </template>
          </button>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel.vue'
import { confirmerPaiement, initierPaiement, recupererInscriptionAPayer } from '@/services/tenants'

const route = useRoute()
const router = useRouter()
const reference = route.params.reference

const boutonPrincipal = 'flex h-[50px] items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-600 hover:shadow-md'
const boutonSecondaire = 'flex h-[50px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50'

// Moyens proposés par PayDunya au Sénégal (le choix se fait sur leur page)
const moyens = [
  { libelle: 'Orange Money', sigle: 'OM', couleur: '#FF7900' },
  { libelle: 'Wave', sigle: 'W', couleur: '#1DC8F2' },
  { libelle: 'Free Money', sigle: 'F', couleur: '#CD0000' },
  { libelle: 'Carte bancaire', sigle: 'CB', couleur: '#1E3A8A' },
]

// chargement | introuvable | a_payer | verification | en_attente | paye
const etat = ref('chargement')
const inscription = ref(null)
const recu = ref(null)
const enCours = ref(false)
const errorMessage = ref('')
const messageRetour = ref(route.query.annule ? 'Paiement annulé : aucun montant n’a été débité. Vous pouvez réessayer.' : '')

const fcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`

// ─── Retour de PayDunya ───────────────────────────────────────────────────────

const token = route.query.token
let minuterie = null
let essais = 0
const ESSAIS_MAX = 20 // relu toutes les 5 s, pendant 100 s

const arreter = () => {
  clearTimeout(minuterie)
  minuterie = null
}

const verifier = async () => {
  arreter()
  try {
    const paiement = await confirmerPaiement(reference, token)
    if (paiement.statut === 'REUSSI') {
      recu.value = paiement
      inscription.value = await recupererInscriptionAPayer(reference)
      etat.value = 'paye'
    } else if (paiement.statut === 'EN_ATTENTE') {
      etat.value = 'en_attente'
      if (++essais < ESSAIS_MAX) minuterie = setTimeout(verifier, 5000)
    } else {
      messageRetour.value = paiement.statut === 'ANNULE'
        ? 'Paiement annulé : aucun montant n’a été débité. Vous pouvez réessayer.'
        : 'Le paiement n’a pas abouti. Vous pouvez réessayer.'
      revenirAuPaiement()
    }
  } catch (e) {
    if (e.response?.status === 404) {
      etat.value = 'introuvable'
      return
    }
    // PayDunya ou le serveur ne répondent pas : on réessaie un peu plus tard
    etat.value = 'en_attente'
    if (++essais < ESSAIS_MAX) minuterie = setTimeout(verifier, 5000)
  }
}

// Le backend relit chez PayDunya un paiement resté en attente (page fermée
// avant le retour) : une inscription payée affiche alors son reçu.
const charger = async () => {
  inscription.value = await recupererInscriptionAPayer(reference)
  recu.value = inscription.value.paiement
  etat.value = inscription.value.statut === 'PAYEE' ? 'paye' : 'a_payer'
}

const revenirAuPaiement = async () => {
  router.replace({ name: 'inscription-paiement', params: { reference } })
  await charger()
}

onMounted(async () => {
  if (token) {
    etat.value = 'verification'
    await verifier()
    return
  }
  try {
    await charger()
  } catch {
    etat.value = 'introuvable'
  }
})

onUnmounted(arreter)

// ─── Paiement ─────────────────────────────────────────────────────────────────

const payer = async () => {
  errorMessage.value = ''
  enCours.value = true
  try {
    const { url } = await initierPaiement(reference)
    window.location.assign(url)
  } catch (e) {
    enCours.value = false
    if (e.response?.status === 429) {
      errorMessage.value = 'Trop de tentatives. Réessayez dans une heure.'
    } else if (e.response?.status === 400 || e.response?.status === 503) {
      const d = e.response.data
      errorMessage.value = d?.detail ?? (Array.isArray(d) ? d[0] : 'Le paiement est impossible pour le moment.')
    } else {
      errorMessage.value = 'Le paiement a échoué. Vérifiez votre connexion et réessayez.'
    }
  }
}
</script>

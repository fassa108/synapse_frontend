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
              <dt class="text-xs text-zinc-400">Moyen</dt>
              <dd class="font-semibold text-zinc-900">{{ recu.moyen_libelle }}</dd>
            </div>
            <div class="col-span-2">
              <dt class="text-xs text-zinc-400">Référence de la transaction</dt>
              <dd class="font-mono font-semibold text-zinc-900">{{ recu.reference_transaction }}</dd>
            </div>
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

        <!-- Formulaire de paiement -->
        <div v-else class="flex flex-col gap-7">
          <div class="flex flex-col gap-3">
            <p class="text-xs font-semibold uppercase tracking-wider text-indigo-600">Étape 2 sur 2</p>
            <h1 class="text-3xl font-bold leading-9 text-gray-900">Paiement de l'abonnement</h1>
          </div>

          <!-- Simulation -->
          <div class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <i class="fa-solid fa-flask mt-0.5"></i>
            <p><strong>Mode démonstration</strong> : aucun paiement réel n'est effectué et rien n'est débité.</p>
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

          <form @submit.prevent="payer" novalidate class="flex flex-col gap-5">
            <!-- Moyen -->
            <fieldset class="flex flex-col gap-2.5">
              <legend class="mb-2.5 text-[13px] font-semibold text-zinc-900">Moyen de paiement</legend>
              <div class="grid grid-cols-2 gap-3">
                <label
                  v-for="m in moyens" :key="m.valeur"
                  class="flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3.5 transition"
                  :class="moyen === m.valeur ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-zinc-200 hover:border-zinc-300'"
                >
                  <input v-model="moyen" type="radio" name="moyen" :value="m.valeur" class="sr-only" />
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" :style="{ backgroundColor: m.couleur }">
                    {{ m.sigle }}
                  </span>
                  <span class="text-sm font-semibold text-zinc-900">{{ m.libelle }}</span>
                </label>
              </div>
            </fieldset>

            <!-- Numéro -->
            <div class="flex flex-col gap-2.5">
              <label for="telephone" class="text-[13px] font-semibold text-zinc-900">
                Numéro {{ moyenChoisi.libelle }}
              </label>
              <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-zinc-500">+221</span>
                <input
                  id="telephone" v-model="telephone" name="telephone" type="tel" inputmode="tel"
                  autocomplete="tel-national" placeholder="77 123 45 67" maxlength="20"
                  @blur="quitter('telephone')" @input="modifier('telephone')"
                  :aria-invalid="!!erreur('telephone')"
                  class="h-13 w-full rounded-xl border border-zinc-200 bg-white pl-16 pr-4 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500/5': erreur('telephone') }"
                />
              </div>
              <p v-if="erreur('telephone')" class="flex items-center gap-1.5 px-1 text-xs font-medium text-red-600">
                <i class="fa-solid fa-circle-exclamation text-[10px]"></i>{{ erreur('telephone') }}
              </p>
              <p v-else class="px-1 text-xs leading-5 text-zinc-500">
                Le numéro du compte {{ moyenChoisi.libelle }} qui règle l'abonnement.
              </p>
            </div>

            <div
              v-if="errorMessage"
              class="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <i class="fa-solid fa-circle-exclamation mt-0.5 text-xs"></i>
              <span>{{ errorMessage }}</span>
            </div>

            <button type="submit" :disabled="enCours" :class="[boutonPrincipal, 'w-full disabled:cursor-not-allowed disabled:opacity-70']">
              <template v-if="enCours">
                <i class="fa-solid fa-spinner fa-spin text-xs"></i>
                Validation sur votre téléphone…
              </template>
              <template v-else>
                <i class="fa-solid fa-lock text-xs"></i>
                Payer {{ fcfa(inscription.montant) }}
              </template>
            </button>
          </form>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel.vue'
import { payerInscription, recupererInscriptionAPayer } from '@/services/tenants'
import { useFormulaire } from '@/composables/useFormulaire'

const route = useRoute()
const reference = route.params.reference

const boutonPrincipal = 'flex h-[50px] items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-600 hover:shadow-md'

const moyens = [
  { valeur: 'WAVE', libelle: 'Wave', sigle: 'W', couleur: '#1DC8F2' },
  { valeur: 'ORANGE_MONEY', libelle: 'Orange Money', sigle: 'OM', couleur: '#FF7900' },
]

const etat = ref('chargement') // chargement | introuvable | a_payer | paye
const inscription = ref(null)
const recu = ref(null)
const moyen = ref('WAVE')
const telephone = ref('')
const enCours = ref(false)
const errorMessage = ref('')

const moyenChoisi = computed(() => moyens.find((m) => m.valeur === moyen.value))
const fcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`

// Même règle que le backend : mobile sénégalais (70, 75, 76, 77, 78), +221 facultatif
const erreurTelephoneMobile = (valeur) => {
  const compact = valeur.replace(/[\s.-]/g, '')
  if (!compact) return 'Le numéro est obligatoire.'
  if (!/^(\+221|00221)?7[05678]\d{7}$/.test(compact)) {
    return 'Saisissez un numéro mobile sénégalais valide, par exemple 77 123 45 67.'
  }
  return ''
}

const { erreur, quitter, modifier, toutVerifier, erreursDuServeur } = useFormulaire({
  telephone: () => erreurTelephoneMobile(telephone.value),
})

onMounted(async () => {
  try {
    inscription.value = await recupererInscriptionAPayer(reference)
    etat.value = inscription.value.statut === 'PAYEE' ? 'paye' : 'a_payer'
  } catch {
    etat.value = 'introuvable'
  }
})

const pause = (ms) => new Promise((r) => setTimeout(r, ms))

const payer = async () => {
  errorMessage.value = ''
  if (!toutVerifier()) return

  enCours.value = true
  try {
    // Simulation : le temps de « valider sur le téléphone »
    const [reponse] = await Promise.all([
      payerInscription(reference, moyen.value, telephone.value.trim()),
      pause(1500),
    ])
    recu.value = reponse
    etat.value = 'paye'
    window.scrollTo({ top: 0 })
  } catch (e) {
    if (e.response?.status === 429) {
      errorMessage.value = 'Trop de tentatives. Réessayez dans une heure.'
    } else if (e.response?.status === 400) {
      errorMessage.value = erreursDuServeur(e.response.data)
    } else {
      errorMessage.value = 'Le paiement a échoué. Vérifiez votre connexion et réessayez.'
    }
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen w-full grid-cols-1 bg-slate-50 lg:grid-cols-2">

    <!-- Partie gauche -->
    <AuthBrandPanel />

    <!-- Partie droite -->
    <section
      class="flex lg:min-h-screen items-start lg:items-center justify-center bg-slate-50 px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div class="w-full max-w-[480px] py-6">

        <div class="flex flex-col gap-8">

          <div class="flex flex-col gap-3">
            <p class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Étape 1 sur 2
            </p>
            <h1 class="font-['Plus_Jakarta_Sans'] text-3xl font-bold leading-9 text-gray-900">
              Inscrire mon organisme
            </h1>
            <p class="font-['Plus_Jakarta_Sans'] text-sm leading-6 text-zinc-700">
              Présentez votre organisme, puis réglez l'abonnement par Wave ou Orange Money.
              Votre espace est créé aussitôt et le responsable reçoit un email pour l'activer.
            </p>
          </div>

          <form @submit.prevent="envoyer" novalidate class="flex flex-col gap-5">

            <!-- Organisme -->
            <div class="flex flex-col gap-2.5">
              <label for="nom_organisme" class="font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-zinc-900">
                Nom de l'organisme <span class="text-red-500">*</span>
              </label>
              <input
                id="nom_organisme" v-model="form.nom_organisme" name="nom_organisme" type="text"
                maxlength="150" autocomplete="organization" placeholder="Ex. : Simplon Dakar"
                @blur="quitter('nom_organisme')" @input="modifier('nom_organisme')"
                :aria-invalid="!!erreur('nom_organisme')"
                :class="[champ, { [champErreur]: erreur('nom_organisme') }]"
              />
              <p v-if="erreur('nom_organisme')" :class="texteErreur">
                <i class="fa-solid fa-circle-exclamation text-[10px]"></i>{{ erreur('nom_organisme') }}
              </p>
            </div>

            <!-- Responsable -->
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div class="flex flex-col gap-2.5">
                <label for="responsable_prenom" class="font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-zinc-900">
                  Prénom du responsable <span class="text-red-500">*</span>
                </label>
                <input
                  id="responsable_prenom" v-model="form.responsable_prenom" name="responsable_prenom" type="text"
                  maxlength="100" autocomplete="given-name"
                  @blur="quitter('responsable_prenom')" @input="modifier('responsable_prenom')"
                  :aria-invalid="!!erreur('responsable_prenom')"
                  :class="[champ, { [champErreur]: erreur('responsable_prenom') }]"
                />
                <p v-if="erreur('responsable_prenom')" :class="texteErreur">
                  <i class="fa-solid fa-circle-exclamation text-[10px]"></i>{{ erreur('responsable_prenom') }}
                </p>
              </div>
              <div class="flex flex-col gap-2.5">
                <label for="responsable_nom" class="font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-zinc-900">
                  Nom du responsable <span class="text-red-500">*</span>
                </label>
                <input
                  id="responsable_nom" v-model="form.responsable_nom" name="responsable_nom" type="text"
                  maxlength="100" autocomplete="family-name"
                  @blur="quitter('responsable_nom')" @input="modifier('responsable_nom')"
                  :aria-invalid="!!erreur('responsable_nom')"
                  :class="[champ, { [champErreur]: erreur('responsable_nom') }]"
                />
                <p v-if="erreur('responsable_nom')" :class="texteErreur">
                  <i class="fa-solid fa-circle-exclamation text-[10px]"></i>{{ erreur('responsable_nom') }}
                </p>
              </div>
            </div>

            <!-- Email -->
            <div class="flex flex-col gap-2.5">
              <label for="email" class="font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-zinc-900">
                Adresse e-mail du responsable <span class="text-red-500">*</span>
              </label>
              <input
                id="email" v-model="form.email" name="email" type="email"
                autocomplete="email" placeholder="nom@organisme.sn"
                @blur="quitter('email')" @input="modifier('email')"
                :aria-invalid="!!erreur('email')"
                :class="[champ, { [champErreur]: erreur('email') }]"
              />
              <p v-if="erreur('email')" :class="texteErreur">
                <i class="fa-solid fa-circle-exclamation text-[10px]"></i>{{ erreur('email') }}
              </p>
              <p v-else class="px-1 text-xs leading-5 text-zinc-500">
                Le lien d'activation sera envoyé à cette adresse.
              </p>
            </div>

            <!-- Téléphone -->
            <div class="flex flex-col gap-2.5">
              <label for="telephone" class="font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-zinc-900">
                Téléphone <span class="font-normal text-zinc-400">(facultatif)</span>
              </label>
              <input
                id="telephone" v-model="form.telephone" name="telephone" type="tel"
                maxlength="30" autocomplete="tel" placeholder="+221 77 123 45 67"
                @blur="quitter('telephone')" @input="modifier('telephone')"
                :aria-invalid="!!erreur('telephone')"
                :class="[champ, { [champErreur]: erreur('telephone') }]"
              />
              <p v-if="erreur('telephone')" :class="texteErreur">
                <i class="fa-solid fa-circle-exclamation text-[10px]"></i>{{ erreur('telephone') }}
              </p>
            </div>

            <!-- Message -->
            <div class="flex flex-col gap-2.5">
              <div class="flex items-baseline justify-between">
                <label for="message" class="font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-zinc-900">
                  Message <span class="font-normal text-zinc-400">(facultatif)</span>
                </label>
                <span class="text-xs" :class="form.message.length > MAX_MESSAGE ? 'text-red-600' : 'text-zinc-400'">
                  {{ form.message.length }} / {{ MAX_MESSAGE }}
                </span>
              </div>
              <textarea
                id="message" v-model="form.message" name="message" rows="4"
                placeholder="Vos formations, le nombre d'apprenants, vos attentes…"
                @blur="quitter('message')" @input="modifier('message')"
                :aria-invalid="!!erreur('message')"
                :class="[zoneTexte, { [champErreur]: erreur('message') }]"
              ></textarea>
              <p v-if="erreur('message')" :class="texteErreur">
                <i class="fa-solid fa-circle-exclamation text-[10px]"></i>{{ erreur('message') }}
              </p>
            </div>

            <!-- Erreur générale -->
            <div
              v-if="errorMessage"
              class="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <i class="fa-solid fa-circle-exclamation mt-0.5 text-xs"></i>
              <span>{{ errorMessage }}</span>
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="mt-1 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-600 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i v-if="isLoading" class="fa-solid fa-spinner fa-spin text-xs"></i>
              <span>{{ isLoading ? 'Envoi en cours...' : 'Continuer vers le paiement' }}</span>
              <i v-if="!isLoading" class="fa-solid fa-arrow-right text-xs"></i>
            </button>
          </form>

          <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-['Plus_Jakarta_Sans'] text-sm">
            <RouterLink to="/" class="flex items-center gap-2 font-semibold text-indigo-600 hover:underline">
              <i class="fa-solid fa-arrow-left text-xs"></i> Accueil
            </RouterLink>
            <span class="text-zinc-500">
              Déjà un compte ?
              <RouterLink to="/login" class="font-semibold text-indigo-600 hover:underline">Se connecter</RouterLink>
            </span>
          </div>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel.vue'
import { deposerDemandeInscription } from '@/services/tenants'
import { useFormulaire } from '@/composables/useFormulaire'
import { erreurEmail, erreurTelephone, erreurTexte } from '@/utils/validation'

const MAX_MESSAGE = 1000

const base = "w-full rounded-xl border border-zinc-200 bg-white px-4 font-['Plus_Jakarta_Sans'] text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
const champ = `${base} h-13`
const zoneTexte = `${base} resize-y py-3`
const champErreur = 'border-red-300 focus:border-red-500 focus:ring-red-500/5'
const texteErreur = 'flex items-center gap-1.5 px-1 text-xs font-medium text-red-600'

const form = reactive({
  nom_organisme: '',
  responsable_prenom: '',
  responsable_nom: '',
  email: '',
  telephone: '',
  message: '',
})

const errorMessage = ref('')
const isLoading = ref(false)
const router = useRouter()

const { erreur, quitter, modifier, toutVerifier, erreursDuServeur } = useFormulaire({
  nom_organisme: () => erreurTexte(form.nom_organisme, { libelle: "Le nom de l'organisme", min: 2, max: 150 }),
  responsable_prenom: () => erreurTexte(form.responsable_prenom, { libelle: 'Le prénom', max: 100 }),
  responsable_nom: () => erreurTexte(form.responsable_nom, { libelle: 'Le nom', max: 100 }),
  email: () => erreurEmail(form.email),
  telephone: () => erreurTelephone(form.telephone),
  message: () => (form.message.length > MAX_MESSAGE ? `Le message ne peut pas dépasser ${MAX_MESSAGE} caractères.` : ''),
})

const envoyer = async () => {
  errorMessage.value = ''
  if (!toutVerifier()) return

  isLoading.value = true
  try {
    const { reference } = await deposerDemandeInscription({
      ...form,
      nom_organisme: form.nom_organisme.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim(),
    })
    router.push({ name: 'inscription-paiement', params: { reference } })
  } catch (e) {
    if (e.response?.status === 429) {
      errorMessage.value = 'Trop de demandes envoyées depuis votre connexion. Réessayez dans une heure.'
    } else if (e.response?.status === 400) {
      errorMessage.value = erreursDuServeur(e.response.data)
    } else {
      errorMessage.value = "L'envoi a échoué. Vérifiez votre connexion et réessayez."
    }
  } finally {
    isLoading.value = false
  }
}
</script>

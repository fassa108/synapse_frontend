<script setup>
/**
 * InscriptionApprenantsModal — inscrire des apprenants dans une promotion.
 *
 * - « Apprenants de l'organisme » : plusieurs à la fois (recherche, tout
 *   sélectionner) ; ceux déjà inscrits ailleurs sont grisés avec leur
 *   promotion, au lieu d'être refusés après coup.
 * - « Nouvel apprenant » : le compte est créé (invitation par email) et
 *   inscrit dans la foulée ; la fenêtre reste ouverte pour le suivant.
 *
 * Props : tenantId, promotion ({ id, nom }), inscrits (ids des apprenants déjà inscrits)
 * Émet : fermer, inscrits (au moins une inscription faite : recharger la liste)
 */
import { computed, onMounted, reactive, ref } from 'vue'
import AppButton from '../ui/AppButton.vue'
import AppSelect from '../ui/AppSelect.vue'
import FormField from '../ui/FormField.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import SearchInput from '../ui/SearchInput.vue'
import TextInput from '../ui/TextInput.vue'
import { getMembres, inviterMembre } from '../../services/membres'
import { inscrireApprenants } from '../../services/pedagogie'
import { useFormulaire } from '../../composables/useFormulaire'
import { erreurEmail, erreurTexte } from '../../utils/validation'

const props = defineProps({
  tenantId: { type: [Number, String], required: true },
  promotion: { type: Object, required: true },
  inscrits: { type: Array, default: () => [] },
})
const emit = defineEmits(['fermer', 'inscrits'])

const onglet = ref('existants')
const enCours = ref(false)
const succes = ref('')
const erreur = ref('')
const refus = ref([]) // [{ nom, message }]

// ─── Apprenants de l'organisme ────────────────────────────────────────────────

const membres = ref([])
const chargement = ref(true)
const recherche = ref('')
const selection = ref([])
const dejaInscrits = ref(new Set(props.inscrits.map(String)))

const nom = (m) => `${m.utilisateur_prenom ?? ''} ${m.utilisateur_nom ?? ''}`.trim() || m.utilisateur_email

onMounted(async () => {
  try {
    membres.value = (await getMembres(props.tenantId)).filter((m) => m.role === 'APPRENANT' && m.actif)
  } catch {
    erreur.value = 'Impossible de charger les apprenants.'
  } finally {
    chargement.value = false
  }
})

// Disponible : ni inscrit ici, ni dans une autre promotion ouverte
const lignes = computed(() =>
  membres.value
    .filter((m) => !dejaInscrits.value.has(String(m.utilisateur)))
    .map((m) => {
      const ailleurs = (m.promotions_en_cours ?? []).find((p) => String(p.id) !== String(props.promotion.id))
      return { id: m.utilisateur, nom: nom(m), email: m.utilisateur_email, actif: m.utilisateur_actif, ailleurs }
    })
    .sort((a, b) => Number(!!a.ailleurs) - Number(!!b.ailleurs) || a.nom.localeCompare(b.nom)),
)

const lignesAffichees = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  return q ? lignes.value.filter((l) => `${l.nom} ${l.email}`.toLowerCase().includes(q)) : lignes.value
})
const disponibles = computed(() => lignesAffichees.value.filter((l) => !l.ailleurs))
const toutSelectionne = computed(
  () => disponibles.value.length > 0 && disponibles.value.every((l) => selection.value.includes(l.id)),
)

const basculerTout = () => {
  const ids = disponibles.value.map((l) => l.id)
  selection.value = toutSelectionne.value
    ? selection.value.filter((id) => !ids.includes(id))
    : [...new Set([...selection.value, ...ids])]
}

const inscrire = async (ids, noms) => {
  const reponse = await inscrireApprenants(props.tenantId, props.promotion.id, ids)
  reponse.inscrits.forEach((i) => dejaInscrits.value.add(String(i.apprenant)))
  refus.value = reponse.erreurs.map((e) => ({ nom: noms[String(e.apprenant_id)] ?? `#${e.apprenant_id}`, message: e.message }))
  if (reponse.inscrits.length) emit('inscrits')
  return reponse.inscrits.length
}

const inscrireSelection = async () => {
  if (!selection.value.length) return
  enCours.value = true
  succes.value = erreur.value = ''
  try {
    const noms = Object.fromEntries(lignes.value.map((l) => [String(l.id), l.nom]))
    const nb = await inscrire(selection.value, noms)
    selection.value = []
    if (nb) succes.value = `${nb} apprenant${nb > 1 ? 's inscrits' : ' inscrit'} dans ${props.promotion.nom}.`
  } catch (e) {
    erreur.value = e.response?.data?.detail ?? "L'inscription a échoué. Réessayez."
  } finally {
    enCours.value = false
  }
}

// ─── Nouvel apprenant ─────────────────────────────────────────────────────────

const GENRES = [
  { value: 'F', label: 'Femme' },
  { value: 'H', label: 'Homme' },
]
const form = reactive({ prenom: '', nom: '', email: '', genre: '' })
const ajoutes = ref([]) // créés et inscrits pendant cette ouverture

const { erreur: erreurChamp, quitter, modifier, toutVerifier, erreursDuServeur } = useFormulaire({
  prenom: () => erreurTexte(form.prenom, { libelle: 'Le prénom', max: 100 }),
  nom: () => erreurTexte(form.nom, { libelle: 'Le nom', max: 100 }),
  email: () => erreurEmail(form.email),
})
const champ = (n) => ({ name: n, 'aria-invalid': !!erreurChamp(n), onBlur: () => quitter(n), onInput: () => modifier(n) })

const creerEtInscrire = async () => {
  succes.value = erreur.value = ''
  refus.value = []
  if (!toutVerifier()) return
  enCours.value = true
  try {
    const payload = { prenom: form.prenom.trim(), nom: form.nom.trim(), email: form.email.trim(), role: 'APPRENANT' }
    if (form.genre) payload.genre = form.genre
    const membre = await inviterMembre(props.tenantId, payload)
    const nomComplet = `${membre.utilisateur_prenom} ${membre.utilisateur_nom}`.trim()
    membres.value.push(membre)
    const nb = await inscrire([membre.utilisateur], { [String(membre.utilisateur)]: nomComplet })
    if (nb) {
      ajoutes.value.unshift(nomComplet)
      succes.value = membre.invitation_envoyee
        ? `${nomComplet} est inscrit et a reçu son invitation par email.`
        : `${nomComplet} (compte existant) est inscrit.`
    }
    Object.assign(form, { prenom: '', nom: '', email: '', genre: '' })
  } catch (e) {
    erreur.value = e.response?.status === 400 ? erreursDuServeur(e.response.data) : "L'ajout a échoué. Réessayez."
  } finally {
    enCours.value = false
  }
}

const fermer = () => {
  if (!enCours.value) emit('fermer')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" @click.self="fermer">
      <div class="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Inscrire des apprenants</h2>
            <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">{{ promotion.nom }}</p>
          </div>
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100" aria-label="Fermer" @click="fermer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="px-6 pt-4">
          <div class="flex rounded-xl bg-slate-100 p-1 font-['Plus_Jakarta_Sans'] text-sm font-semibold">
            <button
              v-for="o in [{ v: 'existants', l: 'Apprenants de l’organisme', i: 'fa-users' }, { v: 'nouveau', l: 'Nouvel apprenant', i: 'fa-user-plus' }]"
              :key="o.v"
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 transition"
              :class="onglet === o.v ? 'bg-white text-gray-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'"
              @click="onglet = o.v; succes = ''; erreur = ''; refus = []"
            >
              <i class="fa-solid text-xs" :class="o.i"></i>{{ o.l }}
            </button>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <InfoBanner v-if="succes" variant="success" :message="succes" />
          <InfoBanner v-if="erreur" variant="error" :message="erreur" />
          <ul v-if="refus.length" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-xs text-amber-800">
            <li v-for="r in refus" :key="r.nom"><strong>{{ r.nom }}</strong> : {{ r.message }}</li>
          </ul>

          <!-- Apprenants de l'organisme -->
          <template v-if="onglet === 'existants'">
            <div v-if="chargement" class="flex h-32 items-center justify-center text-zinc-400">
              <i class="fa-solid fa-circle-notch animate-spin"></i>
            </div>
            <template v-else>
              <div class="flex items-center gap-3">
                <SearchInput v-model="recherche" placeholder="Rechercher par nom ou email…" class="flex-1" />
                <button
                  v-if="disponibles.length"
                  type="button"
                  class="shrink-0 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-indigo-600 hover:underline"
                  @click="basculerTout"
                >
                  {{ toutSelectionne ? 'Tout désélectionner' : `Tout sélectionner (${disponibles.length})` }}
                </button>
              </div>

              <div v-if="lignes.length === 0" class="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
                Aucun autre apprenant dans l'organisme.
                <button type="button" class="font-semibold text-indigo-600 hover:underline" @click="onglet = 'nouveau'">Créer un apprenant</button>
              </div>
              <p v-else-if="lignesAffichees.length === 0" class="py-4 text-center font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Aucun résultat.</p>
              <div v-else class="flex max-h-80 flex-col divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                <label
                  v-for="l in lignesAffichees"
                  :key="l.id"
                  class="flex items-center gap-3 px-3 py-2"
                  :class="l.ailleurs ? 'cursor-not-allowed bg-slate-50/60' : 'cursor-pointer hover:bg-slate-50'"
                >
                  <input v-model="selection" type="checkbox" :value="l.id" :disabled="!!l.ailleurs || enCours" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-['Plus_Jakarta_Sans'] text-sm" :class="l.ailleurs ? 'text-zinc-400' : 'font-medium text-gray-900'">{{ l.nom }}</p>
                    <p class="truncate font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ l.email }}</p>
                  </div>
                  <span v-if="l.ailleurs" class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] text-zinc-500">
                    Inscrit dans {{ l.ailleurs.nom }}
                  </span>
                  <span v-else-if="!l.actif" class="shrink-0 font-['Plus_Jakarta_Sans'] text-[11px] text-amber-600">Compte non activé</span>
                </label>
              </div>
              <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Un apprenant n'a qu'une inscription active à la fois. Un compte non activé peut être inscrit : il accédera à la promotion dès son activation.
              </p>
            </template>
          </template>

          <!-- Nouvel apprenant -->
          <form v-else id="form-nouvel-apprenant" class="flex flex-col gap-3" novalidate @submit.prevent="creerEtInscrire">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Prénom" required :error="erreurChamp('prenom')">
                <TextInput v-model="form.prenom" v-bind="champ('prenom')" maxlength="100" placeholder="Awa" :disabled="enCours" />
              </FormField>
              <FormField label="Nom" required :error="erreurChamp('nom')">
                <TextInput v-model="form.nom" v-bind="champ('nom')" maxlength="100" placeholder="Ndiaye" :disabled="enCours" />
              </FormField>
            </div>
            <FormField label="Adresse e-mail" required :error="erreurChamp('email')" hint="Il reçoit un lien pour activer son compte.">
              <TextInput v-model="form.email" v-bind="champ('email')" type="email" placeholder="awa.ndiaye@exemple.sn" :disabled="enCours" />
            </FormField>
            <FormField label="Genre" hint="Facultatif : statistiques femmes / hommes des rapports.">
              <AppSelect v-model="form.genre" :options="GENRES" placeholder="Non renseigné" placeholder-selectable :disabled="enCours" />
            </FormField>
            <div v-if="ajoutes.length" class="rounded-xl bg-emerald-50 px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-xs text-emerald-800">
              <i class="fa-solid fa-check mr-1"></i>Ajoutés : {{ ajoutes.join(', ') }}
            </div>
          </form>
        </div>

        <div class="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <AppButton variant="secondary" :disabled="enCours" @click="fermer">Fermer</AppButton>
          <AppButton
            v-if="onglet === 'existants'"
            icon="fa-solid fa-user-check"
            :loading="enCours"
            :disabled="!selection.length"
            @click="inscrireSelection"
          >
            Inscrire<template v-if="selection.length"> ({{ selection.length }})</template>
          </AppButton>
          <AppButton v-else type="submit" form="form-nouvel-apprenant" icon="fa-solid fa-user-plus" :loading="enCours">
            Créer et inscrire
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

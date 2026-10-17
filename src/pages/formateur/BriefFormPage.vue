<script setup>
/**
 * BriefFormPage — Formateur : création (/briefs/creer) et modification
 * (/briefs/:id/modifier) d'un brief.
 *
 * Création en trois étapes, sans rien enregistrer entre elles :
 *   1. Informations (promotion, module, catégorie, titre, description, dates)
 *   2. Contenu (sections du brief)
 *   3. Compétences visées et ressources, puis au choix :
 *      « Enregistrer en brouillon » ou « Publier et assigner à toute la
 *      promotion » ; retour à la liste des briefs dans les deux cas.
 * Modification : tout sur une seule page, retour à la fiche du brief.
 *
 * - Promotion : parmi ses promotions ouvertes (non modifiable ensuite).
 * - Module principal obligatoire.
 * - Compétences visées : CompetenceNiveau (compétence + niveau) de tous les
 *   modules de la formation, module principal en premier (les autres
 *   repliés) ; un seul niveau par compétence.
 * - Ressources : choisies dans la bibliothèque, ou ajoutées sur place.
 * Quitter la page avec des saisies non enregistrées demande confirmation.
 * Un brief qui a déjà des livrables n'est plus modifiable.
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import EditeurTexteRiche from '../../components/texte-riche/EditeurTexteRiche.vue'
import RessourceModal from '../../components/ressources/RessourceModal.vue'
import { SECTIONS_BRIEF } from '../../utils/brief'
import { useAuthStore } from '../../stores/auth'
import { useFormulaire } from '../../composables/useFormulaire'
import {
  getBrief, getBriefs, creerBrief, modifierBrief, getRessources, getCategories, assignerPlusieurs,
} from '../../services/activites'
import {
  getInscriptions,
  getPromotions,
  getModules,
  getCompetences,
  getCompetenceNiveaux,
  getNiveaux,
} from '../../services/pedagogie'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id
const briefId   = route.params.id ?? null
const edition   = computed(() => briefId !== null)

const promotions        = ref([])
const modules           = ref([])
const competences       = ref([])
const competenceNiveaux = ref([])
const briefsPromotion   = ref([]) // autres briefs de la promotion (compétences déjà visées)
const niveaux           = ref([])
const ressources        = ref([])
const categories        = ref([])
const loading           = ref(true)
const error             = ref('')
const nonModifiable     = ref(false)

const form = reactive({
  promotion: '',
  module: '',
  categorie: '',
  titre: '',
  description: '',
  contexte: '',
  modalites_pedagogiques: '',
  modalites_evaluation: '',
  criteres_performance: '',
  livrables_attendus: '',
  date_debut: '',
  date_limite: '',
  competence_niveaux: [],
  ressources: [],
})
const globalError  = ref('')
const envoi        = ref(false)
const etape        = ref(1) // création uniquement

// Champs des étapes 1 et 2 (pour y revenir si le serveur y signale une erreur)
const CHAMPS_ETAPE_1 = ['promotion', 'module', 'categorie', 'titre', 'description', 'date_debut', 'date_limite']
const CHAMPS_ETAPE_2 = SECTIONS_BRIEF.map((s) => s.cle)
const ETAPES = ['Informations', 'Contenu', 'Compétences et ressources']
const afficherEtape = (n) => edition.value || etape.value === n
const rechercheRessource = ref('')
const rechercheCompetence = ref('')
const modulesOuverts = ref(new Set()) // modules dépliés en plus du module principal
const showRessourceModal = ref(false)

// ─── Saisie non enregistrée ───────────────────────────────────────────────────
const etatInitial = ref('')
const enregistre = ref(false)
const modifie = computed(() => !!etatInitial.value && !enregistre.value && JSON.stringify(form) !== etatInitial.value)

onBeforeRouteLeave(() => {
  if (modifie.value) return window.confirm('Quitter sans enregistrer ? Les informations saisies seront perdues.')
})
const avantDechargement = (e) => {
  if (modifie.value) e.preventDefault()
}
window.addEventListener('beforeunload', avantDechargement)
onBeforeUnmount(() => window.removeEventListener('beforeunload', avantDechargement))

// ISO ↔ valeur d'un <input type="datetime-local">
const versLocal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const versIso = (local) => (local ? new Date(local).toISOString() : null)

// Pas de début dans le passé (au jour près), sauf pour un brief déjà commencé
// dont on garde la date : même règle que le backend.
const aujourdhui = versLocal(new Date().toISOString()).slice(0, 10)
const debutInitial = ref('')
const minDebut = computed(() =>
  debutInitial.value && debutInitial.value.slice(0, 10) < aujourdhui ? debutInitial.value.slice(0, 10) + 'T00:00' : `${aujourdhui}T00:00`
)

onMounted(async () => {
  try {
    const [proms, comps, cns, nivs, ress, cats] = await Promise.all([
      getPromotions(tenantId),
      getCompetences(tenantId),
      getCompetenceNiveaux(tenantId),
      getNiveaux(tenantId),
      getRessources(tenantId),
      getCategories(tenantId),
    ])
    categories.value        = cats
    competences.value       = comps
    competenceNiveaux.value = cns
    niveaux.value           = nivs
    ressources.value        = ress

    if (edition.value) {
      const brief = await getBrief(tenantId, briefId)
      if (!brief.modifiable) nonModifiable.value = true
      promotions.value = proms.filter((p) => p.id === brief.promotion)
      Object.assign(form, {
        promotion: String(brief.promotion),
        module: String(brief.module),
        categorie: brief.categorie ? String(brief.categorie) : '',
        titre: brief.titre,
        description: brief.description,
        ...Object.fromEntries(SECTIONS_BRIEF.map((s) => [s.cle, brief[s.cle] ?? ''])),
        date_debut: versLocal(brief.date_debut),
        date_limite: versLocal(brief.date_limite),
        competence_niveaux: [...brief.competence_niveaux],
        ressources: [...brief.ressources],
      })
      debutInitial.value = form.date_debut
      await chargerModules()
    } else {
      // Création : uniquement dans une promotion ouverte
      promotions.value = proms.filter((p) => p.actif)
      if (promotions.value.length === 1) form.promotion = String(promotions.value[0].id)
    }
  } catch {
    error.value = 'Impossible de charger le formulaire.'
  } finally {
    loading.value = false
    etatInitial.value = JSON.stringify(form)
  }
})

const promotionChoisie = computed(() =>
  promotions.value.find((p) => String(p.id) === form.promotion) ?? null
)

const chargerModules = async () => {
  const p = promotionChoisie.value
  const [mods, briefs] = p
    ? await Promise.all([getModules(tenantId, { formation: p.formation }), getBriefs(tenantId, { promotion: p.id })])
    : [[], []]
  modules.value = mods
  briefsPromotion.value = briefs.filter((b) => String(b.id) !== String(briefId))
}

// Une compétence-niveau n'est visée que par un seul brief de la promotion
const briefQuiVise = computed(() => {
  const m = new Map()
  for (const b of briefsPromotion.value) for (const id of b.competence_niveaux) m.set(id, b.titre)
  return m
})

// Changement de promotion (création) : on repart de zéro sur le référentiel
watch(() => form.promotion, async (nouvelle, ancienne) => {
  if (edition.value || nouvelle === ancienne) return
  form.module = ''
  form.competence_niveaux = []
  await chargerModules()
})

const promotionOptions = computed(() =>
  promotions.value.map((p) => ({ value: String(p.id), label: p.nom }))
)
// Catégories actives (+ celle déjà en place sur un brief modifié)
const categorieOptions = computed(() =>
  categories.value
    .filter((c) => c.actif || String(c.id) === form.categorie)
    .map((c) => ({ value: String(c.id), label: c.nom }))
)
const moduleOptions = computed(() =>
  modules.value.filter((m) => m.actif || String(m.id) === form.module)
    .map((m) => ({ value: String(m.id), label: `${m.ordre}. ${m.nom}` }))
)

// Compétences visées regroupées par module, module principal en premier
const nomNiveau = (id) => niveaux.value.find((n) => n.id === id)?.nom ?? `Niveau ${id}`
const ordreNiveau = (id) => niveaux.value.find((n) => n.id === id)?.ordre ?? 0

const groupes = computed(() => {
  const ordonnes = [...modules.value].sort((a, b) => {
    if (String(a.id) === form.module) return -1
    if (String(b.id) === form.module) return 1
    return a.ordre - b.ordre
  })
  const q = rechercheCompetence.value.trim().toLowerCase()
  return ordonnes
    .map((m) => ({
      module: m,
      competences: competences.value
        .filter((c) => c.module === m.id && (!q || c.nom.toLowerCase().includes(q)))
        .map((c) => ({
          competence: c,
          niveaux: competenceNiveaux.value
            .filter((cn) => cn.competence === c.id)
            .sort((a, b) => ordreNiveau(a.niveau) - ordreNiveau(b.niveau)),
        }))
        .filter((c) => c.niveaux.length > 0),
    }))
    .filter((g) => g.competences.length > 0)
})

// Un seul niveau par compétence : choisir un niveau remplace l'autre
const basculerCn = (cn) => {
  if (form.competence_niveaux.includes(cn.id)) {
    form.competence_niveaux = form.competence_niveaux.filter((id) => id !== cn.id)
    return
  }
  const memeCompetence = new Set(
    competenceNiveaux.value.filter((x) => x.competence === cn.competence).map((x) => x.id)
  )
  form.competence_niveaux = [...form.competence_niveaux.filter((id) => !memeCompetence.has(id)), cn.id]
}

// Module principal et modules ayant une compétence choisie : dépliés d'office
const estOuvert = (g) =>
  String(g.module.id) === form.module ||
  !!rechercheCompetence.value.trim() ||
  modulesOuverts.value.has(g.module.id) ||
  nbChoisies(g) > 0
const basculerModule = (g) => {
  const ouverts = new Set(modulesOuverts.value)
  ouverts.has(g.module.id) ? ouverts.delete(g.module.id) : ouverts.add(g.module.id)
  modulesOuverts.value = ouverts
}
const nbChoisies = (g) =>
  g.competences.reduce((n, c) => n + c.niveaux.filter((cn) => form.competence_niveaux.includes(cn.id)).length, 0)

// Ressource ajoutée sur place : rejoint la bibliothèque, cochée d'office
const ressourceAjoutee = (r) => {
  ressources.value = [r, ...ressources.value]
  form.ressources = [...form.ressources, r.id]
  showRessourceModal.value = false
}

const ressourcesFiltrees = computed(() => {
  const q = rechercheRessource.value.trim().toLowerCase()
  return q ? ressources.value.filter((r) => r.titre.toLowerCase().includes(q)) : ressources.value
})

const premier = (v) => (Array.isArray(v) ? v[0] : v)

// ─── Validation au fil de la saisie (useFormulaire) ──────────────────────────
const sansErreur = () => ''
// Texte riche vide : « <p></p> » ne compte pas comme rempli
const texteVide = (html) => !(html ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

const regles = {
  promotion: () => (form.promotion ? '' : 'Choisissez une promotion.'),
  module: () => (form.module ? '' : 'Le module est obligatoire.'),
  categorie: sansErreur,
  titre: () => (form.titre.trim() ? '' : 'Le titre est obligatoire.'),
  description: () => (form.description.trim() ? '' : 'La description est obligatoire.'),
  date_debut: () => {
    if (!form.date_debut) return 'La date de début est obligatoire.'
    const jour = form.date_debut.slice(0, 10)
    if (jour < aujourdhui && jour !== debutInitial.value.slice(0, 10)) return "La date de début ne peut pas être avant aujourd'hui."
    return ''
  },
  date_limite: () => {
    if (!form.date_limite) return 'La date limite est obligatoire.'
    if (form.date_debut && form.date_limite <= form.date_debut) return 'La date limite doit être après la date de début.'
    return ''
  },
  ...Object.fromEntries(SECTIONS_BRIEF.map((s) => [
    s.cle,
    () => (s.obligatoire && texteVide(form[s.cle]) ? `${s.titre} : ce champ est obligatoire.` : ''),
  ])),
  // Erreurs du serveur seulement
  competence_niveaux: sansErreur,
  ressources: sansErreur,
}
const { erreur, surSortie, toutVerifier, erreursDuServeur } = useFormulaire(regles, { valeurs: form })

// Création : « Suivant » vérifie l'étape en cours sans rien enregistrer
const suivant = () => {
  if (!toutVerifier(etape.value === 1 ? CHAMPS_ETAPE_1 : CHAMPS_ETAPE_2)) return
  globalError.value = ''
  etape.value += 1
  window.scrollTo({ top: 0 })
}

const precedent = () => {
  etape.value = Math.max(1, etape.value - 1)
  window.scrollTo({ top: 0 })
}

// Erreur dans une étape précédente : on y revient
const revenirSurErreur = () => {
  if (edition.value) return
  if (CHAMPS_ETAPE_1.some((c) => erreur(c))) etape.value = 1
  else if (CHAMPS_ETAPE_2.some((c) => erreur(c))) etape.value = 2
}

const nomBrief = () => `« ${form.titre.trim()} »`

// Publication : assigné à tous les inscrits actifs, puis publié (ils sont prévenus)
const publierEtAssigner = async (brief) => {
  const inscrits = await getInscriptions(tenantId, brief.promotion, { actif: 'true' })
  if (inscrits.length) {
    await assignerPlusieurs(tenantId, { brief: brief.id, apprenants: inscrits.map((i) => i.apprenant), groupes: [] })
  }
  await modifierBrief(tenantId, brief.id, { statut: 'PUBLIE' })
  return inscrits.length
}

const enregistrer = async (publier = false) => {
  if (!toutVerifier()) {
    revenirSurErreur()
    return
  }
  envoi.value = true
  globalError.value = ''

  const payload = {
    module: parseInt(form.module),
    categorie: form.categorie ? parseInt(form.categorie) : null,
    titre: form.titre.trim(),
    description: form.description.trim(),
    ...Object.fromEntries(SECTIONS_BRIEF.map((s) => [s.cle, form[s.cle]])),
    date_debut: versIso(form.date_debut),
    date_limite: versIso(form.date_limite),
    competence_niveaux: form.competence_niveaux,
    ressources: form.ressources,
  }

  try {
    if (edition.value) {
      await modifierBrief(tenantId, briefId, payload)
      enregistre.value = true
      router.push(`/briefs/${briefId}`)
      return
    }

    const brief = await creerBrief(tenantId, { ...payload, promotion: parseInt(form.promotion), statut: 'BROUILLON' })
    enregistre.value = true
    let retourBrief = {
      variant: 'success',
      message: `Brief ${nomBrief()} enregistré en brouillon : publiez-le depuis sa fiche quand il est prêt.`,
      briefId: brief.id,
    }
    if (publier) {
      try {
        const nb = await publierEtAssigner(brief)
        retourBrief.message = nb
          ? `Brief ${nomBrief()} publié et assigné aux ${nb} apprenant${nb > 1 ? 's' : ''} de la promotion.`
          : `Brief ${nomBrief()} publié. Aucun apprenant n'est encore inscrit dans la promotion.`
      } catch (e) {
        // Le brief existe : seule la publication reste à faire, depuis sa fiche
        retourBrief = {
          variant: 'warning',
          message: `Brief ${nomBrief()} enregistré en brouillon, mais pas publié : ${
            premier(e.response?.data?.date_limite) || e.response?.data?.detail || 'réessayez depuis sa fiche'
          }.`,
          briefId: brief.id,
        }
      }
    }
    router.push({ path: '/briefs', state: { retourBrief } })
  } catch (err) {
    const data = err.response?.data
    if (typeof data === 'object' && data && !Array.isArray(data) && !data.detail) {
      globalError.value = erreursDuServeur(data) || 'Veuillez corriger les champs indiqués.'
      revenirSurErreur()
    } else {
      globalError.value = data?.detail || premier(data) || "Impossible d'enregistrer le brief."
    }
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader :titre="edition ? 'Modifier le brief' : 'Nouveau brief'">
        <template #actions>
          <!-- Création, étapes 2 et 3 : étape précédente (saisies conservées) -->
          <AppButton
            v-if="!edition && etape > 1"
            variant="secondary"
            icon="fa-solid fa-arrow-left"
            :disabled="envoi"
            @click="precedent"
          >
            Étape précédente
          </AppButton>
          <AppButton v-else variant="secondary" icon="fa-solid fa-arrow-left" @click="router.back()">Retour</AppButton>
        </template>
      </PageHeader>

      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <InfoBanner v-else-if="error" variant="error" :message="error" class="mt-6" />

      <InfoBanner
        v-else-if="nonModifiable"
        variant="info"
        message="Ce brief a déjà des livrables : il n'est plus modifiable (seul son statut peut encore changer, depuis sa fiche)."
        class="mt-6"
      />

      <InfoBanner
        v-else-if="!edition && promotions.length === 0 && !loading"
        variant="info"
        message="Vous n'êtes affecté à aucune promotion ouverte : impossible de créer un brief."
        class="mt-6"
      />

      <!-- Étapes (création) -->
      <ol v-if="!loading && !error && !nonModifiable && !edition && promotions.length" class="mt-6 flex items-center gap-3 font-['Plus_Jakarta_Sans'] text-sm">
        <li v-for="(nom, i) in ETAPES" :key="nom" class="flex items-center gap-3">
          <span v-if="i > 0" class="h-px w-10 bg-slate-300"></span>
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
            :class="etape > i + 1 ? 'bg-emerald-500 text-white' : etape === i + 1 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-zinc-500'"
          >
            <i v-if="etape > i + 1" class="fa-solid fa-check"></i>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span :class="etape === i + 1 ? 'font-semibold text-gray-900' : 'text-zinc-500'">{{ nom }}</span>
        </li>
      </ol>

      <form v-if="!loading && !error && !nonModifiable && (edition || promotions.length)" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3" novalidate @focusout="surSortie" @submit.prevent="edition || etape === 3 ? enregistrer() : suivant()">

        <!-- Colonne principale -->
        <div class="flex flex-col gap-6 lg:col-span-2">
          <InfoBanner v-if="globalError" variant="error" :message="globalError" />

          <div v-if="afficherEtape(1)" class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Promotion" required :error="erreur('promotion')" data-champ="promotion">
                <AppSelect v-model="form.promotion" :options="promotionOptions" placeholder="Choisir…" :disabled="edition || envoi" />
              </FormField>
              <FormField label="Module principal" required :error="erreur('module')" data-champ="module">
                <AppSelect v-model="form.module" :options="moduleOptions" placeholder="Choisir…" :disabled="!form.promotion || envoi" />
              </FormField>
            </div>
            <FormField label="Catégorie" :error="erreur('categorie')" data-champ="categorie" hint="Facultatif — pour classer (brief projet, TP, atelier, veille…).">
              <AppSelect v-model="form.categorie" :options="categorieOptions" placeholder-selectable
                         :placeholder="categorieOptions.length ? 'Aucune' : 'Aucune catégorie définie par l’organisme'" :disabled="envoi" />
            </FormField>
            <FormField label="Titre" required :error="erreur('titre')" data-champ="titre">
              <TextInput v-model="form.titre" placeholder="Ex. : Site vitrine d'une boulangerie" :disabled="envoi" />
            </FormField>
            <FormField label="Description" required :error="erreur('description')" data-champ="description" hint="Résumé court, affiché dans les listes.">
              <TextInput v-model="form.description" type="textarea" :rows="2" :disabled="envoi" />
            </FormField>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Date de début" required :error="erreur('date_debut')" data-champ="date_debut" hint="Les dépôts sont possibles à partir de cette date.">
                <TextInput v-model="form.date_debut" type="datetime-local" :min="minDebut" :disabled="envoi" />
              </FormField>
              <FormField label="Date limite" required :error="erreur('date_limite')" data-champ="date_limite" hint="Un dépôt après cette date est accepté mais marqué en retard.">
                <TextInput v-model="form.date_limite" type="datetime-local" :disabled="envoi" />
              </FormField>
            </div>
          </div>

          <!-- Contenu du brief (texte riche) -->
          <div v-if="afficherEtape(2)" class="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Contenu du brief</h2>
            <FormField
              v-for="s in SECTIONS_BRIEF"
              :key="s.cle"
              :label="s.titre"
              :required="s.obligatoire"
              :error="erreur(s.cle)"
              :data-champ="s.cle"
            >
              <EditeurTexteRiche v-model="form[s.cle]" :disabled="envoi" :invalide="!!erreur(s.cle)" />
            </FormField>
          </div>

          <!-- Compétences visées -->
          <div v-if="afficherEtape(3)" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="mb-1 flex items-baseline justify-between">
              <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Compétences visées</h2>
              <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                {{ form.competence_niveaux.length }} sélectionnée{{ form.competence_niveaux.length > 1 ? 's' : '' }}
              </span>
            </div>
            <p class="mb-4 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              Un seul niveau par compétence. Une compétence déjà visée par un autre brief
              de la promotion ne peut pas l'être à nouveau.
            </p>
            <InfoBanner v-if="erreur('competence_niveaux')" variant="error" :message="erreur('competence_niveaux')" class="mb-3" />

            <p v-if="!form.promotion" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Choisissez d'abord une promotion.</p>
            <template v-else>
              <SearchInput v-model="rechercheCompetence" placeholder="Rechercher une compétence…" class="mb-4" />
              <p v-if="groupes.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                {{ rechercheCompetence ? 'Aucune compétence trouvée.' : 'Aucune compétence décrite par niveau dans cette formation.' }}
              </p>
            </template>

            <div v-for="g in groupes" :key="g.module.id" class="mb-3 rounded-xl border border-slate-100 last:mb-0">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                :aria-expanded="estOuvert(g)"
                @click="basculerModule(g)"
              >
                <span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide"
                      :class="String(g.module.id) === form.module ? 'text-indigo-600' : 'text-zinc-500'">
                  {{ g.module.nom }}
                  <span v-if="String(g.module.id) === form.module" class="normal-case tracking-normal">· module principal</span>
                </span>
                <span class="flex shrink-0 items-center gap-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                  <span v-if="nbChoisies(g)" class="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">{{ nbChoisies(g) }} choisie{{ nbChoisies(g) > 1 ? 's' : '' }}</span>
                  {{ g.competences.length }} compétence{{ g.competences.length > 1 ? 's' : '' }}
                  <i class="fa-solid fa-chevron-down text-[10px] transition" :class="{ 'rotate-180': estOuvert(g) }"></i>
                </span>
              </button>
              <div v-if="estOuvert(g)" class="flex flex-col gap-3 px-3 pb-3">
                <div v-for="c in g.competences" :key="c.competence.id" class="rounded-xl border border-slate-100 p-3">
                  <p class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">{{ c.competence.nom }}</p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button
                      v-for="cn in c.niveaux" :key="cn.id" type="button"
                      :title="briefQuiVise.has(cn.id) ? `Déjà visée par « ${briefQuiVise.get(cn.id)} »` : cn.description"
                      class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-['Plus_Jakarta_Sans'] text-xs font-medium transition disabled:cursor-not-allowed"
                      :class="form.competence_niveaux.includes(cn.id)
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : briefQuiVise.has(cn.id)
                          ? 'border-dashed border-slate-200 text-zinc-300'
                          : 'border-slate-200 text-zinc-600 hover:border-indigo-300'"
                      :aria-pressed="form.competence_niveaux.includes(cn.id)"
                      :disabled="briefQuiVise.has(cn.id) && !form.competence_niveaux.includes(cn.id)"
                      @click="basculerCn(cn)"
                    >
                      <i v-if="form.competence_niveaux.includes(cn.id)" class="fa-solid fa-check text-[10px]"></i>
                      <i v-else-if="briefQuiVise.has(cn.id)" class="fa-solid fa-lock text-[9px]"></i>
                      {{ nomNiveau(cn.niveau) }}
                    </button>
                  </div>
                  <p
                    v-for="cn in c.niveaux.filter((x) => briefQuiVise.has(x.id) && !form.competence_niveaux.includes(x.id))"
                    :key="`v${cn.id}`"
                    class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400"
                  >
                    <i class="fa-solid fa-lock mr-1 text-[9px]"></i>{{ nomNiveau(cn.niveau) }} : déjà visée par « {{ briefQuiVise.get(cn.id) }} »
                  </p>
                  <p
                    v-for="cn in c.niveaux.filter((x) => form.competence_niveaux.includes(x.id) && x.description)"
                    :key="`d${cn.id}`"
                    class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500"
                  >
                    <span class="font-semibold text-indigo-700">{{ nomNiveau(cn.niveau) }}</span> — {{ cn.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Colonne latérale -->
        <div class="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto lg:-mx-1 lg:px-1 lg:pb-1">
          <!-- Récapitulatif de l'étape 1 (création, étapes 2 et 3) -->
          <div v-if="!edition && etape > 1" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="mb-2 font-['Sora'] text-sm font-semibold text-gray-900">{{ form.titre }}</h2>
            <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              {{ promotionChoisie?.nom }} · {{ moduleOptions.find((m) => m.value === form.module)?.label }}
              <template v-if="form.categorie"> · {{ categorieOptions.find((c) => c.value === form.categorie)?.label }}</template>
            </p>
            <button type="button" class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-indigo-600 hover:underline" @click="etape = 1">
              Modifier les informations
            </button>
          </div>
          <div v-if="afficherEtape(3)" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="mb-1 flex items-center justify-between gap-2">
              <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">
                Ressources<template v-if="form.ressources.length"> ({{ form.ressources.length }})</template>
              </h2>
              <button type="button" class="font-['Plus_Jakarta_Sans'] text-xs font-semibold text-indigo-600 hover:underline" :disabled="envoi" @click="showRessourceModal = true">
                <i class="fa-solid fa-plus mr-1"></i>Nouvelle ressource
              </button>
            </div>
            <p class="mb-3 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              Cochez-les dans la bibliothèque, ou ajoutez un fichier ou un lien.
            </p>
            <SearchInput v-if="ressources.length > 5" v-model="rechercheRessource" placeholder="Filtrer…" class="mb-3" />
            <button
              v-if="ressources.length === 0"
              type="button"
              class="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-5 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
              @click="showRessourceModal = true"
            >
              <i class="fa-solid fa-file-arrow-up text-lg"></i>
              Bibliothèque vide : ajouter une ressource
            </button>
            <div v-else class="flex max-h-72 flex-col divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              <label v-for="r in ressourcesFiltrees" :key="r.id" class="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                <input v-model="form.ressources" type="checkbox" :value="r.id" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                <i :class="r.url ? 'fa-solid fa-link' : 'fa-solid fa-file-lines'" class="text-xs text-zinc-400"></i>
                <span class="truncate font-['Plus_Jakarta_Sans'] text-sm text-gray-900">{{ r.titre }}</span>
              </label>
            </div>
          </div>

          <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <template v-if="edition">
              <AppButton type="submit" :loading="envoi" :disabled="envoi">Enregistrer</AppButton>
            </template>
            <template v-else-if="etape < 3">
              <AppButton type="submit" icon="fa-solid fa-arrow-right">Suivant</AppButton>
              <AppButton v-if="etape > 1" variant="secondary" icon="fa-solid fa-arrow-left" @click="precedent">Étape précédente</AppButton>
              <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Étape suivante : {{ ETAPES[etape].toLowerCase() }}.
              </p>
            </template>
            <template v-else>
              <AppButton icon="fa-solid fa-paper-plane" :loading="envoi" :disabled="envoi" @click="enregistrer(true)">
                Publier et assigner à la promotion
              </AppButton>
              <AppButton type="submit" variant="secondary" icon="fa-solid fa-floppy-disk" :disabled="envoi">
                Enregistrer en brouillon
              </AppButton>
              <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Publier : tous les apprenants inscrits le reçoivent et sont prévenus.
                Brouillon : invisible pour les apprenants, à publier depuis sa fiche.
              </p>
            </template>
          </div>
        </div>
      </form>
    </div>

    <RessourceModal
      v-if="showRessourceModal"
      :tenant-id="tenantId"
      @fermer="showRessourceModal = false"
      @enregistree="ressourceAjoutee"
    />
  </AppLayout>
</template>

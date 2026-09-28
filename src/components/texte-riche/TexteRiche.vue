<script setup>
/**
 * TexteRiche — affichage d'un HTML de brief.
 *
 * Le backend a déjà nettoyé ce HTML ; DOMPurify le repasse sur la même
 * liste blanche avant l'insertion dans la page (défense en profondeur).
 * Vide : rien n'est affiché (la section garde son titre).
 */
import { computed } from 'vue'
import DOMPurify from 'dompurify'

const props = defineProps({
  html: { type: String, default: '' },
})

const BALISES = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a']

const propre = computed(() =>
  DOMPurify.sanitize(props.html || '', {
    ALLOWED_TAGS: BALISES,
    ALLOWED_ATTR: ['href', 'rel', 'target'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  })
)
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- HTML nettoyé (backend + DOMPurify) -->
  <div v-if="propre" class="texte-riche" v-html="propre"></div>
</template>

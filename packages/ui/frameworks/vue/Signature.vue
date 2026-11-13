<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { signature, signaturePath, signatureSvg } from '@master/ui/behaviors/signature.js'
import { useBehavior } from './use-behavior'

/** One stroke: the points it passed through, in the units of the viewBox, each with the pressure there. */
type SignatureStroke = [x: number, y: number, pressure: number][]

defineOptions({ inheritAttrs: false })

const { viewBox = '0 0 400 160', padLabel = 'Your drawn signature', placeholder = 'Sign here', undoLabel = 'Undo', clearLabel = 'Clear', typedLabel = 'Or type your full name', messages } = defineProps<{
  /** What is being signed: the legend of the group. */
  label: string
  /** The name a form submits the drawing under, as an SVG document. */
  name?: string
  /** The drawing's viewBox: the pad's proportions and the units of a stroke. */
  viewBox?: string
  /** The drawing's name, as an image. */
  padLabel?: string
  /** Where to sign, until the first stroke. */
  placeholder?: string
  undoLabel?: string
  clearLabel?: string
  /** The label of the typed name, the keyboard's way to sign. */
  typedLabel?: string
  /** The name a form submits the typed name under. */
  typedName?: string
  /** A signature is required: the typed name is, until something is drawn. */
  required?: boolean
  readonly?: boolean
  invalid?: boolean
  /** What the status says when the pad is signed, when it is emptied and when Undo takes a stroke back. */
  messages?: { drawn?: string, cleared?: string, undone?: string }
}>()
/** The strokes drawn: `v-model`. It changes as a stroke is drawn, and when Undo or Clear takes strokes back. */
const model = defineModel<SignatureStroke[]>()
/** The typed name: `v-model:typed`. */
const typed = defineModel<string>('typed')

/* A pad to sign in and a name to type instead. `disabled` disables the whole group. */
const first = model.value ?? []
const empty = first.length === 0
const svg = signatureSvg(first, { viewBox })
const root = useTemplateRef<HTMLFieldSetElement>('root')
useBehavior(root, signature, () => ({ drawn: messages?.drawn, cleared: messages?.cleared, undone: messages?.undone }), model)
</script>

<template>
  <fieldset class="signature" :class="{ 'signature-readonly': readonly }" ref="root" v-bind="$attrs">
    <legend class="signature-label">{{ label }}</legend>
    <div class="signature-pad">
      <svg class="signature-ink" :viewBox="viewBox" role="img" :aria-label="padLabel">
        <path v-for="(stroke, index) in first" :key="index" class="signature-stroke" :d="signaturePath(stroke)" />
      </svg>
      <span class="signature-line" aria-hidden="true" />
      <span class="signature-placeholder" aria-hidden="true">{{ placeholder }}</span>
      <div class="signature-actions">
        <button type="button" class="btn btn-sm btn-quiet signature-undo" :aria-disabled="empty || undefined">{{ undoLabel }}</button>
        <button type="button" class="btn btn-sm btn-quiet signature-clear" :aria-disabled="empty || undefined">{{ clearLabel }}</button>
      </div>
    </div>
    <label class="field">
      {{ typedLabel }}
      <input v-model="typed" class="input signature-name" :name="typedName" autocomplete="name" :required="required" :readonly="readonly" :aria-invalid="invalid || undefined">
    </label>
    <input type="hidden" class="signature-value" :name="name" :value.attr="svg">
    <span class="signature-status" role="status" />
  </fieldset>
</template>

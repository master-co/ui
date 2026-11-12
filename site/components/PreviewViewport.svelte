<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { getSite } from '@master/internal-site/site'
  import '@master/ui/components/window.css'
  import '@master/ui/components/surface.css'
  import '@master/ui/components/texture.css'
  import '@master/ui/components/button.css'
  import '@master/ui/components/icon.css'
  import '@master/ui/components/slider.css'
  import '../styles/preview-viewport.css'
  import IconMoon from '@tabler/icons-svelte-runes/icons/moon'
  import IconSun from '@tabler/icons-svelte-runes/icons/sun'

  const { t } = getSite()
  let { title, document: source, height, mediumHeight = height, narrowHeight = height, responsive = false, theme = false, framed = false, background = 'plain' }: {
    title: string
    document: string
    /** Authored viewport height. CSS may select another authored height for a narrow tray. */
    height: number
    mediumHeight?: number
    narrowHeight?: number
    responsive?: boolean
    theme?: boolean
    /** A scaled page has a UI sheet frame; component specimens stay transparent. */
    framed?: boolean
    /** The stage's texture: Master UI's dots or stripes, or none under running text. */
    background?: 'dots' | 'stripes' | 'plain'
  } = $props()
  let frame = $state<HTMLIFrameElement>()
  let body = $state<HTMLDivElement>()
  let width = $state<number>()
  let availableWidth = $state(656)
  let dark = $state<boolean>()
  let isDark = $state(false)
  let ready = $state(false)
  untrack(() => {
    if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(mediumHeight) || mediumHeight <= 0 || !Number.isFinite(narrowHeight) || narrowHeight <= 0) {
      throw new Error(`Preview ${title} requires a positive, authored height`)
    }
  })
  const widthId = $props.id()
  const minimumWidth = $derived(Math.min(240, availableWidth))
  const shownWidth = $derived(width ?? availableWidth)

  function applyTheme() {
    const root = frame?.contentDocument?.documentElement
    if (!root) return
    const mode = dark ?? document.documentElement.classList.contains('dark')
    root.classList.toggle('dark', mode)
    root.classList.toggle('light', !mode)
    root.dataset.theme = mode ? 'dark' : 'light'
    root.style.colorScheme = mode ? 'dark' : 'light'
    isDark = mode
  }
  function load() {
    if (!frame?.contentDocument?.body?.childElementCount) return
    applyTheme()
    ready = true
  }
  $effect(() => { void dark; applyTheme() })
  onMount(() => {
    load()
    const observer = new MutationObserver(applyTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    // Only the optional width control needs a reading. Heights never depend on the iframe's document.
    const resize = responsive ? new ResizeObserver(() => { availableWidth = Math.round(body!.clientWidth) }) : undefined
    if (body) resize?.observe(body)
    return () => { observer.disconnect(); resize?.disconnect() }
  })
  function drag(event: PointerEvent & { currentTarget: HTMLSpanElement }) {
    const handle = event.currentTarget
    const start = { x: event.clientX, width: frame!.clientWidth }
    const scale = start.width < availableWidth - 1 ? 2 : 1
    handle.setPointerCapture(event.pointerId)
    const move = (next: PointerEvent) => { width = Math.round(Math.min(1600, Math.max(minimumWidth, start.width + (next.clientX - start.x) * scale))) }
    const end = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }
</script>

<!-- The server reserves the final height, including before lazy loading and hydration. -->
<div class={['window window-flat ui-browser preview-window', background !== 'plain' && 'texture', background === 'stripes' && 'texture-stripes']} data-demo-viewport data-variant={responsive ? undefined : 'plain'} data-ready={ready} style={`--specimen-height: ${height}px; --specimen-height-medium: ${mediumHeight}px; --specimen-height-narrow: ${narrowHeight}px`}>
  {#if responsive}<div class="window-bar" aria-hidden="true"><span class="window-controls"></span></div>{/if}
  <div bind:this={body} class="window-body preview-body">
    <div class="preview-viewport" style:width={width ? `${width}px` : 'min(100%, 1600px)'}>
      <iframe bind:this={frame} class={framed ? 'sheet sheet-raised' : undefined} title={t(title)} srcdoc={source} loading="lazy" data-ready={ready} data-sizing="viewport"
        style:height="var(--preview-height, var(--specimen-height))" onload={load}></iframe>
      {#if responsive}<span class="preview-resize" aria-hidden="true" onpointerdown={drag}></span>{/if}
    </div>
  </div>
</div>
{#if responsive || theme}
  <div class="ui-browser-tools preview-tools" data-demo-tools role="group" aria-label={t('{label} controls').replace('{label}', t(title))}>
    {#if responsive}
      <span class="preview-range">
        <label class="preview-label" for={widthId}>{t('Viewport')}</label>
        <input id={widthId} class="slider" disabled={!ready} type="range" min={minimumWidth} max="1600" step="1" value={shownWidth}
          oninput={event => { width = Number(event.currentTarget.value) }} />
        <output class="preview-size" for={widthId}>{shownWidth} px</output>
      </span>
      <button type="button" disabled={!ready} class="btn btn-sm" onclick={() => { width = undefined }}>{t('Fit')}</button>
    {/if}
    {#if theme}
      <button type="button" disabled={!ready} class="btn btn-sm" aria-pressed={isDark} title={t('Toggle dark theme')} onclick={() => { dark = !isDark }}>
        {#if isDark}<IconMoon class="icon" aria-hidden="true" />{:else}<IconSun class="icon" aria-hidden="true" />{/if}{t('Theme')}
      </button>
    {/if}
  </div>
{/if}

<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { getSite } from '@master/internal-site/site'
  import '@master/internal-site/styles/interface.css'
  import '@master/internal-site/styles/system/browser.css'
  import '@master/internal-site/styles/system/range.css'
  import IconMoon from '@tabler/icons-svelte-runes/icons/moon'
  import IconSun from '@tabler/icons-svelte-runes/icons/sun'

  const { t } = getSite()
  let { title, document: source, height, mediumHeight = height, narrowHeight = height, responsive = false, theme = false }: {
    title: string
    document: string
    /** Authored viewport height. CSS may select another authored height for a narrow tray. */
    height: number
    mediumHeight?: number
    narrowHeight?: number
    responsive?: boolean
    theme?: boolean
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
<div class="ui-browser" data-variant={responsive ? undefined : 'plain'} data-ready={ready} style={`--specimen-height: ${height}px; --specimen-height-medium: ${mediumHeight}px; --specimen-height-narrow: ${narrowHeight}px`}>
  {#if responsive}<div class="ui-browser-bar" aria-hidden="true"><span class="ui-browser-dots"><i></i><i></i><i></i></span></div>{/if}
  <div bind:this={body} class="ui-browser-body">
    <div class="ui-browser-viewport" style:width={width ? `${width}px` : 'min(100%, 1600px)'}>
      <iframe bind:this={frame} title={t(title)} srcdoc={source} loading="lazy" data-ready={ready} data-sizing="viewport"
        style:height="var(--preview-height, var(--specimen-height))" onload={load}></iframe>
      {#if responsive}<span class="ui-resize" aria-hidden="true" onpointerdown={drag}></span>{/if}
    </div>
  </div>
</div>
{#if responsive || theme}
  <div class="ui-browser-tools" role="group" aria-label={t('{label} controls').replace('{label}', t(title))}>
    {#if responsive}
      <span class="ui-browser-range">
        <label class="ui-label" for={widthId}>{t('Viewport')}</label>
        <input id={widthId} class="ui-range" disabled={!ready} type="range" min={minimumWidth} max="1600" step="1" value={shownWidth}
          style:--value={`${((shownWidth - minimumWidth) / Math.max(1, 1600 - minimumWidth)) * 100}%`}
          oninput={event => { width = Number(event.currentTarget.value) }} />
        <output class="ui-browser-size" for={widthId}>{shownWidth} px</output>
      </span>
      <button type="button" disabled={!ready} class="ui-button" data-size="sm" onclick={() => { width = undefined }}>{t('Fit')}</button>
    {/if}
    {#if theme}
      <button type="button" disabled={!ready} class="ui-button" data-size="sm" aria-pressed={isDark} title={t('Toggle dark theme')} onclick={() => { dark = !isDark }}>
        {#if isDark}<IconMoon aria-hidden="true" />{:else}<IconSun aria-hidden="true" />{/if}{t('Theme')}
      </button>
    {/if}
  </div>
{/if}

<style>
  .ui-browser-viewport { container-type: inline-size; }
  @container (width < 40rem) {
    iframe { --specimen-height: var(--specimen-height-medium); }
  }
  @container (width < 30rem) {
    iframe { --specimen-height: var(--specimen-height-narrow); }
  }
</style>

(() => {
  'use strict'

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  const progress = document.createElement('div')
  progress.id = 'ui-reading-progress'
  progress.setAttribute('aria-hidden', 'true')
  document.body.appendChild(progress)

  let revealObserver
  let progressQueued = false
  let pointerFrame = 0
  let activeCard = null
  let activeRect = null
  let pointerX = 0
  let pointerY = 0

  const normalizePath = path => {
    const value = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '')
    return value.endsWith('/') ? value : `${value}/`
  }

  const updateProgress = () => {
    const root = document.documentElement
    const available = root.scrollHeight - window.innerHeight
    const ratio = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0
    progress.style.transform = `scaleX(${ratio})`
    progressQueued = false
  }

  const queueProgress = () => {
    if (progressQueued) return
    progressQueued = true
    requestAnimationFrame(updateProgress)
  }

  const updateActiveNavigation = () => {
    const current = normalizePath(window.location.pathname)
    const links = [...document.querySelectorAll('#nav .menus_item > a[href]')]
    let activeLink = null
    let longestMatch = -1

    links.forEach(link => {
      link.classList.remove('is-active')
      link.removeAttribute('aria-current')
      const target = normalizePath(new URL(link.href, window.location.origin).pathname)
      const matches = target === '/' ? current === '/' : current.startsWith(target)
      if (matches && target.length > longestMatch) {
        activeLink = link
        longestMatch = target.length
      }
    })

    if (activeLink) {
      activeLink.classList.add('is-active')
      activeLink.setAttribute('aria-current', 'page')
    }
  }

  const setupReveals = () => {
    if (revealObserver) revealObserver.disconnect()
    const elements = document.querySelectorAll([
      '#recent-posts .recent-post-item',
      '.leo-project',
      '.reading-section',
      '#aside-content .card-widget',
      '.article-sort-item:not(.year)'
    ].join(','))

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.remove('ui-reveal', 'is-visible'))
      return
    }

    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        revealObserver.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.04 })

    elements.forEach(element => {
      if (element.classList.contains('is-visible')) return
      element.classList.add('ui-reveal')
      revealObserver.observe(element)
    })
  }

  const paintPointerGlow = () => {
    pointerFrame = 0
    if (!activeCard || !activeRect || !activeCard.isConnected) return
    activeCard.style.setProperty('--ui-pointer-x', `${pointerX - activeRect.left}px`)
    activeCard.style.setProperty('--ui-pointer-y', `${pointerY - activeRect.top}px`)
  }

  const onPointerMove = event => {
    if (!precisePointer.matches || reduceMotion.matches) return
    const card = event.target.closest('.leo-cover, .leo-project, #recent-posts .recent-post-item, #aside-content .card-widget')
    if (!card) {
      activeCard = null
      activeRect = null
      return
    }
    if (card !== activeCard) {
      activeCard = card
      activeRect = card.getBoundingClientRect()
    }
    pointerX = event.clientX
    pointerY = event.clientY
    if (!pointerFrame) pointerFrame = requestAnimationFrame(paintPointerGlow)
  }

  const initPageUI = () => {
    updateActiveNavigation()
    setupReveals()
    updateProgress()
  }

  window.addEventListener('scroll', queueProgress, { passive: true })
  window.addEventListener('resize', queueProgress, { passive: true })
  document.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('pjax:complete', initPageUI)
  reduceMotion.addEventListener('change', setupReveals)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageUI, { once: true })
  } else {
    initPageUI()
  }
})()

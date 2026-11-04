const sectionFiles = [
    'section-1-identity.html',
    'section-2-cognitive.html',
    'section-3-philosophy.html',
    'section-4-methodology.html',
    'section-5-personal.html',
    'section-6-work.html',
    'section-7-ai-view.html',
    'section-appendix-articles.html'
];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const chapterButtons = Array.from(document.querySelectorAll('.tab-btn'));
const chapterContainer = document.getElementById('tab-panels');
const chapterNavigation = document.querySelector('.tab-nav');
const progressBar = document.querySelector('.reading-progress');
const progressFill = document.querySelector('.reading-progress-fill');
const readingStatus = document.querySelector('.reading-status');
const backToTop = document.querySelector('.back-to-top');
let chapterPanels = [];
let activeChapter = null;
let scrollPending = false;

function scrollBehavior() {
    return reducedMotion.matches ? 'instant' : 'smooth';
}

function updateReadingProgress() {
    scrollPending = false;
    if (!activeChapter) return;
    const chapterStart = activeChapter.getBoundingClientRect().top + window.scrollY;
    const navigationBottom = chapterNavigation.getBoundingClientRect().bottom;
    const readingLine = Math.max(0, navigationBottom) + 20;
    const availableHeight = Math.max(1, window.innerHeight - readingLine);
    const scrollableHeight = activeChapter.offsetHeight - availableHeight;
    const progress = scrollableHeight <= 0
        ? (chapterStart <= window.scrollY + readingLine ? 100 : 0)
        : Math.round(Math.min(1, Math.max(0, (window.scrollY + readingLine - chapterStart) / scrollableHeight)) * 100);
    progressFill.style.transform = `scaleX(${progress / 100})`;
    progressBar.setAttribute('aria-valuenow', String(progress));
    const chapterTitle = chapterButtons.find((button) => button.dataset.tab === activeChapter.id)
        .querySelector('.tab-btn-text').textContent;
    progressBar.setAttribute('aria-valuetext', `${chapterTitle}，已阅读 ${progress}%`);
    readingStatus.textContent = `${chapterTitle} / 当前章节 ${progress}%`;
    backToTop.hidden = window.scrollY < 480;
}

function queueReadingProgress() {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(updateReadingProgress);
}

function switchChapter(button, shouldScroll = true, updateHash = true) {
    const panel = document.getElementById(button.dataset.tab);
    if (!panel) return;
    chapterButtons.forEach((chapterButton) => {
        const selected = chapterButton === button;
        chapterButton.classList.toggle('active', selected);
        chapterButton.setAttribute('aria-selected', String(selected));
        chapterButton.tabIndex = selected ? 0 : -1;
    });
    chapterPanels.forEach((chapterPanel) => {
        const selected = chapterPanel === panel;
        chapterPanel.classList.toggle('active', selected);
        chapterPanel.hidden = !selected;
    });
    activeChapter = panel;
    if (updateHash && location.hash !== `#${panel.id}`) {
        history.pushState(null, '', `#${panel.id}`);
    }
    if (shouldScroll) {
        const buttonLeft = button.offsetLeft - chapterNavigation.offsetLeft;
        chapterNavigation.scrollTo({
            left: buttonLeft - (chapterNavigation.clientWidth - button.offsetWidth) / 2,
            behavior: scrollBehavior()
        });
        const navigationTop = chapterNavigation.getBoundingClientRect().top + window.scrollY;
        const navigationInset = parseFloat(getComputedStyle(chapterNavigation).top) || 8;
        const contentTop = panel.getBoundingClientRect().top + window.scrollY - chapterNavigation.offsetHeight - navigationInset - 24;
        window.scrollTo({ top: Math.max(0, Math.min(navigationTop - navigationInset, contentTop)), behavior: scrollBehavior() });
    }
    updateReadingProgress();
}

function selectHashChapter() {
    const button = chapterButtons.find((chapterButton) => `#${chapterButton.dataset.tab}` === location.hash);
    switchChapter(button || chapterButtons[0], Boolean(button), false);
}

async function loadSections() {
    chapterContainer.setAttribute('aria-busy', 'true');
    chapterContainer.innerHTML = '<p class="loading-state" role="status">正在打开人物思想档案…</p>';
    try {
        const responses = await Promise.all(sectionFiles.map(async (file) => {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
            return response.text();
        }));
        chapterContainer.innerHTML = responses.join('');
        chapterPanels = Array.from(chapterContainer.querySelectorAll('.tab-panel'));
        if (chapterPanels.length !== chapterButtons.length ||
            chapterButtons.some((button) => !chapterPanels.some((panel) => panel.id === button.dataset.tab))) {
            throw new Error('Chapter panels do not match chapter navigation');
        }
        chapterPanels.forEach((panel) => {
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', `tab-${panel.id}`);
            panel.tabIndex = 0;
        });
        chapterContainer.querySelectorAll('a[target="_blank"]').forEach((link) => {
            link.rel = 'noopener noreferrer';
        });
        window.enhanceChapterGuides?.(chapterContainer);
        selectHashChapter();
    } catch (error) {
        activeChapter = null;
        readingStatus.textContent = '内容暂未加载';
        console.error('Failed to load sections:', error);
        chapterContainer.innerHTML = '<div class="loading-error" role="alert"><p>档案未能完整加载，请检查网络后重试。</p><button type="button">重新加载</button></div>';
        chapterContainer.querySelector('button').addEventListener('click', loadSections);
    } finally {
        chapterContainer.setAttribute('aria-busy', 'false');
    }
}

chapterButtons.forEach((button, buttonIndex) => {
    button.id = `tab-${button.dataset.tab}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', button.dataset.tab);
    button.tabIndex = buttonIndex === 0 ? 0 : -1;
    button.addEventListener('click', () => switchChapter(button));
    button.addEventListener('keydown', (event) => {
        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (buttonIndex + 1) % chapterButtons.length;
        if (event.key === 'ArrowLeft') nextIndex = (buttonIndex - 1 + chapterButtons.length) % chapterButtons.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = chapterButtons.length - 1;
        if (nextIndex === undefined) return;
        event.preventDefault();
        chapterButtons[nextIndex].focus({ preventScroll: true });
        switchChapter(chapterButtons[nextIndex]);
    });
});

backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    document.querySelector('.header-title').focus({ preventScroll: true });
});
window.addEventListener('scroll', queueReadingProgress, { passive: true });
window.addEventListener('resize', queueReadingProgress);
window.addEventListener('hashchange', () => {
    if (activeChapter) selectHashChapter();
});
if ('ResizeObserver' in window) {
    new ResizeObserver(queueReadingProgress).observe(chapterContainer);
} else {
    window.addEventListener('load', queueReadingProgress);
}
loadSections();

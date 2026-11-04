(() => {
    'use strict';
    const dialog = document.createElement('dialog');
    dialog.className = 'diagram-dialog';
    dialog.setAttribute('aria-labelledby', 'diagram-title');
    dialog.innerHTML = '<div class="diagram-shell"><div class="diagram-toolbar"><h2 id="diagram-title">章节结构图</h2><div class="diagram-actions"><button type="button" data-zoom="out" aria-label="缩小图表">−</button><output aria-live="polite"></output><button type="button" data-zoom="in" aria-label="放大图表">＋</button><button type="button" data-zoom="fit">适合窗口</button><button type="button" data-zoom="read">清晰字号</button><button type="button" data-zoom="close" autofocus>关闭</button></div></div><div class="diagram-scroll" tabindex="0" role="region" aria-label="结构图，可横向与纵向滚动"></div><p class="diagram-hint">清晰字号保持最小文字 16px；可滚动查看完整结构，按 Esc 关闭。</p></div>';
    document.body.append(dialog);
    const viewport = dialog.querySelector('.diagram-scroll');
    let active = null;
    let scale = 1;
    const setScale = value => {
        scale = Math.max(0.25, Math.min(4, value));
        active.svg.style.width = `${active.width * scale}px`;
        dialog.querySelector('output').textContent = `${Math.round(scale * 100)}%`;
        dialog.querySelector('[data-zoom="out"]').disabled = scale <= 0.25;
        dialog.querySelector('[data-zoom="in"]').disabled = scale >= 4;
    };
    dialog.addEventListener('click', event => {
        const button = event.target.closest('[data-zoom]');
        if (!button || !active) return;
        const action = button.dataset.zoom;
        if (action === 'close') closeDiagram();
        if (action === 'in') setScale(scale + 0.25);
        if (action === 'out') setScale(scale - 0.25);
        if (action === 'fit') setScale((viewport.clientWidth - 48) / active.width);
        if (action === 'read') setScale(16 / active.minimum);
    });
    const restoreDiagram = () => {
        if (dialog.open || !active) return;
        active.svg.style.width = '';
        active.holder.append(active.svg);
        document.body.style.overflow = active.overflow;
        active.button.focus({ preventScroll: true });
        active = null;
    };
    function closeDiagram() {
        dialog.close();
        restoreDiagram();
    }
    dialog.addEventListener('close', restoreDiagram);
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeDiagram(); });
    dialog.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(dialog.querySelectorAll('button:not(:disabled), [tabindex="0"]'));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    const themeDiagram = svg => {
        const surfaces = new Map([['white', '#191919'], ['#ffffff', '#191919'], ['#fafbfc', '#141414'], ['#f6f8fa', '#242424'], ['#fff8c5', '#352F20'], ['#ddf4ff', '#1B2B3C'], ['#d4f8e8', '#203226'], ['#eff6ff', '#1B2B3C'], ['#f0fdf4', '#203226'], ['rgba(255,255,255,0.9)', '#242424'], ['#d0d7de', '#555555']]);
        const accents = new Map([['#1a7f37', '#8BDDAD'], ['#2da44e', '#8BDDAD'], ['#0969da', '#91BEEC'], ['#54aeff', '#91BEEC'], ['#bf8700', '#E6C47D'], ['#9a6700', '#E6C47D'], ['#7c3aed', '#C9AFF2'], ['#8250df', '#C9AFF2']]);
        svg.querySelectorAll('[fill]').forEach(element => {
            const fill = element.getAttribute('fill').toLowerCase();
            if (element.tagName.toLowerCase() === 'text') {
                element.setAttribute('fill', accents.get(fill) || '#E2E2E2');
            } else if (surfaces.has(fill)) element.setAttribute('fill', surfaces.get(fill));
            else if (accents.has(fill)) element.setAttribute('fill', '#33302B');
        });
        svg.querySelectorAll('text:not([fill])').forEach(element => element.setAttribute('fill', '#E2E2E2'));
        svg.querySelectorAll('stop').forEach(element => element.style.stopColor = '#33302B');
        svg.querySelectorAll('[stroke]').forEach(element => {
            const stroke = element.getAttribute('stroke').toLowerCase();
            if (accents.has(stroke)) element.setAttribute('stroke', accents.get(stroke));
            else if (stroke !== 'none' && !stroke.startsWith('url(')) element.setAttribute('stroke', '#656565');
        });
    };
    const addLine = (parent, texts) => {
        if (!texts.length) return;
        const line = document.createElement('div');
        line.className = 'guide-line';
        texts.forEach(text => {
            const span = document.createElement('span');
            span.textContent = text.textContent;
            if (Number(text.getAttribute('font-weight')) >= 600) span.className = 'guide-emphasis';
            line.append(span);
        });
        parent.append(line);
    };
    window.enhanceChapterGuides = container => {
        container.querySelectorAll('.section-overview-chart').forEach(chart => {
            if (chart.dataset.enhanced) return;
            const svg = chart.querySelector('svg');
            if (!svg) return;
            const title = svg.querySelector(':scope > text')?.textContent || '章节结构图';
            const bar = document.createElement('div');
            bar.className = 'chapter-guide-bar';
            const label = document.createElement('p');
            label.textContent = '章节导览 · 大字重排';
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = '查看结构图 ↗';
            button.setAttribute('aria-haspopup', 'dialog');
            bar.append(label, button);
            const guide = document.createElement('div');
            guide.className = 'chapter-guide';
            guide.setAttribute('role', 'group');
            guide.setAttribute('aria-label', title);
            Array.from(svg.children).forEach(group => {
                if (group.tagName.toLowerCase() === 'text') {
                    const note = document.createElement('p');
                    note.className = 'chapter-guide-note';
                    note.textContent = group.textContent;
                    guide.append(note);
                    return;
                }
                if (group.tagName.toLowerCase() !== 'g' || !group.querySelector('text')) return;
                const card = document.createElement('div');
                card.className = 'chapter-guide-card';
                let heading = false;
                Array.from(group.children).forEach(child => {
                    if (child.tagName.toLowerCase() === 'text' && !heading) {
                        const title = document.createElement('h3');
                        title.textContent = child.textContent;
                        card.append(title);
                        heading = true;
                    } else if (child.tagName.toLowerCase() === 'text') addLine(card, [child]);
                    else if (child.querySelector('text')) addLine(card, Array.from(child.querySelectorAll('text')));
                });
                guide.append(card);
            });
            const holder = document.createElement('div');
            holder.hidden = true;
            holder.className = 'chart-original';
            holder.append(svg);
            chart.append(bar, guide, holder);
            const width = svg.viewBox.baseVal.width;
            const minimum = Math.min(...Array.from(svg.querySelectorAll('text'), text => Number(text.getAttribute('font-size')) || 12));
            themeDiagram(svg);
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label', title);
            button.addEventListener('click', () => {
                active = { svg, holder, button, width, minimum, overflow: document.body.style.overflow };
                dialog.querySelector('h2').textContent = title;
                viewport.replaceChildren(svg);
                document.body.style.overflow = 'hidden';
                dialog.showModal();
                setScale(16 / minimum);
                viewport.scrollTo(0, 0);
            });
            chart.dataset.enhanced = 'true';
        });
    };
})();

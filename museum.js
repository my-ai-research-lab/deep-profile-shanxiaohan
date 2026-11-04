(() => {
    'use strict';
    const topics = [
        ['身份演化', '技术管理者、哲学行者与系统黑客，构成同一个人的不同切面。'],
        ['认知框架', '操作系统、数据、算法与应用程序：把思维的底层逻辑拆开来看。'],
        ['人生哲学', '用刻刀看透世界，用画笔赋予意义；在求真与求存之间寻找平衡。'],
        ['方法论', '从产品思维到系统思考，让认知成为可以实践的方法。'],
        ['个人世界', '角色之外，仍有父亲、读者和生活中真实的人。'],
        ['工作经历', '技术与管理相互交织，在研发效能的实践中探索系统如何运作。'],
        ['AI 视角', '从既有文章出发的 AI 观察与解读，不把推测当作本人定论。']
    ];
    const layers = [
        ['LAYER 01 / OPERATING SYSTEM', '操作系统', '理性与情绪像两套操作系统。理解它们如何工作，是理解自己的起点。'],
        ['LAYER 02 / DATA', '数据', '认知结构与世界观构成思维的数据。信息如何连接，影响我们如何理解世界。'],
        ['LAYER 03 / ALGORITHM', '算法', '归纳从经验中发现规律，演绎从规则推导结论。两种路径互相校验。'],
        ['LAYER 04 / APPLICATION', '应用程序', '方法论把认知结构与推理方式组合起来，将理解转化为解决问题的行动。']
    ];
    const eras = [
        ['2017', '起步期 / THE BEGINNING', '从代码，走向人生。', '开始系统性写作，以程序员视角审视思维方法。写下《人生没有指南》，探索逻辑之外的人生意义。'],
        ['2018', '框架构建 / BUILDING FRAMEWORKS', '给思维，建立地图。', '密集输出《产品思维》《思维的地图》等系列，开始建立自己的认知与方法论框架。'],
        ['2019—20', '深化期 / GOING DEEPER', '回到认知的底层。', '从《如何用信息看世界》到《记忆的真相》，通过信息论与记忆科学继续理解认知机制。'],
        ['2021', '转折期 / A TURNING POINT', '仰望星空，脚踏实地。', '35 岁生日的反思带来新的追问：当技术和方法之外仍有困惑，人生的意义究竟在哪里？'],
        ['2022', '哲学构建 / FINDING MEANING', '一把刻刀，一支画笔。', '《四个人生问题》《刻刀与画笔》《思想成长乱谈》等系列汇入人生哲学框架，探索真实与意义。'],
        ['2023', '黑客觉醒 / THE SYSTEM HACKER', '在系统中，寻找自由。', '通过《“黑客”之路》提出系统黑客的自我定位，以更游戏化的心态面对工作和生活。'],
        ['2024—25', '超越期 / JUST FOR FUN', '从寻找答案，到体验人生。', '思考更超脱的人生态度，同时在写给儿子奇奇的家书里展现温情。哲学最终回到具体的生活。']
    ];
    const setText = (id, value) => { document.getElementById(id).textContent = value; };
    const activate = (selector, selected) => document.querySelectorAll(selector).forEach(button => button.setAttribute('aria-pressed', String(button === selected)));

    document.querySelectorAll('[data-topic]').forEach(button => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.topic);
            activate('[data-topic]', button);
            setText('topic-name', topics[index][0]);
            setText('topic-description', topics[index][1]);
            document.getElementById('topic-link').href = `index.html#section-${index + 1}`;
            document.getElementById('sculpture').dispatchEvent(new CustomEvent('museum:select', { detail: index }));
        });
    });
    document.querySelectorAll('[data-layer]').forEach(button => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.layer);
            activate('[data-layer]', button);
            ['layer-code', 'layer-title', 'layer-description'].forEach((id, field) => setText(id, layers[index][field]));
        });
    });
    document.querySelectorAll('[data-era]').forEach(button => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.era);
            activate('[data-era]', button);
            ['era-year', 'era-stage', 'era-title', 'era-description'].forEach((id, field) => setText(id, eras[index][field]));
            const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
            const timeline = button.parentElement;
            const left = button.getBoundingClientRect().left - timeline.getBoundingClientRect().left + timeline.scrollLeft;
            timeline.scrollTo({ left: left - (timeline.clientWidth - button.clientWidth) / 2, behavior: reducedMotion ? 'instant' : 'smooth' });
        });
    });

    const slider = document.getElementById('perspective');
    const comparison = document.querySelector('.comparison');
    slider.addEventListener('input', () => {
        const value = Number(slider.value);
        comparison.style.setProperty('--paint', `${value}%`);
        const description = value === 0 ? '刻刀 · 看透结构' : value === 100 ? '画笔 · 赋予意义' : value === 50 ? '刻刀与画笔 · 并置' : `画笔 ${value}% · 刻刀 ${100 - value}%`;
        setText('perspective-value', description);
        slider.setAttribute('aria-valuetext', description);
    });
    let comparisonPointer = null;
    const moveComparison = event => {
        if (comparisonPointer !== event.pointerId) return;
        const bounds = comparison.getBoundingClientRect();
        slider.value = String(Math.round(Math.max(0, Math.min(100, 100 - (event.clientX - bounds.left) / bounds.width * 100))));
        slider.dispatchEvent(new Event('input'));
    };
    comparison.addEventListener('pointerdown', event => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
        comparisonPointer = event.pointerId;
        comparison.setPointerCapture(event.pointerId);
        moveComparison(event);
    });
    comparison.addEventListener('pointermove', moveComparison);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => comparison.addEventListener(name, () => { comparisonPointer = null; }));

    const drawWorld = () => {
        const namespace = 'http://www.w3.org/2000/svg';
        const wire = document.getElementById('wire-world');
        const paint = document.getElementById('paint-world');
        const wireFragment = document.createDocumentFragment();
        const paintFragment = document.createDocumentFragment();
        const columns = 32;
        const rows = 18;
        const point = (column, row) => {
            const horizontal = (column / columns - 0.5) * 2;
            const depth = row / rows;
            const peak = Math.exp(-((horizontal + 0.23) ** 2 * 13 + (depth - 0.40) ** 2 * 25)) * 200;
            const peakTwo = Math.exp(-((horizontal - 0.38) ** 2 * 20 + (depth - 0.54) ** 2 * 35)) * 155;
            const ridge = Math.sin(column * 0.8 + row * 0.6) * Math.sin(depth * Math.PI) * 9;
            return [600 + horizontal * (340 + depth * 185), 255 + depth * 220 - peak - peakTwo + ridge];
        };
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                const topLeft = point(column, row);
                const topRight = point(column + 1, row);
                const bottomLeft = point(column, row + 1);
                const bottomRight = point(column + 1, row + 1);
                [[topLeft, topRight, bottomLeft], [topRight, bottomRight, bottomLeft]].forEach((triangle, face) => {
                    const path = `M${triangle.map(vertex => vertex.map(value => value.toFixed(1)).join(',')).join('L')}Z`;
                    const outline = document.createElementNS(namespace, 'path');
                    outline.setAttribute('d', path);
                    outline.setAttribute('fill', '#0C0C0C');
                    outline.setAttribute('stroke', '#787878');
                    outline.setAttribute('stroke-width', '0.7');
                    wireFragment.append(outline);
                    const filled = document.createElementNS(namespace, 'path');
                    filled.setAttribute('d', path);
                    const slope = (triangle[1][1] - triangle[0][1]) / Math.max(1, triangle[1][0] - triangle[0][0]);
                    const lightness = Math.max(24, Math.min(76, 52 + slope * 13 + Math.sin(column * 1.9 + row * 1.2 + face) * 8));
                    const color = `hsl(29 38% ${lightness}%)`;
                    filled.setAttribute('fill', color);
                    filled.setAttribute('stroke', color);
                    filled.setAttribute('stroke-width', '0.5');
                    paintFragment.append(filled);
                });
            }
        }
        wire.replaceChildren(wireFragment);
        paint.replaceChildren(paintFragment);
    };
    drawWorld();

    if ('IntersectionObserver' in window) {
        const links = Array.from(document.querySelectorAll('.main-nav a'));
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    links.forEach(link => {
                        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
                        else link.removeAttribute('aria-current');
                    });
                }
            });
        }, { rootMargin: '-15% 0px -55% 0px' });
        document.querySelectorAll('section.exhibit').forEach(section => observer.observe(section));
    }
    document.querySelectorAll('.enhanced').forEach(element => { element.hidden = false; });
    document.body.dataset.museum = 'ready';
})();

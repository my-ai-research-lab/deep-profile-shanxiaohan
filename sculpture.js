(() => {
    'use strict';
    const canvas = document.getElementById('sculpture');
    const stage = canvas.closest('.sculpture-stage');
    const pauseButton = document.getElementById('sculpture-pause');
    const expandButton = document.getElementById('sculpture-expand');
    const rotateButton = document.getElementById('sculpture-rotate');
    const resetButton = document.getElementById('sculpture-reset');
    const hint = document.getElementById('sculpture-hint');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frameId = 0;
    let visible = true;
    let disposed = false;
    let paused = motion.matches;
    let yaw = -0.35;
    let pitch = 0.58;
    let targetYaw = yaw;
    let targetPitch = pitch;
    let spread = 0;
    let targetSpread = 0;
    let selectedLayer = 0;
    let pointer = null;
    let lastTimestamp = 0;
    let observer;
    let sizeObserver;

    const fallback = () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        frameId = 0;
        if (observer) observer.disconnect();
        if (sizeObserver) sizeObserver.disconnect();
        canvas.dataset.renderer = 'fallback';
        stage.classList.remove('has-webgl');
        canvas.hidden = true;
        [pauseButton, expandButton, rotateButton, resetButton].forEach(button => { button.disabled = true; });
        hint.textContent = '当前使用静态雕塑；下方七个主题仍可正常探索。';
    };

    let graphics;
    try { graphics = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { fallback(); return; }
    if (!graphics) { fallback(); return; }

    const vertexSource = `
        precision highp float;
        attribute vec2 aAngles;
        uniform vec2 uViewport;
        uniform float uYaw;
        uniform float uPitch;
        uniform float uSpread;
        uniform float uLayer;
        uniform float uRadius;
        varying vec3 vNormal;
        varying vec3 vPosition;
        mat3 rotateX(float angle) {
            float cosine = cos(angle), sine = sin(angle);
            return mat3(1.0,0.0,0.0, 0.0,cosine,sine, 0.0,-sine,cosine);
        }
        mat3 rotateY(float angle) {
            float cosine = cos(angle), sine = sin(angle);
            return mat3(cosine,0.0,-sine, 0.0,1.0,0.0, sine,0.0,cosine);
        }
        mat3 rotateZ(float angle) {
            float cosine = cos(angle), sine = sin(angle);
            return mat3(cosine,sine,0.0, -sine,cosine,0.0, 0.0,0.0,1.0);
        }
        void main() {
            float around = aAngles.x;
            float tube = aAngles.y;
            float radius = uRadius * (1.0 + 0.085 * cos(around * 3.0 + uLayer * 0.28));
            float derivative = -uRadius * 0.255 * sin(around * 3.0 + uLayer * 0.28);
            vec3 tangent = normalize(vec3(derivative*cos(around)-radius*sin(around),0.0,derivative*sin(around)+radius*cos(around)));
            vec3 outward = normalize(vec3(tangent.z,0.0,-tangent.x));
            vec3 normal = outward*cos(tube) + vec3(0.0,sin(tube),0.0);
            vec3 position = vec3(radius*cos(around),0.0,radius*sin(around)) + normal*0.125;
            mat3 localRotation = rotateY(uLayer*0.16 + uSpread*uLayer*0.08);
            position = localRotation*position;
            normal = localRotation*normal;
            position.y += (uLayer-3.0)*(0.32+uSpread*0.30);
            position.x += sin(uLayer*0.6)*uSpread*0.16;
            mat3 model = rotateZ(-0.24)*rotateX(uPitch)*rotateY(uYaw);
            position = model*position;
            normal = model*normal;
            float zoom = 1.0 - uSpread*0.13;
            position *= zoom;
            position.z -= 7.7;
            float aspect = uViewport.x/uViewport.y;
            float focal = 2.75;
            gl_Position = vec4(position.x*focal/aspect,position.y*focal,-1.0067*position.z-0.2007,-position.z);
            vNormal = normal;
            vPosition = position;
        }
    `;
    const fragmentSource = `
        precision mediump float;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 uMetal;
        void main() {
            vec3 normal = normalize(vNormal);
            vec3 view = normalize(-vPosition);
            vec3 key = normalize(vec3(-2.0,3.5,4.0));
            vec3 fill = normalize(vec3(3.0,0.5,2.0));
            vec3 rim = normalize(vec3(0.3,2.0,-3.0));
            float diffuse = max(dot(normal,key),0.0)*0.43 + max(dot(normal,fill),0.0)*0.16;
            float edge = pow(1.0-max(dot(normal,view),0.0),2.4);
            float specular = pow(max(dot(normal,normalize(key+view)),0.0),65.0)*0.95;
            specular += pow(max(dot(normal,normalize(fill+view)),0.0),95.0)*0.60;
            float back = max(dot(normal,rim),0.0)*0.25;
            vec3 reflected = reflect(-view,normal);
            float softbox = smoothstep(0.75,0.98,reflected.y)*0.38;
            float stripe = pow(max(0.0,1.0-abs(reflected.x+0.32)*7.0),5.0)*0.25;
            vec3 color = uMetal*(0.12+diffuse+edge*0.16+back+softbox+stripe) + vec3(specular);
            color = pow(color,vec3(0.82));
            gl_FragColor = vec4(color,1.0);
        }
    `;

    const compile = (type, source) => {
        const shader = graphics.createShader(type);
        graphics.shaderSource(shader, source);
        graphics.compileShader(shader);
        if (!graphics.getShaderParameter(shader, graphics.COMPILE_STATUS)) {
            graphics.deleteShader(shader);
            throw new Error('Sculpture shader unavailable');
        }
        return shader;
    };

    let program;
    try {
        program = graphics.createProgram();
        const vertex = compile(graphics.VERTEX_SHADER, vertexSource);
        const fragment = compile(graphics.FRAGMENT_SHADER, fragmentSource);
        graphics.attachShader(program, vertex);
        graphics.attachShader(program, fragment);
        graphics.linkProgram(program);
        graphics.deleteShader(vertex);
        graphics.deleteShader(fragment);
        if (!graphics.getProgramParameter(program, graphics.LINK_STATUS)) throw new Error('Sculpture program unavailable');
    } catch {
        if (program) graphics.deleteProgram(program);
        fallback();
        return;
    }

    const angles = [];
    const indices = [];
    const ringSegments = 120;
    const tubeSegments = 24;
    for (let ring = 0; ring <= ringSegments; ring++) {
        for (let tube = 0; tube <= tubeSegments; tube++) {
            angles.push(ring / ringSegments * Math.PI * 2, tube / tubeSegments * Math.PI * 2);
            if (ring < ringSegments && tube < tubeSegments) {
                const corner = ring * (tubeSegments + 1) + tube;
                const next = corner + tubeSegments + 1;
                indices.push(corner, next, corner + 1, next, next + 1, corner + 1);
            }
        }
    }
    graphics.useProgram(program);
    const vertexBuffer = graphics.createBuffer();
    graphics.bindBuffer(graphics.ARRAY_BUFFER, vertexBuffer);
    graphics.bufferData(graphics.ARRAY_BUFFER, new Float32Array(angles), graphics.STATIC_DRAW);
    const location = graphics.getAttribLocation(program, 'aAngles');
    graphics.enableVertexAttribArray(location);
    graphics.vertexAttribPointer(location, 2, graphics.FLOAT, false, 0, 0);
    const indexBuffer = graphics.createBuffer();
    graphics.bindBuffer(graphics.ELEMENT_ARRAY_BUFFER, indexBuffer);
    graphics.bufferData(graphics.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), graphics.STATIC_DRAW);
    const uniforms = {};
    ['uViewport', 'uYaw', 'uPitch', 'uSpread', 'uLayer', 'uRadius', 'uMetal'].forEach(name => { uniforms[name] = graphics.getUniformLocation(program, name); });
    graphics.enable(graphics.DEPTH_TEST);
    graphics.clearColor(0, 0, 0, 0);
    const radii = [0.86, 1.32, 1.61, 1.73, 1.61, 1.32, 0.86];

    const resize = () => {
        if (disposed) return;
        const pixelRatio = Math.min(devicePixelRatio || 1, innerWidth < 768 ? 1.5 : 2);
        const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
        const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            graphics.viewport(0, 0, width, height);
        }
        wake();
    };

    function render(timestamp) {
        frameId = 0;
        if (disposed || !visible || document.hidden) return;
        const elapsed = lastTimestamp ? Math.min((timestamp - lastTimestamp) / 1000, 0.05) : 0.016;
        lastTimestamp = timestamp;
        if (!paused && !motion.matches && !pointer) targetYaw += elapsed * 0.12;
        const blend = motion.matches ? 1 : 1 - Math.exp(-elapsed * 8);
        yaw += (targetYaw - yaw) * blend;
        pitch += (targetPitch - pitch) * blend;
        spread += (targetSpread - spread) * blend;
        graphics.clear(graphics.COLOR_BUFFER_BIT | graphics.DEPTH_BUFFER_BIT);
        graphics.uniform2f(uniforms.uViewport, canvas.width, canvas.height);
        graphics.uniform1f(uniforms.uYaw, yaw);
        graphics.uniform1f(uniforms.uPitch, pitch);
        graphics.uniform1f(uniforms.uSpread, spread);
        radii.forEach((radius, layer) => {
            graphics.uniform1f(uniforms.uLayer, layer);
            graphics.uniform1f(uniforms.uRadius, radius);
            const copper = layer === selectedLayer;
            graphics.uniform3f(uniforms.uMetal, copper ? 0.85 : 0.92, copper ? 0.59 : 0.94, copper ? 0.37 : 0.98);
            graphics.drawElements(graphics.TRIANGLES, indices.length, graphics.UNSIGNED_SHORT, 0);
        });
        canvas.dataset.rotation = yaw.toFixed(3);
        canvas.dataset.spread = spread.toFixed(3);
        const moving = Math.abs(targetYaw - yaw) + Math.abs(targetPitch - pitch) + Math.abs(targetSpread - spread) > 0.001;
        if ((!paused && !motion.matches) || moving) frameId = requestAnimationFrame(render);
    }

    function wake() {
        if (!frameId && !disposed && visible && !document.hidden) frameId = requestAnimationFrame(render);
    }

    const updatePause = () => {
        if (disposed) return;
        pauseButton.setAttribute('aria-pressed', String(paused || motion.matches));
        pauseButton.textContent = motion.matches ? '已减少动态效果' : paused ? '继续旋转' : '暂停旋转';
        pauseButton.disabled = motion.matches;
        wake();
    };
    pauseButton.addEventListener('click', () => { paused = !paused; updatePause(); });
    expandButton.addEventListener('click', () => {
        targetSpread = targetSpread ? 0 : 1;
        expandButton.setAttribute('aria-pressed', String(Boolean(targetSpread)));
        expandButton.textContent = targetSpread ? '合拢结构 ↙' : '展开结构 ↗';
        wake();
    });
    rotateButton.addEventListener('click', () => { targetYaw += Math.PI / 2; wake(); });
    resetButton.addEventListener('click', () => {
        targetYaw = -0.35;
        targetPitch = 0.58;
        targetSpread = 0;
        expandButton.setAttribute('aria-pressed', 'false');
        expandButton.textContent = '展开结构 ↗';
        wake();
    });
    canvas.addEventListener('museum:select', event => {
        const next = Number(event.detail);
        if (Number.isInteger(next) && next >= 0 && next < 7) { selectedLayer = next; wake(); }
    });
    canvas.addEventListener('pointerdown', event => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
        pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, yaw: targetYaw, pitch: targetPitch };
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
        if (!pointer || pointer.id !== event.pointerId) return;
        targetYaw = pointer.yaw + (event.clientX - pointer.startX) * 0.009;
        if (event.pointerType !== 'touch') targetPitch = Math.max(-0.7, Math.min(1.3, pointer.pitch + (event.clientY - pointer.startY) * 0.006));
        wake();
    });
    const release = () => { pointer = null; wake(); };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; lastTimestamp = 0; }
        else wake();
    });
    motion.addEventListener('change', () => { paused = motion.matches; updatePause(); });
    if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            if (!visible) { cancelAnimationFrame(frameId); frameId = 0; lastTimestamp = 0; }
            else wake();
        });
        observer.observe(canvas);
    }
    if ('ResizeObserver' in window) { sizeObserver = new ResizeObserver(resize); sizeObserver.observe(canvas); }
    window.addEventListener('resize', resize);
    canvas.dataset.renderer = 'webgl';
    stage.classList.add('has-webgl');
    hint.textContent = '拖动旋转 · 点选切面 · 几何形态为艺术表达';
    updatePause();
    resize();
})();

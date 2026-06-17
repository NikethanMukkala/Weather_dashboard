// MagicRings - Vanilla JS conversion of the React Three.js component
// Renders an interactive WebGL shader background with animated rings

(function () {
  const vertexShader = `
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;

    uniform float uTime, uAttenuation, uLineThickness;
    uniform float uBaseRadius, uRadiusStep, uScaleRate;
    uniform float uOpacity, uNoiseAmount, uRotation, uRingGap;
    uniform float uFadeIn, uFadeOut;
    uniform float uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;
    uniform vec2 uResolution, uMouse;
    uniform vec3 uColor, uColorTwo;
    uniform int uRingCount;

    const float HP = 1.5707963;
    const float CYCLE = 3.45;

    float fade(float t) {
      return t < uFadeIn ? smoothstep(0.0, uFadeIn, t) : 1.0 - smoothstep(uFadeOut, CYCLE - 0.2, t);
    }

    float ring(vec2 p, float ri, float cut, float t0, float px) {
      float t = mod(uTime + t0, CYCLE);
      float r = ri + t / CYCLE * uScaleRate;
      float d = abs(length(p) - r);
      float a = atan(abs(p.y), abs(p.x)) / HP;
      float th = max(1.0 - a, 0.5) * px * uLineThickness;
      float h = (1.0 - smoothstep(th, th * 1.5, d)) + 1.0;
      d += pow(cut * a, 3.0) * r;
      return h * exp(-uAttenuation * d) * fade(t);
    }

    void main() {
      float px = 1.0 / min(uResolution.x, uResolution.y);
      vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) * px;
      float cr = cos(uRotation), sr = sin(uRotation);
      p = mat2(cr, -sr, sr, cr) * p;
      p -= uMouse * uMouseInfluence;
      float sc = mix(1.0, uHoverScale, uHoverAmount) + uBurst * 0.3;
      p /= sc;
      vec3 c = vec3(0.0);
      float rcf = max(float(uRingCount) - 1.0, 1.0);
      for (int i = 0; i < 10; i++) {
        if (i >= uRingCount) break;
        float fi = float(i);
        vec2 pr = p - fi * uParallax * uMouse;
        vec3 rc = mix(uColor, uColorTwo, fi / rcf);
        c = mix(c, rc, vec3(ring(pr, uBaseRadius + fi * uRadiusStep, pow(uRingGap, fi), i == 0 ? 0.0 : 2.95 * fi, px)));
      }
      c *= 1.0 + uBurst * 2.0;
      float n = fract(sin(dot(gl_FragCoord.xy + uTime * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
      c += (n - 0.5) * uNoiseAmount;
      gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)) * uOpacity);
    }
  `;

  // Configuration
  const config = {
    color: '#A855F7',
    colorTwo: '#6366F1',
    speed: 1,
    ringCount: 6,
    attenuation: 10,
    lineThickness: 2,
    baseRadius: 0.35,
    radiusStep: 0.1,
    scaleRate: 0.1,
    opacity: 1,
    noiseAmount: 0.1,
    rotation: 0,
    ringGap: 1.5,
    fadeIn: 0.7,
    fadeOut: 0.5,
    followMouse: true,
    mouseInfluence: 0.2,
    hoverScale: 1.2,
    parallax: 0.05,
    clickBurst: true,
  };

  const mount = document.getElementById('magic-rings-bg');
  if (!mount) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true });
  } catch (e) {
    console.warn('WebGL not supported for MagicRings background');
    return;
  }

  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
  camera.position.z = 1;

  const uniforms = {
    uTime: { value: 0 },
    uAttenuation: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
    uColor: { value: new THREE.Color() },
    uColorTwo: { value: new THREE.Color() },
    uLineThickness: { value: 0 },
    uBaseRadius: { value: 0 },
    uRadiusStep: { value: 0 },
    uScaleRate: { value: 0 },
    uRingCount: { value: 0 },
    uOpacity: { value: 1 },
    uNoiseAmount: { value: 0 },
    uRotation: { value: 0 },
    uRingGap: { value: 1.6 },
    uFadeIn: { value: 0.5 },
    uFadeOut: { value: 0.75 },
    uMouse: { value: new THREE.Vector2() },
    uMouseInfluence: { value: 0 },
    uHoverAmount: { value: 0 },
    uHoverScale: { value: 1 },
    uParallax: { value: 0 },
    uBurst: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  scene.add(quad);

  // Mouse tracking state
  let mouse = [0, 0];
  let smoothMouse = [0, 0];
  let hoverAmount = 0;
  let isHovered = false;
  let burst = 0;

  // Resize handler
  function resize() {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setSize(w, h);
    renderer.setPixelRatio(dpr);
    uniforms.uResolution.value.set(w * dpr, h * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  const ro = new ResizeObserver(resize);
  ro.observe(mount);

  // Mouse event handlers
  mount.addEventListener('mousemove', function (e) {
    const rect = mount.getBoundingClientRect();
    mouse[0] = (e.clientX - rect.left) / rect.width - 0.5;
    mouse[1] = -((e.clientY - rect.top) / rect.height - 0.5);
  });
  mount.addEventListener('mouseenter', function () { isHovered = true; });
  mount.addEventListener('mouseleave', function () {
    isHovered = false;
    mouse[0] = 0;
    mouse[1] = 0;
  });
  mount.addEventListener('click', function () { burst = 1; });

  // Animation loop
  function animate(t) {
    requestAnimationFrame(animate);

    smoothMouse[0] += (mouse[0] - smoothMouse[0]) * 0.08;
    smoothMouse[1] += (mouse[1] - smoothMouse[1]) * 0.08;
    hoverAmount += ((isHovered ? 1 : 0) - hoverAmount) * 0.08;
    burst *= 0.95;
    if (burst < 0.001) burst = 0;

    uniforms.uTime.value = t * 0.001 * config.speed;
    uniforms.uAttenuation.value = config.attenuation;
    uniforms.uColor.value.set(config.color);
    uniforms.uColorTwo.value.set(config.colorTwo);
    uniforms.uLineThickness.value = config.lineThickness;
    uniforms.uBaseRadius.value = config.baseRadius;
    uniforms.uRadiusStep.value = config.radiusStep;
    uniforms.uScaleRate.value = config.scaleRate;
    uniforms.uRingCount.value = config.ringCount;
    uniforms.uOpacity.value = config.opacity;
    uniforms.uNoiseAmount.value = config.noiseAmount;
    uniforms.uRotation.value = (config.rotation * Math.PI) / 180;
    uniforms.uRingGap.value = config.ringGap;
    uniforms.uFadeIn.value = config.fadeIn;
    uniforms.uFadeOut.value = config.fadeOut;
    uniforms.uMouse.value.set(smoothMouse[0], smoothMouse[1]);
    uniforms.uMouseInfluence.value = config.followMouse ? config.mouseInfluence : 0;
    uniforms.uHoverAmount.value = hoverAmount;
    uniforms.uHoverScale.value = config.hoverScale;
    uniforms.uParallax.value = config.parallax;
    uniforms.uBurst.value = config.clickBurst ? burst : 0;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
})();

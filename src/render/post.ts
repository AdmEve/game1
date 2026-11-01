/**
 * Film-style post-processing: the scene is drawn into an HDR, multisampled target, then one composite pass
 * adds bloom (from a small blurred mip chain), filmic tone mapping, a color grade (saturation, contrast,
 * split-toning), a lens vignette and a little film grain. Everything after the scene pass runs at a quarter
 * or eighth of the resolution except the final composite, so it stays cheap on phones.
 */
import * as THREE from 'three';

export interface Grade {
  /** 1 = untouched. */
  saturation: number;
  contrast: number;
  /** Tints mixed into the shadows and the highlights (linear rgb, small values). */
  shadows: [number, number, number];
  highlights: [number, number, number];
  bloom: number;
  /** Luminance above which pixels start to glow. */
  threshold: number;
  vignette: number;
}

export const DEFAULT_GRADE: Grade = { saturation: 0.92, contrast: 1.06, shadows: [0.0, 0.01, 0.025], highlights: [0.03, 0.015, 0.0], bloom: 0.35, threshold: 1.1, vignette: 0.32 };

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BRIGHT = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 texel; uniform float threshold; varying vec2 vUv;
void main() {
  vec3 c = vec3(0.0);
  c += texture2D(tSrc, vUv + texel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tSrc, vUv + texel * vec2( 1.0, -1.0)).rgb;
  c += texture2D(tSrc, vUv + texel * vec2(-1.0,  1.0)).rgb;
  c += texture2D(tSrc, vUv + texel * vec2( 1.0,  1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = clamp((l - threshold) / max(l, 1e-4), 0.0, 1.0);
  gl_FragColor = vec4(min(c * k, vec3(24.0)), 1.0);
}`;

const BLUR = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.227027;
  c += texture2D(tSrc, vUv + dir * 1.3846153).rgb * 0.3162162;
  c += texture2D(tSrc, vUv - dir * 1.3846153).rgb * 0.3162162;
  c += texture2D(tSrc, vUv + dir * 3.2307692).rgb * 0.0702703;
  c += texture2D(tSrc, vUv - dir * 3.2307692).rgb * 0.0702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const COMPOSITE = /* glsl */ `
uniform sampler2D tScene, tBloomA, tBloomB;
uniform float bloom, saturation, contrast, vignette, grain, time, aspect;
uniform vec3 shadowTint, highTint;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  c += (texture2D(tBloomA, vUv).rgb * 0.6 + texture2D(tBloomB, vUv).rgb * 0.8) * bloom;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  vec3 g = gl_FragColor.rgb;
  float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
  g = mix(vec3(l), g, saturation);
  g = (g - 0.5) * contrast + 0.5;
  g += shadowTint * (1.0 - l) + highTint * l;
  vec2 d = (vUv - 0.5) * vec2(aspect, 1.0);
  g *= 1.0 - vignette * smoothstep(0.25, 1.05, length(d) * 1.25);
  g += (hash(vUv * 1024.0 + fract(time) * 97.0) - 0.5) * grain;
  gl_FragColor = vec4(clamp(g, 0.0, 1.0), 1.0);
}`;

export class Post {
  enabled = true;
  private scene: THREE.WebGLRenderTarget;
  private a1: THREE.WebGLRenderTarget; private a2: THREE.WebGLRenderTarget;
  private b1: THREE.WebGLRenderTarget; private b2: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private qscene = new THREE.Scene();
  private bright: THREE.ShaderMaterial; private blur: THREE.ShaderMaterial; private comp: THREE.ShaderMaterial;
  private size = new THREE.Vector2();
  private t = 0;

  constructor(private renderer: THREE.WebGLRenderer, opts: { samples?: number } = {}) {
    const ext = renderer.extensions;
    const hdr = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const mk = (samples = 0) => new THREE.WebGLRenderTarget(4, 4, { type, samples, depthBuffer: samples > 0 || false, colorSpace: THREE.LinearSRGBColorSpace });
    this.scene = new THREE.WebGLRenderTarget(4, 4, { type, samples: opts.samples ?? 4, colorSpace: THREE.LinearSRGBColorSpace });
    this.a1 = mk(); this.a2 = mk(); this.b1 = mk(); this.b2 = mk();
    for (const r of [this.a1, this.a2, this.b1, this.b2]) r.texture.minFilter = r.texture.magFilter = THREE.LinearFilter;
    this.bright = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: BRIGHT, uniforms: { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 1 } }, depthTest: false, depthWrite: false, toneMapped: false });
    this.blur = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: BLUR, uniforms: { tSrc: { value: null }, dir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false, toneMapped: false });
    this.comp = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: COMPOSITE, depthTest: false, depthWrite: false,
      uniforms: {
        tScene: { value: this.scene.texture }, tBloomA: { value: this.a1.texture }, tBloomB: { value: this.b1.texture },
        bloom: { value: 0.35 }, saturation: { value: 1 }, contrast: { value: 1 }, vignette: { value: 0.3 }, grain: { value: 0.018 }, time: { value: 0 }, aspect: { value: 1 },
        shadowTint: { value: new THREE.Vector3() }, highTint: { value: new THREE.Vector3() },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.comp);
    this.quad.frustumCulled = false;
    this.qscene.add(this.quad);
    this.setGrade(DEFAULT_GRADE);
  }

  setGrade(g: Grade) {
    const u = this.comp.uniforms;
    u.saturation.value = g.saturation; u.contrast.value = g.contrast; u.vignette.value = g.vignette; u.bloom.value = g.bloom;
    u.shadowTint.value.set(...g.shadows); u.highTint.value.set(...g.highlights);
    this.bright.uniforms.threshold.value = g.threshold;
  }

  setSize() {
    this.renderer.getDrawingBufferSize(this.size);
    const w = Math.max(4, this.size.x), h = Math.max(4, this.size.y);
    this.scene.setSize(w, h);
    this.a1.setSize(Math.ceil(w / 4), Math.ceil(h / 4)); this.a2.setSize(Math.ceil(w / 4), Math.ceil(h / 4));
    this.b1.setSize(Math.ceil(w / 8), Math.ceil(h / 8)); this.b2.setSize(Math.ceil(w / 8), Math.ceil(h / 8));
    this.comp.uniforms.aspect.value = w / h;
  }

  private pass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.qscene, this.cam);
  }

  render(scene: THREE.Scene, camera: THREE.Camera, dt = 1 / 60) {
    const r = this.renderer;
    if (!this.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    r.getDrawingBufferSize(this.size);
    if (this.size.x !== this.scene.width || this.size.y !== this.scene.height) this.setSize();
    this.t += dt;
    r.setRenderTarget(this.scene);
    r.render(scene, camera);
    // Bloom: bright parts at 1/4 res, blurred; then a wider glow at 1/8.
    this.bright.uniforms.tSrc.value = this.scene.texture;
    this.bright.uniforms.texel.value.set(1 / this.scene.width, 1 / this.scene.height);
    this.pass(this.bright, this.a1);
    this.blur.uniforms.tSrc.value = this.a1.texture; this.blur.uniforms.dir.value.set(1 / this.a1.width, 0); this.pass(this.blur, this.a2);
    this.blur.uniforms.tSrc.value = this.a2.texture; this.blur.uniforms.dir.value.set(0, 1 / this.a1.height); this.pass(this.blur, this.a1);
    this.blur.uniforms.tSrc.value = this.a1.texture; this.blur.uniforms.dir.value.set(2 / this.a1.width, 0); this.pass(this.blur, this.b2);
    this.blur.uniforms.tSrc.value = this.b2.texture; this.blur.uniforms.dir.value.set(0, 1 / this.b1.height); this.pass(this.blur, this.b1);
    this.blur.uniforms.tSrc.value = this.b1.texture; this.blur.uniforms.dir.value.set(1 / this.b1.width, 0); this.pass(this.blur, this.b2);
    this.blur.uniforms.tSrc.value = this.b2.texture; this.blur.uniforms.dir.value.set(0, 1 / this.b1.height); this.pass(this.blur, this.b1);
    this.comp.uniforms.time.value = this.t;
    this.pass(this.comp, null);
  }
}

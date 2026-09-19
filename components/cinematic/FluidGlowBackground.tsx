'use client'

import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface FluidGlowBackgroundProps {
  className?: string
  accentColor?: string
}

export default function FluidGlowBackground({
  className = '',
}: FluidGlowBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch (e) {
      console.warn('WebGL not supported, falling back to CSS canvas', e)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    // GLSL Shader for Organic Fluid Light
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      // Color Palette: Deep Charcoal, Logo Green (#7FBA44), Fresh Aqua (#2DD4BF), Deep Ocean Cyan
      const vec3 colorBg = vec3(0.035, 0.051, 0.094);    // #090D18
      const vec3 colorGreen = vec3(0.498, 0.729, 0.267); // #7FBA44
      const vec3 colorAqua = vec3(0.176, 0.831, 0.749);  // #2DD4BF
      const vec3 colorCyan = vec3(0.024, 0.380, 0.451);  // #066173

      // Simplex-like organic noise functions
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ) );
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        st.x *= u_resolution.x / u_resolution.y;

        float t = u_time * 0.25;

        // Mouse influence distortion
        vec2 mouse = u_mouse / u_resolution.xy;
        float mouseDist = distance(st, mouse);
        float mouseInfluence = smoothstep(0.5, 0.0, mouseDist) * 0.15;

        // Bottom-center light origin point
        vec2 origin = vec2(0.5 * (u_resolution.x / u_resolution.y), -0.2);
        float distToOrigin = length(st - origin);

        // Fluid organic noise layers
        float n1 = snoise(st * 1.5 + vec2(t * 0.4, t * 0.3) + mouseInfluence);
        float n2 = snoise(st * 3.0 - vec2(t * 0.5, t * 0.2));
        float n3 = snoise(st * 0.8 + vec2(sin(t * 0.2), cos(t * 0.3)));

        // Combine noise for wave light movement
        float combinedNoise = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2);

        // Bottom glow mask
        float glowMask = smoothstep(1.4, 0.1, distToOrigin + combinedNoise * 0.35);

        // Dynamic color blend
        vec3 glowColor = mix(colorGreen, colorAqua, sin(t * 0.8 + combinedNoise) * 0.5 + 0.5);
        glowColor = mix(glowColor, colorCyan, cos(t * 0.5) * 0.5 + 0.5);

        // Final composite
        vec3 finalColor = mix(colorBg, glowColor, glowMask * 0.85);

        // Subtle vignette at edges
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
        vignette = clamp(pow(16.0 * vignette, 0.25), 0.0, 1.0);
        finalColor *= vignette;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      u_mouse: { value: new THREE.Vector2(container.clientWidth / 2, container.clientHeight / 2) },
    }

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthWrite: false,
      depthTest: false,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Handle Resize
    const handleResize = () => {
      if (!container) return
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      uniforms.u_resolution.value.set(width, height)
    }

    // Handle Mouse Movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      uniforms.u_mouse.value.set(e.clientX - rect.left, rect.height - (e.clientY - rect.top))
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)

    // Animation Loop
    let animationFrameId: number
    const clock = new THREE.Clock()

    const animate = () => {
      uniforms.u_time.value = clock.getElapsedTime()
      renderer.render(scene, camera)
      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {/* CSS Mesh Fallback Background Overlay */}
      <div className="absolute inset-0 bg-radial-gradient-glow pointer-events-none opacity-40 mix-blend-screen" />
    </div>
  )
}

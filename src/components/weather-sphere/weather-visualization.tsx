
"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import type { WeatherCondition } from '@/lib/weather-data';
import Stars from './stars';

interface WeatherVisualizationProps {
  weatherCondition: WeatherCondition;
  sunrise: string;
  sunset: string;
  currentTime: string;
}

const timeToMinutes = (time: string) => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

type DaylightState = 'night' | 'sunrise' | 'day' | 'sunset';

const getDaylightInfo = (currentTime: string, sunrise: string, sunset: string): { factor: number; state: DaylightState; sunPosition: { x: number; y: number; z: number } } => {
    if (!currentTime || !sunrise || !sunset) return { factor: 0.5, state: 'day', sunPosition: { x: 0, y: 5, z: 0 } };
    const now = timeToMinutes(currentTime);
    const rise = timeToMinutes(sunrise);
    const set = timeToMinutes(sunset);
    const dayDuration = set - rise;

    let sunProgress = 0;
    if (dayDuration > 0) {
        sunProgress = (now - rise) / dayDuration; // 0 at sunrise, 1 at sunset
    }

    const sunX = Math.cos(sunProgress * Math.PI) * 10;
    const sunY = Math.sin(sunProgress * Math.PI) * 6;
    const sunZ = Math.sin(sunProgress * Math.PI) * -4;

    if (now < rise - 30 || now > set + 30) return { factor: 0, state: 'night', sunPosition: { x: 0, y: -10, z: 0 } }; // Keep moon/stars centered
    if (now >= rise - 30 && now < rise + 60) return { factor: Math.max(0.1, (now - (rise - 30)) / 90), state: 'sunrise', sunPosition: { x: sunX, y: sunY, z: sunZ } };
    if (now >= set - 60 && now < set + 30) return { factor: Math.max(0.1, 1 - (now - (set - 60)) / 90), state: 'sunset', sunPosition: { x: sunX, y: sunY, z: sunZ } };
    
    if (now >= rise && now <= set) {
        return { factor: Math.sin(sunProgress * Math.PI) * 0.9 + 0.1, state: 'day', sunPosition: { x: sunX, y: sunY, z: sunZ } };
    }

    return { factor: 0, state: 'night', sunPosition: { x: 0, y: -10, z: 0 } };
};


export default function WeatherVisualization({ weatherCondition, sunrise, sunset, currentTime }: WeatherVisualizationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    renderer: null as THREE.WebGLRenderer | null,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    controls: null as OrbitControls | null,
    weatherGroup: null as THREE.Group | null,
    particles: null as THREE.Points | null,
    lightning: null as THREE.PointLight | null,
    lightningTimeout: null as NodeJS.Timeout | null,
    clock: new THREE.Clock(),
    stars: null as Stars | null,
    sunLight: null as THREE.PointLight | null,
  }).current;

  // Setup scene, camera, renderer, controls
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Scene & Camera
    stateRef.scene = new THREE.Scene();
    stateRef.camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    stateRef.camera.position.z = 10;

    // Renderer
    stateRef.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    stateRef.renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    stateRef.renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(stateRef.renderer.domElement);
    
    // Controls
    stateRef.controls = new OrbitControls(stateRef.camera, stateRef.renderer.domElement);
    stateRef.controls.enableDamping = true;
    stateRef.controls.enableZoom = false;
    stateRef.controls.autoRotate = true;
    stateRef.controls.autoRotateSpeed = 0.2;
    stateRef.controls.maxPolarAngle = Math.PI / 2 + 0.3;
    stateRef.controls.minPolarAngle = Math.PI / 2 - 0.3;


    // Animation loop
    const animate = () => {
      if (!stateRef.renderer || !stateRef.scene || !stateRef.camera || !stateRef.controls) return;
      
      const delta = stateRef.clock.getDelta();
      const elapsedTime = stateRef.clock.elapsedTime;
      
      stateRef.stars?.update(delta);
      
      // Particle animation
      if (stateRef.particles) {
        const positions = stateRef.particles.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
          let y = positions.getY(i);
          y -= (weatherCondition === 'Snowy' ? 0.02 : 0.1);
          if (y < -10) y = 10;
          positions.setY(i, y);
        }
        positions.needsUpdate = true;
      }

      // Main object animation
      if (stateRef.weatherGroup) {
         if (weatherCondition === 'Sunny' && stateRef.weatherGroup.children[0]) {
             const sun = stateRef.weatherGroup.children[0] as THREE.Mesh;
             if (sun.name === "sun") {
                sun.scale.setScalar(Math.sin(elapsedTime * 1.5) * 0.05 + 1);
             }
         }
         if (weatherCondition === 'Cloudy' || weatherCondition === 'Thunderstorm' || weatherCondition === 'Rainy') {
            stateRef.weatherGroup.children.forEach((cloud, i) => {
                cloud.rotation.y += delta * 0.05 * (i % 2 === 0 ? 1 : -1);
                cloud.children.forEach((part, j) => {
                    part.position.y += Math.sin(elapsedTime * 2 + j) * 0.001;
                })
            })
         }
      }

      stateRef.controls.update();
      requestAnimationFrame(animate);
      stateRef.renderer.render(stateRef.scene, stateRef.camera);
    };
    animate();

    const handleResize = () => {
        if (!stateRef.camera || !stateRef.renderer || !currentMount) return;
        stateRef.camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        stateRef.camera.updateProjectionMatrix();
        stateRef.renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (currentMount && stateRef.renderer?.domElement) {
        currentMount.removeChild(stateRef.renderer.domElement);
      }
      if (stateRef.lightningTimeout) clearTimeout(stateRef.lightningTimeout);
      stateRef.controls?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update scene based on props
  useEffect(() => {
    const scene = stateRef.scene;
    if (!scene) return;
    
    // Clear previous timeout if any
    if (stateRef.lightningTimeout) clearTimeout(stateRef.lightningTimeout);

    // Clear previous objects
    if (stateRef.weatherGroup) scene.remove(stateRef.weatherGroup);
    if (stateRef.particles) scene.remove(stateRef.particles);
    if (stateRef.lightning) scene.remove(stateRef.lightning);
    if (stateRef.sunLight) scene.remove(stateRef.sunLight);
    if (stateRef.stars) stateRef.stars.remove();

    stateRef.weatherGroup = new THREE.Group();
    stateRef.particles = null;
    stateRef.lightning = null;
    stateRef.sunLight = null;
    stateRef.stars = null;


    const { factor: daylight, state: daylightState, sunPosition } = getDaylightInfo(currentTime, sunrise, sunset);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, daylight * 0.2 + 0.1);
    scene.add(ambientLight);
    
    const directionalLightColor = daylightState === 'day' ? 0xfffde7 : 0x6677cc;
    const directionalLight = new THREE.DirectionalLight(directionalLightColor, daylight * 0.6 + 0.1);
    directionalLight.position.set(sunPosition.x, sunPosition.y, sunPosition.z + 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // FOG
    if (daylightState !== 'night') {
        const fogColor = new THREE.Color(0x87ceeb).lerp(new THREE.Color(0x000033), 1 - daylight);
        scene.fog = new THREE.Fog(fogColor, 10, 40);
    } else {
        scene.fog = new THREE.Fog(0x000011, 10, 30);
    }

    switch (weatherCondition) {
      case 'Sunny': {
        if (daylightState === 'night') {
          // MOON
          const moonGeom = new THREE.SphereGeometry(1.5, 32, 32);
          const moonMat = new THREE.MeshStandardMaterial({
            color: 0xddeeff,
            emissive: 0x8899cc,
            emissiveIntensity: 0.1,
            metalness: 0.1,
            roughness: 0.9,
          });
          const moon = new THREE.Mesh(moonGeom, moonMat);
          moon.name = 'moon';
          stateRef.weatherGroup.add(moon);
          stateRef.stars = new Stars(scene);

        } else {
            // SUN
            let sunColor: THREE.Color;
            if (daylightState === 'sunrise') {
                sunColor = new THREE.Color(0xfffde7).lerp(new THREE.Color(0xff6633), 1 - daylight * 2);
            } else if (daylightState === 'sunset') {
                sunColor = new THREE.Color(0xfffde7).lerp(new THREE.Color(0xff4500), 1 - daylight * 2);
            } else { // day
                sunColor = new THREE.Color(0xfacc15);
            }

            stateRef.sunLight = new THREE.PointLight(0xffffff, 1.5, 2000);
            stateRef.sunLight.position.copy(sunPosition);
            stateRef.sunLight.color.set(sunColor);
            
            const textureLoader = new THREE.TextureLoader();
            const textureFlare0 = textureLoader.load( 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lensflare/lensflare0.png' );
            const textureFlare3 = textureLoader.load( 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lensflare/lensflare3.png' );
            
            const lensflare = new Lensflare();
            lensflare.addElement( new LensflareElement( textureFlare0, 512, 0, stateRef.sunLight.color ) );
            lensflare.addElement( new LensflareElement( textureFlare3, 60, 0.6 ) );
            lensflare.addElement( new LensflareElement( textureFlare3, 70, 0.7 ) );
            lensflare.addElement( new LensflareElement( textureFlare3, 120, 0.9 ) );
            lensflare.addElement( new LensflareElement( textureFlare3, 70, 1.0 ) );

            stateRef.sunLight.add( lensflare );
            scene.add(stateRef.sunLight);

            const sunGeom = new THREE.SphereGeometry(2, 32, 32);
            const sunMat = new THREE.MeshBasicMaterial({ color: sunColor });
            const sun = new THREE.Mesh(sunGeom, sunMat);
            sun.name = 'sun';
            sun.position.copy(sunPosition);
            stateRef.weatherGroup.add(sun);
        }
        break;
      }
      case 'Cloudy': {
        const cloudMaterial = new THREE.MeshStandardMaterial({
          color: daylight > 0.1 ? 0xffffff : 0x48546c,
          opacity: 0.85,
          transparent: true,
          roughness: 0.8,
          flatShading: true
        });

        for (let i = 0; i < 5; i++) {
          const cloudGroup = new THREE.Group();
          for (let j = 0; j < 6; j++) {
            const partGeom = new THREE.IcosahedronGeometry(Math.random() * 0.8 + 0.5, 2);
            const part = new THREE.Mesh(partGeom, cloudMaterial);
            part.position.set(
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 1,
              (Math.random() - 0.5) * 1
            );
            part.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            cloudGroup.add(part);
          }
          cloudGroup.position.set(
            (Math.random() - 0.5) * 8,
            Math.random() * 2 - 1,
            (Math.random() - 0.5) * 4 - 2
          );
          stateRef.weatherGroup.add(cloudGroup);
        }
        if (daylightState === 'night') {
            stateRef.stars = new Stars(scene);
        }
        break;
      }
      case 'Rainy': {
        const particleCount = 2000;
        const positions = [];
        for (let i = 0; i < particleCount; i++) {
          positions.push((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
          color: 0xaaccff,
          size: 0.04,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true
        });
        
        stateRef.particles = new THREE.Points(geometry, material);
        scene.add(stateRef.particles);

        if (daylightState === 'night') {
            stateRef.stars = new Stars(scene);
        }
        break;
      }
      case 'Snowy': {
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: daylight > 0.1 ? 0xaaaaaa : 0x3a4458,
            opacity: 0.5,
            transparent: true,
            roughness: 0.9,
          });
          for (let i = 0; i < 3; i++) {
              const cloudGroup = new THREE.Group();
                for (let j = 0; j < 5; j++) {
                  const partGeom = new THREE.IcosahedronGeometry(Math.random() * 0.8 + 0.5, 1);
                  const part = new THREE.Mesh(partGeom, cloudMaterial);
                  part.position.set(
                    (Math.random() - 0.5) * 2.5,
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1.5
                  );
                  cloudGroup.add(part);
                }
             cloudGroup.position.set(
               (Math.random() - 0.5) * 10,
               2 + (Math.random() - 0.5) * 2,
               (Math.random() - 0.5) * 6 - 3
             );
             stateRef.weatherGroup.add(cloudGroup);
          }

        const particleCount = 1500;
        const positions = [];
        for (let i = 0; i < particleCount; i++) {
          positions.push((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 0.08,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true
        });
        
        stateRef.particles = new THREE.Points(geometry, material);
        scene.add(stateRef.particles);

        if (daylightState === 'night') {
            stateRef.stars = new Stars(scene);
        }
        break;
      }
      case 'Thunderstorm': {
        const cloudMaterial = new THREE.MeshStandardMaterial({
          color: 0x666666,
          opacity: 0.9,
          transparent: true,
          roughness: 0.9,
          flatShading: true,
          emissive: 0x222233,
        });

        for (let i = 0; i < 8; i++) {
          const cloudGroup = new THREE.Group();
          for (let j = 0; j < 8; j++) {
            const partGeom = new THREE.IcosahedronGeometry(Math.random() * 1 + 0.8, 1);
            const part = new THREE.Mesh(partGeom, cloudMaterial);
            part.position.set(
              (Math.random() - 0.5) * 3,
              (Math.random() - 0.5) * 1.5,
              (Math.random() - 0.5) * 1.5
            );
            part.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            cloudGroup.add(part);
          }
          cloudGroup.position.set(
            (Math.random() - 0.5) * 10,
            Math.random() * 2 - 0.5,
            (Math.random() - 0.5) * 5 - 2
          );
          stateRef.weatherGroup.add(cloudGroup);
        }

        stateRef.lightning = new THREE.PointLight(0xccccff, 0, 0, 2);
        stateRef.lightning.position.set(0,0,5);
        scene.add(stateRef.lightning);

        const flash = () => {
            if (stateRef.lightning && weatherCondition === 'Thunderstorm') {
              stateRef.lightning.position.set((Math.random()-0.5) * 20, (Math.random()-0.5) * 10, (Math.random()-0.5)*10);
              stateRef.lightning.power = 50 + Math.random() * 50;
              setTimeout(() => {
                if (stateRef.lightning) stateRef.lightning.power = 0;
              }, 50 + Math.random() * 50);
            }
            stateRef.lightningTimeout = setTimeout(flash, 2000 + Math.random() * 4000);
        }
        flash();
        break;
      }
    }
    scene.add(stateRef.weatherGroup);

  }, [weatherCondition, sunrise, sunset, currentTime, stateRef]);

  return <div ref={mountRef} className="w-full h-full rounded-lg overflow-hidden" />;
}

    
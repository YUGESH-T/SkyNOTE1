
"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

const getDaylightInfo = (currentTime: string, sunrise: string, sunset: string): { factor: number; state: DaylightState; sunPosition: { x: number; y: number } } => {
    if (!currentTime || !sunrise || !sunset) return { factor: 0.5, state: 'day', sunPosition: { x: 0, y: 5 } };
    const now = timeToMinutes(currentTime);
    const rise = timeToMinutes(sunrise);
    const set = timeToMinutes(sunset);
    const dayDuration = set - rise;

    let sunProgress = 0;
    if (dayDuration > 0 && now >= rise && now <= set) {
        sunProgress = (now - rise) / dayDuration; // 0 at sunrise, 1 at sunset
    }

    const sunX = (sunProgress - 0.5) * -16; // Range from 8 to -8
    const sunY = Math.sin(sunProgress * Math.PI) * 6; // Arched path

    if (now < rise - 30 || now > set + 30) return { factor: 0, state: 'night', sunPosition: { x: 0, y: 0 } };
    if (now >= rise - 30 && now < rise + 60) return { factor: Math.max(0.1, (now - (rise - 30)) / 90), state: 'sunrise', sunPosition: { x: sunX, y: sunY } };
    if (now >= set - 60 && now < set + 30) return { factor: Math.max(0.1, 1 - (now - (set - 60)) / 90), state: 'sunset', sunPosition: { x: sunX, y: sunY } };
    if (now < rise || now > set) return { factor: 0, state: 'night', sunPosition: { x: 0, y: 0 } };

    const midday = rise + dayDuration / 2;
    const timeFromMidday = Math.abs(now - midday);
    
    const daylight = 1 - (timeFromMidday / (dayDuration / 2));
    return { factor: Math.sin(daylight * Math.PI / 2) * 0.8 + 0.2, state: 'day', sunPosition: { x: sunX, y: sunY } };
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
                sun.scale.setScalar(Math.sin(elapsedTime * 2) * 0.02 + 1);
             }
         }
         if (weatherCondition === 'Cloudy' || weatherCondition === 'Thunderstorm') {
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
    if (stateRef.stars) stateRef.stars.remove();

    stateRef.weatherGroup = new THREE.Group();
    stateRef.particles = null;
    stateRef.lightning = null;
    stateRef.stars = null;


    const { factor: daylight, state: daylightState, sunPosition } = getDaylightInfo(currentTime, sunrise, sunset);
    
    // Lighting
    scene.clear();
    const ambientLight = new THREE.AmbientLight(0xffffff, daylight * 0.4 + 0.1);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, daylight * 0.8 + 0.2);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    switch (weatherCondition) {
      case 'Sunny': {
        if (daylightState === 'night') {
          // MOON
          const moonGeom = new THREE.SphereGeometry(2, 32, 32);
          const moonMat = new THREE.MeshStandardMaterial({
            color: 0xddeeff,
            emissive: 0x8899cc,
            emissiveIntensity: 0.1,
            metalness: 0.1,
            roughness: 0.9,
          });
          const moon = new THREE.Mesh(moonGeom, moonMat);
          moon.name = 'moon';

          // Craters
          const craterGeom = new THREE.SphereGeometry(1, 16, 16);
          const craterMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 1 });
          for (let i = 0; i < 15; i++) {
            const crater = new THREE.Mesh(craterGeom, craterMat);
            const size = Math.random() * 0.3 + 0.1;
            crater.scale.set(size, size, size * 0.5);
            const pos = new THREE.Vector3().setFromSphericalCoords(2.01, Math.acos(2 * Math.random() - 1), Math.random() * 2 * Math.PI);
            crater.position.copy(pos);
            crater.lookAt(new THREE.Vector3(0,0,0));
            moon.add(crater);
          }
          stateRef.weatherGroup.add(moon);
          stateRef.stars = new Stars(scene);

        } else {
            // SUN
            const sunGeom = new THREE.IcosahedronGeometry(2.5, 3);
            const sunColor = daylightState === 'day' ? 0xffa500 : 0xff6633; // Orange for day, reddish for sunset/sunrise
            const sunEmissive = daylightState === 'day' ? 0xffa500 : 0xff4400;

            const sunMat = new THREE.MeshStandardMaterial({
              color: sunColor,
              emissive: sunEmissive,
              emissiveIntensity: 0.8,
              metalness: 0.1,
              roughness: 0.4,
              flatShading: true,
            });
            const sun = new THREE.Mesh(sunGeom, sunMat);
            sun.name = 'sun';
            sun.position.set(sunPosition.x, sunPosition.y, 0);
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
      case 'Rainy':
      case 'Snowy': {
        const isSnow = weatherCondition === 'Snowy';
        const particleCount = isSnow ? 1500 : 2000;
        const positions = [];
        for (let i = 0; i < particleCount; i++) {
          positions.push((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
          color: isSnow ? 0xffffff : 0xaaccff,
          size: isSnow ? 0.08 : 0.04,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true
        });
        
        stateRef.particles = new THREE.Points(geometry, material);
        scene.add(stateRef.particles);

        if (isSnow) {
            // Add some subtle clouds for atmosphere in snow
            const cloudMaterial = new THREE.MeshStandardMaterial({
              color: daylight > 0.1 ? 0xaaaaaa : 0x3a4458,
              opacity: 0.5,
              transparent: true,
              roughness: 0.9,
            });
            for (let i = 0; i < 3; i++) {
               const cloudSphere = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), cloudMaterial);
               cloudSphere.position.set(
                 (Math.random() - 0.5) * 10,
                 2 + (Math.random() - 0.5) * 2,
                 (Math.random() - 0.5) * 6 - 3
               );
               cloudSphere.scale.set(1.5, 0.8, 1.2);
               stateRef.weatherGroup.add(cloudSphere);
            }
        }
        if (daylightState === 'night') {
            stateRef.stars = new Stars(scene);
        }
        break;
      }
      case 'Thunderstorm': {
        const cloudMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a2a, // Dark stormy color
          opacity: 0.9,
          transparent: true,
          roughness: 0.9,
          flatShading: true,
          emissive: 0x111122,
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


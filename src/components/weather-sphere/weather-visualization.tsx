"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { WeatherCondition } from '@/lib/weather-data';

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

const getDaylightFactor = (currentTime: string, sunrise: string, sunset: string) => {
  if (!currentTime || !sunrise || !sunset) return 0.5;
  const now = timeToMinutes(currentTime);
  const rise = timeToMinutes(sunrise);
  const set = timeToMinutes(sunset);
  
  if (now < rise || now > set) return 0; // Night
  const dayDuration = set - rise;
  if (dayDuration <= 0) return 0;

  const midday = rise + dayDuration / 2;
  const timeFromMidday = Math.abs(now - midday);
  
  return 1 - (timeFromMidday / (dayDuration / 2));
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
    clock: new THREE.Clock(),
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
    stateRef.controls.autoRotateSpeed = 0.5;

    // Animation loop
    const animate = () => {
      if (!stateRef.renderer || !stateRef.scene || !stateRef.camera || !stateRef.controls) return;
      
      const delta = stateRef.clock.getDelta();
      
      // Particle animation
      if (stateRef.particles) {
        stateRef.particles.rotation.y += delta * 0.1;
        const positions = stateRef.particles.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
          let y = positions.getY(i);
          y -= 0.1;
          if (y < -10) y = 10;
          positions.setY(i, y);
        }
        positions.needsUpdate = true;
      }

      // Main object animation
      if (stateRef.weatherGroup) {
         if (weatherCondition === 'Sunny') {
            stateRef.weatherGroup.rotation.y += delta * 0.1;
         }
         if (weatherCondition === 'Cloudy') {
            stateRef.weatherGroup.children.forEach((cloud, i) => {
                cloud.position.x += Math.sin(stateRef.clock.elapsedTime + i) * 0.001;
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
      stateRef.controls?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update scene based on props
  useEffect(() => {
    const scene = stateRef.scene;
    if (!scene) return;

    // Clear previous objects
    if (stateRef.weatherGroup) scene.remove(stateRef.weatherGroup);
    if (stateRef.particles) scene.remove(stateRef.particles);
    stateRef.weatherGroup = new THREE.Group();
    stateRef.particles = null;

    const daylight = getDaylightFactor(currentTime, sunrise, sunset);
    const isNight = daylight < 0.2;

    // Lighting
    scene.clear();
    const ambientLight = new THREE.AmbientLight(0xffffff, daylight * 0.5 + 0.1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(isNight ? 0x6c7a9a : 0xfff4e0, daylight * 0.8 + 0.2);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    switch (weatherCondition) {
      case 'Sunny': {
        const sunGeom = new THREE.IcosahedronGeometry(3, 8);
        const sunMat = new THREE.MeshStandardMaterial({
          color: isNight ? 0xddeeff : 0xffdd00,
          emissive: isNight ? 0xddeeff : 0xffdd00,
          emissiveIntensity: 0.8,
          metalness: 0.2,
          roughness: 0.3,
        });
        const sun = new THREE.Mesh(sunGeom, sunMat);
        stateRef.weatherGroup.add(sun);
        break;
      }
      case 'Cloudy': {
        const cloudMaterial = new THREE.MeshStandardMaterial({
          color: isNight ? 0x4a5468 : 0xf0f0f0,
          transparent: true,
          opacity: 0.8,
          roughness: 0.9,
        });
        for (let i = 0; i < 6; i++) {
          const cloudSphere = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), cloudMaterial);
          cloudSphere.position.set(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 4
          );
          const scale = 1 + Math.random() * 0.5;
          cloudSphere.scale.set(scale, scale * 0.7, scale);
          stateRef.weatherGroup.add(cloudSphere);
        }
        break;
      }
      case 'Rainy':
      case 'Snowy': {
        const isSnow = weatherCondition === 'Snowy';
        const particleCount = isSnow ? 500 : 1000;
        const positions = [];
        for (let i = 0; i < particleCount; i++) {
          positions.push((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
          color: isSnow ? 0xffffff : 0x88aaff,
          size: isSnow ? 0.1 : 0.05,
          transparent: true,
          opacity: 0.7,
        });
        
        stateRef.particles = new THREE.Points(geometry, material);
        scene.add(stateRef.particles);
        break;
      }
    }
    scene.add(stateRef.weatherGroup);

  }, [weatherCondition, sunrise, sunset, currentTime, stateRef]);

  return <div ref={mountRef} className="w-full h-full" />;
}

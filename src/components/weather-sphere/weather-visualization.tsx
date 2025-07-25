"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { WeatherCondition } from '@/lib/weather-data';

interface WeatherVisualizationProps {
  weatherCondition: WeatherCondition;
  sunrise: string;
  sunset: string;
  currentTime: string;
}

// Helper to convert HH:mm string to minutes from midnight
const timeToMinutes = (time: string) => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Returns a value between 0 (night) and 1 (day)
const getDaylightFactor = (currentTime: string, sunrise: string, sunset: string) => {
  if (!currentTime || !sunrise || !sunset) return 0.5; // Default to neutral if data is missing
  
  const now = timeToMinutes(currentTime);
  const rise = timeToMinutes(sunrise);
  const set = timeToMinutes(sunset);
  const dayDuration = set - rise;

  if (now < rise || now > set) return 0; // Night
  if (now > rise + 60 && now < set - 60) return 1; // Full day

  // Transition for sunrise
  if (now >= rise && now <= rise + 60) {
    return (now - rise) / 60;
  }
  // Transition for sunset
  if (now >= set - 60 && now <= set) {
    return (set - now) / 60;
  }
  
  return 0.5; // Fallback
};

export default function WeatherVisualization({ weatherCondition, sunrise, sunset, currentTime }: WeatherVisualizationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    renderer: null as THREE.WebGLRenderer | null,
    camera: null as THREE.PerspectiveCamera | null,
    particles: [] as THREE.Mesh[],
    weatherObject: null as THREE.Object3D | null,
    ambientLight: null as THREE.AmbientLight | null,
    directionalLight: null as THREE.DirectionalLight | null,
    clock: new THREE.Clock(),
  }).current;

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    stateRef.scene = new THREE.Scene();
    stateRef.camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    stateRef.camera.position.z = 5;

    stateRef.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    stateRef.renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    stateRef.renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(stateRef.renderer.domElement);

    stateRef.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    stateRef.scene.add(stateRef.ambientLight);
    stateRef.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    stateRef.directionalLight.position.set(5, 10, 7.5);
    stateRef.scene.add(stateRef.directionalLight);

    const animate = () => {
      if (!stateRef.renderer || !stateRef.scene || !stateRef.camera) return;
      requestAnimationFrame(animate);

      const elapsedTime = stateRef.clock.getElapsedTime();

      stateRef.particles.forEach(p => {
        p.position.y -= 0.05;
        if (p.position.y < -10) p.position.y = 10;
        p.rotation.y += 0.01;
      });

      if (stateRef.weatherObject) {
         if (weatherCondition === 'Sunny') {
            stateRef.weatherObject.rotation.y += 0.005;
            stateRef.weatherObject.scale.setScalar(1 + Math.sin(elapsedTime * 2) * 0.1);
        } else if (weatherCondition === 'Cloudy') {
            stateRef.weatherObject.children.forEach((cloud, index) => {
                cloud.position.x += Math.sin(elapsedTime * 0.5 + index) * 0.01;
                (cloud.material as THREE.MeshStandardMaterial).opacity = 0.7 + Math.sin(elapsedTime * 0.7 + index) * 0.1;
            });
        }
        stateRef.weatherObject.rotation.y += 0.002;
      }

      stateRef.renderer.render(stateRef.scene, stateRef.camera);
    };

    animate();

    const handleResize = () => {
      if (currentMount && stateRef.renderer && stateRef.camera) {
        stateRef.camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        stateRef.camera.updateProjectionMatrix();
        stateRef.renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (currentMount && stateRef.renderer?.domElement) {
        currentMount.removeChild(stateRef.renderer.domElement);
      }
    };
  }, [stateRef, weatherCondition]);

  useEffect(() => {
    const scene = stateRef.scene;
    if (!scene || !stateRef.ambientLight || !stateRef.directionalLight) return;
    
    // Day/Night cycle
    const daylight = getDaylightFactor(currentTime, sunrise, sunset);
    stateRef.ambientLight.intensity = THREE.MathUtils.lerp(0.1, 0.5, daylight);
    stateRef.directionalLight.intensity = THREE.MathUtils.lerp(0.1, 0.8, daylight);
    const nightColor = new THREE.Color(0x334466);
    const dayColor = new THREE.Color(0xffffff);
    stateRef.directionalLight.color.lerpColors(nightColor, dayColor, daylight);

    if (stateRef.weatherObject) scene.remove(stateRef.weatherObject);
    stateRef.particles.forEach(p => scene.remove(p));
    stateRef.particles = [];
    scene.background = null;
    scene.environment = null;

    const isNight = daylight < 0.3;

    switch (weatherCondition) {
      case 'Sunny': {
        const sunOrMoon = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.5, 8),
          new THREE.MeshStandardMaterial({ color: isNight ? 0xeeeeff : 0xffcc00, emissive: isNight ? 0xeeeeff : 0xffcc00, emissiveIntensity: 0.6 })
        );
        scene.add(sunOrMoon);
        stateRef.weatherObject = sunOrMoon;
        scene.fog = null;
        break;
      }
      case 'Cloudy': {
        const cloudGroup = new THREE.Group();
        const cloudMaterial = new THREE.MeshStandardMaterial({ color: isNight ? 0x666677 : 0xffffff, transparent: true, opacity: 0.7 });
        for (let i = 0; i < 5; i++) {
          const cloudSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), cloudMaterial);
          const scale = 0.8 + Math.random() * 0.4;
          cloudSphere.scale.set(scale, scale * 0.6, scale);
          cloudSphere.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 2 - 1);
          cloudGroup.add(cloudSphere);
        }
        scene.add(cloudGroup);
        stateRef.weatherObject = cloudGroup;
        scene.fog = new THREE.Fog(isNight ? 0x222233 : 0xaaaaaa, 5, 15);
        break;
      }
      case 'Rainy':
      case 'Snowy': {
        const isSnow = weatherCondition === 'Snowy';
        const particleGeometry = isSnow ? new THREE.SphereGeometry(0.05, 8, 8) : new THREE.CylinderGeometry(0.01, 0.01, 0.5, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: isSnow ? 0xffffff : 0xadd8e6 });
        for (let i = 0; i < (isSnow ? 200 : 300); i++) {
          const particle = new THREE.Mesh(particleGeometry, particleMaterial);
          particle.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10);
          scene.add(particle);
          stateRef.particles.push(particle);
        }
        scene.fog = new THREE.Fog(isNight ? 0x334455 : (isSnow ? 0xd0d0d0 : 0x8090a0), 3, 10);
        stateRef.weatherObject = null;
        break;
      }
    }
  }, [weatherCondition, stateRef, sunrise, sunset, currentTime]);

  return <div ref={mountRef} className="w-full h-full rounded-lg shadow-inner bg-transparent" />;
}

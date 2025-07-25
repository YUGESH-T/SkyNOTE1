"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { WeatherCondition } from '@/lib/weather-data';

interface WeatherVisualizationProps {
  weatherCondition: WeatherCondition;
  enhancedTexture: string | null;
}

export default function WeatherVisualization({ weatherCondition, enhancedTexture }: WeatherVisualizationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    renderer: null as THREE.WebGLRenderer | null,
    camera: null as THREE.PerspectiveCamera | null,
    particles: [] as THREE.Mesh[],
    weatherObject: null as THREE.Object3D | null,
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    stateRef.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 10, 7.5);
    stateRef.scene.add(directionalLight);

    const animate = () => {
      if (!stateRef.renderer || !stateRef.scene || !stateRef.camera) return;
      requestAnimationFrame(animate);

      stateRef.particles.forEach(p => {
        p.position.y -= 0.02;
        if (p.position.y < -5) p.position.y = 5;
        p.rotation.y += 0.01;
      });

      if (stateRef.weatherObject) {
        stateRef.weatherObject.rotation.y += 0.005;
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
  }, [stateRef]);

  useEffect(() => {
    const scene = stateRef.scene;
    if (!scene) return;

    if (stateRef.weatherObject) scene.remove(stateRef.weatherObject);
    stateRef.particles.forEach(p => scene.remove(p));
    stateRef.particles = [];
    scene.background = null;
    scene.environment = null;

    switch (weatherCondition) {
      case 'Sunny': {
        const sun = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.5, 15),
          new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffdd00, emissiveIntensity: 0.8, metalness: 0, roughness: 0.2 })
        );
        scene.add(sun);
        stateRef.weatherObject = sun;
        scene.fog = null;
        break;
      }
      case 'Cloudy': {
        const cloudGroup = new THREE.Group();
        const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xd3d3d3, transparent: true, opacity: 0.8 });
        for (let i = 0; i < 5; i++) {
          const cloudSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), cloudMaterial);
          cloudSphere.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 2);
          cloudGroup.add(cloudSphere);
        }
        scene.add(cloudGroup);
        stateRef.weatherObject = cloudGroup;
        scene.fog = new THREE.Fog(0xaaaaaa, 5, 15);
        break;
      }
      case 'Rainy':
      case 'Snowy': {
        const isSnow = weatherCondition === 'Snowy';
        const particleGeometry = isSnow ? new THREE.SphereGeometry(0.05, 8, 8) : new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: isSnow ? 0xffffff : 0x87CEEB });
        for (let i = 0; i < 200; i++) {
          const particle = new THREE.Mesh(particleGeometry, particleMaterial);
          particle.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
          scene.add(particle);
          stateRef.particles.push(particle);
        }
        scene.fog = new THREE.Fog(isSnow ? 0xe0e0e0 : 0x506070, 5, 15);
        stateRef.weatherObject = null;
        break;
      }
    }
  }, [weatherCondition, stateRef]);
  
  useEffect(() => {
    if (enhancedTexture && stateRef.scene) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(enhancedTexture, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            stateRef.scene!.background = texture;
            stateRef.scene!.environment = texture;
        });
    }
  }, [enhancedTexture, stateRef]);

  return <div ref={mountRef} className="w-full h-full rounded-lg shadow-inner bg-black/20" />;
}

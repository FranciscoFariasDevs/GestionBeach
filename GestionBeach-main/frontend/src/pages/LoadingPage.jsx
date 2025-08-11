// frontend/src/components/LoadingScreen.jsx
import React, { useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useLoading } from '../contexts/LoadingContext';

const LoadingScreen = () => {
  const { isLoading } = useLoading();
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const modelRef = useRef(null);

  // Inicializar la escena 3D
  useEffect(() => {
    if (!containerRef.current || !isLoading) return;

    let renderer, scene, camera, controls, frameId;

    // Crear escena
    scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf5f5f5);

    // Añadir luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Añadir más luces para mejor visualización
    const pointLight = new THREE.PointLight(0xff9900, 1, 100);
    pointLight.position.set(-10, 5, 5);
    scene.add(pointLight);

    // Configurar cámara
    camera = new THREE.PerspectiveCamera(
      45, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000
    );
    camera.position.z = 5;
    camera.position.y = 1;

    // Configurar renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    containerRef.current.appendChild(renderer.domElement);

    // Controles para ver mejor el modelo
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;

    // Función de animación
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      
      // Actualizar controles
      controls.update();
      
      // Animar el modelo si está cargado
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.01;
      }
      
      renderer.render(scene, camera);
    };

    // Responsive
    const handleResize = () => {
      if (containerRef.current) {
        camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Cargar el modelo GLB
    const loader = new GLTFLoader();
    loader.load(
      '/beach3d.glb', // Asegúrate de que el archivo esté en la carpeta public
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;
        
        // Ajuste automático al tamaño y centro del modelo
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Reposicionar el modelo para que esté centrado
        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;
        
        // Ajustar escala
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        model.scale.set(scale, scale, scale);
        
        // Configurar sombras
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        scene.add(model);
      },
      (xhr) => {
        // Progreso de carga
        console.log(`Modelo cargando: ${(xhr.loaded / xhr.total) * 100}% cargado`);
      },
      (error) => {
        console.error('Error al cargar el modelo:', error);
      }
    );
    
    // Añadir un plano para sombras
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    plane.receiveShadow = true;
    scene.add(plane);
    
    // Iniciar animación
    animate();
    
    // Limpieza
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      
      if (renderer && containerRef.current) {
        if (containerRef.current.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
      
      if (scene && modelRef.current) {
        scene.remove(modelRef.current);
      }
      
      renderer?.dispose();
    };
  }, [isLoading]);

  // Si no está cargando, no mostrar
  if (!isLoading) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          width: '300px',
          height: '300px',
          mb: 4
        }}
      />
      
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            color: '#f37d16',
            textShadow: '0px 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          Beach Market
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
          <CircularProgress
            size={24}
            thickness={4}
            sx={{ color: '#f37d16' }}
          />
          <Typography
            variant="body1"
            sx={{ ml: 2, color: '#333' }}
          >
            Cargando...
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LoadingScreen;
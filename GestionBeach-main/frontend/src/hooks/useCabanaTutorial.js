import { useEffect } from 'react';
import Shepherd from 'shepherd.js';
import '../styles/shepherd-custom.css';

export const useCabanaTutorial = (svgContainerRef, mapaRef) => {
  useEffect(() => {
    // Verificar que estamos en la ruta correcta
    const currentPath = window.location.pathname;
    console.log('📍 Ruta actual:', currentPath);

    // NUNCA activar en rutas administrativas
    if (currentPath.includes('/admin') ||
        currentPath.includes('/dashboard') ||
        currentPath.includes('/intranet') ||
        currentPath.includes('/login')) {
      console.log('❌ Ruta administrativa detectada, tutorial DESACTIVADO');

      // Limpiar cualquier overlay residual inmediatamente
      const overlays = document.querySelectorAll('.shepherd-modal-overlay-container');
      overlays.forEach(overlay => overlay.remove());
      const elements = document.querySelectorAll('.shepherd-element');
      elements.forEach(el => el.remove());

      return;
    }

    // Solo activar en la página de reservas pública (EXACTA)
    if (currentPath !== '/reserva-cabanas' && currentPath !== '/reserva') {
      console.log('❌ No es la página de reservas pública, tutorial desactivado');
      return;
    }

    // Verificar si el usuario marcó "No volver a mostrar"
    const noMostrarMas = localStorage.getItem('tutorial_cabanas_no_mostrar');
    console.log('🔍 Tutorial check - noMostrarMas:', noMostrarMas);

    if (noMostrarMas === 'true') {
      console.log('❌ Tutorial bloqueado por localStorage');
      return;
    }

    // Esperar a que los refs estén disponibles
    if (!svgContainerRef.current || !mapaRef.current) {
      console.log('⏳ Esperando refs...', { svg: !!svgContainerRef.current, mapa: !!mapaRef.current });
      return;
    }

    // Esperar a que el SVG esté cargado
    const svg = svgContainerRef.current.querySelector('svg');
    if (!svg) {
      console.log('⏳ Esperando SVG...');
      return;
    }

    console.log('✅ Iniciando tutorial en 2 segundos...');

    // Función para manejar el checkbox "No volver a mostrar"
    const handleNoMostrarMas = () => {
      const checkbox = document.getElementById('tutorial-no-mostrar-checkbox');
      if (checkbox && checkbox.checked) {
        localStorage.setItem('tutorial_cabanas_no_mostrar', 'true');
      }
    };

    let tour;
    try {
      // Crear instancia del tour
      tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'shepherd-theme-custom',
          scrollTo: { behavior: 'smooth', block: 'center' },
          cancelIcon: {
            enabled: true
          },
          modalOverlayOpeningPadding: 10,
          modalOverlayOpeningRadius: 12,
        }
      });
      console.log('✅ Tour creado correctamente');
    } catch (error) {
      console.error('❌ Error creando tour:', error);
      return;
    }

    // Paso 0: Mensaje flotante inicial - "¿Nuevo aquí?"
    tour.addStep({
      id: 'inicio-flotante',
      text: `
        <div style="text-align: center; padding: 10px;">
          <div style="font-size: 48px; margin-bottom: 16px;">👋</div>
          <h2 style="color: #1976D2; margin-bottom: 16px; font-size: 28px; font-weight: 800;">
            ¿Nuevo aquí?
          </h2>
          <p style="font-size: 17px; line-height: 1.7; color: #455A64; margin-bottom: 8px;">
            Te guiaremos paso a paso para que reserves tu cabaña de forma fácil y rápida.
          </p>
          <p style="font-size: 15px; color: #78909C; margin-top: 16px; margin-bottom: 20px;">
            Solo tomará <strong style="color: #FF6B00;">30 segundos</strong> ⏱️
          </p>
          <div style="background: #F5F5F5; border-radius: 8px; padding: 12px; margin-top: 20px;">
            <label style="display: flex; align-items: center; cursor: pointer; justify-content: center; gap: 8px;">
              <input
                type="checkbox"
                id="tutorial-no-mostrar-checkbox"
                style="width: 18px; height: 18px; cursor: pointer; accent-color: #2196F3;"
              />
              <span style="font-size: 14px; color: #546E7A; font-weight: 500;">
                No volver a mostrar este tutorial
              </span>
            </label>
          </div>
        </div>
      `,
      buttons: [
        {
          text: 'Cerrar',
          action: () => {
            handleNoMostrarMas();
            tour.cancel();
          },
          secondary: true
        },
        {
          text: '¡Comencemos! 🚀',
          action: tour.next
        }
      ],
      modalOverlayOpeningPadding: 0,
      modalOverlayOpeningRadius: 0,
    });

    // Paso 1: Mapa Interactivo (1 de 2)
    tour.addStep({
      id: 'mapa',
      text: `
        <div>
          <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-size: 42px; margin-bottom: 8px;">📍</div>
            <h3 style="color: #1976D2; margin-bottom: 12px; font-size: 20px; font-weight: 700;">
              Paso 1 de 2: Mapa Interactivo
            </h3>
          </div>
          <p style="font-size: 15px; line-height: 1.7; color: #455A64;">
            Este es el <strong>mapa de nuestras cabañas</strong> frente a la playa.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #78909C; margin-top: 12px;">
            🎨 Cada <strong>color</strong> representa una cabaña diferente
          </p>
        </div>
      `,
      attachTo: {
        element: mapaRef.current,
        on: 'top'
      },
      buttons: [
        {
          text: '← Atrás',
          action: tour.back,
          secondary: true
        },
        {
          text: 'Siguiente →',
          action: tour.next
        }
      ]
    });

    // Paso 2: Haz clic en una cabaña (2 de 2) - Apunta al SVG completo pero ilumina todos los paths
    tour.addStep({
      id: 'seleccionar',
      text: `
        <div>
          <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-size: 42px; margin-bottom: 8px;">🏠</div>
            <h3 style="color: #1976D2; margin-bottom: 12px; font-size: 20px; font-weight: 700;">
              Paso 2 de 2: ¡Haz Clic en una Cabaña!
            </h3>
          </div>
          <p style="font-size: 16px; line-height: 1.7; color: #455A64; margin-bottom: 16px; text-align: center;">
            <strong style="color: #FF6B00;">👆 Haz clic en cualquier cabaña</strong> del mapa para:
          </p>
          <div style="background: #F5F5F5; border-radius: 8px; padding: 14px; margin-top: 12px;">
            <div style="display: flex; align-items: center; margin: 10px 0; font-size: 14px;">
              <span style="margin-right: 10px; font-size: 18px;">📸</span>
              <span style="color: #455A64; font-weight: 500;">Ver galería de fotos</span>
            </div>
            <div style="display: flex; align-items: center; margin: 10px 0; font-size: 14px;">
              <span style="margin-right: 10px; font-size: 18px;">💰</span>
              <span style="color: #455A64; font-weight: 500;">Conocer precios y disponibilidad</span>
            </div>
            <div style="display: flex; align-items: center; margin: 10px 0; font-size: 14px;">
              <span style="margin-right: 10px; font-size: 18px;">📅</span>
              <span style="color: #455A64; font-weight: 500;">Reservar tus fechas</span>
            </div>
          </div>
          <div style="background: linear-gradient(135deg, #FFE5CC 0%, #FFF3E0 100%); border-left: 4px solid #FF6B00; border-radius: 8px; padding: 14px; margin-top: 16px; text-align: center;">
            <p style="margin: 0; font-weight: 700; color: #FF6B00; font-size: 16px;">
              🎉 ¡Es muy fácil!
            </p>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #E65100;">
              Solo haz clic y sigue los pasos
            </p>
          </div>
        </div>
      `,
      attachTo: {
        element: svgContainerRef.current,
        on: 'top'
      },
      modalOverlayOpeningPadding: 15,
      modalOverlayOpeningRadius: 12,
      buttons: [
        {
          text: '← Atrás',
          action: tour.back,
          secondary: true
        },
        {
          text: '¡Entendido! ✓',
          action: () => {
            handleNoMostrarMas();
            tour.complete();
          }
        }
      ],
      when: {
        show: () => {
          // Agregar clase especial al SVG para iluminar todos los paths
          const svg = svgContainerRef.current.querySelector('svg');
          if (svg) {
            svg.classList.add('shepherd-highlight-paths');
          }
        },
        hide: () => {
          // Remover clase al salir del paso
          const svg = svgContainerRef.current.querySelector('svg');
          if (svg) {
            svg.classList.remove('shepherd-highlight-paths');
          }
        }
      }
    });

    // Iniciar el tour después de 2 segundos para que vean la página normal primero
    const timeout = setTimeout(() => {
      tour.start();
    }, 2000);

    // Cleanup
    return () => {
      clearTimeout(timeout);
      if (tour && tour.isActive()) {
        tour.cancel();
      }
      // Limpiar cualquier overlay que pueda haber quedado
      const overlay = document.querySelector('.shepherd-modal-overlay-container');
      if (overlay) {
        overlay.remove();
      }
      // Limpiar clase del SVG
      const svg = svgContainerRef.current?.querySelector('svg');
      if (svg) {
        svg.classList.remove('shepherd-highlight-paths');
      }
    };
  }, [svgContainerRef, mapaRef]);

  // Función para resetear el tutorial (útil para testing o ver de nuevo)
  const resetTutorial = () => {
    localStorage.removeItem('tutorial_cabanas_no_mostrar');
    window.location.reload();
  };

  // Función de emergencia para limpiar overlays (útil si algo sale mal)
  const limpiarOverlays = () => {
    const overlays = document.querySelectorAll('.shepherd-modal-overlay-container');
    overlays.forEach(overlay => overlay.remove());
    const elements = document.querySelectorAll('.shepherd-element');
    elements.forEach(el => el.remove());
    const svgs = document.querySelectorAll('svg.shepherd-highlight-paths');
    svgs.forEach(svg => svg.classList.remove('shepherd-highlight-paths'));
    console.log('✅ Overlays limpiados');
  };

  // Exponer funciones globalmente para debug
  if (typeof window !== 'undefined') {
    window.resetTutorial = resetTutorial;
    window.limpiarOverlays = limpiarOverlays;
  }

  return { resetTutorial, limpiarOverlays };
};

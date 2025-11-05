# Sistema de Carga de Boletas con Image Cropper

## 📋 Instrucciones de Instalación

### 1. Instalar Dependencias

Ejecuta el siguiente comando en la carpeta `frontend`:

```bash
npm install react-image-crop
```

**Nota:** `react-image-crop` requiere también importar su CSS.

### 2. Archivos Modificados/Creados

- ✅ `backend/controllers/concursoPiscinasController.js` - Agregado endpoint `/ocr-crop`
- ✅ `backend/routes/concursoPiscinasRoutes.js` - Agregada ruta POST `/api/concurso-piscinas/ocr-crop`
- ⚠️ `frontend/src/components/ImageCropperUpload.jsx` - **NUEVO COMPONENTE** (crear)
- ⚠️ `frontend/src/pages/ConcursoPiscinasPage.jsx` - Integrar el nuevo componente

### 3. Funcionalidad

#### Backend:
- **Endpoint:** `POST /api/concurso-piscinas/ocr-crop`
- **Recibe:**
  - `imagen_boleta` (file): Imagen completa de la boleta
  - `cropX`, `cropY`, `cropWidth`, `cropHeight` (numbers): Coordenadas del área seleccionada
- **Retorna:**
  ```json
  {
    "success": true,
    "numero_boleta": "123456",
    "texto_completo": "texto detectado por OCR",
    "confianza": 85.5,
    "detectado": true
  }
  ```

#### Frontend:
1. Usuario sube foto completa
2. Se muestra con un cropper para seleccionar el área del número de boleta
3. Usuario ajusta el recuadro sobre el número
4. Al confirmar, se envía la imagen completa + coordenadas al backend
5. Backend usa Sharp para recortar esa área y aplicar OCR
6. Se extrae automáticamente el número de boleta
7. El usuario confirma o corrige el número
8. Se verifica en la BD y se guarda la participación

### 4. Flujo Completo

```
Usuario → Sube foto completa
   ↓
Muestra imagen con cropper
   ↓
Usuario ajusta recuadro sobre número
   ↓
Click "Detectar Número"
   ↓
Backend recorta área + OCR
   ↓
Muestra número detectado (editable)
   ↓
Usuario confirma datos
   ↓
Verificación en BD
   ↓
Guardar foto completa + datos
```

### 5. Ventajas de esta Implementación

- ✅ Se guarda siempre la **foto completa** de la boleta
- ✅ Solo se usa el crop para **mejorar la precisión del OCR**
- ✅ El usuario **controla** qué área se analiza
- ✅ Mejor precisión que OCR sobre imagen completa
- ✅ Imagen original intacta para futuras verificaciones


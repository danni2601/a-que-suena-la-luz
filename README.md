# ¿A qué suena la luz?

**El ruido de la luz**

Instalación web en español. Percibir presenta el árbol y su paisaje sonoro. Experimentar permite explorar seis ramas geográficas y comparar periodos o países. Comprender revela la metáfora y relaciona la experiencia con estudios publicados.

## Ejecutar

Usa Node.js 22.12 o posterior y un navegador con WebGL 2.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

El resultado estático se genera en `dist/`. El navegador puede consultar el contenido científico y la serie activa aunque falle WebGL.

## Interacción

Arrastra para orbitar, desplaza para acercarte o usa dos dedos en una pantalla táctil. Los botones de cámara ofrecen las seis perspectivas y vuelven a la vista inicial. Con foco en el lienzo, usa las flechas para girar, + y − para acercar o alejar, 1–6 para las perspectivas y 0 para restablecer. El control de movimiento detiene la animación ambiental y sigue inicialmente la preferencia del sistema. El audio requiere una acción dentro del menú Sonido. Acumula una vuelta horizontal en un mismo sentido para avanzar un año. La rotación automática, el zoom y los saltos de perspectiva no suman vueltas.

Para girar con la mano, elige **Activar cámara** y concede el permiso de tu navegador. La vista previa marca las articulaciones y la acción junto a la mano. Abre la palma para iniciar una vuelta lateral y cierra el puño para detenerla en la posición actual. Ajusta la velocidad en ese panel. Al completarse la vuelta avanza un año. Usa el mouse para cambiar la inclinación vertical. El atlas sirve el modelo MediaPipe y su motor WebAssembly desde el mismo sitio. Los cuadros de la cámara se procesan localmente. Usa HTTPS o localhost. La cámara se apaga al cerrar el panel o entrar a Comprender.

## Arquitectura y recursos

- React y Vite para la interfaz, el estado narrativo y la línea temporal.
- Three.js y OrbitControls para la cámara, los puntos anclados y los modelos. `tree.js` genera filamentos y partículas mediante curvas tridimensionales con semilla repetible. `birds.js` genera la anatomía articulada y reutiliza geometrías y materiales. `scene.js` integra vuelo, separación, alineación, cohesión, reposo y transición de individuos.
- `data.js` carga el JSON activo, agrega por territorio y calcula cambios respecto al año anterior disponible. Un denominador cero o una observación faltante deja el cambio sin calcular. Las gráficas usan la misma escala para las series comparadas.
- Las imágenes proporcionadas sirvieron como guía de anatomía, color y composición. Los modelos del atlas se dibujan en tiempo real y no incorporan píxeles de las láminas.
- `audio.js` genera cantos sintéticos mediante osciladores y sitúa cada emisión con un PannerNode. Para incorporar grabaciones autorizadas, coloca los archivos con su ficha de autoría y licencia en `public/audio/` y sustituye la generación de la frase dentro de `chirp()` por un AudioBufferSourceNode conectado al mismo PannerNode. Conserva la activación explícita y el compresor.

## Serie actual

El atlas incluye una serie sintética de 2011 a 2022 para 12 países. La interfaz identifica las cifras, tendencias y gráficas como **Modo simulación**. Los promedios de demostración asignan el mismo peso a cada país disponible. El año final corresponde a esa serie. Los cantos son una traducción artística de la densidad de aves. En Percibir, el año controla la cantidad de aves, la frecuencia de los cantos y la amplitud de las ondas. El modo de demostración suma ocho aves por año y aumenta la frecuencia y el volumen de sus cantos. El control de volumen limita el nivel máximo. Solo las raíces ondulan en respuesta a las frases sonoras.

Hallazgos científicos independientes de la serie de demostración:

- [Kyba et al., 2023](https://doi.org/10.1126/science.abq7781). Cambio estimado en el brillo perceptible del cielo.
- [Falchi et al., 2016](https://doi.org/10.1126/sciadv.1600377). Atlas de brillo artificial del cielo y estimación de población expuesta.
- [NASA Black Marble VNP46A4 v2](https://doi.org/10.5067/VIIRS/VNP46A4.002). Compuesto anual de radiancia nocturna VIIRS, cuadrícula geográfica de 15 segundos de arco, aproximadamente 500 m en el ecuador. VIIRS tiene sensibilidad limitada al azul, una hora de paso determinada y coberturas desiguales por nubes, nieve y otros filtros.

## Actualizar con registros científicos

1. Descarga las teselas anuales disponibles desde 2012 en [NASA LAADS DAAC](https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/VNP46A4). Usa Earthdata Login fuera del navegador del atlas. Mantén la misma colección y plataforma en todos los años.
2. Según la guía v2, extrae la banda compuesta anual para todas las geometrías de observación y condición sin nieve. Aplica la máscara de calidad documentada y los atributos de escala, unidades y relleno del archivo. Exporta teselas GeoTIFF no solapadas con valores físicos y nodata explícito, conservando la cuadrícula nativa EPSG:4326. Registra cobertura, banda, banderas y procedencia junto al manifiesto.
3. Usa límites nacionales versionados, terrestres y no solapados. Disuelve cada país por ISO y agrega los campos `iso`, `name` y `continent`. Excluye países sin cobertura comparable o publícalos como faltantes. Prepara un manifiesto como `[{"year":2012,"observation":"2012-12-31","tiles":["2012/h08v05.tif"]}]`. Usa una fecha de corte respaldada por los metadatos.
4. En un entorno de Python con `geopandas`, `numpy` y `rasterio`, ejecuta:

   ```sh
   python scripts/aggregate.py --borders limites.geojson --manifest manifiesto.json --scale-max VALOR
   ```

   Define `VALOR` como un límite de escala común que cubra todos los países y años. El script asigna por centro de píxel y pondera por su superficie terrestre aproximada en la cuadrícula geográfica. Guarda el área válida para calcular promedios regionales. Revisa cobertura espacial y temporal, compara una muestra con una herramienta SIG independiente y registra el umbral de cobertura aplicado antes de publicar. Los agregados muestran únicamente los países incluidos y con datos. El atlas detecta `public/data/validated.json` cuando se compila o se sirve y obtiene el intervalo de los años disponibles.
5. Vuelve a compilar y publica el resultado. La actualización es manual. Las series diarias y mensuales pueden mantenerse en el procesamiento externo, pero el visor actual solo presenta agregados anuales.

## Límites

Se incluye el agregador de teselas previamente enmascaradas, sin una descarga autenticada ni una serie Black Marble procesada. La estimación regional puede variar con la cobertura válida. El modelo de aves y sus sonidos son interpretaciones procedurales de las referencias. El audio espacial se recalcula al emitir cada frase.

# Guía para agentes

## Objetivo del proyecto

Dronia es una aplicación experimental de Angular para estudiar aprendizaje reforzado en drones simulados. Combina TypeScript, TensorFlow.js, Three.js, Web Workers y persistencia con Dexie.

Este repositorio conserva deliberadamente varias aproximaciones de un mismo experimento. No elimines ni unifiques implementaciones antiguas salvo que la tarea lo pida explícitamente: suelen existir como referencia o caso de prueba independiente.

## Entorno y comandos

- Usa Node.js 18 o posterior.
- Instala las dependencias reproduciblemente con `npm ci`.
- Inicia el entorno de desarrollo con `npm start`.
- Comprueba tipos y build con `npm run build`.
- Ejecuta lint con `npm run lint`.
- Ejecuta una pasada de pruebas sin watch con `npm test -- --watch=false --browsers=ChromeHeadless`.

No sustituyas npm por otro gestor de paquetes ni modifiques dependencias para una tarea no relacionada.

## Estructura relevante

- `src/app/NetsIA/`: lógica de aprendizaje, modelos TensorFlow.js, recompensas, memoria y adaptadores entre el dron y la red neuronal.
- `src/app/Objects/`: simulación y geometría del dron, incluida la integración con Three.js.
- `src/app/workers/`: Web Workers para aprendizaje y evaluación.
- `src/app/services/`: servicios de aplicación, IndexedDB mediante Dexie y comunicación con workers.
- `src/app/pages/` y `src/app/graph/`: páginas y visualizaciones experimentales.
- `wiki/`: notas de investigación; documenta hipótesis y experimentos, no debe tratarse como documentación normativa.

## Convenciones

- Mantén TypeScript estricto, con las opciones de `tsconfig.json` y las reglas de `.eslintrc.json`.
- Respeta `.editorconfig`: UTF-8, dos espacios, comillas simples en TypeScript y línea final.
- Usa la arquitectura Angular existente. Los componentes pueden ser `standalone` o declarados en `AppModule`; comprueba el patrón local antes de añadir componentes.
- Conserva los selectores `app-*` para componentes y `app...` en camelCase para directivas.
- Sigue las convenciones de los archivos cercanos; existen estilos históricos, pero las modificaciones nuevas deben ser tipadas y claras.
- Añade cambios pequeños y pruebas focalizadas; no refactorices una ruta experimental completa como efecto secundario.

## TensorFlow.js, simulación y workers

- Un tensor creado debe liberarse cuando deje de ser necesario. Usa `tf.tidy`, `dispose()` o patrones equivalentes sin doble liberación.
- No uses `dataSync()` en rutas nuevas de interfaz si existe una alternativa asíncrona adecuada; en ciclos de entrenamiento existentes, minimiza copias y conversiones.
- Los cálculos de entrenamiento pueden ser costosos. Evita bloquear el hilo de interfaz con nuevos bucles largos; usa un worker cuando corresponda al patrón del repositorio.
- Mantén explícita la forma de los tensores (`Tensor1D`, `Tensor2D`, dimensiones y número de estados/acciones) al cruzar adaptadores, modelos y workers.
- Los límites, pasos de simulación y recompensas afectan al comportamiento aprendido. No cambies constantes de aprendizaje o criterios de terminación sin una razón y una validación específicas.
- El código de workers debe transferir solo datos serializables. Conserva importaciones y configuración compatibles con `tsconfig.worker.json`.

## Validación

Para cada cambio:

1. Ejecuta la validación mínima que cubra el comportamiento modificado.
2. Si cambia lógica de IA o simulación, añade o ajusta pruebas deterministas para los casos límite relevantes.
3. Ejecuta al menos `npm run lint` y `npm run build` antes de dar por terminado un cambio transversal.
4. Si una validación no puede ejecutarse, informa el comando y la causa concreta.

## Alcance

No edites artefactos generados (`dist/`, `out-tsc/`, cobertura), no renueves de forma masiva dependencias y no cambies el propósito educativo ni las rutas experimentales sin indicación expresa.

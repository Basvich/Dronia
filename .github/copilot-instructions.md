# Instrucciones de Copilot para Dronia

Lee primero `AGENTS.md`; estas instrucciones resumen las expectativas operativas para cambios en este repositorio.

- Dronia es una aplicación Angular 18 de experimentación con aprendizaje reforzado, TensorFlow.js, Three.js, Web Workers y Dexie.
- El proyecto conserva varias generaciones de ejemplos a propósito. No elimines ni generalices experimentos antiguos salvo que se solicite.
- Usa TypeScript estricto, dos espacios, comillas simples y las reglas existentes de ESLint.
- Sigue el patrón del componente o servicio cercano. No conviertas módulos o componentes NgModule completos a `standalone` como tarea incidental.
- Antes de afirmar que un cambio está terminado, valida el alcance con `npm run lint`, `npm run build` o la prueba focalizada pertinente.
- Ejecuta pruebas no interactivas con `npm test -- --watch=false --browsers=ChromeHeadless`.

## Propuestas de mejora

Este es un proyecto para experimentar, aprender y comparar alternativas. Se admiten y agradecen propuestas que mejoren la simplicidad, elegancia, mantenimiento o comprensión del código, así como alternativas de paquetes, librerías o versiones.

Explica brevemente qué aporta cada alternativa, sus ventajas y posibles costes o riesgos. Mantén las propuestas separadas del cambio solicitado: no actualices dependencias ni amplíes el alcance de forma automática; sugiere primero las alternativas razonables cuando puedan afectar al objetivo del experimento, a la arquitectura o a su reproducibilidad.

## Riesgos específicos

- Libera los tensores de TensorFlow.js con `dispose()` o `tf.tidy`; evita fugas y dobles liberaciones.
- Mantén sincronizadas las dimensiones de entrada y salida entre adaptadores, modelos, memoria de acciones y workers.
- No cambies recompensas, límites, pasos o constantes de exploración sin explicar y probar el efecto.
- No muevas cálculos de entrenamiento largos al hilo de la interfaz cuando exista un patrón de worker aplicable.
- Solo envía valores serializables entre workers y el hilo principal.
- Evita cambios genéricos sobre Dexie/IndexedDB y su esquema si la tarea no requiere persistencia.

## Criterio de trabajo

Haz cambios precisos y completos. Añade pruebas para comportamiento nuevo o corregido, no para declaraciones o constantes triviales. Conserva el lenguaje y la intención documental del proyecto, principalmente en español, salvo que el archivo cercano siga otra convención.

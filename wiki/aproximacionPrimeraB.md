# Primera aproximación usando variación de fuerzas

Una diferencia con la primera aproximación, en la que se calculaba directamente una fuerza deseada entre las acciones posibles, en este caso los que se calcula es si hay que aplicar mas o menos fuerza.

## Estrategia general

Muy similar a la primera aproximacion, aunque las posibles acciones son solo 3 (bajar, mantener subir potencia), mientras que en el estado del dron, se incluye también la fuerza sentida (equivalente a un sensor de acceleración)

## Recompensas

Se aplica la misma recompensa que en el primer caso, aunque se añadió un pequeño premio adicional si además la aceleración es cerca de -1 (esta estático).

### Otras pruebas para probar el resultado.

De igual forma que en la primera versión, cuando se está simulando el dron, se añade un payload, en este caso, si se puede ver como previsto que el piloto automático gobernado por la red, responde adecuadamente, aumentando la fuerza para mantenerse en la posición final deseada. Si cuando está en torno a la posición deseada, se elimina la carga adicional, se ve como el dron sale con cierta velocidad hacia arriba hasta que vuelve a la posición.

> ⚠️ Debido a que lo que se hace es como mucho desplazarnos en un paso en la fuerza aplicada, ocurre también un efecto malo. Debido a que ocurre como un desfase entre que se va modificando la fuerza, y la velocidad alcanzada, no se llega a una buena posición de equilibrio.




# Primera aproximación

Solo se usa en 1 Dimension (vertical), para poder probar distintas las distintas partes que se necesitan, y poder tener un buen control y visualización de los datos para no entrar en muchas variables que harían dificil el análisis.

En la primera aproximación para resolver el problema, se parte de un sistema con estados continuos como entrada y con un conjunto de estados finito de salida.
Como datos de la entrada, se usa la diferencia en altura con la altura deseada y la velocidad (vertical)

## Acciones posibles

Las posibles acciones que se quieren tener en cuenta para saber cual es la siguiente acción, son 5 niveles posibles de potencia (incluyendo el neutro=peso). Se pensó en usar 5 en vez de simplmente 3 para ver si con mas niveles de potencia se podía obtener un ajuste mas fino del control, 

## Recompensas

Para la recompensa, como tiene que ver con la posición y velocidad que tiene en un momento dado, una forma simple, es en un momento, sumamos la posición con la velocidad (escalada), de forma que básicamente se puntua donde estará el vehiculo en el paso siguiente. Con esta posición, simplemente se usa una función cuadrática con la distancia para obtener un valor dado de recompensa.
 
Si el drone se encuentra en un pequeño intervalo de la altura deseada y con una velocidad muy pequeña, entonces se añade a la recompensa otro valor por conseguir el objectivo.

Si se sale de los límites, se añade una penalización.

## Pruebas del concepto



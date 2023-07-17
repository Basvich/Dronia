# Usando el modelo en 2D

Esto es usando un modelo que puede moverse en 2 dimensiones: [x,y]. Para ello, se usa en el control de dron además la posibilidad de controlar el pith, o sea la inclinación en torno al eje Z, dicho de otra forma, el cabeceo. Con ello el dron puede moverse tambien en el eje X.

En cuanto a los datos que se usan para el entrenamiento, hace falta tener entonces la siguiente información:

* Fuerzas detectadas, esto son los componentes de las fuerzas en X e Y. Esta información permitiría a la red conocer la orientación y aceleración del dron. Por ejemplo si está perfectamente estable y horizontal, tendría como fuerza y=-1 siendo x=0. Si está inclinado unos 45º y con velocidad constante, tendría una fuerza y~=1,41 e x~=-1,41. Si se deja caer, en ese momento todas las fuerzas son 0, aumentando la y hasta el momento en que alcance la velocidad limite en el que se alcanza de nuevo y=-1.
* Velocidades x,y, en este caso referidas al mundo, que proporcionan la velocidad con la que nos movemos.
* Posición absoluta en x,y. Que para el calculo de las recompensas se usa como relativa al targer deseado.

## Estrategia general

Es similar a las anteriores, aunque generalizada a 2D (internamente es todo 3D, pero limitamos la libertad). Segumis manteniendo el cálculo de la fuerza, usando la variación, o sea el modelo aprende si tiene que aumentar o disminuir la potencia (frente a escoger una cantidad prefijada). El giro en este caso es fijo, o sea decide girar en un sentido, en el otro o nada. 

En la salida del modelo en 1D, se tenía solo una variable de salida: la fuerza, la cual se descompone en varias posibles acciones, y el modelo proporciona la recompensa esperada para cada una de esas acciones.

En este caso, necesitamos 2 conjuntos de valores, uno para la fuerza como antes, pero otro también para el acción de cabeceo (pitch).

> 💡 Se ponen mas variables de salida a la red neuronal, con lo que realmente tenemos un array de salida de posibles recomensas, pero lo que hacemos es que somos nosotros lo que interpretamos las 3 primeras posiciones del array como las desadas para manejar la fuerza, y las 3 siguientes para manejar el cabeceo. En cada grupo de ellos se escoje el indice que apunta al resultado que tenga la mayor recompensa.

## Recompensas

Se usa el mismo algoritmo que en 1D, aunque generalizado a 3D. Como distancia se usa la distancia manhatan simplemente para ahorrar cálculo, y no parece que sea una penalización que influya.

## Problemas encontrados

### Limites del espacio fisico.

En el caso 1D, se acaba usando como limites si la recompensa obtenida ya es muy negativa, lo cual corresponde mas o menos a unos limites físicos de distancia (depende la velocidad a la que se mueve).

>💡 En este caso hubo que aumentar el limite inferior de la recompensa, ya que al ser 2D el limite práctico hacía que fuese una caja en el espacio demasiado pequeña.

### Pocos datos para el ciclo de aprendizaje

En cada ciclo de aprendizaje, se situa el dron en una posición aleatoria, va tomando las acciones en cada momento que cree que son mejores, y guarda las recompensas obtenidas, lo cual sirve para volver a entrenar la red.

Para que pueda converger algo la red (dependiendo de su complejidad), se necesitan idealmente unos miles de samples para que pueda converger algo la red. Sin embargo en este caso, debido a que enseguida el modelo se sale de los limites (incluso aunque sean mayores), solo se obtienen del orden de un centenar de samples por ciclo, lo que hace que tenga una tasa de aprendizage en cada ciclo muy pequeña.

>💡  Se modifica la estrategia, para que en vez de realizar el entrenamiento con cada ciclo, pueda realizar diferentes pruebas consecutivas y conseguir mas datos para poder dar a la red para entrenar. 

### Dar volteretas con el dron no es tan mala solución

Una de las tipicas cosas que quizás no pensamos, son las soluciones que se van viendo, y que torpedean las ideas previas que teníamos. Una cosa que aprende relativamente rápido la red es que pone ponerse a girar en un sentido, no es tan malo como puede parecer.

Al ponerse a girar el dron, acaba realizando circulos pequeños, y puede mantenerse recibiendo mayor recompensa que quizas apuntar en alguna dirección y volar hacía ahí, ya que acaba cayendo más lentamente. Puede llevar muchisimos ciclos de entrenamiento conseguir que el dron aprenda a salir de esas volteretas apuntando mas o menos al target, y que aprenda que esa salida es mejor que dar vueltas.

### Obtener NAN en la obtención de los datos de loss

A veces, después de algunos ciclos de entrenamiento, se empieza a obtener el valor NAN como loss en la parte de aprendizaje de TF.js

🚧 Comprobar si no se trata de exploding gradient problem
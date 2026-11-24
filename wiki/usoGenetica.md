# Uso de algoritmos de genética para incrementar el aprendizage

En este caso, se añade el uso de algoritmos genéticos para aumentar el aprendizaje.
La idea que se sigue aquí, se resume en los siguientes pasos que se repiten varias veces:

* Se entrenan en paralelo con condiciones aleatorias diferentes entre ellos
* Cuando tengan ya ciertos ciclos de entrenamiento, entonces se somenten todos a exactamente las mismas pruebas. De dichas pruebas, se obtiene una puntuación, la cual permite ordenarlos.
* Se mantienen los n primeros tal cual, y los siguientes se van modificando creando cruces _geneticos_ entre ellos y/o ganadores.
* Se repite el ciclo completo.

Una primera ventaja, es que algunas carácteristicas pueden no ser triviales de modelizar en un aprendizaje reforzado, sin embargo, si que pueden ser evaluadas más facilmente si comparamos entre varias soluciones. Por ejemplo un dron oscilando entorno al target, frente a otro que tiene vuelo más estable.

## Web Workers

Para poder entrenar varios drones de forma simultánea, lo cual es un proceso bastante lento para cada dron, y encima por la naturaleza de la ejecución del código, el cual es básicamente monotarea, es necesario paralelizar esta parte.

Para la paralelización se usan web workers, que consiste básicamente en un script que se ejecuta en un proceso en paralelo al principal.

⚠️ Hay que tener en cuenta que para simplificar la sincronización entre procesos y evitar concurrencias, directamente NO se pueden pasar objetos directamente entre la tarea principal y el web worker. Siempre se hace pasando una copia de unos datos y recibiendo a su vez copia de lo generado [(Pasar datos)](https://developer.mozilla.org/es/docs/Web/API/Web_Workers_API/Using_web_workers#pasando_datos). Esta simplificación evita casi por completo problemas recurrentes en la multitarea.

Debido a lo anterior, es necesario generar unas funciones que básicamente obtienen la información mínima del dron (red neuronal principalmente), que se reconstruye en el web worker, se entrena, y de vuelta es necesario realizar el proceso inverso para tener los resultados del entrenamiento.

### Tareas y observables

Se pueden tener muchos drones a entrenar simultaneamente, pero el número de tareas simultaneas tiene que estar limitado. Se busca entonces que el código resultante de estas limitaciones junto con el llamar a la tarea, resulte lo mas simple y elegante posible (al menos desde las zonas en las que se consume).

El uso de observables, hace bastante simple el código. En este caso partimos de un observable obtenido a partir de la lista (array) de drones, y se genera otro observable, que va devolviendonos los drones ya entrenados.

Internamente, para poder hacer esto, se usan unas clases accesorias, siendo la primera una que nos devuelve objetos worker (capaz de realizar ciclos de aprendizaje a un único dron), pero limitando e a un maximo de objetos simultaneos.

Con la clase anterior, y el observable primero de los drones, internamente realizamos una operación [zip](https://www.learnrxjs.io/learn-rxjs/operators/combination/zip) , la cual nos empareja drones a entrenar junto con entrenadores libres. Con esto ya se pueden poner a entrenar y se maneja internamente todo.

``` TypeScript
const obs$=from(this.students);
this.workerSrv.CicleLeanrStudents(obs$).subscribe(
  {
    next(value){ console.log(`Rx procesado ${value.name}`); },
    complete(){ console.log('Acabose'); },
    error(err){ console.error(err); }
  }
);
```

Este código anterior tan simple es como se puede usar, quedando todo muy limpio: pasamos drones (aquí llamados estudiantes), y devuelve lo mismo, aunque el orden no se garantiza, debido a la propia naturaleza de los procesos en paralelo, y las distintas condiciones de cada estudiante.
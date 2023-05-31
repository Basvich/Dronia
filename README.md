# Dronia

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.2.1.

## Ejemplos

### Entrenamiento simple en 1D

En este caso, lo que se busca es partiendo de un espacio continuo, con las variables posición y velocidad, limitadas a simplemente y, se quiere realizar un entrenamiento reforzado para que el dron se mantenga estable a cierta altura.
En la red, tenemos 2 entradas, y 5 posibles estados de salida, correspondientes a las posibles acciones a tomar: 5 posibles niveles de potencia.

Para controlar el dron, se obtiene el array de las 5 posibles acciones, y se toma la que tenga la recompensa mayor.

El objetivo de la red, es entonces acabar entrenando el campo recompensa de cada uno de los posibles estados.
Se van 

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

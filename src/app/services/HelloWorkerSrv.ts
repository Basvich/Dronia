import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HelloWorkerService {
  private worker? :Worker;
  countApple(counter: number, updateCounter: (value: number) => void) {
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../workers/hello.worker', import.meta.url));
      this.worker=worker;
      worker.onmessage = (event) => {
        updateCounter(event.data);
        console.log(`${event.currentTarget===this.worker}`);
      };     

      worker.postMessage(counter);
    }
  }  
}
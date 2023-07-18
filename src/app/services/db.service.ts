import { Injectable } from '@angular/core';
import Dexie from 'dexie';

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  constructor() {
    super("DexieDB"); //database name 'DexieDB'
    this.version(1).stores({
      myStore1: '++empId, empName, empSal', //'myStore1' table, 'empId' primary key
      myStore2: 'compId, compName'          //'myStore2' table, 'compId' primary key
    });

    this.open()                             //opening the database
    .then(data => console.log("DB Opened"))
    .catch(err => console.log(err.message));  
  }
}

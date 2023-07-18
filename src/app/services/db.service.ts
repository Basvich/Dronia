import { Injectable } from '@angular/core';
import Dexie, { PromiseExtended, Table } from 'dexie';
import { IStudentState } from '../NetsIA/Students';

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  studentItems!: Table<IStudentState, number>;
  constructor() {
    super("DroneStudents"); //database name 'DexieDB'
    this.version(1).stores({
      studentItems: '++id'
    });

   /*  this.open()                             //opening the database
    .then(data => console.log("DB Opened"))
    .catch(err => console.log(err.message));   */
  }
   
  saveStudent(state: IStudentState): PromiseExtended<number>{
    return this.studentItems.add(state);
  }
}

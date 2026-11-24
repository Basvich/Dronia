/// <reference lib="webworker" />

import { ISimulateCfg } from "../NetsIA/DroneLearn3DContext";
import { IStudentState, Student } from "../NetsIA/Students";
import { IDisposable } from "../Objects/utils";
import * as tf from '@tensorflow/tfjs';
import { SupervivenceExam } from "../exams/Supervivence";

addEventListener('message', ({ data }) => {
  console.log(`[examinator.worker] Recibido ${data.name}`);
  const examinator = new ExaminatorWorker(data);
  examinator.evaluate(); //learnr.learnCiclesTest();
  const nState = examinator.getState();
  examinator.dispose();
  postMessage(nState);
  close();
});

/**
 * Web worker que se encarga de realizar el (los) examenes 
 */
class ExaminatorWorker implements IDisposable {
  private student: Student;

  constructor(private state: IStudentState) {
    this.student = new Student();
    this.student.loadSerializedState(state);
  }

  public evaluate(): number {
    const supervivence = new SupervivenceExam(this.student);
    const r = supervivence.evaluate();
    this.student.score = r;
    return r;
  }

  public getState(): IStudentState {
    return this.student.getSerializedState();
  }

  dispose() {
    this.student.dispose();
  }
}




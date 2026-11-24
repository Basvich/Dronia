import { ISimulateCfg } from "../NetsIA/DroneLearn3DContext";
import { Student } from "../NetsIA/Students";



class baseConstructor{

}

/** Examen que prueba la supervivencia en base a unas cuantas posiciones de partida. Se puntua más el que mas tiempo aguante */
export class SupervivenceExam {
  private pos0: Array<[number, number, number]> = [[0, 6, 0], [-3, 6, 0], [3, 6, 0]];
  private maxSteps = 500;
  
  constructor(private student: Student) { }

  evaluate(): number {
    const results: Array<{ stepCount: number; lastReward: number; mean: number }> = [];
    if (!this.student.learnContext) throw new Error("missing learnContext");
    this.pos0.forEach((p0) => {
      const opt: ISimulateCfg = { pos: p0, maxSteps: this.maxSteps };
      const r = this.student.learnContext?.simulateCicleExt(opt);
      if (r) results.push(r);
    });

    const acum = results.reduce((acum, value) => {
      acum.stepCount += value.stepCount;
      acum.lastReward += value.lastReward;
      acum.mean += value.mean;
      return acum;
    }, { stepCount: 0, lastReward: 0, mean: 0 });
    const meanSteps = acum.stepCount / results.length;
    const point = meanSteps / this.maxSteps;
    return point;
  }
}
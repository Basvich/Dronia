import { abs, math } from "@tensorflow/tfjs";
import { TDrone3D } from "../Objects/Drone3D";



export class TReward{
  private a=0;
  private b=0;
  private c=0;
  private max_rew=10;
  private radius=6;
  public targetY=6;

  /** Premio/penalización por acabar mal */
  public badReward=-20;
  public goodReward=20;
  public badMiniReward=-5;

  public constructor(){
    this.initParams();
  }
  

  /**
   * Calcula el premio en base a la posicion y velocidad del drone, junto con el target
   * @param drone 
   */
  public InstanReward(drone:TDrone3D):number{
     return this.cuadraticReward(drone);
  }

  /**
   * Si se da por obtenido el objetivo
   * @param drone 
   * @returns 
   */
  public IsDone(drone:TDrone3D):boolean{
    let res=Math.abs(drone.Position.y-this.targetY)<=0.2;
    res=res && Math.abs(drone.Velocity.y)<=0.05;
    return res;
  }

  private initParams() {
    this.c=this.max_rew;
    this.b=0; //Maximo en 0
    this.a=-this.max_rew/(this.radius*this.radius);
  }

  private linearReward(drone:TDrone3D):number{
    let res=0;
     const posY=drone.Position.y;     
     const velY=drone.Velocity.y;   //Absoluta, positiva hacia arriba          
     //Proyectamos la psocion actual junto con la velocidad
     const futPosY=posY+ 4*velY;
     const difY=futPosY- this.targetY; //Positivo está por encima
     const absDifY=Math.abs(difY);
     res=6-absDifY; //Tomamos un radio de 6 que coincide con los limites
     const innerRadius=0.5;const innerRew=5/innerRadius;
     if(absDifY<=innerRadius){ //Incrementamos el premio de esta zona
       res+=(innerRadius-absDifY)*innerRew;  //Una recta creciendo hacia el centro con el pico en 5
     }        
     return res;
  }

  private cuadraticReward(drone:TDrone3D):number{
    let res=0;
    const posY=drone.Position.y;     
    const velY=drone.Velocity.y;   //Absoluta, positiva hacia arriba          
     //Proyectamos la psocion actual junto con la velocidad
    const futPosY=posY+ 4*velY;
    const difY=futPosY- this.targetY; //Positivo está por encima
    const absDifY=Math.abs(difY);
    res=this.a*absDifY*absDifY + this.b*absDifY + this.c;
    return res;
  }
}
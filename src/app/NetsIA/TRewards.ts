import { abs, math } from "@tensorflow/tfjs";
import { TDrone3D } from "../Objects/Drone3D";



export class TReward{
  public targetY=6;

  /** Premio/penalización por acabar mal */
  public badReward=-20;
  public goodReward=20;

  /**
   * Calcula el premio en base a la posicion y velocidad del drone, junto con el target
   * @param drone 
   */
  public InstanReward(drone:TDrone3D):number{
     let res=0;
     const posY=drone.Position.y;
     const difY=posY- this.targetY; //Positivo está por encima
     const velY=drone.Velocity.y;   //Absoluta, positiva hacia arriba
     const absVelY=Math.abs(velY);
     res=this.targetY-Math.abs(difY); //Por lo cerca que está
     if(Math.abs(difY)<0.5){//especial si está cerca
       res+=10; 
       if(absVelY<0.2) res+=10;
       if(absVelY<0.01) res+=30;
     }
     //Por la velocidad, cuanto mas cerca del target, menor tendría que ser, y de sentido diferente
     if(absVelY===0 || Math.sign(difY) !== Math.sign(velY)){  //La velocidad va en el buen sentido        
        res+=5;
     }else{ //Va en sentido contrario
       if(Math.abs(difY)>3) res-=2*absVelY;
       else res-=absVelY;
     }
     return res;   
  }

  /**
   * Si se da por obtenido el objetivo
   * @param drone 
   * @returns 
   */
  public IsDone(drone:TDrone3D):boolean{
    let res=Math.abs(drone.Position.y-this.targetY)<0.2;
    res=res && Math.abs(drone.Velocity.y)<=0.01;
    return res;
  }
}
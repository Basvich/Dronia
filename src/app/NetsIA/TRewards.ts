import { TDrone3D } from "../Objects/Drone3D";



export class TReward{
  private a=0;
  private b=0;
  private c=0;
  private max_rew=10;
  private radius=6;
  private velocityFactor=6;
  public targetY=6;

  /** Premio/penalización por acabar mal */
  public badReward=-20;
  public goodReward=20;
  /** Por acabar sin conseguir nada */
  public badMiniReward=-5;

  public constructor(){
    this.initParams();
  }
  

  /**
   * Calcula el premio en base a la posicion y velocidad del drone, junto con el target
   * @param drone 
   */
  public InstanReward(drone:TDrone3D):number{
     //return this.cuadraticReward(drone);
     return this.polinomialReward(drone);
  }

  /**
   * Si se da por obtenido el objetivo
   * @param drone 
   * @returns >0 si el objetivo está conseguido
   */
  public IsDone(drone:TDrone3D):number{
    let res=0;
    const limitV=0.3;
    let ok=Math.abs(drone.Position.y-this.targetY)<=0.2;
    const absV= Math.abs(drone.Velocity.y);
    ok=ok && absV<=limitV;
    if(ok){ //Damos un premio proporcional a lo cerca que queda
      const rv=this.goodReward-(this.goodReward/limitV)*absV;
      res=rv;
      //Y otro si la aceleración está cerca de 1 (parado)
      const accelY=Math.abs(drone.NetForce.y+1);
      if(accelY<0.2){
        res=res+((0.2-accelY)/0.2)*this.goodReward/2;
      }
    }
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
     const futPosY=posY+ this.velocityFactor*velY;
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

  private polinomialReward(drone:TDrone3D):number{
    let res=0;
    const posY=drone.Position.y;     
    const velY=drone.Velocity.y;   
     //Proyectamos la psocion actual junto con la velocidad
    const futPosY=posY+ 4*velY;
    const difY=futPosY- this.targetY; 
    const absDifY=Math.abs(difY);
    const yr3=this.radius/3;
    const rew0=this.max_rew/2;
    if(absDifY<yr3){
      const m=-rew0/yr3;
      res=this.max_rew+m*absDifY;
    }else if(absDifY<this.radius){
      const y2=absDifY-yr3;
      const m=rew0/(this.radius-yr3);
      res=rew0-m*y2;
    }else {
      res=-2*(absDifY-this.radius);  //Simplemente decreciente a medida que nos alejamos
    }
    //console.log({posY,velY,futPosY,res});
    return res;
  }
}
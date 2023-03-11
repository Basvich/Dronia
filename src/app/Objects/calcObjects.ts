import * as THREE from "three";

/** Representa un vector posicionado en el espacio */
export class TSpatialVector{
  public pos =new THREE.Vector3();
  public vector=new THREE.Vector3();
  public constructor(pos?:THREE.Vector3, vector?:THREE.Vector3){
    if(pos)this.pos.copy(pos);
    if(vector)this.vector.copy(vector);
  }
}
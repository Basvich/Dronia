import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import GUI from 'lil-gui';
import { Student } from 'src/app/NetsIA/Students';
import { ThreeRenderComponent } from 'src/app/three-render/three-render.component';


@Component({
  selector: 'app-drone2d-genetic',
  templateUrl: './drone2d-genetic.component.html',
  styleUrls: ['./drone2d-genetic.component.scss']
})
export class Drone2dGeneticComponent implements AfterViewInit  {
  
  miniMenuGui?: GUI;
  displayedColumns: string[] = ['name', 'score'];
  students:Array<Student> =[];
  public bussy=false;
  public dsStudents = new MatTableDataSource<Student>(this.students);
  @ViewChild(ThreeRenderComponent) render!: ThreeRenderComponent;
  @ViewChild(MatTable) table!: MatTable<Student>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit(): void {
    this.dsStudents.paginator = this.paginator;
  }

  testCreateStudents(){
    for(let i=0; i<20; i++){
      const n=new Student();
      n.name=`Student_${i}`;
      this.students.push(n);
    }
    this.dsStudents.data=this.students;
  }


}

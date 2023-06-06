import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';
import{MatSidenavModule} from '@angular/material/sidenav';
import {MatSliderModule} from '@angular/material/slider';
import {MatListModule} from '@angular/material/list';
import {MatTooltipModule} from '@angular/material/tooltip';


@NgModule({
    exports: [
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatListModule,
        MatSidenavModule,
        MatSliderModule,
        MatToolbarModule,
        MatTooltipModule
    ]
})
export class MaterialModule {}
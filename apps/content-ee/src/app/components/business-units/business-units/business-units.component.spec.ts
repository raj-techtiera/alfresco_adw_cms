import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BusinessUnitsComponent } from './business-units.component';
import { AlfrescoService } from '../../../alfresco.service';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

describe('BusinessUnitsComponent', () => {
  let component: BusinessUnitsComponent;
  let fixture: ComponentFixture<BusinessUnitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessUnitsComponent],
      providers: [
        provideRouter([]),
        {
          provide: AlfrescoService,
          useValue: {
            getNodes: () => of({ list: { entries: [] } })
          }
        },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(undefined) }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessUnitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

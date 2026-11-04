import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GeographicoverviewComponent } from './geographicoverview.component';
import { AlfrescoService } from '../../alfresco.service';

describe('GeographicoverviewComponent', () => {
  let component: GeographicoverviewComponent;
  let fixture: ComponentFixture<GeographicoverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeographicoverviewComponent],
      providers: [
        {
          provide: AlfrescoService,
          useValue: {
            searchEngineeringProjects: () => of({ items: [], total: 0 })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GeographicoverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

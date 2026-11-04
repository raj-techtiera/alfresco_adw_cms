import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AssetsDashboardComponent } from './assets-dashboard.component';
import { AssetsService } from '../../../services/assets.service';

describe('AssetsDashboardComponent', () => {
  let component: AssetsDashboardComponent;
  let fixture: ComponentFixture<AssetsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetsDashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: AssetsService,
          useValue: {
            loadRegions: jasmine.createSpy('loadRegions').and.resolveTo([]),
            loadBlocks: jasmine.createSpy('loadBlocks').and.resolveTo([]),
            loadFacilities: jasmine.createSpy('loadFacilities').and.resolveTo([]),
            loadFacilityFolders: jasmine.createSpy('loadFacilityFolders').and.resolveTo([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AssetsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

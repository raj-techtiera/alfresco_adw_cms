import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdministrationHubComponent } from './administration-hub.component';

describe('AdministrationHubComponent', () => {
  let component: AdministrationHubComponent;
  let fixture: ComponentFixture<AdministrationHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdministrationHubComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AdministrationHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

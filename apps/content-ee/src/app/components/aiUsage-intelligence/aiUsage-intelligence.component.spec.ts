import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiUsageIntelligenceComponent } from './aiUsage-intelligence.component';

describe('AiUsageIntelligenceComponent', () => {
  let component: AiUsageIntelligenceComponent;
  let fixture: ComponentFixture<AiUsageIntelligenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiUsageIntelligenceComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AiUsageIntelligenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

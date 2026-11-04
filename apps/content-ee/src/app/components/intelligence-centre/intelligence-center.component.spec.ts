import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IntelligenceCenterComponent } from './intelligence-center.component';

describe('IntelligenceCenterComponent', () => {
  let component: IntelligenceCenterComponent;
  let fixture: ComponentFixture<IntelligenceCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntelligenceCenterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IntelligenceCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

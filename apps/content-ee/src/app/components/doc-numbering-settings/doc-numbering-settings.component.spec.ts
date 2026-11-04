import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocNumberingSettingsComponent } from './doc-numbering-settings.component';

describe('DocNumberingSettingsComponent', () => {
  let component: DocNumberingSettingsComponent;
  let fixture: ComponentFixture<DocNumberingSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocNumberingSettingsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DocNumberingSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

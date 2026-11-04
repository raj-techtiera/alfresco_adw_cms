import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './Footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render copyright on the left and powered by on the right', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain(
      'Copyright © 2026 TechTiera. All rights reserved.'
    );
    expect(el.textContent).toContain('Powered By');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('assets/images/companylog.png');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { SettingsComponent } from './settings.component';
import { SettingsService } from '../../services/settings.service';
import { of } from 'rxjs';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        {
          provide: SettingsService,
          useValue: {
            listTemplates: () => Promise.resolve([]),
            contentUrl: () => '',
            createTextTemplate: () => Promise.resolve(),
            createImageTemplate: () => Promise.resolve()
          }
        },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({ afterClosed: () => of(undefined) })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists UI Theme Change in the settings menu', () => {
    expect(component.subNavItems.some((item) => item.key === 'ui-theme' && item.label === 'UI Theme Change')).toBeTrue();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotificationService, UserPreferencesService } from '@alfresco/adf-core';
import { AppService } from '@alfresco/aca-shared';
import { ReportsComponent } from './reports.component';
import { ReportsService } from './reports.service';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsComponent],
          providers: [
        {
          provide: ReportsService,
          useValue: {
            loadDashboard: () =>
              Promise.resolve({
                data: {
                  total: 0,
                  approved: 0,
                  underReview: 0,
                  draft: 0,
                  engineeringDocs: 0,
                  vdrDocs: 0,
                  transmittals: { outgoing: { draft: 0, issued: 0 }, incoming: { draft: 0, approved: 0 } },
                  documents: []
                },
                partialFailure: false
              }),
            loadDocumentsByFilter: () => Promise.resolve([])
          }
        },
        {
          provide: UserPreferencesService,
          useValue: { select: () => of(true), set: () => undefined }
        },
        {
          provide: AppService,
          useValue: {
            setAppNavbarMode: () => undefined,
            appNavNarMode$: { next: () => undefined },
            toggleAppNavBar$: { next: () => undefined }
          }
        },
        {
          provide: NotificationService,
          useValue: { openSnackMessage: () => undefined }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

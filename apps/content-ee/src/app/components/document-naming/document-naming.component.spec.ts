import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotificationService } from '@alfresco/adf-core';
import { of } from 'rxjs';
import { DocumentNamingComponent } from './document-naming.component';
import { AlfrescoService } from '../../alfresco.service';
import { MdrService } from '../../services/mdr.service';

describe('DocumentNamingComponent', () => {
  let component: DocumentNamingComponent;
  let fixture: ComponentFixture<DocumentNamingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentNamingComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        { provide: NotificationService, useValue: { openSnackMessage: () => undefined, showError: () => undefined } },
        { provide: MAT_DIALOG_DATA, useValue: { projectId: 'test-project', projectName: 'Test Project' } },
        {
          provide: MdrService,
          useValue: {
            getProjectCode: () => Promise.resolve('PRJ-TEST')
          }
        },
        {
          provide: AlfrescoService,
          useValue: {
            getCategories: () => of({ data: [] }),
            getCountries: () => of([]),
            getDisciplines: () => of([]),
            getVendorcode: () => of([]),
            getRecipients: () => of([]),
            getSheetNo: () => of([]),
            getDocumentTypeByCategoryId: () => of([]),
            bulkuploadDocumentFiles: () => of({ id: 'uploaded-node' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentNamingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

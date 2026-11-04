import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthenticationService, NotificationService } from '@alfresco/adf-core';
import { CreateAssetsComponent } from './create-assets.component';
import { AssetsService } from '../../../services/assets.service';
import { AlfrescoService } from '../../../alfresco.service';

describe('CreateAssetsComponent', () => {
  let component: CreateAssetsComponent;
  let fixture: ComponentFixture<CreateAssetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateAssetsComponent],
      providers: [
        {
          provide: AssetsService,
          useValue: {
            loadPttepRegions: jasmine.createSpy('loadPttepRegions').and.resolveTo([]),
            loadPttepBlocks: jasmine.createSpy('loadPttepBlocks').and.resolveTo([]),
            loadPttepAssets: jasmine.createSpy('loadPttepAssets').and.resolveTo([]),
            createPttepRegion: jasmine.createSpy('createPttepRegion').and.resolveTo(undefined),
            createPttepBlock: jasmine.createSpy('createPttepBlock').and.resolveTo(undefined),
            createPttepAsset: jasmine.createSpy('createPttepAsset').and.resolveTo(undefined),
            createAssetHierarchy: jasmine.createSpy('createAssetHierarchy').and.resolveTo(undefined)
          }
        },
        {
          provide: AlfrescoService,
          useValue: {
            getNodes: jasmine.createSpy('getNodes').and.returnValue(
              of({
                list: {
                  entries: [
                    {
                      entry: {
                        id: '72bf2fa5-9aa1-49cc-bf2f-a59aa179cc74',
                        name: 'Standard Asset Template',
                        isFolder: true
                      }
                    }
                  ]
                }
              })
            )
          }
        },
        {
          provide: NotificationService,
          useValue: {
            openSnackMessage: jasmine.createSpy('openSnackMessage')
          }
        },
        {
          provide: AuthenticationService,
          useValue: {
            isLoggedIn: () => true,
            getUsername: () => 'admin',
            onLogin: of(null),
            onTokenReceived: of(null)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateAssetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

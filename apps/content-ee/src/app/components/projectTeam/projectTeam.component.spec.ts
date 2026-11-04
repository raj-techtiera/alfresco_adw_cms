import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectTeamComponent } from './projectTeam.component';

describe('ProjectTeamComponent', () => {
  let component: ProjectTeamComponent;
  let fixture: ComponentFixture<ProjectTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectTeamComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

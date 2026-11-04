import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

interface Slot {
  id: string;
  role: string;
  department: string;
  assignee: string;
  email: string;
  fullName: string;
  required: boolean;
}

interface Stage {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  slots: Slot[];
}

interface AddSlotForm {
  role: string;
  department: string;
  assignee: string;
  email: string;
  fullName: string;
}

interface StepperStep {
  label: string;
  sub: string;
  icon: string;
  color: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface Kpi {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'acs-project-team',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './projectTeam.component.html',
  styleUrl: './projectTeam.component.scss'
})
export class ProjectTeamComponent {
  readonly projects: ProjectOption[] = [
    { id: 'ECE-020', name: 'name (ECE-020)' },
    { id: 'ECE-021', name: 'Alpha Plant (ECE-021)' },
    { id: 'ECE-022', name: 'Beta Refinery (ECE-022)' }
  ];

  readonly roleOptions = [
    'Project Manager', 'Project Director', 'Engineering Manager', 'Design Lead',
    'QA Engineer', 'Safety Officer', 'Procurement Lead', 'Document Controller',
    'Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Instrumentation Engineer'
  ];

  readonly departmentOptions = [
    'Auto from role / select...', 'Engineering', 'Management', 'Design',
    'Quality Assurance', 'Safety', 'Procurement', 'Document Control'
  ];

  readonly assigneeOptions = [
    'Leave vacant', 'Raj (raj@bhavath.com)', 'John Smith', 'Sarah Connor', 'Mike Johnson'
  ];

  readonly stepperSteps: StepperStep[] = [
    { label: 'Project Initiation', sub: 'Top Management', icon: '🏢', color: '#0056B3' },
    { label: 'Key Appointments', sub: 'Project Director', icon: '👤', color: '#9B2D6F' },
    { label: 'Discipline Teams', sub: 'Engineering Manager', icon: '⚙️', color: '#D97706' },
    { label: 'Review & Approval', sub: 'Project Manager', icon: '✅', color: '#0F766E' },
    { label: 'Published', sub: 'Published', icon: '🚀', color: '#7C3AED' }
  ];

  selectedProject = this.projects[0].id;
  activeStep = 0;
  openFormStage: number | null = 1;
  formData: AddSlotForm = this.emptyForm();

  stages: Stage[] = [
    { id: 1, title: 'Stage 1 — Project Initiation', subtitle: 'Top Management', color: '#0056B3', slots: [] },
    { id: 2, title: 'Stage 2 — Key Appointments', subtitle: 'Project Director', color: '#9B2D6F', slots: [] },
    { id: 3, title: 'Stage 3 — Discipline Teams', subtitle: 'Engineering Manager', color: '#D97706', slots: [] }
  ];

  get kpis(): Kpi[] {
    const isFilled = (sl: Slot) => !!sl.assignee && sl.assignee !== 'Leave vacant';
    const totalSlots = this.sumSlots(() => true);
    const filled = this.sumSlots(isFilled);
    const required = this.sumSlots((sl) => sl.required);
    const reqFilled = this.sumSlots((sl) => sl.required && isFilled(sl));
    const notOnboarded = this.sumSlots((sl) => isFilled(sl) && !sl.email);

    return [
      { label: 'Total Slots', value: totalSlots, color: '#0056B3' },
      { label: 'Filled', value: filled, color: '#16A34A' },
      { label: 'Required', value: required, color: '#D97706' },
      { label: 'Req. Filled', value: reqFilled, color: '#16A34A' },
      { label: 'Not Onboarded', value: notOnboarded, color: '#DC2626' }
    ];
  }

  isStepActive(index: number): boolean {
    return index <= this.activeStep;
  }

  stepBorderColor(step: StepperStep, index: number): string {
    return index <= this.activeStep ? step.color : '#E5E7EB';
  }

  stepBackground(step: StepperStep, index: number): string {
    return index <= this.activeStep ? `${step.color}15` : '#F9FAFB';
  }

  stepLabelColor(step: StepperStep, index: number): string {
    return index <= this.activeStep ? step.color : '#9CA3AF';
  }

  connectorColor(step: StepperStep, index: number): string {
    return index < this.activeStep ? step.color : '#E5E7EB';
  }

  toggleForm(stageId: number): void {
    this.openFormStage = this.openFormStage === stageId ? null : stageId;
  }

  cancelForm(): void {
    this.openFormStage = null;
    this.formData = this.emptyForm();
  }

  handleAddSlot(stage: Stage): void {
    if (!this.formData.role) {
      return;
    }
    const newSlot: Slot = {
      id: `slot-${Date.now()}`,
      role: this.formData.role,
      department:
        this.formData.department === 'Auto from role / select...' ? 'Engineering' : this.formData.department,
      assignee: this.formData.assignee,
      email: this.formData.email,
      fullName: this.formData.fullName,
      required: false
    };
    stage.slots = [...stage.slots, newSlot];
    this.formData = this.emptyForm();
    this.openFormStage = null;
  }

  handleTemplateRoles(stage: Stage): void {
    const now = Date.now();
    const templates: Record<number, Slot[]> = {
      1: [
        { id: `t1-${now}`, role: 'Project Sponsor', department: 'Management', assignee: 'Leave vacant', email: '', fullName: '', required: true },
        { id: `t2-${now}`, role: 'Steering Committee', department: 'Management', assignee: 'Leave vacant', email: '', fullName: '', required: true }
      ],
      2: [
        { id: `t3-${now}`, role: 'Project Director', department: 'Management', assignee: 'Leave vacant', email: '', fullName: '', required: true },
        { id: `t4-${now}`, role: 'Project Manager', department: 'Management', assignee: 'Leave vacant', email: '', fullName: '', required: true }
      ],
      3: [
        { id: `t5-${now}`, role: 'Engineering Manager', department: 'Engineering', assignee: 'Leave vacant', email: '', fullName: '', required: true },
        { id: `t6-${now}`, role: 'Civil Engineer', department: 'Engineering', assignee: 'Leave vacant', email: '', fullName: '', required: false },
        { id: `t7-${now}`, role: 'Mechanical Engineer', department: 'Engineering', assignee: 'Leave vacant', email: '', fullName: '', required: false }
      ]
    };
    stage.slots = [...stage.slots, ...(templates[stage.id] || [])];
  }

  removeSlot(stage: Stage, slot: Slot): void {
    stage.slots = stage.slots.filter((s) => s.id !== slot.id);
  }

  slotInitial(role: string): string {
    return role.charAt(0);
  }

  trackByStageId(_index: number, stage: Stage): number {
    return stage.id;
  }

  trackBySlotId(_index: number, slot: Slot): string {
    return slot.id;
  }

  trackByLabel(_index: number, item: { label: string }): string {
    return item.label;
  }

  private sumSlots(predicate: (slot: Slot) => boolean): number {
    return this.stages.reduce((acc, stage) => acc + stage.slots.filter(predicate).length, 0);
  }

  private emptyForm(): AddSlotForm {
    return {
      role: '',
      department: 'Auto from role / select...',
      assignee: 'Leave vacant',
      email: '',
      fullName: ''
    };
  }
}

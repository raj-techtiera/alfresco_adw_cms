import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  empId: string;
  role: string;
  department: string;
  projects: number;
  mobile: string;
  status: 'Active' | 'Inactive';
  avatarColor: string;
}

interface NewMemberForm {
  email: string;
  name: string;
  mobile: string;
  department: string;
  roleSearch: string;
  role: string;
  designation: string;
  empId: string;
  ddmRouting: string;
  assignedProjects: string[];
}

interface SampleProject {
  id: string;
  label: string;
}

type FormField = keyof NewMemberForm;

@Component({
  selector: 'acs-team-resources',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './team-resources.component.html',
  styleUrl: './team-resources.component.scss'
})
export class TeamResourcesComponent {
  readonly departments = ['All Departments', 'Engineering', 'Design', 'Management', 'Finance', 'Operations'];
  readonly statusOptions = ['Active only', 'All Status', 'Inactive only'];
  readonly avatarColors = ['#0056B3', '#9B2D6F', '#0F766E', '#D97706', '#DC2626', '#7C3AED'];
  readonly allRoles = [
    'Administrator (System)',
    'Project Manager',
    'Senior Engineer',
    'Design Lead',
    'Finance Manager',
    'Operations Head',
    'QA Engineer',
    'Business Analyst'
  ];
  readonly ddmRoutingOptions = [
    'Member (no DDM routing)',
    'Reviewer',
    'Approver',
    'Lead Reviewer',
    'Lead Approver'
  ];
  readonly sampleProjects: SampleProject[] = [
    { id: 'p1', label: 'name (ECE-020)' },
    { id: 'p2', label: 'Alpha Bridge (CIV-011)' },
    { id: 'p3', label: 'Metro Line 4 (STR-033)' }
  ];

  members: TeamMember[] = [
    {
      id: '1',
      name: 'Raj',
      email: 'raj@bhavath.com',
      empId: '—',
      role: 'Administrator (System)',
      department: '—',
      projects: 0,
      mobile: '—',
      status: 'Active',
      avatarColor: '#9B2D6F'
    }
  ];

  search = '';
  department = 'All Departments';
  statusFilter = 'Active only';
  showModal = false;
  form: NewMemberForm = this.emptyForm();
  formErrors: Partial<Record<FormField, string>> = {};

  get departmentOptions(): string[] {
    return this.departments.slice(1);
  }

  get filtered(): TeamMember[] {
    const search = this.search.toLowerCase();
    return this.members.filter((m) => {
      const matchSearch =
        search === '' ||
        m.name.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search) ||
        m.empId.toLowerCase().includes(search);
      const matchDept = this.department === 'All Departments' || m.department === this.department;
      const matchStatus =
        this.statusFilter === 'All Status' ||
        (this.statusFilter === 'Active only' && m.status === 'Active') ||
        (this.statusFilter === 'Inactive only' && m.status === 'Inactive');
      return matchSearch && matchDept && matchStatus;
    });
  }

  get activeCount(): number {
    return this.members.filter((m) => m.status === 'Active').length;
  }

  get filteredRoles(): string[] {
    const term = this.form.roleSearch.toLowerCase();
    return this.allRoles.filter((r) => term === '' || r.toLowerCase().includes(term));
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.form = this.emptyForm();
    this.formErrors = {};
  }

  clearError(field: FormField): void {
    if (this.formErrors[field]) {
      this.formErrors = { ...this.formErrors, [field]: '' };
    }
  }

  isProjectAssigned(projectId: string): boolean {
    return this.form.assignedProjects.includes(projectId);
  }

  toggleProject(projectId: string): void {
    this.form.assignedProjects = this.isProjectAssigned(projectId)
      ? this.form.assignedProjects.filter((id) => id !== projectId)
      : [...this.form.assignedProjects, projectId];
  }

  initial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  handleAddMember(): void {
    if (!this.validate()) {
      return;
    }

    const newMember: TeamMember = {
      id: String(Date.now()),
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      empId: this.form.empId.trim() || '—',
      role: this.form.designation.trim() || this.form.role.trim(),
      department: this.form.department.trim() || '—',
      projects: this.form.assignedProjects.length,
      mobile: this.form.mobile.trim() || '—',
      status: 'Active',
      avatarColor: this.avatarColors[this.members.length % this.avatarColors.length]
    };

    this.members = [...this.members, newMember];
    this.form = this.emptyForm();
    this.formErrors = {};
    this.showModal = false;
  }

  trackByMemberId(_index: number, member: TeamMember): string {
    return member.id;
  }

  trackByProjectId(_index: number, project: SampleProject): string {
    return project.id;
  }

  private validate(): boolean {
    const errors: Partial<Record<FormField, string>> = {};
    if (!this.form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) {
      errors.email = 'Invalid email address';
    }
    if (!this.form.name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!this.form.role.trim()) {
      errors.role = 'Role is required';
    }
    this.formErrors = errors;
    return Object.keys(errors).length === 0;
  }

  private emptyForm(): NewMemberForm {
    return {
      email: '',
      name: '',
      mobile: '',
      department: '',
      roleSearch: '',
      role: '',
      designation: '',
      empId: '',
      ddmRouting: 'Member (no DDM routing)',
      assignedProjects: []
    };
  }
}

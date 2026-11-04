import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

type KpiIcon =
  | 'folder'
  | 'gear'
  | 'warning'
  | 'wrench'
  | 'clock'
  | 'send'
  | 'question'
  | 'box'
  | 'building'
  | 'file';

interface KpiCard {
  label: string;
  value: number;
  subtitle: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  icon: KpiIcon;
}

interface ActivityItem {
  user: string;
  action: string;
  time: string;
  initials: string;
  color: string;
}

@Component({
  selector: 'acs-kpi-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './kpi-dashboard.component.html',
  styleUrl: './kpi-dashboard.component.scss'
})
export class KpiDashboardComponent {
  readonly timeRanges = ['All time', 'Last 30 days', 'Last 60 days', 'Last 90 days', 'This year'];
  timeRange = 'All time';

  readonly row1: KpiCard[] = [
    { label: 'TOTAL DOCUMENTS', value: 0, subtitle: '0 approved (0%)', iconBg: '#FEF9C3', iconColor: '#F59E0B', valueColor: '#3B82F6', icon: 'folder' },
    { label: 'OPEN WORKFLOWS', value: 0, subtitle: 'All within SLA', iconBg: '#FEF3C7', iconColor: '#F59E0B', valueColor: '#F59E0B', icon: 'gear' },
    { label: 'RAID ITEMS', value: 0, subtitle: 'No critical risks', iconBg: '#FEF3C7', iconColor: '#F59E0B', valueColor: '#F59E0B', icon: 'warning' },
    { label: 'PUNCH LIST', value: 0, subtitle: '0% complete', iconBg: '#FFE4E6', iconColor: '#F43F5E', valueColor: '#F43F5E', icon: 'wrench' },
    { label: 'OVERDUE REVIEWS', value: 0, subtitle: 'All reviews on time', iconBg: '#DCFCE7', iconColor: '#22C55E', valueColor: '#22C55E', icon: 'clock' }
  ];

  readonly row2: KpiCard[] = [
    { label: 'TRANSMITTALS ISSUED', value: 0, subtitle: '0 pending acknowledgement', iconBg: '#EDE9FE', iconColor: '#8B5CF6', valueColor: '#8B5CF6', icon: 'send' },
    { label: 'RFIS OPEN', value: 0, subtitle: '0 answered', iconBg: '#FEF3C7', iconColor: '#F59E0B', valueColor: '#F59E0B', icon: 'question' },
    { label: 'VENDOR DOCS', value: 0, subtitle: '0 approved · 0 pending review', iconBg: '#CCFBF1', iconColor: '#14B8A6', valueColor: '#14B8A6', icon: 'box' },
    { label: 'AS-BUILT DOCS', value: 0, subtitle: '0% of register', iconBg: '#E0E7FF', iconColor: '#6366F1', valueColor: '#6366F1', icon: 'building' },
    { label: 'DRAFT DOCS', value: 0, subtitle: 'Not yet formally issued', iconBg: '#F1F5F9', iconColor: '#64748B', valueColor: '#64748B', icon: 'file' }
  ];

  readonly monthlyUploads = [
    { month: 'Jan', docs: 0 }, { month: 'Feb', docs: 0 }, { month: 'Mar', docs: 0 },
    { month: 'Apr', docs: 0 }, { month: 'May', docs: 0 }, { month: 'Jun', docs: 0 }
  ];

  readonly ifcStatus = [
    { name: 'IFC', value: 0, color: '#22C55E' },
    { name: 'IFR', value: 0, color: '#3B82F6' },
    { name: 'IFA', value: 0, color: '#F59E0B' },
    { name: 'Draft', value: 0, color: '#94A3B8' }
  ];

  readonly disciplineCompletion = [
    { discipline: 'Civil', completed: 0, total: 0 },
    { discipline: 'Structural', completed: 0, total: 0 },
    { discipline: 'Mechanical', completed: 0, total: 0 },
    { discipline: 'Electrical', completed: 0, total: 0 },
    { discipline: 'Piping', completed: 0, total: 0 }
  ];

  readonly slaPerformance = [
    { name: 'Review', onTime: 0, late: 0 },
    { name: 'Approval', onTime: 0, late: 0 },
    { name: 'Transmittal', onTime: 0, late: 0 }
  ];

  readonly recentActivity: ActivityItem[] = [
    { user: 'raj', action: 'login', time: '26 Jun, 04:03 pm', initials: 'R', color: '#F59E0B' },
    { user: 'raj', action: 'login', time: '26 Jun, 10:45 am', initials: 'R', color: '#F59E0B' }
  ];

  get hasMonthlyData(): boolean {
    return this.monthlyUploads.some((d) => d.docs > 0);
  }

  get hasIfcData(): boolean {
    return this.ifcStatus.some((d) => d.value > 0);
  }

  get hasDisciplineData(): boolean {
    return this.disciplineCompletion.some((d) => d.total > 0);
  }

  get hasSlaData(): boolean {
    return this.slaPerformance.some((d) => d.onTime > 0 || d.late > 0);
  }

  refresh(): void {
    // Placeholder for future data reload; charts are driven by the data arrays above.
  }

  activityAvatarBg(color: string): string {
    return `${color}22`;
  }

  trackByLabel(_index: number, card: KpiCard): string {
    return card.label;
  }

  trackByIndex(index: number): number {
    return index;
  }
}

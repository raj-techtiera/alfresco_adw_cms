import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Certificate, RegulatorySubmission, KpiCard } from '../../interface/compliance';

@Component({
  selector: 'acs-compliance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compliance.component.html',
  styleUrl: './compliance.component.scss'
})
export class ComplianceComponent {
  certificates: Certificate[] = [];
  submissions: RegulatorySubmission[] = [];
  showCertModal = false;
  showRegModal = false;

  get kpiCards(): KpiCard[] {
    return [
      {
        label: 'Active Certs',
        value: this.certificates.filter((c) => c.status === 'active').length,
        icon: 'check-badge',
        color: '#22C55E',
        accentClass: 'cmp-accent--green'
      },
      {
        label: 'Due for Review',
        value: this.certificates.filter((c) => c.status === 'due').length,
        icon: 'clock',
        color: '#F59E0B',
        accentClass: 'cmp-accent--amber'
      },
      {
        label: 'Pending Regulatory',
        value: this.submissions.filter((s) => s.status === 'pending').length,
        icon: 'warning',
        color: '#EF4444',
        accentClass: 'cmp-accent--red'
      },
      {
        label: 'Total Standards',
        value: this.certificates.length + this.submissions.length,
        icon: 'clipboard',
        color: '#3B82F6',
        accentClass: 'cmp-accent--blue'
      }
    ];
  }

  openCertModal(): void {
    this.showCertModal = true;
  }

  closeCertModal(): void {
    this.showCertModal = false;
  }

  openRegModal(): void {
    this.showRegModal = true;
  }

  closeRegModal(): void {
    this.showRegModal = false;
  }

  trackByLabel(_index: number, card: KpiCard): string {
    return card.label;
  }
}

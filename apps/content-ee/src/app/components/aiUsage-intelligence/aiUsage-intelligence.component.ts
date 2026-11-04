import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type AiUsageTab = 'Overview' | 'By Feature' | 'By User' | 'Trends';

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  valueColor: string;
}

@Component({
  selector: 'acs-ai-usage-intelligence',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aiUsage-intelligence.component.html',
  styleUrl: './aiUsage-intelligence.component.scss'
})
export class AiUsageIntelligenceComponent {
  readonly tabs: AiUsageTab[] = ['Overview', 'By Feature', 'By User', 'Trends'];

  readonly kpiCards: KpiCard[] = [
    { label: 'CREDITS USED', value: '0', sub: 'of 50 this month', valueColor: '#22c55e' },
    { label: 'CREDITS REMAINING', value: '50', sub: 'available now', valueColor: '#22c55e' },
    { label: 'USAGE %', value: '0%', sub: 'of monthly quota', valueColor: '#22c55e' },
    { label: 'AI FEATURES USED', value: '0', sub: 'this month', valueColor: '#1e293b' },
    { label: 'TOTAL AI CALLS', value: '0', sub: 'this month', valueColor: '#1e293b' },
    { label: 'ACTIVE USERS', value: '0', sub: 'using AI this month', valueColor: '#1e293b' }
  ];

  activeTab: AiUsageTab = 'Overview';

  setTab(tab: AiUsageTab): void {
    this.activeTab = tab;
  }

  trackByTab(_index: number, item: AiUsageTab): string {
    return item;
  }

  trackByLabel(_index: number, item: KpiCard): string {
    return item.label;
  }
}

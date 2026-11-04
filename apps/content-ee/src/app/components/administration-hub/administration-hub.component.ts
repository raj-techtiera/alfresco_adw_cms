import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface HubCard {
  title: string;
  description: string;
  href: string;
  borderColor: string;
  icon: string;
}

@Component({
  selector: 'acs-administration-hub',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './administration-hub.component.html',
  styleUrl: './administration-hub.component.scss'
})
export class AdministrationHubComponent {
  readonly cards: HubCard[] = [
    { title: 'Team Members', description: 'Invite, manage roles and access', href: '/project-team', borderColor: '#4F6BED', icon: 'team' },
    { title: 'Billing & Plan', description: 'Subscription, usage, invoices', href: '/billing', borderColor: '#22C55E', icon: 'billing' },
    { title: 'Branding', description: 'Logo, colours, company identity', href: '/branding', borderColor: '#A855F7', icon: 'branding' },
    { title: 'Platform Settings', description: 'Workspace configuration', href: '/settings', borderColor: '#F59E0B', icon: 'settings' },
    { title: 'Data Migration', description: 'Import legacy data and documents', href: '/data-migration', borderColor: '#06B6D4', icon: 'migration' },
    { title: 'Appoint Leadership', description: 'Appoint project directors and managers', href: '/team-resources', borderColor: '#6366F1', icon: 'leadership' },
    { title: 'Audit Log', description: 'Full platform activity trail', href: '/notifications', borderColor: '#64748B', icon: 'audit' },
    { title: 'Organisation', description: 'Departments, disciplines, roles', href: '/business-units', borderColor: '#10B981', icon: 'organisation' }
  ];

  trackByTitle(_index: number, item: HubCard): string {
    return item.title;
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

interface IntelligenceTab {
  id: string;
  label: string;
  emoji: string;
  title: string;
  message: string;
}

@Component({
  selector: 'acs-intelligence-center',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './intelligence-center.component.html',
  styleUrl: './intelligence-center.component.scss'
})
export class IntelligenceCenterComponent {
  readonly projects = [
    'Project Alpha - Offshore Platform',
    'Project Beta - Pipeline Expansion',
    'Project Gamma - Refinery Upgrade',
    'Project Delta - LNG Terminal'
  ];

  readonly tabs: IntelligenceTab[] = [
    { id: 'project-health', label: 'Project Health', emoji: '🩺', title: 'Project Health Scores', message: 'Select a project above to view health scores.' },
    { id: 'predictions', label: 'Predictions', emoji: '🧠', title: 'Predictions', message: 'Select a project above to view AI predictions.' },
    { id: 'quick-actions', label: 'Quick Actions', emoji: '⚡', title: 'Quick Actions', message: 'Select a project above to view quick actions.' },
    { id: 'knowledge-base', label: 'Knowledge Base', emoji: '💬', title: 'Knowledge Base', message: 'Select a project above to access the knowledge base.' },
    { id: 'ai-tools', label: 'AI Tools', emoji: '🔧', title: 'AI Tools', message: 'Select a project above to access AI tools.' },
    { id: 'ai-emails', label: 'AI Emails', emoji: '🔵', title: 'AI Emails', message: 'Select a project above to manage AI emails.' },
    { id: 'idc-requests', label: 'IDC Requests', emoji: '🔗', title: 'IDC Requests', message: 'Select a project above to view IDC requests.' }
  ];

  activeTabId = 'project-health';
  selectedProject = '';

  get activeTab(): IntelligenceTab {
    return this.tabs.find((tab) => tab.id === this.activeTabId) ?? this.tabs[0];
  }

  setActiveTab(id: string): void {
    this.activeTabId = id;
  }

  trackByTabId(_index: number, tab: IntelligenceTab): string {
    return tab.id;
  }
}

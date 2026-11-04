import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DviFlowStep } from '../../../interface/programPortfolio';

@Component({
  selector: 'adw-view-track',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './view-track.component.html',
  styleUrl: './view-track.component.scss'
})
export class ViewTrackComponent {
  @Input() steps: DviFlowStep[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() selectedStepId = '';
  @Output() readonly stepSelect = new EventEmitter<DviFlowStep>();

  onStepClick(step: DviFlowStep): void {
    if (step.tone !== 'completed') {
      return;
    }
    this.stepSelect.emit(step);
  }
}

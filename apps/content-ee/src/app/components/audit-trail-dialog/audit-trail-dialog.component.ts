import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Node } from '@alfresco/js-api';
import { AuditTrailEntryView, AuditTrailService } from '../../services/audit-trail.service';

export interface AuditTrailDialogData {
    node: Node;
}

@Component({
    selector: 'app-audit-trail-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        DatePipe,
        NgClass
    ],
    templateUrl: './audit-trail-dialog.component.html',
    styleUrl: './audit-trail-dialog.component.scss'
})
export class AuditTrailDialogComponent implements OnInit {
    private readonly auditTrailService = inject(AuditTrailService);
    private readonly dialogRef = inject(MatDialogRef<AuditTrailDialogComponent>);

    readonly data = inject<AuditTrailDialogData>(MAT_DIALOG_DATA);

    loading = true;
    error = '';
    searchTerm = '';
    entries: AuditTrailEntryView[] = [];
    pageSizeOptions = [5, 10, 25, 50];
    pageSize = 5;
    currentPage = 1;

    get filteredEntries(): AuditTrailEntryView[] {
        const term = this.searchTerm.trim().toLowerCase();

        if (!term) {
            return this.entries;
        }

        return this.entries.filter((entry) =>
            [entry.action, entry.createdBy, entry.details, JSON.stringify(entry.values)]
                .join(' ')
                .toLowerCase()
                .includes(term)
        );
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.filteredEntries.length / this.pageSize));
    }

    get pagedEntries(): AuditTrailEntryView[] {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredEntries.slice(start, start + this.pageSize);
    }

    get pageStart(): number {
        if (this.filteredEntries.length === 0) {
            return 0;
        }

        return (this.currentPage - 1) * this.pageSize + 1;
    }

    get pageEnd(): number {
        return Math.min(this.currentPage * this.pageSize, this.filteredEntries.length);
    }

    get nodeLabel(): string {
        return this.auditTrailService.getNodeLabel(this.data.node);
    }

    constructor(@Inject(MAT_DIALOG_DATA) _data: AuditTrailDialogData) {}

    ngOnInit(): void {
        this.auditTrailService.getAuditEntriesForNode(this.data.node.id).subscribe({
            next: (entries) => {
                this.entries = entries;
                this.loading = false;
            },
            error: (error) => {
                this.error =
                    error?.error?.error?.briefSummary ||
                    error?.error?.error?.errorKey ||
                    error?.message ||
                    'Unable to load audit trail.';
                this.loading = false;
            }
        });
    }

    onSearchTermChange(): void {
        this.currentPage = 1;
    }

    onPageSizeChange(): void {
        this.currentPage = 1;
    }

    goToPreviousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage -= 1;
        }
    }

    goToNextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage += 1;
        }
    }

    close(): void {
        this.dialogRef.close();
    }
}

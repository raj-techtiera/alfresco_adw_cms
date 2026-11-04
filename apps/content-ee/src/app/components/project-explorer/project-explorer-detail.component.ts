import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AlfrescoApiService } from '@alfresco/adf-content-services';
import { NodesApi } from '@alfresco/js-api';

@Component({
  selector: 'adw-project-explorer-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-explorer-detail.component.html',
  styleUrls: ['./project-explorer.component.scss']
})
export class ProjectExplorerDetailComponent implements OnInit {
  nodeId?: string;
  children: any[] = [];
  loading = false;

  constructor(private route: ActivatedRoute, private alfrescoApiService: AlfrescoApiService) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('nodeId');
      if (id) {
        this.nodeId = id;
        this.loadChildren(id);
      }
    });
  }

  async loadChildren(nodeId: string) {
    this.loading = true;
    this.children = [];
    try {
      const nodesApi = new NodesApi(this.alfrescoApiService.getInstance());
      // @ts-ignore
      const res: any = await nodesApi.listNodeChildren(nodeId, { include: ['properties', 'allowableOperations'], skipCount: 0, maxItems: 200 });
      this.children = (res?.list?.entries || []).map((e: any) => e.entry);
    } catch (err) {
      console.error('Failed to load children for node', nodeId, err);
    } finally {
      this.loading = false;
    }
  }

  isFolder(entry: any): boolean {
    return entry && (entry.isFolder || entry.nodeType === 'cm:folder' || entry.nodeType?.includes('folder'));
  }
}


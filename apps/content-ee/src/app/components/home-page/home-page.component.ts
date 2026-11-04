import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthenticationService } from '@alfresco/adf-core';

@Component({
  standalone: true,
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
  imports: [CommonModule]
})
export class HomePageComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthenticationService);

  welcomeMessage = 'Welcome';
  numberOfColumns = 4;

  sections = [
    {
      name: 'Personal Files',
      description: 'Access and manage your personal documents and folders.',
      image: 'assets/images/personal_blue.png'
    },
    {
      name: 'Libraries',
      description: 'Browse and collaborate on shared document libraries.',
      image: 'assets/images/documents_blue.png'
    },
    {
      name: 'Tasks',
      description: 'View and manage your assigned tasks and workflows.',
      image: 'assets/images/tasks_blue.png'
    },
    {
      name: 'Processes',
      description: 'Monitor and track your active process instances.',
      image: 'assets/images/user_settings_blue.png'
    },
    {
      name: 'Shared Files',
      description: 'View files that have been shared with you.',
      image: 'assets/images/learning_blue.png'
    },
    {
      name: 'Recent Files',
      description: 'Quickly access your recently viewed or modified files.',
      image: 'assets/images/recently_blue.png'
    },
    {
      name: 'Favorites',
      description: 'Access your favorite files and folders at a glance.',
      image: 'assets/images/favorites.png'
    },
    {
      name: 'Trashcan',
      description: 'Recover or permanently delete discarded items.',
      image: 'assets/images/recycle-bin.png'
    }
  ];

  ngOnInit(): void {
    this.updateColumns(window.innerWidth);
    this.loadUserName();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.updateColumns((event.target as Window).innerWidth);
  }

  routeToFolder(name: string): void {
    const routeMap: Record<string, string> = {
      'Personal Files': '/personal-files',
      'Libraries': '/libraries',
      'Tasks': '/apps/0/tasks/1',
      'Processes': '/apps/0/processes/5',
      'Shared Files': '/shared',
      'Recent Files': '/recent-files',
      'Favorites': '/favorites',
      'Trashcan': '/trashcan',
      'News': '/personal-files'
    };
    const route = routeMap[name] || '/personal-files';
    this.router.navigateByUrl(route);
  }

  private updateColumns(width: number): void {
    if (width <= 600) {
      this.numberOfColumns = 1;
    } else if (width <= 900) {
      this.numberOfColumns = 2;
    } else if (width <= 1200) {
      this.numberOfColumns = 3;
    } else {
      this.numberOfColumns = 4;
    }
  }

  private loadUserName(): void {
    const username = this.authService.getUsername();
    if (username) {
      this.welcomeMessage = `Welcome, ${username}`;
    } else {
      this.welcomeMessage = 'Welcome to Your Workspace';
    }
  }
}

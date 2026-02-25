import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsService, Project } from '../../services/projects';

declare var bootstrap: any;

@Component({
  selector: 'app-list',
  standalone: false,
  templateUrl: './list.html',
  styleUrls: ['./list.css']
})
export class List implements OnInit {
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  loading = true;
  error: string | null = null;

  projectToDelete: Project | null = null;
  myId: string | null = null;

  // Filtros y vista
  searchTerm: string = '';
  statusFilter: string = '';
  viewMode: 'cards' | 'list' = 'cards';

  constructor(
    private projectsService: ProjectsService,
    private router: Router
  ) { }

  ngOnInit() {
    this.myId = localStorage.getItem('id');
    this.loadProjects();
  }

  loadProjects() {
    this.projectsService.getUserProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.filteredProjects = [...this.projects];
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los proyectos.';
        this.loading = false;
      }
    });
  }

  createProject() {
    this.router.navigate(['/projects/create']);
  }

  viewProject(id: number) {
    this.router.navigate([`/projects/${id}`]);
  }

  isOwner(project: Project): boolean {
    return project.owner_id?.toString() === this.myId;
  }

  openDeleteModal(project: Project) {
    if (!this.isOwner(project)) {
      const modalEl = document.getElementById('notOwnerModal');
      if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
      return;
    }

    this.projectToDelete = project;
    const modalEl = document.getElementById('deleteModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  truncateText(text: string, limit: number = 120): string {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  }


  confirmDelete() {
    if (!this.projectToDelete) return;

    this.projectsService.deleteProject(this.projectToDelete.id).subscribe({
      next: () => {
        this.projects = this.projects.filter(
          (p) => p.id !== this.projectToDelete!.id
        );
        this.filterProjects(); // actualizar lista filtrada
        this.projectToDelete = null;
      },
      error: (err) => {
        console.error(err);
        alert('No se pudo eliminar el proyecto.');
        this.projectToDelete = null;
      }
    });
  }

  // 🔍 Filtrar y buscar
  filterProjects() {
    this.filteredProjects = this.projects.filter(
      (p) =>
        p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) &&
        (this.statusFilter ? p.status === this.statusFilter : true)
    );
  }

  // 🔄 Cambiar vista
  toggleView() {
    this.viewMode = this.viewMode === 'cards' ? 'list' : 'cards';
  }

  getLoggedUserId(): number | null {
    const id = localStorage.getItem('id');
    return id ? Number(id) : null;
  }
}

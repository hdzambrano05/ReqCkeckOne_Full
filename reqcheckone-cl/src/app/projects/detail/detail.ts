import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectsService, Project } from '../../services/projects';
import { RequirementsService } from '../../services/requirements';

declare var bootstrap: any; // 👈 importante para usar el modal de Bootstrap

export interface Requirement {
  id: number;
  project_id: number;
  title: string;
  text: string;
  context?: string;
  status: 'draft' | 'reviewed' | 'accepted' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-detail',
  standalone: false,
  templateUrl: './detail.html',
  styleUrls: ['./detail.css'],
})
export class Detail implements OnInit {
  project: Project | null = null;
  requirements: Requirement[] = [];
  loadingProject = true;
  loadingRequirements = true;
  selectedRequirement: Requirement | null = null; // 👈 requisito a eliminar
  selectedRequirementId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: ProjectsService,
    private requirementsService: RequirementsService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadProject(id);
      this.loadRequirements(id);
    }
  }

  loadProject(id: number) {
    this.projectsService.getProjectById(id).subscribe({
      next: (project) => {
        this.project = project;
        this.loadingProject = false;
      },
      error: (err) => {
        console.error('Error cargando proyecto:', err);
        this.loadingProject = false;
      },
    });
  }

  loadRequirements(projectId: number) {
    this.requirementsService.getByProject(projectId).subscribe({
      next: (reqs: Requirement[]) => {
        this.requirements = reqs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          // 👈 ordenar por fecha de creación
        );
        this.loadingRequirements = false;
      },
      error: (err) => {
        console.error('Error cargando requisitos:', err);
        this.loadingRequirements = false;
      },
    });
  }

  goToAddRequirement() {
    if (!this.project) return;
    this.router.navigate([`/projects/${this.project.id}/requirements/create`]);
  }

  goBack() {
    this.router.navigate(['/projects']);
  }

  viewRequirement(id: number) {
    if (!this.project) return;
    this.router.navigate([`/projects/${this.project.id}/requirements/${id}`]);
  }

  deleteRequirement(id: number) {
    this.selectedRequirementId = id;
    const modalElement = document.getElementById('confirmDeleteModal') as any;
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  confirmDelete() {
    if (!this.selectedRequirementId) return;

    this.requirementsService.deleteRequirement(this.selectedRequirementId).subscribe({
      next: () => {
        if (this.project?.id) {
          this.loadRequirements(this.project.id);
        }
        this.selectedRequirementId = null;
      },
      error: (err) => {
        console.error('Error eliminando requisito:', err);
        alert('No se pudo eliminar el requisito.');
      },
    });
  }
}

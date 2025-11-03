import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectsService, Project } from '../../services/projects';
import { RequirementsService } from '../../services/requirements';
import { TasksService } from '../../services/tasks';
import { AuthService } from '../../services/auth';
import Swal from 'sweetalert2';

declare var bootstrap: any;

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
  selectedRequirement: Requirement | null = null;
  selectedRequirementId: number | null = null;
  loadingTasks = false;
  tasks: any[] = [];
  unreadTasks = 0;
  userId = 0 ;

  private taskModal: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: ProjectsService,
    private requirementsService: RequirementsService,
    private tasksService: TasksService,
    private authService: AuthService
  ) {
    this.userId = this.authService.getUserId()!;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadProject(id);
      this.loadRequirements(id);
      this.loadTasks(id);
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
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.loadingRequirements = false;
      },
      error: (err) => {
        console.error('Error cargando requisitos:', err);
        this.loadingRequirements = false;
      },
    });
  }

  loadTasks(projectId: number, showAlert = false) {
  this.loadingTasks = true;
  this.tasksService.getByProject(projectId).subscribe({
    next: (tasks) => {
      if (!this.project) return;

      if (this.project.owner_id === this.userId) {
        // Creador: tareas pending, accepted o rejected
        this.tasks = tasks.filter(t =>
          ['pending', 'accepted', 'rejected'].includes(t.status)
        );
      } else {
        // Colaborador: tareas asignadas que estén pending o accepted
        this.tasks = tasks.filter(t =>
          t.assignee_id === this.userId && ['pending', 'accepted'].includes(t.status)
        );

        // Alertar si alguna tarea está cerca de la fecha límite
        const now = new Date();
        this.tasks.forEach(t => {
          if (t.due_date) {
            const due = new Date(t.due_date);
            const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 2 && !t.notified) {
              if (showAlert) {
                Swal.fire({
                  icon: 'warning',
                  title: 'Tarea próxima a vencer',
                  text: `La tarea "${t.title}" vence en ${diffDays} día(s).`,
                  timer: 2500,
                  showConfirmButton: false
                });
              }
              t.notified = true;
            }
          }
        });
      }

      this.loadingTasks = false;

      // Contar tareas sin leer para badge
      this.unreadTasks = this.tasks.filter(t => !t.read_by_user).length;

      if (showAlert && this.unreadTasks > 0 && this.project.owner_id === this.userId) {
        Swal.fire({
          icon: 'info',
          title: 'Nuevas tareas disponibles',
          text: `Tienes ${this.unreadTasks} tareas nuevas.`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    },
    error: (err) => {
      console.error('Error cargando tareas', err);
      this.loadingTasks = false;
    },
  });
}


  /** 🔹 Abrir modal de tareas */
  openTasksModal() {
  const modal = new bootstrap.Modal(document.getElementById('tasksModal'));
  modal.show();

  // Solo marcar como leídas las que corresponden al usuario
  this.tasks
    .filter(t => !t.read_by_user && (this.project?.owner_id === this.userId || t.assignee_id === this.userId))
    .forEach(t => this.tasksService.markAsRead(t.id).subscribe());

  this.unreadTasks = 0;
}


  /** 🔹 Abrir modal para crear nueva tarea */
  openCreateTaskModal() {
    const modalEl = document.getElementById('createTaskModal');
    if (modalEl) {
      this.taskModal = new bootstrap.Modal(modalEl);
      this.taskModal.show();
    }
  }

  onTaskCreated() {
    if (this.project?.id) this.loadTasks(this.project.id, true);
    if (this.taskModal) this.taskModal.hide();
  }

  /** 🔹 Aceptar o rechazar tarea */
  respondTask(taskId: number, accept: boolean) {
    this.tasksService.respondTask(taskId, accept).subscribe({
      next: (res: any) => {
        const index = this.tasks.findIndex((t) => t.id === taskId);
        if (index !== -1) {
          this.tasks[index].status = accept ? 'accepted' : 'rejected';
          this.tasks[index].read_by_user = true;
        }

        Swal.fire({
          icon: 'success',
          title: `Tarea ${accept ? 'aceptada' : 'rechazada'}`,
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo responder la tarea, intenta de nuevo.',
        });
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

  editRequirement(id: number) {
    if (!this.project) return;
    this.router.navigate([`/projects/${this.project.id}/requirements/${id}/update`]);
  }

  deleteRequirement(id: number) {
    const modalElement = document.getElementById('confirmDeleteModal') as any;
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
      this.selectedRequirementId = id;
    }
  }

  confirmDelete() {
    if (!this.selectedRequirementId) return;

    this.requirementsService.deleteRequirement(this.selectedRequirementId).subscribe({
      next: () => {
        if (this.project?.id) this.loadRequirements(this.project.id);
        this.selectedRequirementId = null;
      },
      error: (err) => {
        console.error('Error eliminando requisito:', err);
        Swal.fire('Error', 'No se pudo eliminar el requisito.', 'error');
      },
    });
  }
}

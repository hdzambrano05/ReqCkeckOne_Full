import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectsService, Project } from '../../services/projects';
import { RequirementsService } from '../../services/requirements';
import { TasksService } from '../../services/tasks';
import { AuthService } from '../../services/auth';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Chart, ChartConfiguration, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { BarController } from 'chart.js';

declare var bootstrap: any;
Chart.register(BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
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
  analysis?: Record<string, number>;
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
  userId = 0;

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

  generatePDF() {
    if (!this.project) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    let yPos = margin;

    const primaryColor: [number, number, number] = [33, 150, 243];
    const darkColor: [number, number, number] = [40, 40, 40];
    const grayColor: [number, number, number] = [120, 120, 120];
    const lightGray: [number, number, number] = [230, 230, 230];

    const lineHeight = 6;

    const addFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(...grayColor);
        doc.text(
          `Informe generado automáticamente | Página ${i} de ${pageCount}`,
          pageWidth / 2,
          290,
          { align: 'center' }
        );
      }
    };

    const checkPageBreak = (space: number) => {
      if (yPos + space > pageHeight - 25) {
        doc.addPage();
        yPos = margin;
      }
    };

    /* ======================================================
       PORTADA
    ====================================================== */

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 80, 'F');

    doc.setFontSize(30);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORME DE REQUISITOS', pageWidth / 2, 40, { align: 'center' });

    doc.setFontSize(16);
    doc.text(this.project.name, pageWidth / 2, 55, { align: 'center' });

    doc.setTextColor(...darkColor);
    doc.setFontSize(12);
    doc.text(
      `Generado el ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      100,
      { align: 'center' }
    );

    doc.addPage();
    yPos = margin;

    /* ======================================================
       INFORMACIÓN GENERAL
    ====================================================== */

    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Información General', margin, yPos);
    yPos += 10;

    doc.setDrawColor(...lightGray);
    doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkColor);

    const generalInfo = [
      `Descripción: ${this.project.description || 'No disponible'}`,
      `Estado: ${this.project.status || '—'}`,
      `Fecha límite: ${this.project.deadline || '—'}`,
      `Creador: ${this.project.owner?.username || 'No disponible'}`,
      `Colaboradores: ${this.project.collaborators?.map(c => c.username).join(', ') ||
      'Sin colaboradores'
      }`
    ];

    generalInfo.forEach(text => {
      const split = doc.splitTextToSize(text, pageWidth - margin * 2);
      checkPageBreak(split.length * lineHeight);
      doc.text(split, margin, yPos);
      yPos += split.length * lineHeight + 2;
    });

    yPos += 10;

    /* ======================================================
       REQUISITOS
    ====================================================== */

    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Requisitos del Proyecto', margin, yPos);
    yPos += 10;

    this.requirements.forEach((req, index) => {
      checkPageBreak(40);

      // Card background
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin - 5, yPos - 5, pageWidth - margin * 2 + 10, 8, 3, 3, 'F');

      doc.setFontSize(13);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${req.title}`, margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const desc = doc.splitTextToSize(req.text, pageWidth - margin * 2);
      doc.text(desc, margin, yPos);
      yPos += desc.length * lineHeight + 4;

      doc.setFontSize(10);
      doc.setTextColor(...grayColor);
      doc.text(
        `Estado: ${req.status}   |   Prioridad: ${req.priority}`,
        margin,
        yPos
      );
      yPos += 8;

      /* ====== BARRA DE CALIDAD ====== */

      let totalPercent = 0;
      try {
        const analysis =
          typeof req.analysis === 'string'
            ? JSON.parse(req.analysis)
            : req.analysis;

        totalPercent = analysis?.promedio_cumplimiento ?? 0;
      } catch { }

      const barWidth = 150;
      const barHeight = 8;

      doc.setFillColor(220, 220, 220);
      doc.rect(margin, yPos, barWidth, barHeight, 'F');

      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPos, (totalPercent / 100) * barWidth, barHeight, 'F');

      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`${totalPercent}%`, margin + barWidth - 15, yPos + 6);

      yPos += 15;
    });

    addFooter();
    doc.save(`${this.project.name}_Informe_Requisitos.pdf`);
  }
}

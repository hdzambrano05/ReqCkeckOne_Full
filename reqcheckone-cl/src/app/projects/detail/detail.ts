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
    const margin = 15;
    let yPos = margin;
    const pageHeight = 297;
    const pageWidth = 210;

    const colors = {
      title: [30, 30, 30] as [number, number, number],
      subtitle: [80, 80, 80] as [number, number, number],
      text: [50, 50, 50] as [number, number, number],
      agent: [54, 162, 235] as [number, number, number],
      percentBar: [54, 162, 235] as [number, number, number],
      separator: [200, 200, 200] as [number, number, number],
      headerBg: [230, 240, 250] as [number, number, number],
    };

    const lineHeight = 6;
    const smallLineHeight = 5;

    const checkPageBreak = (extraHeight: number) => {
      if (yPos + extraHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
    };

    // -------------------- Header --------------------
    doc.setFillColor(...colors.headerBg);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFontSize(24);
    doc.setTextColor(...colors.title);
    doc.setFont('helvetica', 'bold');
    doc.text(`Proyecto: ${this.project.name}`, margin, yPos + 7);

    yPos += 14;
    doc.setFontSize(12);
    doc.setTextColor(...colors.subtitle);
    doc.setFont('helvetica', 'normal');
    const projectDesc = this.project.description || 'No hay descripción';
    let splitDesc = doc.splitTextToSize(`Descripción: ${projectDesc}`, pageWidth - 2 * margin);
    checkPageBreak(splitDesc.length * lineHeight);
    doc.text(splitDesc, margin, yPos);
    yPos += splitDesc.length * lineHeight;

    doc.text(`Creador: ${this.project.owner?.username || 'No disponible'}`, margin, yPos);
    yPos += 5;
    const collaborators = this.project.collaborators?.map(c => `${c.username} (${c.role || 'Sin rol'})`).join(', ') || 'Sin colaboradores';
    doc.text(`Colaboradores: ${collaborators}`, margin, yPos);
    yPos += 10;

    doc.setFontSize(18);
    doc.setTextColor(...colors.title);
    doc.setFont('helvetica', 'bold');
    doc.text('Requisitos', margin, yPos);
    yPos += 8;

    // -------------------- Add Requirements --------------------
    const addRequirementToPDF = async (req: Requirement, index: number) => {
      checkPageBreak(20); // salto de página seguro antes de cada requisito
      doc.setDrawColor(...colors.separator);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      // Título
      checkPageBreak(10);
      doc.setFontSize(14);
      doc.setTextColor(...colors.title);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${req.title}`, margin, yPos);
      yPos += 7;

      // Descripción
      doc.setFontSize(11);
      doc.setTextColor(...colors.text);
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(`Descripción: ${req.text}`, pageWidth - 2 * margin);
      checkPageBreak(splitText.length * lineHeight);
      doc.text(splitText, margin, yPos);
      yPos += splitText.length * lineHeight;

      // Estado y prioridad
      checkPageBreak(6);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Estado: ${req.status} | Prioridad: ${req.priority}`, margin, yPos);
      yPos += 6;

      // Análisis
      let analysisObj: any = {};
      try {
        if (req.analysis) {
          analysisObj = typeof req.analysis === 'string' ? JSON.parse(req.analysis) : req.analysis;
        }
      } catch { analysisObj = {}; }

      const totalPercent = analysisObj["promedio_cumplimiento"] ?? 0;

      // Barra de porcentaje total
      checkPageBreak(14);
      doc.setFontSize(10);
      doc.setTextColor(...colors.subtitle);
      doc.setFont('helvetica', 'bold');
      doc.text('Porcentaje de calidad del requisito funcional', margin, yPos);
      yPos += 4;

      const totalBarWidth = 160;
      const barHeight = 8;
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, yPos, totalBarWidth, barHeight, 'F');
      doc.setFillColor(...colors.percentBar);
      doc.rect(margin, yPos, (totalPercent / 100) * totalBarWidth, barHeight, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`${totalPercent}%`, margin + totalBarWidth / 2 - 8, yPos + 6);
      doc.setFont('helvetica', 'normal');
      yPos += barHeight + 6;

      // Análisis por agente
      const agents = analysisObj['agents'];
      if (agents && Object.keys(agents).length > 0) {
        for (const [agentName, agentRawData] of Object.entries(agents)) {
          checkPageBreak(10);
          const agentData = agentRawData as { analysis?: Record<string, any>; porcentaje?: number };
          const analysis = agentData.analysis ?? {};
          const agentPercent = agentData.porcentaje ?? 0;

          doc.setFontSize(12);
          doc.setTextColor(...colors.agent);
          doc.setFont('helvetica', 'bold');
          doc.text(agentName, margin + 5, yPos);
          yPos += 5;

          if (Object.keys(analysis).length > 0) {
            for (const [key, value] of Object.entries(analysis)) {
              let lines: string[];
              if (Array.isArray(value)) {
                lines = doc.splitTextToSize(`${key}: ${value.join(', ')}`, pageWidth - 2 * margin - 10);
              } else {
                lines = doc.splitTextToSize(`${key}: ${value}`, pageWidth - 2 * margin - 10);
              }
              checkPageBreak(lines.length * smallLineHeight);
              doc.setFontSize(9);
              doc.setTextColor(...colors.text);
              doc.setFont('helvetica', 'normal');
              doc.text(lines, margin + 10, yPos);
              yPos += lines.length * smallLineHeight;
            }

            // Barra de porcentaje del agente
            checkPageBreak(8);
            const agentBarWidth = 140;
            const agentBarHeight = 6;
            doc.setFillColor(220, 220, 220);
            doc.rect(margin + 10, yPos, agentBarWidth, agentBarHeight, 'F');
            doc.setFillColor(...colors.percentBar);
            doc.rect(margin + 10, yPos, (agentPercent / 100) * agentBarWidth, agentBarHeight, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`${agentPercent}%`, margin + 10 + agentBarWidth - 14, yPos + 5);
            yPos += agentBarHeight + 6;
          } else {
            checkPageBreak(6);
            doc.setFontSize(10);
            doc.setTextColor(200, 0, 0);
            doc.text('No hay análisis disponible', margin + 10, yPos);
            yPos += 5;
          }
        }
      }
    };

    (async () => {
      for (let i = 0; i < this.requirements.length; i++) {
        await addRequirementToPDF(this.requirements[i], i);
      }
      window.open(doc.output('bloburl'));
      doc.save(`${this.project?.name}_Requisitos.pdf`);
    })();
  }

}

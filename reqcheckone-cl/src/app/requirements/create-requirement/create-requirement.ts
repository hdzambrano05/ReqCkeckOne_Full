import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { RequirementsService } from '../../services/requirements';
import { AuthService } from '../../services/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectsService, Project } from '../../services/projects';
import { AfterViewInit } from '@angular/core';
import { Tooltip } from 'bootstrap';

interface Attribute {
  name: string;
  value: number; // porcentaje de cumplimiento
}

interface RefinedRequirement {
  estado?: 'aceptado' | 'opcional' | 'rechazado' | 'sugerencias' | 'refinado_obligatorio';
  sugerencias?: string[];
  requisito_refinado_final?: string;
}

interface RequirementAnalysis {
  promedio_cumplimiento?: number;
  agents: { [agent: string]: { analysis: any } };
  refined_requirement?: RefinedRequirement;
}

@Component({
  selector: 'app-create-requirement',
  templateUrl: './create-requirement.html',
  styleUrls: ['./create-requirement.css'],
  standalone: false
})
export class CreateRequirement implements OnInit {
  form: FormGroup;
  analysis: RequirementAnalysis | null = null;
  loadingAnalysis = false;
  canSave = false;
  username = '';
  projectId!: number;
  projectName = '';

  // Modal
  modalMessage = '';
  showModal = false;
  modalType: 'success' | 'error' | 'info' = 'info';

  attributes: Attribute[] = [
    { name: 'Validez', value: 0 },
    { name: 'Claridad / No ambigüedad', value: 0 },
    { name: 'Completitud', value: 0 },
    { name: 'Consistencia', value: 0 },
    { name: 'Viabilidad', value: 0 },
    { name: 'Priorización', value: 0 },
    { name: 'Trazabilidad', value: 0 },
    { name: 'Verificabilidad', value: 0 },
    { name: 'Modificabilidad', value: 0 },
    { name: 'Necesidad / Relevancia', value: 0 },
    { name: 'Singularidad / Atomicidad', value: 0 },
    { name: 'Conformidad', value: 0 }
  ];

  attributeDescriptions: { [key: string]: string } = {
    'Validez': `
    <b>El requisito representa una necesidad real del usuario o sistema.</b><br>
    <i class="bi bi-check-circle text-success"></i> “El sistema debe registrar ventas con fecha y hora.”<br>
    <i class="bi bi-x-circle text-danger"></i> “El sistema debe cambiar los colores del fondo.”
  `,

    'Claridad / No ambigüedad': `
    <b>El requisito se entiende de una sola forma.</b><br>
    <i class="bi bi-check-circle text-success"></i> “El sistema debe responder en ≤ 3 segundos con 100 usuarios.”<br>
    <i class="bi bi-x-circle text-danger"></i> “El sistema debe ser rápido.”
  `,

    'Completitud': `
    <b>Incluye entradas, procesos y salidas.</b><br>
    <i class="bi bi-check-circle text-success"></i> “El sistema generará un reporte mensual en PDF con cliente y monto.”<br>
    <i class="bi bi-x-circle text-danger"></i> “El sistema generará un reporte.”
  `,

    'Consistencia': `
    <b>No contradice otros requisitos.</b><br>
    <i class="bi bi-check-circle text-success"></i> Req1: “Contraseña mínimo 8 caracteres.” / Req2: “Validar con 8 caracteres.”<br>
    <i class="bi bi-x-circle text-danger"></i> Req1: “Contraseña mínimo 8.” / Req2: “Contraseña mínimo 10.”
  `,

    'Viabilidad': `
    <b>Pueden implementarse con los recursos disponibles.</b><br>
    <i class="bi bi-check-circle text-success"></i> “El sistema debe soportar 200 usuarios concurrentes.”<br>
    <i class="bi bi-x-circle text-danger"></i> “El sistema debe responder en 1 ms con 10.000 usuarios.”
  `,

    'Priorización': `
    <b>Tiene un nivel de importancia definido.</b><br>
    <i class="bi bi-check-circle text-success"></i> “Alta prioridad: Cumplimiento normativo.”<br>
    <i class="bi bi-x-circle text-danger"></i> “El sistema debe integrarse con todas las redes sociales.” (sin prioridad)
  `,

    'Trazabilidad': `
    <b>Puede rastrearse desde su origen hasta su prueba.</b><br>
    <i class="bi bi-check-circle text-success"></i> “REQ-010 → Login → Auth.java → TC-025.”<br>
    <i class="bi bi-x-circle text-danger"></i> “El sistema debe permitir iniciar sesión.” (sin ID ni rastro)
  `,

    'Verificabilidad': `
    <b>Puede comprobarse con pruebas o revisión.</b><br>
    <i class="bi bi-check-circle text-success"></i> “El sistema debe bloquear cuenta tras 3 intentos fallidos.”<br>
    <i class="bi bi-x-circle text-danger"></i> “El sistema debe ser confiable.”
  `,

    'Modificabilidad': `
    <b>Puede cambiarse sin afectar otros requisitos.</b><br>
    <i class="bi bi-check-circle text-success"></i> “REQ-045: alerta de inventario bajo.”<br>
    <i class="bi bi-x-circle text-danger"></i> “El sistema debe alertar inventario y enviar correos y actualizar precios.”
  `,

    'Necesidad / Relevancia': `
    <b>Es realmente necesario y justificado.</b><br>
    <i class="bi bi-check-circle text-success"></i> “El sistema debe cumplir normativa DIAN.”<br>
    <i class="bi bi-x-circle text-danger"></i> “El sistema debe mostrar animación al abrir.”
  `,

    'Singularidad / Atomicidad': `
    <b>Expresa una sola necesidad.</b><br>
    <i class="bi bi-check-circle text-success"></i> “Registrar usuario.” / “Enviar correo.”<br>
    <i class="bi bi-x-circle text-danger"></i> “Registrar usuario y enviar correo.”
  `,

    'Conformidad': `
    <b>Cumple con normas o plantillas establecidas.</b><br>
    <i class="bi bi-check-circle text-success"></i> “REQ-123 – Descripción – Prioridad – Fuente.”<br>
    <i class="bi bi-x-circle text-danger"></i> “El sistema debe calcular impuestos.” (sin estructura)
  `
  };

  constructor(
    private fb: FormBuilder,
    private requirementsService: RequirementsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: ProjectsService
  ) {
    this.username = localStorage.getItem('username') || '';

    this.form = this.fb.group({
      project_id: [''],
      title: ['', Validators.required],
      text: ['', Validators.required],
      context: [''],
      status: ['draft'],
      priority: [{ value: 'medium', disabled: true }],
      due_date: [''],
      version: [1],
      created_by: [{ value: this.username, disabled: true }]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.projectId = +idParam;
        this.form.get('project_id')?.setValue(this.projectId);

        this.projectsService.getProjectById(this.projectId).subscribe({
          next: (project: Project) => this.projectName = project.name,
          error: err => console.error('Error cargando proyecto:', err)
        });
      }
    });
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(el => new Tooltip(el));
  }

  // Getters para evitar errores TS
  get priorityControl(): FormControl {
    return this.form.get('priority') as FormControl;
  }

  get createdByControl(): FormControl {
    return this.form.get('created_by') as FormControl;
  }

  // ------------------- MODAL -------------------
  openModal(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.modalMessage = message;
    this.modalType = type;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.modalMessage = '';
  }

  // ------------------- ANALIZAR REQUISITO -------------------
  analyzeRequirement(): void {
    const text = this.form.value.text;
    const context = this.form.value.context;

    if (!text) return;

    this.loadingAnalysis = true;
    this.analysis = null;
    this.canSave = false;

    const payload = { id: 'REQ-TEMP', text, context };

    this.requirementsService.analyzeRequirement(payload).subscribe({
      next: res => {
        this.analysis = res.data;
        this.updateAttributes();

        // Actualiza la prioridad según Product Owner
        const poAnalysis = this.analysis?.agents?.['Product Owner']?.analysis;
        const prioridad = poAnalysis?.priorizacion || 'medium';
        this.priorityControl.setValue(prioridad);

        // Determina si se puede guardar según promedio
        const promedio = this.analysis?.promedio_cumplimiento ?? 0;
        this.canSave = promedio >= 60;

        if (promedio < 30) {
          this.canSave = false;
          this.openModal('El requisito no cumple el mínimo de calidad (menor a 30%), no se puede guardar.', 'error');
        }

        this.loadingAnalysis = false;
      },
      error: err => {
        console.error('Error analizando requisito:', err);
        this.loadingAnalysis = false;
        this.openModal('Error analizando requisito. Revisa la consola.', 'error');
      }
    });
  }

  // ------------------- ACTUALIZAR ATRIBUTOS -------------------
  private updateAttributes(): void {
    if (!this.analysis?.agents) return;
    const agents = this.analysis.agents;

    this.attributes.forEach(attr => {
      let total = 0;
      let count = 0;

      Object.values(agents).forEach(agent => {
        const analysis = agent?.analysis;
        if (!analysis) return;

        switch (attr.name) {
          case 'Validez':
            if ('validez' in analysis) {
              total += analysis.validez ? (analysis.porcentaje ?? 100) : 0;
              count++;
            }
            break;
          case 'Claridad / No ambigüedad':
            if ('claridad' in analysis) {
              total += analysis.porcentaje ?? (analysis.claridad === 'claro' ? 100 : 0);
              count++;
            }
            break;
          case 'Completitud':
            if ('completitud' in analysis) {
              total += analysis.porcentaje ?? (analysis.completitud === 'completo' ? 100 : 0);
              count++;
            }
            break;
          case 'Consistencia':
            if ('consistencia' in analysis) {
              total += analysis.porcentaje ?? (analysis.consistencia === 'consistente' ? 100 : 0);
              count++;
            }
            break;
          case 'Viabilidad':
            if ('viabilidad' in analysis) {
              total += analysis.porcentaje ?? 100;
              count++;
            }
            break;
          case 'Priorización':
            if ('priorizacion' in analysis) {
              total += analysis.porcentaje ?? (analysis.priorizacion === 'alta' ? 100 : analysis.priorizacion === 'media' ? 60 : 30);
              count++;
            }
            break;
          case 'Trazabilidad':
            if ('trazabilidad' in analysis) {
              total += analysis.porcentaje ?? (analysis.trazabilidad === 'trazable' ? 100 : 0);
              count++;
            }
            break;
          case 'Verificabilidad':
            if ('verificabilidad' in analysis) {
              total += analysis.porcentaje ?? (analysis.verificabilidad ? 100 : 0);
              count++;
            }
            break;
          case 'Modificabilidad':
            if ('modificabilidad' in analysis) {
              total += analysis.porcentaje ?? (analysis.modificabilidad === 'alta' ? 100 : analysis.modificabilidad === 'media' ? 60 : 30);
              count++;
            }
            break;
          case 'Necesidad / Relevancia':
            if ('necesidad' in analysis) {
              total += analysis.porcentaje ?? (analysis.necesidad ? 100 : 0);
              count++;
            }
            break;
          case 'Singularidad / Atomicidad':
            if ('atomicidad' in analysis) {
              total += analysis.porcentaje ?? (analysis.atomicidad === 'atómico' ? 100 : 0);
              count++;
            }
            break;
          case 'Conformidad':
            if ('conformidad' in analysis) {
              total += analysis.porcentaje ?? (analysis.conformidad === 'conforme' ? 100 : 0);
              count++;
            }
            break;
        }
      });

      attr.value = count ? Math.round(total / count) : 0;
    });
  }

  // ------------------- GUARDAR REQUISITO -------------------
  saveRequirement(): void {
    if (!this.analysis) return;

    const userId = localStorage.getItem('id'); // o tu método real
    if (!userId) {
      this.openModal('No se pudo identificar al usuario. Inicia sesión nuevamente.', 'error');
      return;
    }

    if (!this.projectId) {
      this.openModal('No se ha cargado un proyecto válido.', 'error');
      return;
    }

    const raw = this.form.getRawValue();

    const payload = {
      project_id: this.projectId,
      title: raw.title,
      text: raw.text,
      context: raw.context || null,
      status: raw.status,
      priority: this.priorityControl.value || 'medium',
      due_date: raw.due_date || null,
      version: raw.version || 1,
      created_by: +userId,
      analysis: {
        promedio_cumplimiento: this.analysis?.promedio_cumplimiento ?? 0,
        refined_requirement: this.analysis?.refined_requirement ?? null,
        agents: this.analysis?.agents ?? {}
      }
    };

    this.requirementsService.addRequirement(payload).subscribe({
      next: res => {
        this.openModal('Requisito guardado exitosamente', 'success');

        this.form.reset({
          project_id: this.projectId,
          priority: 'medium',
          created_by: this.username,
          version: 1
        });

        this.analysis = null;
        this.canSave = false;
        this.attributes.forEach(a => (a.value = 0));
      },
      error: err => {
        console.error('Error guardando requisito:', err);
        this.openModal('Ocurrió un error al guardar el requisito. Revisa la consola.', 'error');
      }
    });
  }

  getTotalProgress(): number {
    return Math.round(this.analysis?.promedio_cumplimiento ?? 0);
  }

  goBack() {
    this.router.navigate(['/projects', this.projectId]);
  }


}

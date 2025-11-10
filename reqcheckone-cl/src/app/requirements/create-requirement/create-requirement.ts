import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { RequirementsService } from '../../services/requirements';
import { AuthService } from '../../services/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectsService, Project } from '../../services/projects';
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
  agents: { [agent: string]: { analysis: any; porcentaje?: number } };
  refined_requirement?: RefinedRequirement;
}

@Component({
  selector: 'app-create-requirement',
  templateUrl: './create-requirement.html',
  styleUrls: ['./create-requirement.css'],
  standalone: false
})
export class CreateRequirement implements OnInit, AfterViewInit {
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

  // Lista de atributos visibles en UI
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

  // Mapa backendKey -> UI name
  private attrMap: Record<string, string> = {
    validez: 'Validez',
    claridad: 'Claridad / No ambigüedad',
    completitud: 'Completitud',
    consistencia: 'Consistencia',
    viabilidad: 'Viabilidad',
    priorizacion: 'Priorización',
    trazabilidad: 'Trazabilidad',
    verificabilidad: 'Verificabilidad',
    modificabilidad: 'Modificabilidad',
    necesidad: 'Necesidad / Relevancia',
    atomicidad: 'Singularidad / Atomicidad',
    conformidad: 'Conformidad'
  };

  // Sugerencias por atributo (UI name -> array de sugerencias)
  attributeSuggestions: { [uiName: string]: string[] } = {};

  attributeDescriptions: { [key: string]: string } = {
    'Validez': 'El requisito representa una necesidad real del usuario o sistema.',
    'Claridad / No ambigüedad': 'El requisito se entiende de una sola forma.',
    'Completitud': 'Incluye entradas, procesos y salidas.',
    'Consistencia': 'No contradice otros requisitos.',
    'Viabilidad': 'Puede implementarse con los recursos disponibles.',
    'Priorización': 'Tiene un nivel de importancia definido.',
    'Trazabilidad': 'Puede rastrearse desde su origen hasta su prueba.',
    'Verificabilidad': 'Puede comprobarse con pruebas o revisión.',
    'Modificabilidad': 'Puede cambiarse sin afectar otros requisitos.',
    'Necesidad / Relevancia': 'Es realmente necesario y justificado.',
    'Singularidad / Atomicidad': 'Expresa una sola necesidad.',
    'Conformidad': 'Cumple con normas o plantillas establecidas.'
  };

  constructor(
    private fb: FormBuilder,
    private requirementsService: RequirementsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: ProjectsService,
    private cd: ChangeDetectorRef
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
          next: (project: Project) => (this.projectName = project.name),
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
    this.attributeSuggestions = {}; // limpiar sugerencias previas

    const payload = { id: 'REQ-TEMP', text, context };

    this.requirementsService.analyzeRequirement(payload).subscribe({
      next: (res) => {
        const data = res.data;
        console.log('Respuesta backend (raw):', data);

        // Construir estructura de analysis compatible con el componente
        this.analysis = {
          promedio_cumplimiento: data.promedio_cumplimiento,
          agents: {},
          refined_requirement: {
            estado: 'sugerencias',
            sugerencias: data.sugerencias_combinadas || [],
            requisito_refinado_final: data.requisito_refinado_final || ''
          }
        };

        // Transformar analisis_detallado -> agents
        if (data.analisis_detallado) {
          for (const [agentName, agentData] of Object.entries<any>(data.analisis_detallado)) {
            const atributos = (agentData as any).atributos || {};
            const analysisPlain: Record<string, any> = {};
            // Extraer sugerencias por atributo para mostrarlas luego
            for (const [backendKey, detalle] of Object.entries<any>(atributos)) {
              // detalle puede ser { valor: ..., sugerencia: ... } u otras formas
              analysisPlain[backendKey] = detalle?.valor !== undefined ? detalle.valor : detalle;
              // recolectar sugerencia textual si existe
              if (detalle?.sugerencia) {
                const uiName = this.attrMap[backendKey] ?? backendKey;
                if (!this.attributeSuggestions[uiName]) this.attributeSuggestions[uiName] = [];
                this.attributeSuggestions[uiName].push(`${agentName}: ${detalle.sugerencia}`);
              }
            }

            this.analysis.agents[agentName] = {
              analysis: analysisPlain,
              porcentaje: (agentData as any).porcentaje
            };
          }
        }

        // Actualizar atributos y UI
        this.updateAttributes();
        this.cd.detectChanges(); // asegurar render

        // Prioridad según Product Owner (si existe)
        const poAnalysis = this.analysis.agents?.['Product Owner']?.analysis;
        const prioridad = poAnalysis?.priorizacion === 'alta'
          ? 'high'
          : poAnalysis?.priorizacion === 'media'
            ? 'medium'
            : 'low';
        this.priorityControl.setValue(prioridad);

        // Control de guardado por promedio
        const promedio = this.analysis.promedio_cumplimiento ?? 0;
        this.canSave = promedio >= 60;

        if (promedio < 30) {
          this.canSave = false;
          this.openModal('El requisito no cumple el mínimo de calidad (menor a 30%), no se puede guardar.', 'error');
        }

        this.loadingAnalysis = false;
      },
      error: (err) => {
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

    // reiniciar valores y sugerencias si fuera necesario
    this.attributes.forEach(a => a.value = 0);

    this.attributes.forEach(attr => {
      let total = 0;
      let count = 0;

      // encontrar la clave backend que corresponde al nombre UI
      const backendKey = Object.keys(this.attrMap).find(k => this.attrMap[k] === attr.name);
      if (!backendKey) {
        attr.value = 0;
        return;
      }

      Object.values(agents).forEach((agent: any) => {
        const analysis = agent?.analysis;
        if (!analysis) return;

        const valor = analysis[backendKey];
        if (valor === undefined || valor === null) return;

        let porcentaje = 0;
        switch (typeof valor) {
          case 'boolean':
            porcentaje = valor ? 100 : 0;
            break;
          case 'number':
            porcentaje = Math.max(0, Math.min(100, valor)); // si backend ya devuelve número
            break;
          case 'string':
            // Normalizar valores textuales a porcentajes
            const v = valor.toLowerCase();
            if (v === 'alta' || v === 'correcta' || v === 'completo' || v === 'claro' || v === 'atómico' || v === 'atomico') porcentaje = 100;
            else if (v === 'media' || v === 'parcial' || v === 'media') porcentaje = 60;
            else if (v === 'baja' || v === 'ambigua' || v === 'ambiguous') porcentaje = 30;
            else porcentaje = 0;
            break;
          default:
            porcentaje = 0;
        }

        total += porcentaje;
        count++;
      });

      attr.value = count ? Math.round(total / count) : 0;
    });

    console.log('Atributos calculados:', this.attributes);
  }

  // ------------------- GUARDAR REQUISITO -------------------
  saveRequirement(): void {
    if (!this.analysis) return;

    const userId = localStorage.getItem('id');
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
      next: () => {
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
        this.attributeSuggestions = {};
      },
      error: err => {
        console.error('Error guardando requisito:', err);
        this.openModal('Ocurrió un error al guardar el requisito.', 'error');
      }
    });
  }

  getTotalProgress(): number {
    return Math.round(this.analysis?.promedio_cumplimiento ?? 0);
  }

  goBack() {
    this.router.navigate(['/projects', this.projectId]);
  }

  // Copiar requisito refinado al campo de texto
  copyRefinedToText(): void {
    const refined = this.analysis?.refined_requirement?.requisito_refinado_final;
    if (refined) {
      this.form.patchValue({ text: refined });
      this.openModal('El requisito refinado ha sido copiado al campo de descripción.', 'info');
    } else {
      this.openModal('No hay requisito refinado disponible.', 'error');
    }
  }

}

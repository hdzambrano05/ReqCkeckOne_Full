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
  requisito_refinado?: string;
}

interface RequirementAnalysis {
  promedio_cumplimiento?: number;
  agents: { [agent: string]: { analysis: any; porcentaje?: number } };
  opciones_requisito?: RefinedRequirement;
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
  description = '';

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
      descripcion_proyecto: [''],
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
          next: (project: Project) => (this.projectName = project.name, this.description = project.description),
          error: err => console.error('Error cargando proyecto:', err)
        });
      }
    });
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(el => new Tooltip(el));
  }

  get priorityControl(): FormControl {
    return this.form.get('priority') as FormControl;
  }

  get createdByControl(): FormControl {
    return this.form.get('created_by') as FormControl;
  }

  openModal(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.modalMessage = message;
    this.modalType = type;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.modalMessage = '';
  }

  analyzeRequirement(): void {
    const text = this.form.value.text;
    const descripcion_proyecto = this.form.value.descripcion_proyecto;

    if (!text) return;

    this.loadingAnalysis = true;
    this.analysis = null;
    this.canSave = false;
    this.attributeSuggestions = {};

    const payload = { id: 'REQ-TEMP', text, descripcion_proyecto };

    this.requirementsService.analyzeRequirement(payload).subscribe({
      next: (res) => {
        const data = res.data;
        console.log('Respuesta backend (raw):', data);

        // Construir estructura de analysis
        this.analysis = {
          promedio_cumplimiento: data.promedio_cumplimiento,
          agents: {},
          opciones_requisito: {
            requisito_refinado: data.opciones_requisito?.requisito_refinado || ''
          }
        };

        // Procesar sugerencias
        if (data.sugerencias_combinadas) {
          this.updateAttributesFromSuggestions(data.sugerencias_combinadas);
        }

        // Procesar analisis_detallado
        if (data.analisis_detallado) {
          for (const [agentName, agentData] of Object.entries<any>(data.analisis_detallado)) {
            const atributos = (agentData as any).atributos || {};
            const analysisPlain: Record<string, any> = {};
            for (const [backendKey, detalle] of Object.entries<any>(atributos)) {
              analysisPlain[backendKey] = detalle?.valor !== undefined ? detalle.valor : detalle;
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

        this.cd.detectChanges();

        // Prioridad según Product Owner
        const poAnalysis = this.analysis.agents?.['Product Owner']?.analysis;
        const prioridad = poAnalysis?.priorizacion === 'alta'
          ? 'high'
          : poAnalysis?.priorizacion === 'media'
            ? 'medium'
            : 'low';
        this.priorityControl.setValue(prioridad);

        // Control de guardado
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

  private updateAttributesFromSuggestions(suggestions: string[]) {
    this.attributes.forEach(a => a.value = 0);
    this.attributeSuggestions = {};

    const tempSuggestions: { [uiName: string]: Set<string> } = {};

    suggestions.forEach(s => {
      // Regex para extraer: agente, clave backend, porcentaje y texto
      const match = s.match(/- \((.+) - (\w+) - ([0-9.]+)%\): Sugerencia: (.+)/);
      if (match) {
        const backendKey = match[2].toLowerCase();
        const porcentaje = parseFloat(match[3]);

        const uiName = this.attrMap[backendKey];
        if (!uiName) return;

        // Actualizar valor máximo del atributo
        const attr = this.attributes.find(a => a.name === uiName);
        if (attr) attr.value = Math.max(attr.value, porcentaje);

        // Inicializar Set temporal si no existe
        if (!tempSuggestions[uiName]) tempSuggestions[uiName] = new Set();

      }
    });
  }


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
      descripcion_proyecto: raw.descripcion_proyecto || null,
      status: raw.status,
      priority: this.priorityControl.value || 'medium',
      due_date: raw.due_date || null,
      version: raw.version || 1,
      created_by: +userId,
      analysis: {
        promedio_cumplimiento: this.analysis?.promedio_cumplimiento ?? 0,
        opciones_requisito: this.analysis?.opciones_requisito ?? null,
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

        setTimeout(() => {
          const currentUrl = this.router.url;

          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate([currentUrl]);
          });
        }, 800);
      },
      error: err => {
        console.error('Error guardando requisito:', err);
        this.openModal('Ocurrió un error al guardar el requisito.', 'error');
      }

    });
  }

  getTotalProgress(): number {
    if (!this.attributes.length) return 0;
    // Promedio exacto basado en atributos visibles
    const total = this.attributes.reduce((sum, a) => sum + a.value, 0);
    return Math.round(total / this.attributes.length);
  }

  goBack() {
    this.router.navigate(['/projects', this.projectId]);
  }

  copyRefinedToText(): void {
    const refined = this.analysis?.opciones_requisito?.requisito_refinado;
    if (refined) {
      this.form.patchValue({ text: refined });
      this.openModal('El requisito refinado ha sido copiado al campo de descripción.', 'info');
    } else {
      this.openModal('No hay requisito refinado disponible.', 'error');
    }
  }
}

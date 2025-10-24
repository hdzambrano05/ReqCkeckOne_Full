import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RequirementsService } from '../../services/requirements';
import { ProjectsService } from '../../services/projects';
import { AuthService } from '../../services/auth';

interface Attribute {
  name: string;
  value: number;
  description: string;
}

type ModalType = 'success' | 'error' | 'info' | 'loading';

@Component({
  selector: 'app-update-requirement',
  standalone: false,
  templateUrl: './update-requirement.html',
  styleUrls: ['./update-requirement.css']
})
export class UpdateRequirement implements OnInit {
  form!: FormGroup;
  loading = false;
  loadingAnalysis = false;
  canAnalyze = false;
  projectName = '';
  projectId!: number;
  requirementId!: number;
  analysis: any = null;
  agents: any[] = [];
  canSave = false;

  // Modal centralizado
  modalState = {
    show: false,
    message: '',
    type: 'info' as ModalType,
    callback: null as (() => void) | null
  };

  attributes: Attribute[] = [
    { name: 'Validez', value: 0, description: 'Evalúa si el requisito es válido según el dominio del proyecto.' },
    { name: 'Claridad / No ambigüedad', value: 0, description: 'Mide si el requisito es claro y sin ambigüedades.' },
    { name: 'Completitud', value: 0, description: 'Determina si el requisito está completo y no faltan detalles esenciales.' },
    { name: 'Consistencia', value: 0, description: 'Evalúa si no hay contradicciones con otros requisitos.' },
    { name: 'Viabilidad', value: 0, description: 'Analiza si el requisito puede implementarse técnica y económicamente.' },
    { name: 'Priorización', value: 0, description: 'Mide si el requisito tiene una prioridad adecuada.' },
    { name: 'Trazabilidad', value: 0, description: 'Evalúa si el requisito puede rastrearse a sus orígenes.' },
    { name: 'Verificabilidad', value: 0, description: 'Determina si el requisito puede probarse o verificarse.' },
    { name: 'Modificabilidad', value: 0, description: 'Mide si el requisito puede cambiarse sin afectar otros.' },
    { name: 'Necesidad / Relevancia', value: 0, description: 'Evalúa si el requisito es realmente necesario para el sistema.' },
    { name: 'Singularidad / Atomicidad', value: 0, description: 'Verifica si el requisito no se solapa con otros y es indivisible.' },
    { name: 'Conformidad', value: 0, description: 'Mide si cumple con estándares y normas aplicables.' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private requirementsService: RequirementsService,
    private projectsService: ProjectsService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.requirementId = Number(this.route.snapshot.paramMap.get('id'));
    this.initForm();
    this.loadRequirement();
  }

  initForm(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      text: ['', Validators.required],
      context: [''],
      status: ['draft', Validators.required],
      priority: [{ value: 'medium', disabled: true }],
      due_date: [''],
      version: [1]
    });
  }

  loadRequirement(): void {
    this.loading = true;
    this.requirementsService.getById(this.requirementId).subscribe({
      next: (req: any) => {
        this.loading = false;
        if (req.project_id) {
          this.projectsService.getProjectById(req.project_id).subscribe({
            next: (project) => {
              this.projectName = project.name;
              this.projectId = project.id;
            },
            error: () => this.openModal('Error cargando proyecto', 'error')
          });
        }
        this.form.patchValue(req);
        if (req.analysis) {
          try {
            this.analysis = typeof req.analysis === 'string' ? JSON.parse(req.analysis) : req.analysis;
            this.processAnalysis();
            this.calculateAttributes();
            this.updateSavePermission();
          } catch (e) {
            console.error('Error parseando analysis:', e);
          }
        }
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.openModal('Error cargando requisito', 'error');
      }
    });
  }

  enableAnalyze(): void {
    this.canAnalyze = true;
  }

  analyzeRequirement(): void {
    const text = this.form.value.text;
    const context = this.form.value.context;
    if (!text) return;

    this.loadingAnalysis = true;
    this.analysis = null;
    this.canSave = false;

    const payload = { id: 'REQ-TEMP', text, context };

    this.openModal('Por favor, espere mientras se analiza el requisito...', 'loading');

    this.requirementsService.analyzeRequirement(payload).subscribe({
      next: (res: any) => {
        this.analysis = res.data;
        this.processAnalysis();
        this.calculateAttributes();

        const poAnalysis = this.analysis?.agents?.['Product Owner']?.analysis;
        const prioridad = poAnalysis?.priorizacion || 'medium';
        this.form.get('priority')?.setValue(prioridad);

        this.updateSavePermission();

        const promedio = this.analysis.promedio_cumplimiento ?? 0;
        if (promedio < 30) {
          this.canSave = false;
          this.openModal('El promedio de cumplimiento es menor a 30. No se puede guardar.', 'error');
        } else if (promedio < 60) {
          this.openModal('El requisito es aceptable pero tiene sugerencias de mejora.', 'info');
        } else {
          this.closeModal();
        }

        this.loadingAnalysis = false;
        this.canAnalyze = false;
      },
      error: (err) => {
        console.error(err);
        this.loadingAnalysis = false;
        this.openModal('Error analizando requisito. Revisa la consola.', 'error');
      }
    });
  }

  processAnalysis(): void {
    this.agents = [];
    if (!this.analysis?.agents) return;
    Object.entries(this.analysis.agents).forEach(([role, data]: any) => {
      const atributos: { key: string; value: number }[] = [];
      Object.entries(data.analysis || {}).forEach(([key, value]: any) => {
        if (key !== 'casos_prueba') {
          atributos.push({ key, value: value === true ? data.porcentaje : data.porcentaje || 0 });
        }
      });
      this.agents.push({
        role,
        porcentaje: data.porcentaje || 0,
        atributos,
        casos_prueba: data.analysis?.casos_prueba || []
      });
    });
  }

  calculateAttributes(): void {
    this.attributes.forEach(attr => {
      let total = 0;
      let count = 0;
      this.agents.forEach(agent => {
        agent.atributos.forEach((a: any) => {
          if (this.mapKey(a.key) === attr.name) {
            total += a.value;
            count++;
          }
        });
      });
      attr.value = count ? Math.round(total / count) : 0;
    });
  }

  mapKey(key: string): string {
    const mapping: { [key: string]: string } = {
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
    return mapping[key.toLowerCase()] || key;
  }

  updateSavePermission(): void {
    const promedio = this.analysis?.promedio_cumplimiento ?? 0;
    this.canSave = promedio >= 60;
  }

  updateRequirement(): void {
    if (this.form.invalid || !this.canSave) {
      this.openModal('No se puede guardar. Verifica los porcentajes de cumplimiento.', 'error');
      return;
    }

    const currentUserId = this.authService.getUserId();
    const payload: any = { ...this.form.value };

    if (currentUserId) {
      payload.changed_by = currentUserId;
    }

    // Incluir el análisis en el payload
    if (this.analysis) {
      payload.analysis = this.analysis;
    }

    this.loading = true;
    this.openModal('Actualizando requisito, por favor espere...', 'loading');

    this.requirementsService.updateRequirement(this.requirementId, payload).subscribe({
      next: () => {
        this.loading = false;
        this.openModal(
          'Requisito actualizado correctamente',
          'success',
          () => this.router.navigate([`/projects/${this.projectId}`])
        );
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.openModal('Error al actualizar el requisito', 'error');
      }
    });
  }


  goBack(): void {
    if (this.projectId) {
      this.router.navigate([`/projects/${this.projectId}`]);
    } else {
      this.router.navigate(['/requirements']);
    }
  }

  /** Modal control */
  openModal(message: string, type: ModalType = 'info', callback: (() => void) | null = null) {
    this.modalState = { show: true, message, type, callback };
  }

  closeModal() {
    this.modalState.show = false;
    if (this.modalState.callback) {
      this.modalState.callback();
      this.modalState.callback = null;
    }
  }
}

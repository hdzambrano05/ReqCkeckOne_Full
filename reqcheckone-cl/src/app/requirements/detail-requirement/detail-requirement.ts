import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RequirementsService } from '../../services/requirements';

interface AgentAnalysis {
  role: string;
  analysis: Record<string, any>;
  porcentaje: number;
}

interface AnalysisData {
  promedio_cumplimiento: number;
  refined_requirement: {
    estado: string;
    mensaje: string;
  };
  agents: Record<string, AgentAnalysis>;
}

interface Requirement {
  id: number;
  project_id: number;
  title: string;
  text: string;
  context?: string;
  status: string;
  priority: string;
  version: number;
  analysis?: string | AnalysisData; // Puede venir como JSON string
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-detail-requirement',
  standalone: false,
  templateUrl: './detail-requirement.html',
  styleUrls: ['./detail-requirement.css'],
})
export class DetailRequirement implements OnInit {
  requirement: Requirement | null = null;
  analysis: AnalysisData | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private requirementsService: RequirementsService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadRequirement(id);
    }
  }

  loadRequirement(id: number) {
    this.requirementsService.getById(id).subscribe({
      next: (req) => {
        this.requirement = req;
        this.loading = false;

        // 🔍 Si el análisis viene como string, lo parseamos
        if (req.analysis) {
          try {
            this.analysis =
              typeof req.analysis === 'string'
                ? JSON.parse(req.analysis)
                : req.analysis;
          } catch (error) {
            console.error('Error parseando análisis:', error);
            this.analysis = null;
          }
        }
      },
      error: (err) => {
        console.error('Error cargando requisito:', err);
        this.loading = false;
      },
    });
  }

  goBack() {
    if (this.requirement) {
      this.router.navigate([`/projects/${this.requirement.project_id}`]);
    } else {
      this.router.navigate(['/projects']);
    }
  }
}

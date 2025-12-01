import { Component, OnInit } from '@angular/core';
import Chart from 'chart.js/auto';
import { ProjectsService } from '../../services/projects';
import { RequirementsService } from '../../services/requirements';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {

  requirementsChart: any;

  constructor(
    private projectService: ProjectsService,
    private reqService: RequirementsService
  ) { }

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.projectService.getUserProjects().subscribe(projects => {

      const total = projects.length;
      const active = projects.filter(p => p.status === 'active').length;
      const completed = projects.filter(p => p.status === 'completed').length;

      document.getElementById("kpiTotalProjects")!.innerHTML = total.toString();
      document.getElementById("kpiActiveProjects")!.innerHTML = active.toString();
      document.getElementById("kpiCompletedProjects")!.innerHTML = completed.toString();

      // Cargar gráfico
      this.countRequirementsPerProject(projects);
    });
  }

  // ====================================
  // 🔥 Nuevo método con forkJoin
  // ====================================
  countRequirementsPerProject(projects: any[]) {
    const requests = projects.map(p => this.reqService.getByProject(p.id));

    forkJoin(requests).subscribe(responses => {
      const labels = projects.map(p => p.name);
      const counts = responses.map(reqs => reqs ? reqs.length : 0);

      this.chartRequirementsPerProject(labels, counts);
    });
  }

  // ====================================
  // 🎨 Gráfico final y estable
  // ====================================
  chartRequirementsPerProject(labels: string[], data: number[]) {

    if (this.requirementsChart) {
      this.requirementsChart.destroy();
    }

    this.requirementsChart = new Chart("requirementsPerProjectChart", {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Requisitos",
          data,
          backgroundColor: [
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 99, 132, 0.7)",
            "rgba(255, 205, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
            "rgba(153, 102, 255, 0.7)",
            "rgba(255, 159, 64, 0.7)",
            "rgba(99, 255, 132, 0.7)"
          ],
          borderRadius: 12
        }]
      },
      options: {
        responsive: true,
        indexAxis: "y",
        scales: {
          x: { beginAtZero: true }
        }
      }
    });
  }

}

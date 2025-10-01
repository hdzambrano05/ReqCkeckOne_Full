import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsService, Project } from '../../services/projects';

@Component({
  selector: 'app-list',
  standalone: false,
  templateUrl: './list.html',
  styleUrls: ['./list.css']
})
export class List implements OnInit {
  projects: Project[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private projectsService: ProjectsService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectsService.getUserProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los proyectos.';
        this.loading = false;
      }
    });
  }

  createProject() {
    this.router.navigate(['/projects/create']);
  }

  viewProject(id: number) {
    this.router.navigate([`/projects/${id}`]);
  }
}

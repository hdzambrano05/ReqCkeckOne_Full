import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsService } from '../../services/projects';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

declare var bootstrap: any;

@Component({
  selector: 'app-create-project',
  standalone: false,
  templateUrl: './create.html',
  styleUrls: ['./create.css']
})
export class Create implements OnInit {
  projectForm: FormGroup;
  error: string | null = null;
  users: any[] = [];
  selectedCollaborators: any[] = [];
  searchTerm: string = '';

  constructor(
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private http: HttpClient,
    private router: Router
  ) {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      deadline: [''],
      status: ['active'],
      collaborators: [[]]
    });
  }

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/users`, {
      headers: this.projectsService['getHeaders']()
    }).subscribe({
      next: (data) => this.users = data,
      error: (err) => console.error('Error cargando usuarios', err)
    });
  }

  /** Modal de colaboradores */
  openCollaboratorsModal() {
    const modal = new bootstrap.Modal(document.getElementById('collaboratorsModal'));
    modal.show();
  }

  filteredUsers() {
    return this.users.filter(u =>
      u.username.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  toggleCollaborator(user: any) {
    if (this.isSelected(user)) {
      this.selectedCollaborators = this.selectedCollaborators.filter(u => u.id !== user.id);
    } else {
      this.selectedCollaborators.push(user);
    }
    this.projectForm.patchValue({
      collaborators: this.selectedCollaborators.map(u => u.id)
    });
  }

  isSelected(user: any) {
    return this.selectedCollaborators.some(u => u.id === user.id);
  }

  removeCollaborator(user: any) {
    this.selectedCollaborators = this.selectedCollaborators.filter(u => u.id !== user.id);
    this.projectForm.patchValue({
      collaborators: this.selectedCollaborators.map(u => u.id)
    });
  }

  /** Crear proyecto */
  createProject() {
    if (this.projectForm.invalid) return;

    const payload = {
      ...this.projectForm.value,
      owner_id: Number(localStorage.getItem('id')),
      collaborators: this.projectForm.value.collaborators
    };

    this.projectsService.createProject(payload).subscribe({
      next: () => this.goBack(),
      error: () => this.error = 'No se pudo crear el proyecto'
    });
  }

  goBack() {
    this.router.navigate(['/projects']); // 👈 redirige a la lista de proyectos
  }
}


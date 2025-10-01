import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Project {
  id: number;
  name: string;
  description: string;
  status?: string;
  deadline?: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private base = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) { }

  getUserProjects(): Observable<Project[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<Project[]>(`${this.base}/my`, { headers });
  }

  addProject(data: { name: string; description: string; status?: string; deadline?: string }) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<Project>(`${this.base}`, data, { headers });
  }
}

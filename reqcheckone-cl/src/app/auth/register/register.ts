import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

function passwordMatchValidator(control: AbstractControl) {
  const pass = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pass === confirm ? null : { passwordMismatch: true };
}

@Component({
  standalone: false,
  selector: 'app-register',
  templateUrl: './register.html'
})
export class Register implements OnInit {
  form!: FormGroup;
  error = '';
  success = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            // al menos 1 mayúscula, 1 minúscula, 1 número y 1 símbolo
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
          ]
        ],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: passwordMatchValidator }
    );
  }

  // ✅ Getters para acceder en el HTML sin errores TS4111
  get username() { return this.form.get('username'); }
  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }
  get confirmPassword() { return this.form.get('confirmPassword'); }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;

    const { username, email, password } = this.form.value;

    this.auth.register({ username, email, password }).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Registro exitoso. Redirigiendo a login...';
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Error al registrar';
      }
    });
  }
}

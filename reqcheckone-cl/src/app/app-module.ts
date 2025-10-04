import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

/* Components */
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Home } from './dashboard/home/home';

/* Core */
import { AuthInterceptor } from './core/auth-interceptor';
import { AuthGuard } from './core/auth-guard';
import { Sidebar } from './shared/sidebar/sidebar';
import { List } from './projects/list/list';
import { Create } from './projects/create/create';
import { Detail } from './projects/detail/detail';
import { CreateRequirement } from './requirements/create-requirement/create-requirement';



@NgModule({
  declarations: [
    App,
    Login,
    Register,
    List,
    Home,
    Sidebar,
    Create,
    Detail,
    Create,
    CreateRequirement,
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule
  ],
  providers: [
    AuthGuard,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [App]
})
export class AppModule { }

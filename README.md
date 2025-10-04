# ReqCkeckOne_Full

Descripción breve
-----------------

ReqCkeckOne_Full es una aplicación fullstack para gestionar requisitos, proyectos y tareas. Está compuesta por:

- Un backend REST API construido con Node.js y Express (carpeta `reqcheckone_ws`).
- Un frontend web construido con Angular (carpeta `reqcheckone-cl`).

El backend maneja autenticación, gestión de usuarios, proyectos, requisitos, historial de requisitos, tareas y comentarios. El frontend consume la API y ofrece una interfaz para gestionar todo desde el navegador.

Características principales
-------------------------

- Autenticación (registro / login).
- CRUD de proyectos.
- CRUD de requisitos y su historial.
- Gestión de tareas y comentarios.
- Relación usuarios-proyectos (roles/participación).

Stack tecnológico
------------------

- Backend: Node.js, Express, Sequelize (migraciones, modelos y seeders presentes).
- Base de datos: PostgreSQL / MySQL (según `config/config.json`).
- Frontend: Angular (TypeScript, Angular CLI).
- Herramientas: npm, sequelize-cli, Angular CLI.

Estructura del repositorio
--------------------------

- `reqcheckone_ws/` — Backend (Express)
  - `app.js`, `bin/www` — punto de entrada y arranque.
  - `models/`, `migrations/`, `seeders/` — Sequelize.
  - `routes/`, `controllers/`, `middleware/` — lógica de la API.
- `reqcheckone-cl/` — Frontend (Angular)
  - `src/app/` — componentes, servicios y rutas.

Requisitos previos
------------------

- Node.js (>= 14)
- npm (>= 6)
- PostgreSQL o MySQL (según tu configuración en `reqcheckone_ws/config/config.json`)
- Angular CLI (solo si vas a desarrollar/servir el frontend localmente): `npm i -g @angular/cli`

Configuración rápida (ejemplo PowerShell)
----------------------------------------

1) Clona el repositorio y ve a las carpetas correspondientes:

2) Backend — instalar dependencias:

```powershell
cd .\reqcheckone_ws
npm install
```

3) Frontend — instalar dependencias:

```powershell
cd ..\reqcheckone-cl
npm install
```

Variables de entorno sugeridas
----------------------------

El proyecto usa un archivo de configuración para bases de datos (`reqcheckone_ws/config/config.json`). Es recomendable definir variables de entorno para credenciales y secretos. Crea un archivo `.env` en `reqcheckone_ws/` con al menos estas variables (ejemplo):

```
PORT=3000
DB_USERNAME=tu_usuario_db
DB_PASSWORD=tu_password_db
DB_NAME=nombre_de_la_db
DB_HOST=localhost
DB_DIALECT=postgres
JWT_SECRET=un_secreto_largo
```

Nota: adapta `DB_DIALECT` a `mysql` si usas MySQL.

Base de datos: migraciones y seeders
----------------------------------

Suponiendo que el proyecto usa Sequelize CLI (hay carpetas `migrations/` y `seeders/`):

1) Crea la base de datos (ejemplo con psql/PowerShell):

```powershell
# Crear DB en PostgreSQL (ejemplo)
psql -U postgres -c "CREATE DATABASE nombre_de_la_db;"
```

2) Ejecuta migraciones y seeders desde `reqcheckone_ws`:

```powershell
cd .\reqcheckone_ws
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

Si `sequelize-cli` no está instalado globalmente, `npx` lo ejecuta localmente.

Ejecutar la aplicación
----------------------

Backend (PowerShell):

```powershell
cd .\reqcheckone_ws
# Si package.json declara "start": "node ./bin/www"
npm start
# o directamente
node .\bin\www
```

Por defecto la API quedará escuchando en el puerto definido en `PORT` o `3000`.

Frontend (PowerShell):

```powershell
cd .\reqcheckone-cl
# Si el proyecto usa Angular CLI
npx ng serve --open
# o si existe script start
npm start
```

La app Angular debería abrirse en `http://localhost:4200` por defecto.

Ejemplos de uso de la API
-------------------------

Aquí hay ejemplos genéricos. Ajusta rutas y payloads según la implementación real (revisa `reqcheckone_ws/routes/`).

1) Registro de usuario

```powershell
curl -X POST http://localhost:3000/api/users/register -H "Content-Type: application/json" -d '{"name":"Juan","email":"juan@example.com","password":"password123"}'
```

2) Login (obtener JWT)

```powershell
curl -X POST http://localhost:3000/api/users/login -H "Content-Type: application/json" -d '{"email":"juan@example.com","password":"password123"}'
```

3) Crear un proyecto (ejemplo con token)

```powershell
$token = 'Bearer TU_TOKEN_JWT'
curl -X POST http://localhost:3000/api/projects -H "Authorization: $token" -H "Content-Type: application/json" -d '{"title":"Proyecto A","description":"Descripción"}'
```

4) Obtener requisitos de un proyecto

```powershell
curl http://localhost:3000/api/projects/1/requirements -H "Authorization: $token"
```

Consejos y notas
----------------

- Revisa las rutas disponibles en `reqcheckone_ws/routes/` para endpoints exactos.
- Revisa los controladores en `reqcheckone_ws/controllers/` para entender la estructura de las peticiones y respuestas.
- Si la app usa CORS, el frontend debe apuntar al host/puerto del backend o usar un proxy en `angular.json` durante el desarrollo.

Tests
-----

Si existen pruebas configuradas, podrás ejecutarlas desde cada carpeta con:

```powershell
cd .\reqcheckone_ws
npm test
cd ..\reqcheckone-cl
npm test
```

Si no existen scripts de test, puedes agregar pruebas unitarias e integradas (Jest/Mocha para backend, Karma/Jasmine o Jest para Angular).

CI / Deployment
---------------

- Para producción, construye el frontend con `npx ng build --prod` y sirve los archivos estáticos desde el backend o un CDN.
- Asegura variables de entorno (JWT_SECRET, credenciales DB) en el entorno de producción.
- Considera contenedores Docker para reproducibilidad (Dockerfile para backend y frontend + docker-compose).

Cómo contribuir
---------------

1. Crea un fork y una rama con un nombre claro: `feature/mi-cambio` o `fix/bug`.
2. Asegúrate de que las migraciones/seeders estén actualizadas si cambias modelos.
3. Abre un pull request describiendo el cambio, incluyendo instrucciones para probarlo.

Licencia
--------

Incluye aquí la licencia del proyecto (por ejemplo MIT). Si no deseas añadir una licencia aún, puedes crear un archivo `LICENSE`.

Autores y contacto
-------------------

- Harold Zambrano (@hdzambrano05)

Agradecimientos
---------------

Este README fue generado para documentar y facilitar la puesta en marcha del proyecto. Revisa los archivos `package.json`, `config/config.json` y los controladores para detalles de implementación.

Estado de cobertura de requisitos
--------------------------------

Tareas implementadas en este README:

- Documentación del proyecto: Done
- Instrucciones de instalación y ejecución: Done
- Ejemplos de API: Done (genéricos — revisar rutas reales)

---

Diseño del README (único e intuitivo)
------------------------------------

He diseñado este README para ser directo y útil desde el primer minuto. Puntos clave:

- Quick-start (comandos listos para copiar/pegar en PowerShell).
- Sección "¿Qué sigue?" con mejoras rápidas (badges, licencia, docs, Docker).
- Ejemplos de API colocados como snippets prácticos.

Si quieres, puedo añadir:

- Badges dinámicos (build / npm version / license).
- Archivos `CONTRIBUTING.md` y `LICENSE` con plantillas.
- Un `docker-compose.yml` para levantar DB + backend + frontend en local.

¿Qué prefieres que haga ahora? Escribe una opción breve y la implemento.

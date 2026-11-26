# Mapa de navegación

Imagen: `docs/diagramas_navegacion/navegacion.png` (también en SVG). Los números son los de `04_pantallas.md`.

## Arranque

| Situación | Pantalla inicial |
|---|---|
| Sin sesión | Ingreso (1) |
| Sesión con correo sin verificar | Verifica tu correo (2) |
| Correo verificado sin datos personales | Completa tus datos (3) |
| Sin ninguna membresía activa | Unirse a una sección (5) o Mis instituciones (22), según la elección guardada en el teléfono (por defecto 5, con enlace a 22) |
| Institución activa con rol de estudiante | Inicio del estudiante (6) |
| Institución activa con rol de profesor | Panel docente (24) |
| Institución activa con rol de administrador de la institución | Áreas y administradores (34) |
| Institución activa con rol de administrador de área | Gestión académica (35), filtrada a su área |
| Superadministrador de la plataforma | No usa la aplicación móvil: trabaja desde una herramienta interna del servidor (CU-36) |

Si una persona tiene varios roles en la misma institución (por ejemplo, profesora y administradora), arranca en
el de mayor alcance y cambia de vista desde Mis instituciones (22).

## Barras de navegación

- **Estudiante:** Hoy (6) · Mazos (17) · Evaluar (12) · Perfil (21).
- **Profesor:** Resumen (24) · Mazos (17, con la opción Asignar a una sección en Detalle del mazo, CU-08) ·
  Evaluaciones (30 Crear evaluación y 32 Notas) · Perfil (21).
- **Administrador:** Áreas (34, solo de la institución) · Gestión académica (35) · Usuarios (36, solo de la
  institución) · Moderación (37, solo de la institución) · Perfil (21).
- Desde Perfil (21) todos llegan a Mis instituciones (22) y Ajustes (23).

## Otras reglas

- **Registrar una institución:** 1 → 2 → 3 → 33. La institución exige una cuenta verificada (`created_by`).
- **Editar un mazo (CU-22):** Detalle del mazo (18) → Editar abre Subir mazo (19) con los datos cargados.
- **Avisos (7):** cada aviso abre la pantalla de su campo `notification.link` (por ejemplo, una solicitud de ingreso
  abre Solicitudes de ingreso (27)).
- **Sin conexión:** todo lo del estudiante funciona salvo el registro, unirse a una sección o institución, publicar
  mazos y descargar mazos nuevos.

```mermaid
flowchart TB
  classDef est fill:#F2A93B,stroke:#C17A14,color:#0E1430
  classDef prof fill:#CFF1E7,stroke:#0E7C6A,color:#0E1430
  classDef adm fill:#FFFFFF,stroke:#1E2A5A,color:#0E1430
  classDef com fill:#1E2A5A,stroke:#1E2A5A,color:#FFFFFF

  subgraph REG["Registro e ingreso"]
    P1["1 Ingreso y registro"]:::com --> P2["2 Verifica tu correo"]:::com --> P3["3 Completa tus datos"]:::com --> P4["4 Guía de inicio"]:::com
  end

  P4 -->|"Soy estudiante, sin membresía"| P5
  P4 -->|"Soy profesor, sin membresía"| P22
  P4 -->|"ya pertenece por la lista"| HOY
  P3 -->|"si tocó Registrar mi institución"| P33

  subgraph EST["Estudiante · pestañas Hoy · Mazos · Evaluar · Perfil"]
    HOY["6 Inicio del estudiante (Hoy)"]:::est
    P5["5 Unirse a una sección"]:::est --> HOY
    HOY --> P7["7 Avisos"]:::est
    HOY --> P8["8 Evaluación diagnóstica"]:::est --> P9["9 Sesión de repaso"]:::est --> P10["10 ¿Por qué veo esta tarjeta?"]:::est
    HOY --> P11["11 Reto de dominio"]:::est
    P9 --> P16["16 Unidad dominada"]:::est
    EV["12 Evaluar"]:::est --> P13["13 Presentar evaluación"]:::est --> P14["14 Resultados y plan de refuerzo"]:::est
    HOY --> P15["15 Progreso"]:::est
    HOY -->|"pestaña"| EV
    HOY -->|"pestaña"| MZ
    HOY -->|"pestaña"| PF
    MZ["17 Mazos"]:::est --> P18["18 Detalle del mazo"]:::est --> P20["20 Reportar error"]:::est
    MZ --> P19["19 Subir mazo"]:::est
    PF["21 Perfil"]:::est --> P22["22 Mis instituciones"]:::est
    PF --> P23["23 Ajustes y cuenta"]:::est
  end

  subgraph PROF["Profesor (institución activa con rol teacher)"]
    PD["24 Panel docente"]:::prof --> MS["25 Mi sección"]:::prof
    MS --> INV["26 Invitar a la sección"]:::prof
    MS --> SOL["27 Solicitudes de ingreso"]:::prof
    MS --> DE["28 Desempeño del estudiante"]:::prof
    PD --> RP["29 Reportes y tarjetas problemáticas"]:::prof
    PD -->|"pestaña Evaluaciones"| CE["30 Crear evaluación"]:::prof --> RV["31 Revisar preguntas"]:::prof
    PD --> NT["32 Notas de la evaluación"]:::prof
  end

  subgraph ADM["Administración (institution_admin o area_admin)"]
    P33["33 Registrar mi institución"]:::adm --> AR["34 Áreas y administradores"]:::adm
    AR --> GA["35 Gestión académica"]:::adm
    AR --> US["36 Usuarios"]:::adm
    AR --> MO["37 Moderación y bitácora"]:::adm
  end

  P22 -->|"institución activa con rol de profesor"| PD
  P22 -->|"rol de administrador de la institución"| AR
  P22 -->|"rol de administrador de área"| GA
  PD -->|"pestaña Mazos"| MZ
  PD -->|"pestaña Perfil"| PF
```

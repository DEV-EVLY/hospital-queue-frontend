# Hospital Queue System — Design System

## Principios de diseño

- **Claridad clínica**: La información debe ser legible de inmediato, sin ambigüedad. Nunca sacrificar legibilidad por estética.
- **Jerarquía visual**: Cada pantalla tiene un dato protagonista (ej: código de ticket, turno llamado). Todo lo demás es contexto.
- **Contexto de uso múltiple**: El sistema sirve a cuatro audiencias distintas con necesidades radicalmente diferentes — el diseño debe adaptarse.
- **Sin emojis**: Lenguaje gráfico mediante iconografía Lucide (stroke uniforme de 2px) o color semántico.

---

## Tipografía

| Token           | Familia               | Uso                                     |
|----------------|----------------------|-----------------------------------------|
| `font-sans`    | Inter                 | Todo el texto de interfaz               |
| `font-mono`    | JetBrains Mono        | Códigos de ticket, IDs, timestamps      |

### Escala tipográfica

| Clase Tailwind     | Tamaño | Uso                                          |
|-------------------|--------|----------------------------------------------|
| `text-display-xl` | 96px   | Código de ticket en cartelera principal      |
| `text-display-lg` | 64px   | Número de consultorio en cartelera           |
| `text-display-md` | 40px   | Encabezado de paso en kiosko                 |
| `text-4xl`        | 36px   | Títulos de sección                           |
| `text-2xl`        | 24px   | Subtítulos, headings de módulo               |
| `text-xl`         | 20px   | Labels grandes en kiosko                     |
| `text-base`       | 16px   | Cuerpo de texto principal                    |
| `text-sm`         | 14px   | Labels de formulario, filas de tabla         |
| `text-xs`         | 12px   | Metadata, badges, timestamps                 |

---

## Paleta de colores

### Colores de marca

| Token                | Hex       | Uso                                        |
|---------------------|-----------|--------------------------------------------|
| `primary-700`       | #1D4ED8   | CTA principal, botón primario, links       |
| `primary-600`       | #2563EB   | Hover de elementos primarios               |
| `primary-100`       | #DBEAFE   | Fondo de badges primarios, estado activo   |
| `health-600`        | #0D9488   | Botón de éxito (confirmar, completar)      |
| `health-500`        | #14B8A6   | Indicadores de salud / estado conectado    |
| `health-100`        | #CCFBEF   | Fondos de estado exitoso                   |

### Colores de superficie

| Token              | Hex       | Uso                                          |
|-------------------|-----------|----------------------------------------------|
| `surface-50`      | #F8FAFC   | Fondo de página                              |
| `white`           | #FFFFFF   | Superficie de cards, inputs                  |
| `surface-100`     | #F1F5F9   | Fondo de secciones secundarias, tabs         |
| `surface-200`     | #E2E8F0   | Bordes, divisores                            |
| `surface-400`     | #94A3B8   | Iconos secundarios, placeholder              |
| `surface-600`     | #475569   | Texto secundario                             |
| `surface-900`     | #0F172A   | Texto principal                              |

### Colores semánticos — Estado de turno

| Estado           | Color bg         | Color text       | Cuando usarlo                    |
|-----------------|-----------------|-----------------|----------------------------------|
| `EN_ESPERA`     | `amber-100`      | `amber-800`      | Ticket aguardando atención       |
| `LLAMADO`       | `blue-100`       | `blue-800`       | Ticket en llamado activo         |
| `EN_ATENCION`   | `green-100`      | `green-800`      | Paciente siendo atendido         |
| `ATENDIDO`      | `gray-100`       | `gray-600`       | Atención completada              |
| `NO_ATENDIDO`   | `red-100`        | `red-800`        | Paciente no se presentó          |
| `DERIVADO`      | `purple-100`     | `purple-800`     | Derivado a otro servicio         |

### Colores semánticos — Prioridad

| Nivel            | Color            | Indicador visual                  |
|-----------------|-----------------|-----------------------------------|
| `URGENTE`       | `red-500`        | Badge rojo, franja lateral roja   |
| `PREFERENCIAL`  | `amber-500`      | Badge ámbar                       |
| `NORMAL`        | `primary-500`    | Badge azul (default)              |

---

## Sombras

| Token           | Uso                                          |
|----------------|----------------------------------------------|
| `shadow-card`   | Cards base, componentes en reposo            |
| `shadow-card-md`| Cards al hacer hover, dropdowns              |
| `shadow-card-lg`| Panels flotantes, sidebars                   |
| `shadow-modal`  | Dialogs modales                              |

---

## Espaciado

Sistema basado en múltiplos de 4px (Tailwind default).

- Padding interno de card: `p-5` (20px)
- Gap entre elementos de formulario: `gap-4` (16px)
- Gap entre secciones de página: `gap-6` (24px)
- Margen de página: `px-6 py-4`

---

## Componentes UI

### Button

```tsx
<Button variant="primary" size="md">Confirmar</Button>
<Button variant="secondary" size="md">Cancelar</Button>
<Button variant="danger" size="sm">Eliminar</Button>
<Button variant="success" size="lg" loading>Procesando...</Button>
```

Variantes: `primary | secondary | ghost | danger | success`
Tamaños: `sm | md | lg | xl`

### Card

```tsx
<Card>
  <CardHeader title="Título" subtitle="Subtítulo" action={<Button size="sm">Acción</Button>} />
  <p>Contenido</p>
  <CardFooter>
    <Button variant="secondary">Cancelar</Button>
    <Button>Guardar</Button>
  </CardFooter>
</Card>
```

### Badge / StatusBadge / PriorityBadge

```tsx
<StatusBadge status="EN_ESPERA" />
<PriorityBadge priority="URGENTE" />
<Badge variant="success" dot>Activo</Badge>
```

### Input / Select

```tsx
<Input label="DNI / Documento" placeholder="Ej: 12345678" icon={<Search size={16} />} />
<Select label="Servicio" fullWidth>
  <option>Medicina General</option>
</Select>
```

### Modal

```tsx
<Modal open={open} onClose={() => setOpen(false)} title="Confirmar acción" size="md"
  footer={<><Button variant="secondary" onClick={...}>Cancelar</Button><Button>Confirmar</Button></>}>
  <p>Contenido del modal</p>
</Modal>
```

### ConnectionDot

```tsx
<ConnectionDot connected={true} />  {/* punto verde animado */}
<ConnectionDot connected={false} /> {/* punto rojo estático */}
```

---

## Animaciones (Motion)

Todas las animaciones usan `motion` (ex Framer Motion).

| Uso                    | Animación                                  |
|-----------------------|--------------------------------------------|
| Entrada de página      | `opacity: 0→1, y: 16→0, duration: 0.3s`   |
| Lista stagger          | `staggerChildren: 0.05s`                   |
| Ticket llamado         | Scale 0.95→1.05→1, flash de fondo azul     |
| Modal backdrop         | `opacity: 0→1, duration: 0.15s`            |
| Modal panel            | `scale: 0.95→1, y: 8→0, duration: 0.18s`  |
| Tab transition         | `AnimatePresence` con `fade-up`            |
| Transición de paso (kiosko) | Slide horizontal left/right          |

---

## Contextos de pantalla

### Kiosko (terminal táctil público)
- Fondo: blanco / surface-50
- Texto: grande, alto contraste
- Botones: mínimo 72px de alto (táctil)
- Sin menú de navegación
- Pasos: 1 acción visible a la vez

### Cartelera (pantalla TV pública)
- Fondo: #070D1A (muy oscuro, para visibilidad desde lejos)
- Texto principal: blanco, font-size display-xl
- Alto contraste siempre
- Sin interacción del usuario
- Ticker inferior: información secundaria en movimiento

### Operador / Médico (estación de trabajo)
- Tema claro, denso en información
- Layout 60/40: atención actual / cola de espera
- Acciones rápidas accesibles con teclado

### Admin (panel de gestión)
- Tema claro, data-heavy
- Tabs laterales para módulos
- Tablas con sorting, modales para CRUD

---

## Iconografía

Lucide React con stroke de 2px uniforme. Tamaños:
- En botones: `size={16}`
- En encabezados de sección: `size={20}`
- En ilustraciones vacías: `size={40}` con `text-surface-300`
- En cartelera (display): `size={48}`

### Iconos por contexto

| Concepto           | Icono Lucide             |
|-------------------|--------------------------|
| Ticket / Turno     | `Ticket`                 |
| Paciente           | `User`                   |
| Médico / Doctor    | `Stethoscope`            |
| Consultorio        | `DoorOpen`               |
| Servicio médico    | `Activity`               |
| Llamar siguiente   | `PhoneCall`              |
| Completar          | `CheckCircle2`           |
| Ausente            | `UserX`                  |
| Derivar            | `ArrowRightLeft`         |
| Urgente            | `AlertTriangle`          |
| Conectado / Live   | `Radio`                  |
| Reportes           | `BarChart3`              |
| Configuración      | `Settings2`              |
| Prioridad          | `Star`                   |
| Laboratorio        | `FlaskConical`           |
| Odontología        | `SmilePlus`              |
| Pediatría          | `Baby`                   |
| Ginecología        | `Heart`                  |
| Triaje             | `AlertCircle`            |

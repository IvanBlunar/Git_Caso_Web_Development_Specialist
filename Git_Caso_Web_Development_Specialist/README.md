# Caso Web Development Specialist - Publicis Groupe
## Febrero 2026

**Presentado por:** Iván Humberto Bello Sandoval

---

## Tabla de Contenido

1. [Sección A: Gestión de Equipo y Procesos](#sección-a-gestión-de-equipo-y-procesos)
2. [Sección B: Arquitectura y Desarrollo Técnico](#sección-b-arquitectura-y-desarrollo-técnico)
3. [Sección C: Infraestructura Cloud y Servidores](#sección-c-infraestructura-cloud-y-servidores)
4. [Sección D: CMS y E-commerce](#sección-d-cms-y-e-commerce)
5. [Sección E: Comunicación y Gestión de Stakeholders](#sección-e-comunicación-y-gestión-de-stakeholders)
6. [Sección F: Liderazgo y Gestión de Equipo](#sección-f-liderazgo-y-gestión-de-equipo)
7. [Sección G: Pensamiento Crítico](#sección-g-pensamiento-crítico)
8. [Estructura del Repositorio](#estructura-del-repositorio)
9. [Instalación y Ejecución](#instalación-y-ejecución)

---

##  Estructura del Repositorio

```
Git_Caso_Web_Development_Specialist/
├── Componente_react/
│   └── product-list/           # Componente React con paginación
│       ├── src/
│       ├── package.json
│       └── README.md
├── Webhook_de_Shopify/
│   ├── webhook-handler.js      # Handler con HMAC y retry logic
│   └── README.md
├── Configuracion_nginx/
│   └── nutresa.conf            # Nginx + SSL Let's Encrypt
├── Diagramas/
│   └── E-commerce API Flow.png # Arquitectura plataforma farmacéutica
└── README.md                   # Este archivo
```

---

## Sección A: Gestión de Equipo y Procesos

### 1. Priorización y Distribución de Solicitudes

| Prioridad | Solicitud | Justificación | Asignación |
|-----------|-----------|---------------|------------|
| **Crítico** | B: Bug crítico checkout | Pérdida directa de ingresos. Clientes no pueden comprar. | Dev Senior<br>2-4 horas |
| **Alto** | C: CVE WordPress | Riesgo de seguridad. 72h de plazo. | Dev Mid + Junior<br>48-60 horas |
| **Medio** | A: Migración AWS | Fallas intermitentes. 2 semanas de plazo | Dev Senior<br>10-12 días |
| **Normal** | D: Landing page | Sin impacto crítico. 10 días disponibles. | Dev Junior<br>6-7 días |

**Criterios aplicados:** Impacto de negocio, urgencia temporal y complejidad técnica crítica.

### 2. Plan de Contingencia: Dev Senior Enfermo

- **Estrategia:** Retrasar migración AWS (tenemos 2 semanas de plazo, bug crítico ya resuelto el lunes)
- **Acciones:** Dev Mid prepara documentación detallada para familiarizarse con AWS
- **Liderazgo:** Dev Mid asume liderazgo técnico temporal
- **Sin impacto:** Solicitudes B/C/D continúan con Mid/Junior

### 3. Proceso de Onboarding - 30 Días

**Semana 1 - Fundamentos:** Setup técnico, introducción al equipo, vista previa de proyectos. Primer task guiado. Participación en dailies como observador.

**Semana 2 - Primeros Commits:** Tareas de complejidad baja-media. Code reviews activos. Deployment a staging. Primera sesión 1:1 con feedback.

**Semana 3 - Autonomía:** Tareas más autónomas. Primer acercamiento con clientes. Ownership de componentes específicos.

**Semana 4 - Integración:** Proyecto end-to-end. Primera rotación on-call con backup. Revisión de onboarding y plan de desarrollo 2-3 meses.

**Métricas de éxito:** Desarrollos y despliegues autónomos, participación activa en Scrum.

---

## Sección B: Arquitectura y Desarrollo Técnico

### 2. Arquitectura Plataforma Farmacéutica

#### Diagrama de Arquitectura

![Arquitectura E-commerce](./Diagramas/E-commerce%20API%20Flow-2026-02-08-233549.png)

**Link interactivo:** https://mermaid.ai/view/8bf7386a-9444-461b-ab5a-8d8c54d6b45f

#### Stack Tecnológico Recomendado

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **Frontend** | Next.js 14 + TypeScript | SSR/SSG para SEO, escalable para catálogo y dashboard |
| **CMS** | WordPress Headless + WPGraphQL | Gestiona contenidos complejos con frontend moderno |
| **Backend** | Node.js + Express | Reutilización de código TS, experiencia extensa y escalable |
| **Base de Datos** | PostgreSQL (AWS RDS) | Ideal para datos relacionales: usuarios, roles, órdenes, reportes |
| **E-commerce** | VTEX | PCI-DSS compliant, requerido por cliente |
| **Cloud** | AWS | Servicios maduros, multi-región, load balancing, tolerancia a fallos |
| **CDN** | CloudFront | Integración nativa con S3, ACM SSL, Route 53, cacheo optimizado |
| **Cache** | Redis (ElastiCache) | Sesiones, object cache, queries frecuentes |
| **Notificaciones** | SES + SNS + Twilio | Emails transaccionales y SMS a médicos/pacientes |

#### Patrones de Diseño

**1. Backend for Frontend (BFF)**
- Llamadas a WordPress, VTEX y DB exponiendo API simplificada
- Ejemplo: `/api/producto/:id` combina descripción (WordPress) + precio (VTEX) + restricciones IVA por país (BD)

**2. Repository Pattern**
- Acceso a datos mediante repositorios: `UserRepository`, `OrderRepository`
- Facilita testing y cambios de BD

**3. API Gateway Pattern**
- Centraliza autenticación, autorización y logging
- Reduce acoplamiento entre servicios (VTEX, WordPress)

#### Puntos Críticos de Seguridad

1. **Inyección:** Protección contra XSS con CSP headers y sanitización de inputs
2. **Autenticación:** Login seguro con MFA y reCAPTCHA para evitar accesos no autorizados
3. **Encriptación:** Archivos sensibles (.env, wp-config.php), tokens en directorios públicos
4. **DDoS:** AWS WAF en CloudFront, rate limiting por IP/usuario, auto-scaling
5. **Tokens de Pago:** Implementar tokenización para no almacenar datos de tarjetas
6. **Regulación Multi-país:** Tabla de restricciones por país/producto, validación en checkout, workflow de verificación de recetas médicas

### 3. Implementación Práctica

#### 3.1 Componente React - Lista de Productos Paginada

 **Ubicación:** `./Componente_react/product-list/`

**Características:**
- Consumo de API REST paginada
- Manejo de estados: loading, error, success
- Diseño responsive (mobile-first)
- Código comentado explicando decisiones

**Instalación y ejecución:**
```bash
cd Componente_react/product-list
npm install
npm run dev
```

#### 3.2 Webhook de Shopify

 **Ubicación:** `./Webhook_de_Shopify/`

**Características:**
- Validación de firma HMAC
- Procesamiento asíncrono del payload
- Manejo de reintentos con backoff exponencial
- Logging completo para debugging

**Instalación y ejecución:**
```bash
cd Webhook_de_Shopify
npm install
# Configurar SHOPIFY_WEBHOOK_SECRET en .env
node webhook-handler.js
```

---

## Sección C: Infraestructura Cloud y Servidores

### 4. Migración WordPress Nutresa a AWS

#### 1. Elección de Proveedor: AWS

**Justificación:**
- Reduce riesgo en migración crítica
- Mejor soporte para CMS WordPress
- Integración con S3/ACM/Route 53
- Presupuesto de $200/mes es factible

**Servicios AWS:**
- EC2 t3.medium (~$30)
- RDS MySQL Multi-AZ (~$50)
- S3 (~$3)
- CloudFront (~$15-20)
- ElastiCache Redis (~$15)
- Route 53 (~$1)
- ACM (gratis)
- EBS (~$3)

**Total estimado: $165-185/mes**

#### 2. Proceso de Migración (6 pasos clave)

1. **Identificación:** WordPress version, plugins, PHP, dependencias externas
2. **Arquitectura:** VPC, RDS Multi-AZ, EC2 LEMP stack, S3, ElastiCache, CloudFront
3. **Importación:** BD a RDS, ZIP del sitio a S3, WP ALL MIGRATIONS (opcional), pruebas en staging
4. **Configuración:** Nginx o Apache en nuevo entorno
5. **Reubicación:** Sitio desde S3
6. **Configuraciones DB:** Ajustes de conexión y optimización

#### 3. Estrategia Cero Downtime

**Blue-Green Deployment:**
- Servidor actual (Blue) activo durante preparación de AWS (Green)
- Switch instantáneo vía DNS

**TTL Bajo:**
- 300s configurado 48h antes
- Propagación máxima: 5 minutos

**Modo Lectura:**
- < 15 min durante sync final
- Usuarios ven contenido, no pueden postear

**Plan de Rollback:**
- Revertir DNS a IP vieja (5 min)
- Servidor viejo activo como backup
- Ventana de decisión: primeras 2 horas
- Criterios: error rate > 5%, performance degradada, funcionalidad rota

#### 4. Configuración Nginx

**Ubicación:** `./Configuracion_nginx/nutresa.conf`

Configuración completa de Nginx como reverse proxy con SSL Let's Encrypt, incluyendo:
- Certificados SSL automáticos
- Headers de seguridad
- Optimización de cache
- Compresión gzip

#### 5. Diagnóstico Error 502

**Paso 1:** Verificar PHP-FPM → `systemctl status php8.1-fpm`

**Paso 2:** Verificar socket/puerto correcto en Nginx y PHP-FPM configs

**Paso 3:** Revisar logs de Nginx (`error.log`) buscando "connection failed"

**Paso 4:** Verificar límites PHP-FPM (`pm.max_children`), RAM, CPU

**Paso 5:** Test directo PHP (`info.php`), revisar `wp-config.php` DB_HOST, verificar security groups RDS, habilitar `WP_DEBUG`

---

## Sección D: CMS y E-commerce

### 5.1 Diagnóstico WordPress Lento (12s TTFB)

**Herramientas de diagnóstico:**
- GTmetrix
- PageSpeed Insights
- Query Monitor plugin
- Chrome DevTools

**5 Optimizaciones por Impacto:**

1. **Implementar Cache (IMPACTO ALTO)**
   - WP Rocket o W3 Total Cache
   - Page + object + browser cache
   - Reducción TTFB: 12s → 0.5-1s
   - Costo: $0-50/año

2. **Reducir Plugins (IMPACTO ALTO)**
   - De 35 a <15 plugins esenciales
   - Query Monitor para identificar queries lentas
   - Reducción: 50-70% en queries

3. **Optimizar Imágenes (IMPACTO MEDIO)**
   - Imagify/ShortPixel batch compression
   - Lazy loading nativo
   - WebP format
   - Página: 8MB → 2-3MB

4. **Optimizar BD (IMPACTO MEDIO)**
   - WP-Optimize: limpiar revisions, spam, transients
   - OPTIMIZE TABLE
   - Agregar índices a queries lentas

5. **Upgrade Hosting (IMPACTO ALTO)**
   - Migrar a VPS 4GB+ RAM con CPUs dedicados
   - Hosting compartido 2GB es muy limitado

**Con presupuesto limitado:** Optimizar plugins pagos, memoria e imágenes que consumen recursos innecesarios (opciones 1, 2 y 3).

### 5.2 Comparativa E-commerce

|  | VTEX | Shopify | WooCommerce |
|--|------|---------|-------------|
| **Costos** | $1,500-5,000/mes<br>Alto inicial | $29-299/mes + apps<br>Medio predecible | Gratis core<br>$500-2,000/mes hosting |
| **Escalabilidad** | Muy alta<br>Enterprise-grade | Alta<br>Shopify Plus disponible | Media<br>Depende de hosting |
| **Personalización** | Alta vía APIs<br>Headless nativo | Media<br>Templates + Liquid | Muy alta<br>PHP + hooks infinitos |
| **Multi-país** | Excelente<br>Multi-moneda nativo | Bueno<br>Con Shopify Markets | Básico<br>Requiere plugins |

**Recomendación para farmacéutica (50 SKUs, regulaciones complejas):**

**VTEX**

**Justificación:**
- Regulaciones farmacéuticas requieren workflows complejos (verificación de recetas, restricciones por país, trazabilidad)
- VTEX maneja mejor el acoplamiento con APIs robustas para integraciones custom
- Multi-país nativo esencial para Costa Rica, Guatemala, Honduras, El Salvador
- Aunque más caro, vale la pena para dominio tan regulado
- **Alternativa con presupuesto limitado:** WooCommerce (no paga licencias como VTEX pero requiere desarrollo custom)
- Shopify no está optimizado para regulaciones complejas

---

## Sección E: Comunicación y Gestión de Stakeholders

Ver documento PDF completo para emails y estrategias de comunicación detalladas.

---

## Sección F: Liderazgo y Gestión de Equipo

### 7. Caso de Gestión de Desempeño

#### Plan de Acción (4 pasos)

**Paso 1 - Conversación 1:1 privada (Semana 1)**
- Datos objetivos con ejemplos y fechas
- Conversación empática pero clara
- Escuchar activamente
- Establecer expectativas
- Plan de mejora con deadlines

**Paso 2 - Monitoreo y soporte (Semanas 2-4)**
- Check-ins diarios breves
- Pair programming
- Tareas pequeñas
- Ofrecer recursos

**Paso 3 - Evaluación (Semana 4)**
- Segunda conversación formal
- Revisar progreso
- Reconocer mejoras o escalar

**Paso 4 - Decisión (Semanas 6-8)**
- Sin mejora → PIP con RRHH
- Mejora parcial → extender
- Mejora total → cerrar exitosamente

** Nunca dejar conocimiento crítico en una sola persona sin respaldo**

---

## Sección G: Pensamiento Crítico

### 8. Decisión Técnica Estratégica

**Recomendación: Enfoque Híbrido - Mantener y Migrar Gradualmente**

#### Análisis de Costos

- **Big Bang (60 sitios):** $300K-600K  ALTO RIESGO
- **Mantener WordPress:** $50K/año
- **Enfoque Gradual:** $100K año 1 → $150K año 2 (escalable según ROI)

**Estrategia:** No saltar a "lo nuevo" por moda. Evaluar con pilotos pequeños, medir ROI real, escalar solo si comprobamos valor.

---

## Instalación y Ejecución

### Componente React

```bash
cd Componente_react/product-list
npm install
npm run dev
```

### Webhook de Shopify

```bash
cd Webhook_de_Shopify
npm install
node webhook-handler.js
```

### Configuración Nginx

```bash
sudo cp Configuracion_nginx/nutresa.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nutresa.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

##  Diagramas

**Arquitectura E-commerce API Flow:**  
Ver: `./Diagramas/E-commerce API Flow-2026-02-08-233549.png`

**Vista interactiva:** https://mermaid.ai/view/8bf7386a-9444-461b-ab5a-8d8c54d6b45f

---

## 💡 Highlights del Proyecto

Código funcional production-ready  
Arquitectura escalable multi-país  
Security-first approach  
DevOps best practices  
Zero-downtime deployment  

---

##  Contacto

**Iván Humberto Bello Sandoval**  
Web Development Specialist  
Publicis Groupe

---

## Documentación Completa

PDF disponible: `Desarrollo_caso_Web_Development_Specialist.pdf`

---
 **Nota:** Los costos son estimaciones (Febrero 2026) y pueden variar. Usar calculadora AWS para cotizaciones exactas.

---

**Fin del README - Repositorio Git Completo**
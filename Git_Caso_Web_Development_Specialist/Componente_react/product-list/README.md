
# Product List – Componente React con API REST Paginada

Este proyecto consiste en el desarrollo de un **componente en React** que consume una **API REST pública paginada**, maneja distintos estados de la aplicación y presenta la información de forma **responsive**, cumpliendo con los requisitos solicitados.

---

## Tecnologías utilizadas

- **React** (Hooks)
- **Vite** (entorno de desarrollo)
- **JavaScript (ES6+)**
- **CSS Grid y Flexbox**
- **API REST pública (DummyJSON)**

---

##  API utilizada

Se utiliza la API pública **DummyJSON**, la cual permite paginación y búsqueda sin necesidad de autenticación.

- Listado de productos:  
  `https://dummyjson.com/products`

- Búsqueda de productos:  
  `https://dummyjson.com/products/search?q=palabra`

### Ejemplo de respuesta de la API:
```json
{
  "products": [...],
  "total": 194,
  "skip": 0,
  "limit": 12
}

#### Ejemplo de respuesta de la API:

##  Crear el proyecto con Vite:

npm create vite@latest product-list -- --template react

Entrar al proyecto:

cd product-list

Instalar dependencias:

npm install




product-list
├─ src
│  ├─ components
│  │  ├─ ProductList.jsx
│  │  └─ ProductList.css
│  ├─ App.jsx
│  ├─ main.jsx
│  └─ index.css
├─ index.html
├─ package.json
└─ vite.config.js

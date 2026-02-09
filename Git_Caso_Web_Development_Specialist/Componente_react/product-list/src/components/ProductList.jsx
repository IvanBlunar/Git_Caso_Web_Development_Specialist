import React, { useEffect, useMemo, useState } from "react";
import "./ProductList.css";

/**
 * ProductList Component
 *
 * Consume una API REST paginada (DummyJSON)
 * Maneja estados: loading, error, success
 * Diseño responsive (en ProductList.css)
 * Código comentado explicando decisiones
 *
 * API usada (pública, sin auth):
 * - Listado paginado: https://dummyjson.com/products?limit=12&skip=0
 * - Búsqueda paginada: https://dummyjson.com/products/search?q=phone&limit=12&skip=12
 *
 * Estructura de respuesta DummyJSON:
 * {
 *   products: [...],
 *   total: number,
 *   skip: number,
 *   limit: number
 * }
 */

const ProductList = ({ apiUrl = "https://dummyjson.com/products" }) => {
  // Datos
  const [products, setProducts] = useState([]);

  // Estados
  const [status, setStatus] = useState("loading"); // "loading" | "error" | "success"
  const [error, setError] = useState(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12; // fijo

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce:  evita llamar API en cada tecla
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  /**
   * Fetch productos (paginado) con AbortController:
   * - Cancela requests anteriores si el usuario cambia rápido de página o búsqueda
   */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchProducts = async () => {
      setStatus("loading");
      setError(null);

      try {
        // DummyJSON pagina con skip + limit
        const skip = (currentPage - 1) * itemsPerPage;

        // Construcción de query params
        const params = new URLSearchParams({
          limit: String(itemsPerPage),
          skip: String(skip),
        });

        // Si hay búsqueda, usamos el endpoint /search?q=
        const baseUrl = debouncedSearch
          ? `${apiUrl}/search?q=${encodeURIComponent(debouncedSearch)}`
          : apiUrl;

        const response = await fetch(`${baseUrl}?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal,
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // DummyJSON devuelve products y total
        const list = data.products || [];
        const total = Number(data.total || 0);

        setProducts(list);
        setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));

        setStatus("success");
      } catch (err) {
        if (err?.name === "AbortError") return; // abort es normal

        setStatus("error");
        setError(err?.message || "Error al cargar los productos");
        console.error("Error fetching products:", err);
      }
    };

    fetchProducts();

    return () => controller.abort();
  }, [currentPage, debouncedSearch, apiUrl, itemsPerPage]);

  // UX: scroll top cuando cambia página
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      scrollTop();
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      scrollTop();
    }
  };

  const handlePageClick = (pageNum) => {
    setCurrentPage(pageNum);
    scrollTop();
  };

  /**
   * Paginador: mostrar máximo 5 páginas visibles
   * useMemo evita recalcular si no cambian dependencias
   */
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  /**
   * Render por estados
   */
  if (status === "loading") {
    return (
      <div className="product-list-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="product-list-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Oops! Algo salió mal</h3>
          <p>{error}</p>
          <button
            onClick={() => setCurrentPage((p) => p)} // fuerza re-fetch
            className="retry-button"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // success
  return (
    <div className="product-list-container">
      {/* Header con búsqueda */}
      <div className="list-header">
        <h2>Productos</h2>

        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset a página 1 al buscar
            }}
            className="search-input"
            aria-label="Buscar productos"
          />
        </div>
      </div>

      {/* Vacío */}
      {products.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron productos</p>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Grid responsive */}
          <div className="products-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                {/* Imagen */}
                <div className="product-image">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="image-placeholder">Sin imagen</div>
                  )}
                </div>

                {/* Info */}
                <div className="product-info">
                  <h3 className="product-name">{product.title}</h3>

                  <p className="product-description">
                    {product.description?.substring(0, 100)}
                    {product.description?.length > 100 && "..."}
                  </p>

                  <div className="product-footer">
                    <span className="product-price">
                      ${Number(product.price || 0).toFixed(2)}
                    </span>
                    <button className="view-button">Ver detalles</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          <div className="pagination">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="pagination-button"
              aria-label="Página anterior"
            >
              ← Anterior
            </button>

            <div className="page-numbers">
              {/* Primera página si no está visible */}
              {pageNumbers[0] > 1 && (
                <>
                  <button
                    onClick={() => handlePageClick(1)}
                    className="page-number"
                  >
                    1
                  </button>
                  {pageNumbers[0] > 2 && <span className="ellipsis">...</span>}
                </>
              )}

              {/* Páginas visibles */}
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageClick(p)}
                  className={`page-number ${currentPage === p ? "active" : ""}`}
                  aria-current={currentPage === p ? "page" : undefined}
                >
                  {p}
                </button>
              ))}

              {/* Última página si no está visible */}
              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                    <span className="ellipsis">...</span>
                  )}
                  <button
                    onClick={() => handlePageClick(totalPages)}
                    className="page-number"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="pagination-button"
              aria-label="Página siguiente"
            >
              Siguiente →
            </button>
          </div>

          <div className="pagination-info">
            Página {currentPage} de {totalPages}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductList;

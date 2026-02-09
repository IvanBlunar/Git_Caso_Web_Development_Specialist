# Shopify Webhook Handler (Orders Sync) — Explicación e Implementación

Este documento describe cómo se implementa un **webhook de Shopify** para sincronizar pedidos con un sistema interno, cumpliendo con:

- Validación de firma **HMAC**
- Procesamiento **asíncrono** del payload (cola)
- Reintentos con **backoff exponencial**
- **Logging** para debugging

---

## 1) ¿Qué hace este webhook?

Cuando ocurre un evento en Shopify (por ejemplo `orders/create`), Shopify envía una petición HTTP `POST` a nuestro endpoint:



El servidor:

1. **Verifica** que el webhook realmente viene de Shopify (HMAC).
2. Responde rápido (200 OK) para evitar timeouts.
3. Encola el payload para procesarlo en segundo plano.
4. Procesa el job con reintentos y backoff exponencial.
5. Registra logs con contexto para auditoría y debugging.

---

## 2) Conceptos clave

### 2.1 HMAC
**HMAC** (Hash-based Message Authentication Code) es una firma criptográfica que Shopify envía en el header:

- `X-Shopify-Hmac-Sha256`

Nos permite validar que:
- el mensaje viene de Shopify
- el contenido no fue alterado

La firma se calcula con:
- algoritmo: `HMAC-SHA256`
- entrada: **raw body exacto**
- secreto: `SHOPIFY_WEBHOOK_SECRET`
- salida: Base64

### 2.2 Raw body
**Raw body** es el cuerpo del request tal cual llega (sin parsear a JSON).
Es obligatorio para la firma, porque si el body se “reconstruye” (por ejemplo con `express.json()`), puede cambiar el formato y la firma ya no coincide.

Por eso el endpoint usa:

```js
express.raw({ type: "application/json" })

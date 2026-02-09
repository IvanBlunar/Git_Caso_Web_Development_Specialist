/**
 * Shopify Webhook Handler
 * 
 * Sistema para procesar webhooks de Shopify con:
 * - Validación de firma HMAC
 * - Procesamiento asíncrono con colas
 * - Reintentos con backoff exponencial
 * - Logging completo para debugging
 * 
 * Basado en experiencia con sistemas de integración en producción
 */

const crypto = require('crypto');
const express = require('express');

// Simulación de un sistema de colas (en producción usaría Bull, BullMQ o AWS SQS)
const { Queue } = require('./queue-system'); // Sistema de colas
const logger = require('./logger'); // Sistema de logging

const app = express();

// Configuración
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 segundo

/**
 * Middleware para validar la firma HMAC del webhook de Shopify
 * 
 * Shopify envía un header 'X-Shopify-Hmac-Sha256' con cada webhook
 * Debemos validar que el webhook realmente viene de Shopify
 */
const verifyShopifyWebhook = (req, res, next) => {
  try {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    
    if (!hmacHeader) {
      logger.warn('Webhook received without HMAC header', {
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ 
        error: 'Missing HMAC signature' 
      });
    }

    // El body debe ser raw para calcular el HMAC correctamente
    // Por eso uso express.raw() en lugar de express.json()
    const rawBody = req.body;
    
    // Calcular HMAC usando el secret de Shopify
    const hash = crypto
      .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
      .update(rawBody, 'utf8')
      .digest('base64');

    // Comparación segura para evitar timing attacks
    const verified = crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(hmacHeader)
    );

    if (!verified) {
      logger.error('Invalid HMAC signature', {
        ip: req.ip,
        receivedHmac: hmacHeader,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ 
        error: 'Invalid HMAC signature' 
      });
    }

    // Parsear el body ahora que sabemos que es válido
    req.shopifyPayload = JSON.parse(rawBody);
    
    logger.info('HMAC signature verified successfully', {
      topic: req.get('X-Shopify-Topic'),
      shop: req.get('X-Shopify-Shop-Domain')
    });

    next();
  } catch (error) {
    logger.error('Error verifying webhook', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Endpoint principal para recibir webhooks de Shopify
 * 
 * Nota: El body debe ser raw, no JSON parseado, para la validación HMAC
 */
app.post(
  '/webhooks/shopify/orders',
  express.raw({ type: 'application/json' }),
  verifyShopifyWebhook,
  async (req, res) => {
    try {
      const payload = req.shopifyPayload;
      const topic = req.get('X-Shopify-Topic');
      const shopDomain = req.get('X-Shopify-Shop-Domain');

      // Log del webhook recibido
      logger.info('Webhook received', {
        topic,
        shopDomain,
        orderId: payload.id,
        orderNumber: payload.order_number,
        timestamp: new Date().toISOString()
      });

      // IMPORTANTE: Responder rápido a Shopify (antes de procesar)
      // Shopify espera respuesta 200 en menos de 5 segundos
      res.status(200).json({ 
        received: true,
        orderId: payload.id 
      });

      // Procesar el webhook de forma asíncrona
      // Agregar a cola para procesamiento con reintentos
      await processWebhookAsync(payload, topic, shopDomain);

    } catch (error) {
      // Si ya enviamos la respuesta, solo logueamos el error
      logger.error('Error processing webhook', {
        error: error.message,
        stack: error.stack
      });
    }
  }
);

/**
 * Procesamiento asíncrono del webhook
 * Usa un sistema de colas para manejar el procesamiento
 */
async function processWebhookAsync(payload, topic, shopDomain) {
  try {
    // Crear job en la cola con los datos del webhook
    const job = await orderProcessingQueue.add('process-order', {
      payload,
      topic,
      shopDomain,
      receivedAt: new Date().toISOString()
    }, {
      attempts: MAX_RETRIES,
      backoff: {
        type: 'exponential',
        delay: INITIAL_RETRY_DELAY
      },
      removeOnComplete: false, // Mantener historial
      removeOnFail: false
    });

    logger.info('Job added to queue', {
      jobId: job.id,
      orderId: payload.id
    });

  } catch (error) {
    logger.error('Error adding job to queue', {
      error: error.message,
      orderId: payload.id
    });
    throw error;
  }
}

/**
 * Queue processor - Aquí va la lógica real de negocio
 * Se ejecuta de forma asíncrona y con reintentos automáticos
 */
const orderProcessingQueue = new Queue('order-processing');

orderProcessingQueue.process('process-order', async (job) => {
  const { payload, topic, shopDomain } = job.data;
  const attemptNumber = job.attemptsMade + 1;

  logger.info('Processing order', {
    jobId: job.id,
    orderId: payload.id,
    attempt: attemptNumber,
    maxAttempts: MAX_RETRIES
  });

  try {
    // Aquí va la lógica específica según el tipo de webhook
    switch (topic) {
      case 'orders/create':
        await handleOrderCreate(payload);
        break;
      
      case 'orders/updated':
        await handleOrderUpdate(payload);
        break;
      
      case 'orders/paid':
        await handleOrderPaid(payload);
        break;
      
      case 'orders/fulfilled':
        await handleOrderFulfilled(payload);
        break;
      
      default:
        logger.warn('Unknown webhook topic', { topic });
    }

    // Log de éxito
    logger.info('Order processed successfully', {
      jobId: job.id,
      orderId: payload.id,
      attempt: attemptNumber
    });

    return { success: true, orderId: payload.id };

  } catch (error) {
    // Log del error con contexto completo
    logger.error('Error processing order', {
      jobId: job.id,
      orderId: payload.id,
      attempt: attemptNumber,
      maxAttempts: MAX_RETRIES,
      error: error.message,
      stack: error.stack,
      payload: JSON.stringify(payload, null, 2)
    });

    // Si es el último intento, enviar alerta
    if (attemptNumber >= MAX_RETRIES) {
      await sendFailureAlert({
        orderId: payload.id,
        error: error.message,
        attempts: attemptNumber,
        shopDomain
      });
    }

    // Re-lanzar el error para que el sistema de colas maneje el retry
    throw error;
  }
});

/**
 * Handlers específicos para cada tipo de webhook
 */

async function handleOrderCreate(payload) {
  logger.info('Handling order creation', { 
    orderId: payload.id,
    orderNumber: payload.order_number,
    totalPrice: payload.total_price
  });

  // Ejemplo: Sincronizar con sistema interno
  await syncOrderToInternalSystem({
    shopifyOrderId: payload.id,
    orderNumber: payload.order_number,
    customerEmail: payload.email,
    totalPrice: parseFloat(payload.total_price),
    currency: payload.currency,
    lineItems: payload.line_items.map(item => ({
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
      price: parseFloat(item.price),
      title: item.title
    })),
    shippingAddress: payload.shipping_address,
    billingAddress: payload.billing_address,
    createdAt: payload.created_at
  });

  logger.info('Order synced to internal system', { 
    orderId: payload.id 
  });
}

async function handleOrderUpdate(payload) {
  logger.info('Handling order update', { 
    orderId: payload.id 
  });

  // Actualizar orden en sistema interno
  await updateOrderInInternalSystem(payload.id, {
    status: payload.financial_status,
    fulfillmentStatus: payload.fulfillment_status,
    updatedAt: payload.updated_at
  });
}

async function handleOrderPaid(payload) {
  logger.info('Handling order payment', { 
    orderId: payload.id 
  });

  // Marcar como pagado y procesar siguiente paso
  await markOrderAsPaid(payload.id);
  
  // Trigger para enviar a bodega, por ejemplo
  await triggerFulfillmentProcess(payload.id);
}

async function handleOrderFulfilled(payload) {
  logger.info('Handling order fulfillment', { 
    orderId: payload.id 
  });

  // Actualizar estado y notificar cliente
  await updateFulfillmentStatus(payload.id, payload.fulfillments);
  await sendCustomerNotification(payload.email, payload.id);
}

/**
 * Función auxiliar: Sincronizar orden con sistema interno
 * Simula una llamada a API o BD
 */
async function syncOrderToInternalSystem(orderData) {
  // En producción, esto sería una llamada a tu API/BD interna
  // Ejemplo con retry logic incorporado
  
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Simular llamada HTTP a sistema interno
      // const response = await fetch('https://internal-api.com/orders', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(orderData)
      // });
      
      // if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      logger.info('Order synced successfully', {
        orderId: orderData.shopifyOrderId,
        attempt: i + 1
      });
      
      return true;
      
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Backoff exponencial
        logger.warn('Retry sync after error', {
          orderId: orderData.shopifyOrderId,
          attempt: i + 1,
          delay,
          error: error.message
        });
        await sleep(delay);
      }
    }
  }

  throw new Error(`Failed to sync after ${maxRetries} attempts: ${lastError.message}`);
}

async function updateOrderInInternalSystem(orderId, updates) {
  // Implementación similar a syncOrderToInternalSystem
  logger.info('Updating order', { orderId, updates });
}

async function markOrderAsPaid(orderId) {
  logger.info('Marking order as paid', { orderId });
}

async function triggerFulfillmentProcess(orderId) {
  logger.info('Triggering fulfillment', { orderId });
}

async function updateFulfillmentStatus(orderId, fulfillments) {
  logger.info('Updating fulfillment status', { orderId, fulfillments });
}

async function sendCustomerNotification(email, orderId) {
  logger.info('Sending customer notification', { email, orderId });
}

/**
 * Enviar alerta cuando un webhook falla después de todos los reintentos
 */
async function sendFailureAlert(details) {
  logger.critical('Webhook processing failed after all retries', details);
  
  // En producción, enviar a Slack, email, PagerDuty, etc.
  // await notificationService.sendAlert({
  //   channel: '#tech-alerts',
  //   message: `Shopify webhook failed for order ${details.orderId}`,
  //   details
  // });
}

/**
 * Utilidades
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    queueStats: orderProcessingQueue.getStats()
  });
});

/**
 * Endpoint para consultar estado de un job
 */
app.get('/webhooks/jobs/:jobId', async (req, res) => {
  try {
    const job = await orderProcessingQueue.getJob(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job.id,
      state: await job.getState(),
      progress: job.progress(),
      attempts: job.attemptsMade,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manejo de errores global
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({ 
    error: 'Internal server error' 
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Webhook server running on port ${PORT}`);
});

module.exports = app;

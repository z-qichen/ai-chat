/**
 * 指标插件 —— 暴露 /api/metrics 供 Prometheus 抓取
 *
 * 收集：进程指标、HTTP 请求计数/耗时、事件循环延迟
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client'

// 启用默认指标（CPU、内存、事件循环等）
collectDefaultMetrics({ prefix: 'app_' })

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'HTTP 请求总数',
  labelNames: ['method', 'route', 'status_code'],
})

const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP 请求耗时（秒）',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
})

const appInfo = new Gauge({
  name: 'app_info',
  help: '应用信息',
  labelNames: ['version'],
})

async function metricsPlugin(app: FastifyInstance) {
  appInfo.labels('0.1.0').set(1)

  // 记录每个请求的指标
  app.addHook('onRequest', async (request: FastifyRequest) => {
    ;(request as any).__metricsTimer = process.hrtime.bigint()
  })

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const route = request.routeOptions.url ?? request.url ?? '/unknown'
    const method = request.method
    const statusCode = reply.statusCode.toString()

    httpRequestsTotal.labels(method, route, statusCode).inc()

    const start = (request as any).__metricsTimer as bigint
    if (start) {
      const durationS = Number(process.hrtime.bigint() - start) / 1e9
      httpRequestDurationSeconds.labels(method, route).observe(durationS)
    }
  })

  // 暴露指标端点
  app.get('/api/metrics', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } as any } }, async (_req, reply) => {
    reply.header('Content-Type', register.contentType)
    return reply.send(await register.metrics())
  })

  app.log.info('指标端点已注册 → /api/metrics')
}

export default fp(metricsPlugin, {
  name: 'metrics',
})

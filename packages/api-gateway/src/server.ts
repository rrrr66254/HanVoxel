import express from 'express';
import cors from 'cors';
import presetRoutes from './routes/preset.routes';
import spatialObjectRoutes from './routes/spatial-object.routes';
import warehouseTemplateRoutes from './routes/warehouse-template.routes';
import planRoutes from './routes/plan.routes';
import alertRoutes from './routes/alert.routes';
import slaRoutes from './routes/sla.routes';
import qcRoutes from './routes/qc.routes';
import pickingRoutes from './routes/picking.routes';
import billingRoutes from './routes/billing.routes';
import erpRoutes from './routes/erp.routes';

const app = express();
const PORT = process.env.PORT ?? 3001;

// 미들웨어
app.use(cors());
app.use(express.json());

// API 라우트
app.use('/api/v1', presetRoutes);
app.use('/api/v1', spatialObjectRoutes);
app.use('/api/v1', warehouseTemplateRoutes);
app.use('/api/v1', planRoutes);
app.use('/api/v1', alertRoutes);
app.use('/api/v1', slaRoutes);
app.use('/api/v1', qcRoutes);
app.use('/api/v1', pickingRoutes);
app.use('/api/v1', billingRoutes);
app.use('/api/v1', erpRoutes);

// 헬스 체크
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

app.listen(PORT, () => {
  console.log(`[api-gateway] http://localhost:${PORT} 에서 실행 중`);
});

export default app;

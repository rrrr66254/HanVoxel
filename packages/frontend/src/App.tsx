import { WarehouseViewer } from './components/warehouse-viewer';
import { MOCK_WAREHOUSE } from './data/mock-warehouse';
import './index.css';

function App() {
  return (
    <div className="h-screen w-screen bg-gray-950">
      <WarehouseViewer objects={MOCK_WAREHOUSE} />
    </div>
  );
}

export default App;

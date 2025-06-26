// src/examples/Aulas/imageProcessing.tsx

import { useCallback, useState, FC, CSSProperties } from 'react';

// --- Importando os ícones de serviços AWS
import iconUser from '@/assets/Custom/user.png'; // Ícone genérico para usuário
import iconS3 from '@/assets/Storage/Simple-Storage-Service.svg';
import iconLambda from '@/assets/Compute/Lambda.svg';
import iconElastiCache from '@/assets/Database/ElastiCache.svg'; // Para representar o Redis

import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  NodeProps,
  Handle,
  Position,
  Node,
  Edge,
  MarkerType,
  Connection,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// --- Estilos para animação e estados
const CustomStyles = `
  @keyframes dashdraw { from { stroke-dashoffset: 200; } }
  .animated-edge .react-flow__edge-path { animation: dashdraw 10s linear infinite; }
  .success-edge .react-flow__edge-path { stroke: #28a745; stroke-width: 2.5; stroke-dasharray: 6; }
  .contention-edge .react-flow__edge-path { stroke: #ffc107; stroke-width: 2.5; stroke-dasharray: 3; }
`;

// --- Nós e Arestas
const defaultEdgeOptions = { type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#232f3e' } };

const nodeBaseStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '12px 18px', backgroundColor: '#fff', border: '2px solid #ddd',
  borderRadius: '8px', width: 200, textAlign: 'center', fontSize: '14px',
  boxShadow: '0 5px 8px rgba(0,0,0,0.06)', transition: 'all 0.4s ease',
};

const ServiceNode: FC<NodeProps> = ({ data, selected }) => {
  const dynamicStyle: CSSProperties = { ...nodeBaseStyle,
    borderColor: selected ? '#007bff' : data.isContending ? '#ffc107' : data.highlighted ? '#28a745' : '#ddd',
    transform: data.highlighted || data.isContending ? 'scale(1.05)' : 'scale(1)',
  };
  return (
    <div style={dynamicStyle}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <img src={data.icon as string} alt={data.label as string} style={{ width: 52, height: 52, marginBottom: 10 }} />
      <strong>{data.label as string}</strong>
      {data.subLabel && <span style={{fontSize: '12px', color: '#555', marginTop: '5px', fontStyle: 'italic'}}>{data.subLabel}</span>}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
};

const nodeTypes = { service: ServiceNode };

// --- Definição da Arquitetura
const initialNodes: Node[] = [
  { id: 'user', type: 'service', position: { x: -600, y: 300 }, data: { label: 'Usuário', icon: iconUser, subLabel: 'Faz upload da imagem' } },
  { id: 's3-raw', type: 'service', position: { x: -300, y: 300 }, data: { label: 'Bucket S3 (Imagens Brutas)', icon: iconS3, subLabel: 'Dispara evento "ObjectCreated"' } },
  { id: 'lambda', type: 'service', position: { x: 100, y: 300 }, data: { label: 'Lambda Processador', icon: iconLambda } },
  { id: 'redis', type: 'service', position: { x: 100, y: 50 }, data: { label: 'ElastiCache (Redis)', icon: iconElastiCache, subLabel: 'Mecanismo de Lock' } },
  { id: 's3-processed', type: 'service', position: { x: 500, y: 300 }, data: { label: 'Bucket S3 (Imagens Processadas)', icon: iconS3 } },
];

const initialEdges: Edge[] = [
  { id: 'e-user-s3', source: 'user', target: 's3-raw' },
  { id: 'e-s3-lambda', source: 's3-raw', target: 'lambda', label: 'S3 Event', style: { strokeDasharray: 5 } },
  { id: 'e-lambda-redis', source: 'lambda', target: 'redis', label: 'SETNX lock:image_id' },
  { id: 'e-lambda-s3', source: 'lambda', target: 's3-processed', label: 'Salva imagem' },
];

type SimState = 'idle' | 'single' | 'concurrent';

const ImageProcessingFlow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [simulation, setSimulation] = useState<SimState>('idle');

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  // Função para limpar estilos e resetar o estado
  const resetSimulation = () => {
    setSimulation('idle');
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, highlighted: false, isContending: false, subLabel: (initialNodes.find(initN => initN.id === n.id)?.data as any).subLabel || '' } })));
    setEdges(es => es.map(e => ({ ...e, className: '' })));
  };

  // Simulação de UM upload, passo a passo
  const runSingleUpload = () => {
    resetSimulation();
    setSimulation('single');
    
    const timeouts: NodeJS.Timeout[] = [];
    const highlightNode = (id: string, subLabel?: string) => setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, highlighted: true, subLabel: subLabel || n.data.subLabel } } : n));
    const highlightEdge = (id: string) => setEdges(eds => eds.map(e => e.id === id ? { ...e, className: 'success-edge animated-edge' } : e));
    
    timeouts.push(setTimeout(() => { highlightNode('user'); highlightNode('s3-raw'); highlightEdge('e-user-s3'); }, 500));
    timeouts.push(setTimeout(() => { highlightNode('lambda', 'Evento recebido'); highlightEdge('e-s3-lambda'); }, 1500));
    timeouts.push(setTimeout(() => { highlightNode('redis', 'Lock adquirido!'); highlightEdge('e-lambda-redis'); }, 2500));
    timeouts.push(setTimeout(() => { highlightNode('lambda', 'Processando Imagem...'); }, 3500));
    timeouts.push(setTimeout(() => { highlightNode('s3-processed'); highlightEdge('e-lambda-s3'); }, 4500));
    timeouts.push(setTimeout(() => { highlightNode('redis', 'Lock liberado'); }, 5500));
    
    // Cleanup timeouts if component unmounts
    return () => timeouts.forEach(clearTimeout);
  };

  // Simulação de DOIS uploads concorrentes para mostrar o lock em ação
  const runConcurrentUpload = () => {
    resetSimulation();
    setSimulation('concurrent');

    // Lambda 1 (sucesso)
    setNodes(nds => nds.map(n => ['user', 's3-raw', 'lambda', 'redis'].includes(n.id) ? { ...n, data: { ...n.data, highlighted: true } } : n));
    setNodes(nds => nds.map(n => n.id === 'redis' ? {...n, data: {...n.data, subLabel: 'Lock adquirido por Lambda 1'}} : n));
    setEdges(eds => eds.map(e => ['e-user-s3', 'e-s3-lambda', 'e-lambda-redis'].includes(e.id) ? { ...e, className: 'success-edge animated-edge' } : e));
    
    // Lambda 2 (contenção)
    setTimeout(() => {
        setNodes(nds => nds.map(n => n.id === 'lambda' ? { ...n, data: { ...n.data, isContending: true, subLabel: 'Nova invocação! Tenta o lock...' } } : n));
        setEdges(eds => eds.map(e => e.id === 'e-lambda-redis' ? { ...e, className: `${e.className} contention-edge` } : e));
    }, 1000);

    setTimeout(() => {
        setNodes(nds => nds.map(n => n.id === 'redis' ? { ...n, data: { ...n.data, isContending: true, subLabel: 'Lock negado para Lambda 2' } } : n));
    }, 2000);
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <style>{CustomStyles}</style>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} defaultEdgeOptions={defaultEdgeOptions} fitView>
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        <Panel position="top-left" style={{ padding: '10px', backgroundColor: '#f0f2f3', border: '1px solid #ddd', borderRadius: '8px', display: 'flex', gap: '10px' }}>
            <button onClick={runSingleUpload} disabled={simulation !== 'idle'}>▶️ Simular Upload Único</button>
            <button onClick={runConcurrentUpload} disabled={simulation !== 'idle'}>⏯️ Simular Upload Concorrente</button>
            <button onClick={resetSimulation} disabled={simulation === 'idle'}>🔁 Resetar</button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

const Lambda = () => (<ReactFlowProvider><ImageProcessingFlow /></ReactFlowProvider>);
export default Lambda;
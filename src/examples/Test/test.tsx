import { useCallback, useState, FC, CSSProperties } from 'react';
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
  useReactFlow,
  Panel,
  Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';


// Animação CSS para as arestas (sem alterações)
const CustomAnimatedEdgeStyle = `
  @keyframes dashdraw { from { stroke-dashoffset: 1000; } }
  .animated-edge .react-flow__edge-path { stroke-dasharray: 5; animation: dashdraw 40s linear infinite; }
`;

// Opções padrão para as arestas (sem alterações)
const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#232f3e' },
  style: { strokeWidth: 2, stroke: '#232f3e' },
};

// =================================================================================
// COMPONENTE DE NÓ CUSTOMIZADO PARA EXIBIR Grupos
// =================================================================================
const AwsGroupNode: FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      style={{
        backgroundColor: 'rgba(243, 245, 246, 0.8)',
        border: selected ? '2px dashed #007acc' : '1px dashed #232f3e',
        width: data.width as string || 650,
        height: data.height as string || 350,
        borderRadius: 8,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          fontWeight: 'bold',
          fontSize: 14,
          color: '#232f3e',
        }}
      >
        {data.label as string}
      </div>
    </div>
  );
};

// =================================================================================
// COMPONENTE DE NÓ CUSTOMIZADO PARA EXIBIR ÍCONES DA AWS (sem alterações)
// =================================================================================
const AwsIconNode: FC<NodeProps> = ({ data }) => {
  const nodeStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    width: 150,
    textAlign: 'center',
    fontSize: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  };

  const iconStyle: CSSProperties = {
    width: 48,
    height: 48,
    marginBottom: 8,
  };

  return (
    <div style={nodeStyle}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <img src={data.icon as string} alt={data.label as string} style={iconStyle} />
      <strong>{data.label as string}</strong>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
};

// Mapeia o nome do tipo de nó para o componente React.
const nodeTypes = {
  awsIconNode: AwsIconNode,
  awsGroupNode: AwsGroupNode,
};

// =================================================================================
// ESTADO INICIAL DO DIAGRAMA (SEPARADO)
// =================================================================================

// 1. Definições dos Nós (sem as posições)
// Aqui definimos a estrutura, os dados e o tipo de cada nó.
const initialNodeDefinitions: Omit<Node, 'position'>[] = [
  {
    id: 'api-gateway',
    type: 'awsIconNode',
    data: {
      label: 'API Gateway',
      icon: '/assets/App-Integration/API-Gateway.svg',
    },
  },
  {
    id: 'kafka-cluster',
    type: 'awsGroupNode',
    data: {
      label: 'Kafka Cluster (Amazon MSK)',
      width: 650,
      height: 350,
    },
    style: {
      width: 650,
      height: 350,
    },
  },
  {
    id: 'kafka-topic',
    type: 'awsIconNode',
    parentId: 'kafka-cluster',
    extent: 'parent',
    data: {
      label: 'Tópico Kafka',
      icon: '/assets/Analytics/Managed-Streaming-for-Apache-Kafka.svg',
    },
  },
  {
    id: 'ms-1',
    type: 'awsIconNode',
    parentId: 'kafka-cluster',
    extent: 'parent',
    data: {
      label: 'Microsserviço A',
      icon: '/assets/Compute/EC2.svg'
    },
  },
  {
    id: 'ms-2',
    type: 'awsIconNode',
    data: {
      label: 'Microsserviço B',
      icon: '/assets/Compute/EC2.svg'
    },
  },
  {
    id: 'lambda-1',
    type: 'awsIconNode',
    data: {
      label: 'Função Lambda A',
      icon: '/assets/Compute/Lambda.svg'
    },
  },
  {
    id: 'lambda-2',
    type: 'awsIconNode',
    data: {
      label: 'Função Lambda B',
      icon: '/assets/Compute/Lambda.svg'
    },
  },
  {
    id: 'dynamodb',
    type: 'awsIconNode',
    data: {
      label: 'DynamoDB',
      icon: '/assets/Database/DynamoDB.svg'
    },
  },
];

// 2. Posições iniciais dos nós
// Este é o objeto que você pode atualizar com os dados salvos.
const initialNodePositions: { [key: string]: { x: number, y: number } } = 
{
  "api-gateway": {
    "x": -289.83,
    "y": 310.84
  },
  "kafka-cluster": {
    "x": 42.13,
    "y": 147.21
  },
  "kafka-topic": {
    "x": 245.96,
    "y": 134.21
  },
  "ms-1": {
    "x": -126.45,
    "y": 485.54
  },
  "ms-2": {
    "x": 308.05,
    "y": 219.55
  },
  "lambda-1": {
    "x": 795.33,
    "y": 258.6
  },
  "lambda-2": {
    "x": 796.15,
    "y": 371.39
  },
  "dynamodb": {
    "x": 1070.32,
    "y": 191.89
  }
}

// 3. Definição inicial das arestas
const initialEdges: Edge[] = [
    { id: 'e-api-kafka', source: 'api-gateway', target: 'kafka-topic', animated: true, className: 'animated-edge' },
    { id: 'e-kafka-ms1', source: 'kafka-topic', target: 'ms-1', animated: true, className: 'animated-edge' },
    { id: 'e-kafka-ms2', source: 'kafka-topic', target: 'ms-2', animated: true, className: 'animated-edge' },
    { id: 'e-kafka-lambda1', source: 'kafka-topic', target: 'lambda-1', animated: true, className: 'animated-edge' },
    { id: 'e-kafka-lambda2', source: 'kafka-topic', target: 'lambda-2', animated: true, className: 'animated-edge' },
    { id: 'e-ms1-db', source: 'ms-1', target: 'dynamodb', animated: true, className: 'animated-edge' },
    { id: 'e-ms2-db', source: 'ms-2', target: 'dynamodb', animated: true, className: 'animated-edge' },
    { id: 'e-lambda1-db', source: 'lambda-1', target: 'dynamodb', animated: true, className: 'animated-edge' },
    { id: 'e-lambda2-db', source: 'lambda-2', target: 'dynamodb', animated: true, className: 'animated-edge' },
];

const initialViewport: Viewport = { x: 504.88, y: 190.10, zoom: 1.22 };

// Combina as definições com as posições para criar o estado inicial dos nós
const getInitialNodes = (): Node[] => {
  return initialNodeDefinitions.map(nodeDef => ({
    ...nodeDef,
    position: initialNodePositions[nodeDef.id] || { x: 0, y: 0 }, // Fallback para posição 0,0
  }));
};


// =================================================================================
// COMPONENTE DE CONTROLES PARA SALVAR (CORRIGIDO)
// =================================================================================
const SaveControls = () => {
  const { getNodes } = useReactFlow();
  const [output, setOutput] = useState('');

  // CORREÇÃO: Esta função agora extrai e formata apenas as posições dos nós.
  const handleSave = useCallback(() => {
    const currentNodes = getNodes();
    
    // Usa 'reduce' para transformar o array de nós em um objeto de posições
    const nodePositions = currentNodes.reduce((acc, node) => {
      // Arredonda os valores para 2 casas decimais para um JSON mais limpo
      acc[node.id] = {
        x: Math.round(node.position.x * 100) / 100,
        y: Math.round(node.position.y * 100) / 100,
      };
      return acc;
    }, {} as { [key: string]: { x: number, y: number } });

    const positionsJson = JSON.stringify(nodePositions, null, 2);
    setOutput(positionsJson);
    console.log('Posições dos Nós:', positionsJson);
  }, [getNodes]);
  
  const textAreaStyle: CSSProperties = {
      position: 'absolute', top: '50px', right: '10px', width: '350px',
      height: '400px', zIndex: 10, border: '2px solid #333',
      borderRadius: '8px', padding: '10px', fontFamily: 'monospace',
      fontSize: '12px', backgroundColor: '#f5f5f5',
  };

  return (
    <Panel position="top-right">
      <button onClick={handleSave}>Salvar Posições</button>
      {output && <textarea style={textAreaStyle} readOnly value={output} />}
    </Panel>
  );
};


// =================================================================================
// COMPONENTE PRINCIPAL DO DIAGRAMA
// =================================================================================
const AwsArchitectureDiagram = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <style>{CustomAnimatedEdgeStyle}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodeOrigin={[0.5, 0.5]}
        defaultViewport={initialViewport}
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        <SaveControls />
      </ReactFlow>
    </div>
  );
};

export default AwsArchitectureDiagram;

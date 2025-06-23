import { useCallback, useState, FC, CSSProperties, useEffect } from 'react';

import iconAmplify              from '@/assets/Front-End-Web-Mobile/Amplify.svg';
import iconAppMobile            from '@/assets/App-Integration/Console-Mobile-Application.svg';
import iconApiGateway           from '@/assets/App-Integration/API-Gateway.svg';
import iconCognito              from '@/assets/Security-Identity-Compliance/Cognito.svg';
import iconEc2                  from '@/assets/Compute/EC2.svg';
import iconLambda               from '@/assets/Compute/Lambda.svg';
import iconDynamo               from '@/assets/Database/DynamoDB.svg';
import iconSns                  from '@/assets/App-Integration/Simple-Notification-Service.svg';
  
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
  NodeOrigin,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Animação CSS para as arestas
const CustomAnimatedEdgeStyle = `
  @keyframes dashdraw { from { stroke-dashoffset: 1000; } }
  .animated-edge .react-flow__edge-path {
    stroke-dasharray: 5;
    animation: dashdraw 40s linear infinite;
  }
  .highlighted-edge .react-flow__edge-path {
    stroke:rgb(204, 0, 44);
    stroke-width: 2.5;
    strokeWidth: 4
  }
  .auth-edge .react-flow__edge-path {
    stroke: #ff9900;
    stroke-dasharray: 3;
    animation: dashdraw 5s linear infinite;
  }
`;

// Opções padrão para as arestas
const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#232f3e' },
  style: { strokeWidth: 1 },
};

// Estilo base para os nós
const nodeBaseStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 15px',
  backgroundColor: '#fff',
  border: '1px solid #ddd',
  borderRadius: '8px',
  width: 170,
  textAlign: 'center',
  fontSize: '13px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  transition: 'all 0.2s ease-in-out',
};

// Nó para Grupos Lógicos (AWS-1, Cluster)
const GroupNode: FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: selected ? '2px solid rgb(204, 0, 44)' : '2px dashed #99aab4',
        borderRadius: 12,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 15,
          fontWeight: 'bold',
          fontSize: 16,
          color: '#232f3e',
        }}
      >
        {data.label as string}
      </div>
    </div>
  );
};

// Nó para Ícones da AWS
const AwsIconNode: FC<NodeProps> = ({ data, selected }) => {
    const isHighlighted = data.highlighted;
    const isCached = data.isCached;

    const dynamicStyle: CSSProperties = {
        ...nodeBaseStyle,
        border: selected ? '2px solid #252f3e' : (isHighlighted ? '2px solid rgb(204, 0, 44)' : '1px solid #ddd'),
        backgroundColor: isCached ? '#d1eaff' : '#fff',
        transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
    };

    return (
        <div style={dynamicStyle}>
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
            <img src={data.icon as string} alt={data.label as string} style={{ width: 48, height: 48, marginBottom: 8 }} />
            <strong>{data.label as string}</strong>
            {typeof data.subLabel === 'string' && <span style={{fontSize: '10px', color: '#555', marginTop: '4px'}}>{data.subLabel}</span>}
            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        </div>
    );
};

// Nó para Simular Clientes Externos
const ClientNode: FC<NodeProps> = ({ data, selected }) => {
    const isHighlighted = data.highlighted;
     const dynamicStyle: CSSProperties = {
        ...nodeBaseStyle,
        border: selected ? '2px solid #252f3e' : (isHighlighted ? '2px solid #ff9900' : '1px solid #ddd'),
        backgroundColor: '#f7f7f7',
    };
    return (
     <div style={dynamicStyle}>
        <img src={data.icon as string} alt={data.label as string} style={{ width: 48, height: 48, marginBottom: 8 }} />
        <strong>{data.label as string}</strong>
        <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
     </div>
    );
};

// Mapeamento dos tipos de nós
const nodeTypes = {
  awsIcon: AwsIconNode,
  group: GroupNode,
  client: ClientNode,
};

// =================================================================================
// ESTADO INICIAL DO DIAGRAMA (ESTRUTURA DA ARQUITETURA)
// =================================================================================

const nodeOrigin: NodeOrigin = [0.5, 0.5];

// 1. Definições dos Nós (Estrutura, dados, tipo)
const initialNodeDefinitions: Omit<Node, 'position'>[] = [
  { id: 'client-web',    type: 'client', data: { label: 'Aplicação Web (React)',    icon: iconAmplify } },
  { id: 'client-mobile', type: 'client', data: { label: 'Aplicação Mobile (Flutter)', icon: iconAppMobile } },
  { id: 'aws-1', type: 'group',
    data: { label: 'AWS' },
    style: { width: '1500px', height: '950px', backgroundColor: 'rgba(239, 242, 243, 0.7)' }
  },
  { id: 'bff-web',   type: 'awsIcon', parentId: 'aws-1', data: { label: 'Web BFF Gateway',    icon: iconApiGateway } },
  { id: 'bff-mobile',type: 'awsIcon', parentId: 'aws-1', data: { label: 'Mobile BFF Gateway', icon: iconApiGateway } },
  { id: 'auth-service', type: 'awsIcon', parentId: 'aws-1',
    data: { label: 'Serviço de Autenticação', icon: iconCognito, latency: '15ms', reqs: '150/s' }
  },
  { id: 'ms-1', type: 'awsIcon', parentId: 'aws-1',
    data: { label: 'Microsserviço de Pedidos',  icon: iconEc2, latency: '50ms', reqs: '30/s' }
  },
  { id: 'ms-2', type: 'awsIcon', parentId: 'aws-1',
    data: { label: 'Microsserviço de Estoque', icon: iconEc2, latency: '35ms', reqs: '30/s' }
  },
  { id: 'lambda-1', type: 'awsIcon', parentId: 'aws-1',
    data: { label: 'Lambda de Notificação', icon: iconLambda, latency: '25ms', reqs: '30/s' }
  },
  { id: 'dynamodb', type: 'awsIcon', parentId: 'aws-1',
    data: { label: 'DynamoDB (Pedidos)', icon: iconDynamo }
  },
  { id: 'notification-service', type: 'awsIcon', parentId: 'aws-1',
    data: { label: 'Serviço de Notificação', icon: iconSns }
  },
];

// 2. Posições iniciais dos nós
const initialNodePositions: { [key: string]: { x: number, y: number } } = {
  "client-web": {
    "x": -1824,
    "y": -331
  },
  "client-mobile": {
    "x": -1799,
    "y": -542
  },
  "aws-1": {
    "x": -389,
    "y": -55
  },
  "bff-web": {
    "x": -343,
    "y": 355
  },
  "bff-mobile": {
    "x": -248,
    "y": 150
  },
  "auth-service": {
    "x": 408,
    "y": 820
  },
  "ms-1": {
    "x": 825,
    "y": 354
  },
  "ms-2": {
    "x": 823,
    "y": 485
  },
  "lambda-1": {
    "x": 727,
    "y": 667
  },
  "dynamodb": {
    "x": 1356,
    "y": 584
  },
  "notification-service": {
    "x": 1356,
    "y": 797
  }
}

// 3. Função para combinar definições e posições
const getInitialNodes = (): Node[] => {
  return initialNodeDefinitions.map(nodeDef => ({
    ...nodeDef,
    position: initialNodePositions[nodeDef.id] || { x: 0, y: 0 },
  }));
};

const initialEdges: Edge[] = [
  // Conexões dos Clientes aos Gateways
  { id: 'e-client-web-bff', source: 'client-web', target: 'bff-web', zIndex: 10 },
  { id: 'e-client-mobile-bff', source: 'client-mobile', target: 'bff-mobile', zIndex: 10 },

  // Conexões de Autenticação
  { id: 'e-bff-web-auth', source: 'bff-web', target: 'auth-service', label: 'Valida JWT', type: 'step', zIndex: 10 },
  { id: 'e-bff-mobile-auth', source: 'bff-mobile', target: 'auth-service', label: 'Valida JWT', type: 'step', zIndex: 10 },

  // Conexões diretas Gateway -> Microsserviços / Lambda (substituindo Kafka)
  { id: 'e-bff-web-ms1', source: 'bff-web', target: 'ms-1', zIndex: 10 },
  { id: 'e-bff-web-ms2', source: 'bff-web', target: 'ms-2', zIndex: 10 },
  { id: 'e-bff-web-lambda1', source: 'bff-web', target: 'lambda-1', zIndex: 10 },

  { id: 'e-bff-mobile-ms1', source: 'bff-mobile', target: 'ms-1', zIndex: 10 },
  { id: 'e-bff-mobile-ms2', source: 'bff-mobile', target: 'ms-2', zIndex: 10 },
  { id: 'e-bff-mobile-lambda1', source: 'bff-mobile', target: 'lambda-1', zIndex: 10 },

  // Conexões dos Consumidores para outros serviços
  { id: 'e-ms1-db', source: 'ms-1', target: 'dynamodb', zIndex: 10 },
  { id: 'e-ms2-db', source: 'ms-2', target: 'dynamodb', zIndex: 10 },
  { id: 'e-lambda1-sns', source: 'lambda-1', target: 'notification-service', zIndex: 10 },
];

// =================================================================================
// PAINÉIS DE INTERAÇÃO E DETALHES
// =================================================================================

// Painel para Salvar o Layout
const SaveLayoutControls = () => {
  const { getNodes } = useReactFlow();
  const [output, setOutput] = useState('');

  const onSave = useCallback(() => {
    const nodes = getNodes();
    const nodePositions = nodes.reduce((acc, node) => {
      acc[node.id] = {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
      };
      return acc;
    }, {} as { [key: string]: { x: number; y: number } });

    const positionsJson = JSON.stringify(nodePositions, null, 2);
    setOutput(positionsJson);
  }, [getNodes]);

  return (
    <Panel position="bottom-center" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', backgroundColor: '#f0f2f3', border: '1px solid #ddd', borderRadius: '8px', }}>
      <button onClick={onSave}>Salvar Layout</button>
      {output && (
        <textarea
          readOnly
          style={{ width: '350px', height: '300px', fontFamily: 'monospace' }}
          value={output}
        />
      )}
    </Panel>
  );
};

// Painel de Controles para simular interações
const InteractionPanel = ({
    onToggleCache,
    isCacheActive,
    onToggleWebRequest,
    onToggleMobileRequest,
    isWebRequestRunning,
    isMobileRequestRunning,
}: {
    onToggleCache: () => void;
    isCacheActive: boolean;
    onToggleWebRequest: () => void;
    onToggleMobileRequest: () => void;
    isWebRequestRunning: boolean;
    isMobileRequestRunning: boolean;
}) => {
    return (
        <Panel position="top-left" style={{ padding: '10px', backgroundColor: '#f0f2f3', border: '1px solid #ddd', borderRadius: '8px', display: 'flex', gap: '10px' }}>
            <button 
                onClick={onToggleWebRequest}
                style={{
                    backgroundColor: isWebRequestRunning ? '#cc002c' : '#fff',
                    color: isWebRequestRunning ? '#fff' : '#000',
                    border: isWebRequestRunning ? '1px solid #cc002c' : '1px solid #ccc'
                }}
            >
                Disparar Requisição Web
            </button>
            
            <button
                onClick={onToggleMobileRequest}
                style={{
                    backgroundColor: isMobileRequestRunning ? '#cc002c' : '#fff',
                    color: isMobileRequestRunning ? '#fff' : '#000',
                    border: isMobileRequestRunning ? '1px solid #cc002c' : '1px solid #ccc'
                }}
            >
                Disparar Requisição Mobile
            </button>
            
            <button onClick={onToggleCache} style={{ backgroundColor: isCacheActive ? '#007acc' : '#fff', color: isCacheActive ? '#fff' : '#000' }}>
              Simular Cache na API {isCacheActive ? '(Ativo)' : '(Inativo)'}
            </button>
        </Panel>
    );
};

// Painel para exibir detalhes do nó selecionado
const DetailsPanel = ({ node }: { node: Node | null }) => {
    if (!node) {
        return (
            <Panel position="top-right" style={{ padding: '15px', width: '250px', backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid #ddd', borderRadius: '8px'}}>
                <h3 style={{marginTop: 0}}>Painel de Detalhes</h3>
                {/* <p>Arraste os nós para organizá-los.</p> */}
                <p>Clique em um nó para ver detalhes ou nos botões de simulação para ver o fluxo de dados.</p>
                {/* <p>Use o botão "Salvar Layout" na parte inferior para exportar as novas posições.</p> */}
            </Panel>
        );
    }

    return (
        <Panel position="top-right" style={{ padding: '20px', width: '250px', backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>{node.data.label as string}</h3>
            <p><strong>ID:</strong> {node.id}</p>
            <p><strong>Tipo:</strong> {node.type}</p>
            <p><strong>Posição:</strong> X: {Math.round(node.position.x)}, Y: {Math.round(node.position.y)}</p>
            { typeof node.data.reqs === 'string' && typeof node.data.latency === 'string' && (node.data.latency || node.data.reqs) &&
              <>
                <hr/>
                <h4 style={{marginBottom: '10px'}}>Métricas (Exemplo):</h4>
                {node.data.latency && <p><strong>Latência:</strong> {node.data.latency}</p>}
                {node.data.reqs && <p><strong>Req/s:</strong> {node.data.reqs}</p>}
              </>
            }
        </Panel>
    );
};

// =================================================================================
// COMPONENTE PRINCIPAL DO DIAGRAMA
// =================================================================================
const AwsArchitectureDiagramFlow = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isCacheActive, setIsCacheActive] = useState(false);
    const [isWebRequestRunning, setIsWebRequestRunning] = useState(false);
    const [isMobileRequestRunning, setIsMobileRequestRunning] = useState(false);

    const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const handleNodeClick: any = useCallback((event: any, node: any) => {
        setSelectedNode(node);
    }, []);

    const resetHighlights = () => {
        setNodes((nds) =>
            nds.map((n) => ({ ...n, data: { ...n.data, highlighted: false } }))
        );
        setEdges((eds) =>
            eds.map((e) => ({
                ...e,
                className: e.className
                            ?.replace('highlighted-edge', '')
                            .replace('auth-edge', '')
                            .replace('animated-edge', '')
                            .trim()
            }))
        );
    };

    const highlightPath = (path: string[], authPath: string[] = []) => {
        resetHighlights();

        setNodes((nds) =>
            nds.map((n) => ({
                ...n,
                data: { ...n.data, highlighted: path.includes(n.id) || authPath.includes(n.id) },
            }))
        );

        setEdges((eds) =>
            eds.map((e) => {
                const isAuthEdge = authPath.includes(e.source) && authPath.includes(e.target);
                const isMainPathEdge = path.includes(e.source) && path.includes(e.target);
                let newClassName = e.className || '';
                
                if (isAuthEdge) {
                    newClassName = `${newClassName} auth-edge`.trim();
                }
                if(isMainPathEdge){
                    newClassName = `${newClassName} highlighted-edge animated-edge`.trim();
                }
                return { ...e, className: newClassName };
            })
        );
    };
    
    const handleToggleWebRequest = () => {
        if (isWebRequestRunning) {
            resetHighlights();
            setIsWebRequestRunning(false);
        } else {
            const bff = 'bff-web';
            const authPath = [bff, 'auth-service'];

            if (isCacheActive) {
                const cachePath = ['client-web', bff];
                highlightPath(cachePath, authPath);
            } else {
                const commonPath = ['ms-1', 'ms-2', 'lambda-1', 'dynamodb', 'notification-service'];
                const clientPath = ['client-web', bff, ...commonPath];
                highlightPath(clientPath, authPath);
            }
            setIsWebRequestRunning(true);
        }
    };

    const handleToggleMobileRequest = () => {
        if (isMobileRequestRunning) {
            resetHighlights();
            setIsMobileRequestRunning(false);
        } else {
            const bff = 'bff-mobile';
            const authPath = [bff, 'auth-service'];
            const commonPath = ['ms-1', 'ms-2', 'lambda-1', 'dynamodb', 'notification-service'];
            const clientPath = ['client-mobile', bff, ...commonPath];
            
            highlightPath(clientPath, authPath);
            setIsMobileRequestRunning(true);
        }
    };

    const handleToggleCache = () => {
        setIsCacheActive(prev => !prev);
    };

    useEffect(() => {
        setNodes(nds => nds.map(n => {
            if (n.id === 'bff-web') {
                return { ...n, data: { ...n.data, isCached: isCacheActive, subLabel: isCacheActive ? 'Cache Ativado' : '' }};
            }
            return n;
        }));
    }, [isCacheActive, setNodes]);


    return (
        <div style={{ height: '100vh', width: '100%' }}>
            <style>{CustomAnimatedEdgeStyle}</style>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onPaneClick={() => setSelectedNode(null)}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                nodeOrigin={nodeOrigin}
                fitView
            >
                <Controls />
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
                <InteractionPanel 
                    onToggleWebRequest={handleToggleWebRequest}
                    onToggleMobileRequest={handleToggleMobileRequest}
                    onToggleCache={handleToggleCache}
                    isCacheActive={isCacheActive}
                    isWebRequestRunning={isWebRequestRunning}
                    isMobileRequestRunning={isMobileRequestRunning}
                />
                <DetailsPanel node={selectedNode} />
                {/* <SaveLayoutControls /> */}
            </ReactFlow>
        </div>
    );
};

// Componente Wrapper com o Provider para habilitar o hook useReactFlow
const Gateway = () => (
  <ReactFlowProvider>
    <AwsArchitectureDiagramFlow />
  </ReactFlowProvider>
);

export default Gateway;

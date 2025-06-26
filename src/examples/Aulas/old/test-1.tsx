import { useCallback, useState, FC, CSSProperties, useEffect } from 'react';
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

// Animação CSS para as arestas, com novos estilos para diferentes cenários
const CustomAnimatedEdgeStyle = `
  @keyframes dashdraw { from { stroke-dashoffset: 1000; } }

  .animated-edge .react-flow__edge-path {
    stroke-dasharray: 5;
    animation: dashdraw 40s linear infinite;
  }
  .highlighted-edge .react-flow__edge-path {
    stroke: #007acc; /* Azul para fluxo principal */
    stroke-width: 2.5;
  }
  .auth-edge .react-flow__edge-path {
    stroke: #ff9900; /* Laranja para fluxo de autenticação */
    stroke-dasharray: 3;
    animation: dashdraw 5s linear infinite;
    stroke-width: 2.5;
  }
  .direct-access-edge .react-flow__edge-path {
    stroke: #d13212; /* Vermelho para acesso direto (indesejado) */
    stroke-width: 2.5;
    stroke-dasharray: 4;
  }
`;

// Opções padrão para as arestas
const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#232f3e' },
  style: { strokeWidth: 1.5 },
};

// Estilo base para os nós
const nodeBaseStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '15px 20px',
  backgroundColor: '#fff',
  border: '2px solid transparent',
  borderRadius: '8px',
  width: 180,
  textAlign: 'center',
  fontSize: '13px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease-in-out',
};

// Nó para Grupos Lógicos (AWS, Microsserviços)
const GroupNode: FC<NodeProps> = ({ data }) => (
  <div style={{ width: '100%', height: '100%', border: '2px dashed #99aab4', borderRadius: 12, position: 'relative' }}>
    <div style={{ position: 'absolute', top: 10, left: 15, fontWeight: 'bold', fontSize: 16, color: '#232f3e' }}>
      {data.label as string}
    </div>
  </div>
);

// Nó genérico para ícones da AWS e outros serviços
const ServiceNode: FC<NodeProps> = ({ data, selected }) => {
    const isHighlighted = data.highlighted;
    const isCached = data.isCached;

    const dynamicStyle: CSSProperties = {
        ...nodeBaseStyle,
        borderColor: selected ? '#252f3e' : (isHighlighted ? '#007acc' : 'transparent'),
        backgroundColor: isCached ? '#d1eaff' : '#fff',
        transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
        ...(data.isAuth && isHighlighted && { borderColor: '#ff9900' }), // Borda laranja para auth
        ...(data.isDirectAccess && isHighlighted && { borderColor: '#d13212' }), // Borda vermelha para acesso direto
    };

    return (
        <div style={dynamicStyle}>
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
            <img src={data.icon as string} alt={data.label as string} style={{ width: 48, height: 48, marginBottom: 8 }} />
            <strong>{data.label as string}</strong>
            {typeof data.subLabel === 'string' && <span style={{fontSize: '11px', color: '#007acc', marginTop: '5px', fontWeight: 'bold'}}>{data.subLabel}</span>}
            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        </div>
    );
};

// Mapeamento dos tipos de nós
const nodeTypes = {
  service: ServiceNode,
  group: GroupNode,
};

// =================================================================================
// ESTADO INICIAL DO DIAGRAMA (ESTRUTURA DA ARQUITETURA DO GATEWAY)
// =================================================================================

const nodeOrigin: NodeOrigin = [0.5, 0.5];

// 1. Definições dos Nós
const initialNodeDefinitions: Omit<Node, 'position'>[] = [
  // Clientes
  { id: 'client-web', type: 'service', data: { label: 'Aplicação Web', icon: '/assets/Front-End-Web-Mobile/Amplify.svg' }},
  { id: 'client-mobile', type: 'service', data: { label: 'Aplicação Mobile', icon: '/assets/App-Integration/Console-Mobile-Application.svg' }},

  // Grupo AWS
  {
    id: 'aws-group',
    type: 'group',
    data: { label: 'Nuvem AWS' },
    style: { width: '1200px', height: '800px', backgroundColor: 'rgba(239, 242, 243, 0.7)' },
  },
  
  // Peças Centrais
  { id: 'api-gateway', type: 'service', parentId: 'aws-group', data: { label: 'API Gateway', icon: '/assets/App-Integration/API-Gateway.svg' }},
  { id: 'auth-service', type: 'service', parentId: 'aws-group', data: { label: 'Serviço de Autenticação', icon: '/assets/Security-Identity-Compliance/Cognito.svg', isAuth: true }},
  { id: 'logging-service', type: 'service', parentId: 'aws-group', data: { label: 'Logs & Métricas', icon: '/assets/Management-Governance/CloudWatch.svg' }},

  // Microsserviços
  {
    id: 'services-group',
    type: 'group',
    parentId: 'aws-group',
    data: { label: 'Microsserviços' },
    style: { width: '600px', height: '450px', backgroundColor: 'rgba(224, 238, 255, 0.8)' },
  },
  { id: 'service-orders', type: 'service', parentId: 'services-group', data: { label: 'Serviço de Pedidos', icon: '/assets/Compute/EC2.svg', isDirectAccess: true }},
  { id: 'service-users', type: 'service', parentId: 'services-group', data: { label: 'Serviço de Usuários', icon: '/assets/Compute/Lambda.svg', isDirectAccess: true }},
  { id: 'service-products', type: 'service', parentId: 'services-group', data: { label: 'Serviço de Produtos', icon: '/assets/Compute/Fargate.svg', isDirectAccess: true }},

  // Banco de dados
  { id: 'database', type: 'service', parentId: 'services-group', data: { label: 'Banco de Dados', icon: '/assets/Database/DynamoDB.svg' }},
];

// 2. Posições iniciais dos nós
const initialNodePositions: { [key: string]: { x: number, y: number } } = {
  "client-web": { "x": -950, "y": -150 },
  "client-mobile": { "x": -950, "y": 150 },
  "aws-group": { "x": 0, "y": 0 },
  "api-gateway": { "x": -350, "y": 0 },
  "auth-service": { "x": -350, "y": 250 },
  "logging-service": { "x": -50, "y": 250 },
  "services-group": { "x": 250, "y": 0 },
  "service-orders": { "x": 200, "y": -120 },
  "service-users": { "x": 200, "y": 0 },
  "service-products": { "x": 200, "y": 120 },
  "database": { "x": 450, "y": 0 }
};

// 3. Função para combinar definições e posições
const getInitialNodes = (): Node[] => {
  return initialNodeDefinitions.map(nodeDef => ({
    ...nodeDef,
    position: initialNodePositions[nodeDef.id] || { x: 0, y: 0 },
  }));
};

// 4. Definições das Arestas para todos os cenários
const initialEdges: Edge[] = [
  // Fluxo via Gateway
  { id: 'e-client-web-gateway', source: 'client-web', target: 'api-gateway' },
  { id: 'e-client-mobile-gateway', source: 'client-mobile', target: 'api-gateway' },
  // Gateway -> Auth
  { id: 'e-gateway-auth', source: 'api-gateway', target: 'auth-service', type: 'step' },
  // Gateway -> Logging
  { id: 'e-gateway-logging', source: 'api-gateway', target: 'logging-service', type: 'step' },
  // Gateway -> Roteamento para Microsserviços
  { id: 'e-gateway-orders', source: 'api-gateway', target: 'service-orders' },
  { id: 'e-gateway-users', source: 'api-gateway', target: 'service-users' },
  { id: 'e-gateway-products', source: 'api-gateway', target: 'service-products' },
  // Microsserviços -> DB
  { id: 'e-orders-db', source: 'service-orders', target: 'database' },
  { id: 'e-users-db', source: 'service-users', target: 'database' },
  { id: 'e-products-db', source: 'service-products', target: 'database' },
  // Fluxo de Acesso Direto (problema a ser resolvido pelo gateway)
  { id: 'e-direct-web-orders', source: 'client-web', target: 'service-orders', type: 'step' },
  { id: 'e-direct-web-users', source: 'client-web', target: 'service-users', type: 'step' },
  { id: 'e-direct-mobile-products', source: 'client-mobile', target: 'service-products', type: 'step' },
];

// =================================================================================
// PAINÉIS DE INTERAÇÃO E DETALHES
// =================================================================================

// Painel de Controles para simular os cenários
const InteractionPanel = ({ onScenarioSelect, activeScenario }: {
    onScenarioSelect: (scenario: string | null) => void;
    activeScenario: string | null;
}) => {
    const scenarios = [
        { id: 'direct-access', label: 'Cenário 1: Acesso Direto' },
        { id: 'auth', label: 'Cenário 2: Autenticação via Gateway' },
        { id: 'routing', label: 'Cenário 3: Roteamento via Gateway' },
        { id: 'caching', label: 'Cenário 4: Cache no Gateway' },
    ];
    return (
        <Panel position="top-left" style={{ padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px', width: '280px' }}>
             <h3 style={{marginTop: 0, marginBottom: '10px', textAlign: 'center'}}>Funcionalidades do API Gateway</h3>
            {scenarios.map(s => (
                <button 
                    key={s.id}
                    onClick={() => onScenarioSelect(activeScenario === s.id ? null : s.id)}
                    style={{
                        backgroundColor: activeScenario === s.id ? '#007acc' : '#fff',
                        color: activeScenario === s.id ? '#fff' : '#212529',
                        border: `1px solid ${activeScenario === s.id ? '#0056b3' : '#ced4da'}`,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                >
                    {s.label} {activeScenario === s.id ? ' (Ativo)' : ''}
                </button>
            ))}
             {activeScenario && (
                <button
                    onClick={() => onScenarioSelect(null)}
                    style={{
                        backgroundColor: '#6c757d',
                        color: '#fff',
                        border: '1px solid #5a6268',
                        marginTop: '5px',
                    }}
                >
                    Resetar Simulação
                </button>
             )}
        </Panel>
    );
};

// Painel para exibir detalhes do nó selecionado
const DetailsPanel = ({ node, scenario }: { node: Node | null; scenario: string | null }) => {
    const descriptions: {[key: string]: {title: string, text: string}} = {
      'direct-access': {
          title: 'Cenário 1: Acesso Direto',
          text: 'Sem um Gateway, o cliente precisa conhecer e se conectar a cada microsserviço individualmente. Isso aumenta a complexidade no front-end, dificulta a segurança e a manutenção.'
      },
      'auth': {
          title: 'Cenário 2: Autenticação',
          text: 'O Gateway centraliza a autenticação. Ele intercepta a requisição, valida o token com um serviço de identidade (Ex: Cognito) e só então repassa a chamada para o microsserviço, que não precisa mais se preocupar com essa lógica.'
      },
      'routing': {
          title: 'Cenário 3: Roteamento',
          text: 'O Gateway atua como um ponto de entrada único. Com base na rota da requisição (ex: /pedidos), ele direciona o tráfego para o microsserviço correto, abstraindo a complexidade da infraestrutura interna.'
      },
      'caching': {
          title: 'Cenário 4: Cache',
          text: 'Para requisições frequentes e que não mudam a todo momento, o Gateway pode armazenar a resposta em cache. Requisições futuras são respondidas diretamente pelo Gateway, reduzindo a latência e a carga nos serviços.'
      },
    };
    
    const currentDescription = scenario ? descriptions[scenario] : null;

    if (!node && !currentDescription) {
        return (
            <Panel position="top-right" style={{ padding: '15px', width: '280px', backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #dee2e6', borderRadius: '8px'}}>
                <h3 style={{marginTop: 0}}>Painel de Detalhes</h3>
                <p>Selecione um cenário no painel à esquerda para ver os fluxos de dados.</p>
                <p>Clique em um componente (nó) para ver seus detalhes técnicos.</p>
            </Panel>
        );
    }

    return (
        <Panel position="top-right" style={{ padding: '20px', width: '280px', backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #dee2e6', borderRadius: '8px' }}>
            {currentDescription && (
              <>
                <h3 style={{ marginTop: 0 }}>{currentDescription.title}</h3>
                <p style={{fontSize: '14px'}}>{currentDescription.text}</p>
              </>
            )}
            {node && (
              <>
                <hr style={{margin: '20px 0'}} />
                <h4 style={{ marginTop: 0 }}>Detalhes do Componente</h4>
                <p><strong>Nome:</strong> {node.data.label as string}</p>
                <p><strong>ID:</strong> {node.id}</p>
                <p><strong>Tipo:</strong> {node.type}</p>
              </>
            )}
        </Panel>
    );
};

// =================================================================================
// COMPONENTE PRINCIPAL DO DIAGRAMA
// =================================================================================
const GatewayDiagramFlow = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [activeScenario, setActiveScenario] = useState<string | null>(null);

    const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const handleNodeClick = useCallback((_: any, node: Node) => setSelectedNode(node), []);
    
    const resetHighlights = useCallback(() => {
        setNodes((nds) =>
            nds.map((n) => ({ ...n, data: { ...n.data, highlighted: false, isCached: false, subLabel: undefined } }))
        );
        setEdges((eds) =>
            eds.map((e) => ({
                ...e,
                className: '',
                animated: false,
            }))
        );
    }, [setNodes, setEdges]);
    
    const highlightElements = (nodeIds: string[], edgeIds: {id: string, className: string}[]) => {
      setNodes(nds => nds.map(n => ({...n, data: {...n.data, highlighted: nodeIds.includes(n.id)}})));
      setEdges(eds => eds.map(e => {
        const edgeConfig = edgeIds.find(eid => eid.id === e.id);
        if (edgeConfig) {
          return {...e, className: edgeConfig.className, animated: true};
        }
        return e;
      }));
    }

    const handleScenarioChange = useCallback((scenario: string | null) => {
        resetHighlights();
        setActiveScenario(scenario);
        setSelectedNode(null);

        if (!scenario) return;

        let nodesToHighlight: string[] = [];
        let edgesToHighlight: {id: string, className: string}[] = [];

        switch (scenario) {
            case 'direct-access':
                nodesToHighlight = ['client-web', 'client-mobile', 'service-orders', 'service-users', 'service-products'];
                edgesToHighlight = [
                    { id: 'e-direct-web-orders', className: 'direct-access-edge' },
                    { id: 'e-direct-web-users', className: 'direct-access-edge' },
                    { id: 'e-direct-mobile-products', className: 'direct-access-edge' },
                ];
                break;
            
            case 'auth':
                nodesToHighlight = ['client-web', 'api-gateway', 'auth-service'];
                edgesToHighlight = [
                    { id: 'e-client-web-gateway', className: 'highlighted-edge animated-edge' },
                    { id: 'e-gateway-auth', className: 'auth-edge' },
                ];
                break;

            case 'routing':
                nodesToHighlight = ['client-mobile', 'api-gateway', 'service-orders', 'database', 'logging-service'];
                edgesToHighlight = [
                    { id: 'e-client-mobile-gateway', className: 'highlighted-edge animated-edge' },
                    { id: 'e-gateway-orders', className: 'highlighted-edge animated-edge' },
                    { id: 'e-orders-db', className: 'highlighted-edge animated-edge' },
                    { id: 'e-gateway-logging', className: 'highlighted-edge animated-edge' },
                ];
                break;

            case 'caching':
                 nodesToHighlight = ['client-web', 'api-gateway'];
                 edgesToHighlight = [{ id: 'e-client-web-gateway', className: 'highlighted-edge animated-edge' }];
                 setNodes(nds => nds.map(n => {
                   if (n.id === 'api-gateway') {
                     return {...n, data: {...n.data, isCached: true, subLabel: 'Respondendo do Cache!'}}
                   }
                   return n;
                 }))
                break;
        }
        highlightElements(nodesToHighlight, edgesToHighlight);

    }, [resetHighlights, setNodes]);

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
                onPaneClick={() => { setSelectedNode(null); }}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                nodeOrigin={nodeOrigin}
                fitView
            >
                <Controls />
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
                <InteractionPanel 
                    onScenarioSelect={handleScenarioChange}
                    activeScenario={activeScenario}
                />
                <DetailsPanel node={selectedNode} scenario={activeScenario} />
            </ReactFlow>
        </div>
    );
};


// Componente Wrapper com o Provider
const ApiGatewayDiagram = () => (
  <ReactFlowProvider>
    <GatewayDiagramFlow />
  </ReactFlowProvider>
);

export default ApiGatewayDiagram;

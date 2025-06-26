import { useCallback, useState, FC, CSSProperties } from 'react';

// --- Importando uma gama maior de ícones de serviços AWS
import iconApiGateway from '@/assets/App-Integration/API-Gateway.svg'; // Mantido para referência, mas não no fluxo principal
import iconStepFunctions from '@/assets/App-Integration/Step-Functions.svg';
import iconLambda from '@/assets/Compute/Lambda.svg';
import iconDynamoDB from '@/assets/Database/DynamoDB.svg';
import iconS3 from '@/assets/Storage/Simple-Storage-Service.svg';
import iconKafka from '@/assets/Analytics/Managed-Streaming-for-Apache-Kafka.svg';
import iconSES from '@/assets/Business-Applications/Simple-Email-Service.svg';
import iconPaymentGateway from '@/assets/General-Icons/Marketplace_Light.svg';

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

// --- Estilos para os diferentes caminhos do fluxo
const CustomStyles = `
  @keyframes dashdraw { from { stroke-dashoffset: 1000; } }
  .animated-edge .react-flow__edge-path { animation: dashdraw 30s linear infinite; }
  .success-edge .react-flow__edge-path { stroke: #28a745; stroke-width: 2.5; stroke-dasharray: 5; }
  .compensation-edge .react-flow__edge-path { stroke: #dc3545; stroke-width: 2.5; stroke-dasharray: 3; }
  .event-edge .react-flow__edge-path { stroke: #ff9900; stroke-width: 2.5; stroke-dasharray: 5; }
`;

// --- Nós e Arestas
const defaultEdgeOptions = { type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#232f3e' } };

const nodeBaseStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '10px 15px', backgroundColor: '#fff', border: '2px solid #ddd',
  borderRadius: '8px', width: 180, textAlign: 'center', fontSize: '13px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)', transition: 'all 0.4s ease',
};

const AwsIconNode: FC<NodeProps> = ({ data, selected }) => {
  const dynamicStyle: CSSProperties = { ...nodeBaseStyle,
    borderColor: selected ? '#007bff' : data.isCompensating ? '#dc3545' : data.highlighted ? '#28a745' : data.isEvent ? '#ff9900' : '#ddd',
    transform: data.highlighted || data.isCompensating ? 'scale(1.08)' : 'scale(1)',
    opacity: data.faded ? 0.6 : 1,
  };
  return (
    <div style={dynamicStyle}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <img src={data.icon as string} alt={data.label as string} style={{ width: 48, height: 48, marginBottom: 8 }} />
      <strong>{data.label as string}</strong>
      {(data.subLabel as string) && <span style={{fontSize: '11px', color: '#555', marginTop: '4px'}}>{data.subLabel as string}</span>}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

const GroupNode: FC<NodeProps> = ({ data }) => (
    <div style={{ width: '100%', height: '100%', border: '3px dashed #ff9900', borderRadius: 12, backgroundColor: 'rgba(255, 153, 0, 0.05)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 15, left: 20, fontWeight: 'bold', fontSize: 20, color: '#232f3e' }}>
        {data.label as string}
      </div>
    </div>
);

const nodeTypes = { aws: AwsIconNode, group: GroupNode };

// --- Definição da Arquitetura MODIFICADA com Kafka no início e no fim
const initialNodes: Node[] = [
  // INÍCIO: Recebimento do pedido via Kafka
  { id: 'kafka-orders-topic', type: 'aws', position: { x: -650, y: 350 }, data: { label: 'Tópico: Pedidos de Compra', icon: iconKafka, isEvent: true } },
  { id: 'l-consume-orders', type: 'aws', position: { x: -350, y: 340 }, data: { label: 'Consumidor Kafka', icon: iconLambda, subLabel: 'Inicia a Saga' } },

  // Orquestrador central
  { id: 'orchestrator', type: 'group', position: { x: -100, y: 0 }, style: { width: 800, height: 850 }, data: { label: 'Orquestrador (Step Functions)' } },

  // Lambdas da Saga (Dentro do Orquestrador)
  { id: 'l-reserve-stock', type: 'aws', parentId: 'orchestrator', position: { x: 100, y: 100 }, data: { label: '1. Reservar Estoque', icon: iconLambda } },
  { id: 'l-process-payment', type: 'aws', parentId: 'orchestrator', position: { x: 100, y: 250 }, data: { label: '2. Processar Pagamento', icon: iconLambda } },
  { id: 'l-confirm-stock', type: 'aws', parentId: 'orchestrator', position: { x: 100, y: 400 }, data: { label: '3a. Confirmar Estoque', icon: iconLambda } },
  { id: 'l-release-stock', type: 'aws', parentId: 'orchestrator', position: { x: 450, y: 400 }, data: { label: '3b. Liberar Estoque', icon: iconLambda, subLabel: '(Compensação)' } },
  { id: 'l-gen-invoice', type: 'aws', parentId: 'orchestrator', position: { x: 100, y: 550 }, data: { label: '4. Gerar Nota Fiscal', icon: iconLambda } },
  { id: 'l-pub-purchase-event', type: 'aws', parentId: 'orchestrator', position: { x: 100, y: 700 }, data: { label: '5. Publicar Compra Realizada', icon: iconLambda } },
  
  // Serviços Externos e de Dados
  { id: 'db-inventory', type: 'aws', position: { x: 800, y: 100 }, data: { label: 'BD de Inventário', icon: iconDynamoDB } },
  { id: 'payment-gateway', type: 'aws', position: { x: 800, y: 250 }, data: { label: 'Gateway de Pagamento', icon: iconPaymentGateway } },
  { id: 's3-invoices', type: 'aws', position: { x: 800, y: 550 }, data: { label: 'S3 (Faturas)', icon: iconS3 } },

  // FIM: Tópico de conclusão e consumidores
  { id: 'kafka-purchases-topic', type: 'aws', position: { x: 800, y: 705 }, data: { label: 'Tópico: Compras Realizadas', icon: iconKafka, isEvent: true } },
  { id: 'l-notify-client', type: 'aws', position: { x: 1100, y: 625 }, data: { label: 'Consumidor: Notificar Cliente', icon: iconSES, subLabel: 'Envia e-mail' } },
  { id: 'l-update-crm', type: 'aws', position: { x: 1100, y: 775 }, data: { label: 'Consumidor: Atualizar CRM', icon: iconLambda, subLabel: 'Sistema de Vendas' } },
];

const initialEdges: Edge[] = [
  // Fluxo de entrada
  { id: 'e-topic-consumer', source: 'kafka-orders-topic', target: 'l-consume-orders', className: 'event-edge' },
  { id: 'e-consumer-saga', source: 'l-consume-orders', target: 'l-reserve-stock' },
  // Caminhos da orquestração
  { id: 'e-reserve-payment', source: 'l-reserve-stock', target: 'l-process-payment' },
  { id: 'e-payment-confirm', source: 'l-process-payment', target: 'l-confirm-stock', label:'Pagamento OK' },
  { id: 'e-payment-release', source: 'l-process-payment', target: 'l-release-stock', label:'Pagamento Falhou' },
  { id: 'e-confirm-invoice', source: 'l-confirm-stock', target: 'l-gen-invoice' },
  { id: 'e-invoice-publish', source: 'l-gen-invoice', target: 'l-pub-purchase-event' },
  { id: 'e-publish-topic', source: 'l-pub-purchase-event', target: 'kafka-purchases-topic', className: 'event-edge' },
  // Conexões com serviços externos
  { id: 'e-reserve-db', source: 'l-reserve-stock', target: 'db-inventory' },
  { id: 'e-payment-gw', source: 'l-process-payment', target: 'payment-gateway' },
  { id: 'e-confirm-db', source: 'l-confirm-stock', target: 'db-inventory' },
  { id: 'e-release-db', source: 'l-release-stock', target: 'db-inventory' },
  { id: 'e-invoice-s3', source: 'l-gen-invoice', target: 's3-invoices' },
  // Conexões dos consumidores finais
  { id: 'e-topic-notify', source: 'kafka-purchases-topic', target: 'l-notify-client', className: 'event-edge' },
  { id: 'e-topic-crm', source: 'kafka-purchases-topic', target: 'l-update-crm', className: 'event-edge' },
];

type FlowState = 'idle' | 'started' | 'saga_running' | 'payment_choice' | 'success_path' | 'failure_path';

const SagaOrchestrationFlow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [flowState, setFlowState] = useState<FlowState>('idle');

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const highlight = (nodeIds: string[], edgeIds: string[], isCompensating = false) => {
    setNodes(nds => nds.map(n => ({...n, data: {...n.data, highlighted: nodeIds.includes(n.id), isCompensating: isCompensating && nodeIds.includes(n.id) }})));
    const edgeClass = isCompensating ? 'compensation-edge animated-edge' : 'success-edge animated-edge';
    setEdges(eds => eds.map(e => {
        if (edgeIds.includes(e.id)) return { ...e, className: edgeClass };
        if (e.className?.includes('event-edge')) return e; // Don't clear event edge styles
        return { ...e, className: '' };
    }));
  };

  const resetFlow = () => {
    setFlowState('idle');
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, highlighted: false, isCompensating: false, faded: false } })));
    setEdges(es => es.map(e => ({ ...e, className: e.id.includes('topic') || e.id.includes('consumer') ? 'event-edge' : '' })));
  };

  const runFlowStep = (step: FlowState) => {
    setFlowState(step);
    
    // Reset highlights antes de aplicar novos
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, highlighted: false, isCompensating: false } })));
    
    switch (step) {
      case 'started':
        highlight(['kafka-orders-topic', 'l-consume-orders'], ['e-topic-consumer']);
        break;
      case 'saga_running':
        highlight(['l-consume-orders', 'l-reserve-stock', 'db-inventory'], ['e-consumer-saga', 'e-reserve-db']);
        break;
      case 'payment_choice':
        highlight(['l-reserve-stock', 'l-process-payment', 'payment-gateway'], ['e-reserve-payment', 'e-payment-gw']);
        break;
      case 'success_path':
        const successNodes = [
          'l-confirm-stock', 'l-gen-invoice', 'l-pub-purchase-event', 'db-inventory', 's3-invoices', 
          'kafka-purchases-topic', 'l-notify-client', 'l-update-crm'
        ];
        const successEdges = [
          'e-payment-confirm', 'e-confirm-invoice', 'e-invoice-publish', 'e-publish-topic', 
          'e-confirm-db', 'e-invoice-s3', 'e-topic-notify', 'e-topic-crm'
        ];
        highlight(successNodes, successEdges);
        // Apagar o caminho de falha
        setNodes(nds => nds.map(n => n.id === 'l-release-stock' ? {...n, data: {...n.data, faded: true}} : n));
        break;
      case 'failure_path':
        const failureNodes = ['l-release-stock', 'db-inventory'];
        const failureEdges = ['e-payment-release', 'e-release-db'];
        highlight(failureNodes, failureEdges, true);
        // Apagar o caminho de sucesso
        const successPathNodes = ['l-confirm-stock', 'l-gen-invoice', 'l-pub-purchase-event', 'kafka-purchases-topic', 'l-notify-client', 'l-update-crm'];
        setNodes(nds => nds.map(n => successPathNodes.includes(n.id) ? {...n, data: {...n.data, faded: true}} : n));
        break;
      default:
        resetFlow();
    }
  };

  const InteractionControls = () => {
    switch (flowState) {
        case 'idle':
            return <button onClick={() => runFlowStep('started')}>▶️ Receber Pedido no Kafka</button>;
        case 'started':
            return <button onClick={() => runFlowStep('saga_running')}>Iniciar Orquestração</button>;
        case 'saga_running':
            return <button onClick={() => runFlowStep('payment_choice')}>Avançar para Pagamento</button>;
        case 'payment_choice':
            return (<div style={{ display: 'flex', gap: '10px' }}>
                <span>Pagamento Aprovado?</span>
                <button onClick={() => runFlowStep('success_path')} style={{backgroundColor: '#28a745', color: 'white'}}>Sim</button>
                <button onClick={() => runFlowStep('failure_path')} style={{backgroundColor: '#dc3545', color: 'white'}}>Não</button>
            </div>);
        default:
            return <button onClick={resetFlow}>🔁 Resetar Simulação</button>;
    }
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <style>{CustomStyles}</style>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} defaultEdgeOptions={defaultEdgeOptions} fitView>
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        <Panel position="top-left" style={{ padding: '10px', backgroundColor: '#f0f2f3', border: '1px solid #ddd', borderRadius: '8px' }}>
            <InteractionControls />
        </Panel>
      </ReactFlow>
    </div>
  );
};

const LambdaEvents = () => (<ReactFlowProvider><SagaOrchestrationFlow /></ReactFlowProvider>);
export default LambdaEvents;


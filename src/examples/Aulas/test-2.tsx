import {
  ReactFlow, ReactFlowProvider, useNodesState, useEdgesState,
  addEdge, Controls, Background, Handle, Position,
  Node, Edge, Connection, Panel, BackgroundVariant,
  MarkerType, NodeProps
} from '@xyflow/react';
import { useCallback, useState, CSSProperties, FC } from 'react';

import iconAmplify   from '@/assets/Front-End-Web-Mobile/Amplify.svg';
import iconAppMobile from '@/assets/App-Integration/Console-Mobile-Application.svg';
import iconApiGw     from '@/assets/App-Integration/API-Gateway.svg';
import iconCognito   from '@/assets/Security-Identity-Compliance/Cognito.svg';
import iconLambda    from '@/assets/Compute/Lambda.svg';
import iconEc2       from '@/assets/Compute/EC2.svg';
import iconDynamo    from '@/assets/Database/DynamoDB.svg';
import iconSns       from '@/assets/App-Integration/Simple-Notification-Service.svg';

// -------------------------------------------------------------------
// Tipos de nó visuais
// -------------------------------------------------------------------
const base: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: 10, borderRadius: 8, background: '#fff', fontSize: 12,
  border: '1px solid #ddd', width: 160, textAlign: 'center'
};

const AwsIcon: FC<NodeProps> = ({ data, selected }) => (
  <div style={{ ...base, borderColor: selected ? '#252f3e' : base.border }}>
    <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    <img src={data.icon} alt="" style={{ width: 46, marginBottom: 6 }} />
    <strong>{data.label}</strong>
    <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
  </div>
);

const Client: FC<NodeProps> = ({ data }) => (
  <div style={{ ...base, background: '#f7f7f7' }}>
    <img src={data.icon} alt="" style={{ width: 46, marginBottom: 6 }} />
    <strong>{data.label}</strong>
    <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
  </div>
);

const nodeTypes = { aws: AwsIcon, client: Client };

// -------------------------------------------------------------------
// Nós e posições
// -------------------------------------------------------------------
const nodesInit: Node[] = [
  { id: 'web',    type: 'client', position: { x: -400, y:  50 }, data: { label: 'Web (React)',  icon: iconAmplify } },
  { id: 'mobile', type: 'client', position: { x: -400, y: 250 }, data: { label: 'Mobile (App)', icon: iconAppMobile } },

  { id: 'gw-web',    type: 'aws', position: { x:   50, y:  50 }, data: { label: 'Web Gateway',    icon: iconApiGw } },
  { id: 'gw-mobile', type: 'aws', position: { x:   50, y: 250 }, data: { label: 'Mobile Gateway', icon: iconApiGw } },

  { id: 'auth', type: 'aws', position: { x: 290, y: -200 }, data: { label: 'Auth (Cognito)', icon: iconCognito } },

  // BFF Aggregator (pedido de produto -> junta 3 serviços)
  { id: 'bff', type: 'aws', position: { x: 350, y: 150 }, data: { label: 'Aggregator (BFF)', icon: iconLambda } },

  { id: 'svc-prod',  type: 'aws', position: { x: 650, y:  20 }, data: { label: 'Product Svc',   icon: iconEc2 } },
  { id: 'svc-stock', type: 'aws', position: { x: 650, y: 150 }, data: { label: 'Stock Svc',     icon: iconEc2 } },
  { id: 'svc-rev',   type: 'aws', position: { x: 650, y: 280 }, data: { label: 'Review Svc',    icon: iconEc2 } },

  { id: 'db', type: 'aws', position: { x: 900, y: 150 }, data: { label: 'Product DB', icon: iconDynamo } },

  { id: 'sns', type: 'aws', position: { x: 850, y: 280 }, data: { label: 'Notify (SNS)', icon: iconSns } },
];

// -------------------------------------------------------------------
// Arestas
// -------------------------------------------------------------------
const edgeOpts = { type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#232f3e' } };

const edgesInit: Edge[] = [
  // clientes -> gateways
  { id: 'e1', source: 'web',    target: 'gw-web',    ...edgeOpts },
  { id: 'e2', source: 'mobile', target: 'gw-mobile', ...edgeOpts },

  // auth
  { id: 'e3', source: 'gw-web',    target: 'auth', label: 'JWT', style: { strokeDasharray: 4 }, ...edgeOpts },
  { id: 'e4', source: 'gw-mobile', target: 'auth', label: 'JWT', style: { strokeDasharray: 4 }, ...edgeOpts },

  // gateway -> aggregator
  { id: 'e5', source: 'gw-web',    target: 'bff', ...edgeOpts },
  { id: 'e6', source: 'gw-mobile', target: 'bff', ...edgeOpts },

  // aggregator fan-out
  { id: 'e7',  source: 'bff', target: 'svc-prod',  ...edgeOpts },
  { id: 'e8',  source: 'bff', target: 'svc-stock', ...edgeOpts },
  { id: 'e9',  source: 'bff', target: 'svc-rev',   ...edgeOpts },

  // serviços -> DB / SNS
  { id: 'e10', source: 'svc-prod',  target: 'db',  ...edgeOpts },
  { id: 'e11', source: 'svc-rev',   target: 'sns', ...edgeOpts },
];

// -------------------------------------------------------------------
// Componente principal
// -------------------------------------------------------------------
const ApiGatewayBff = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(nodesInit);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesInit);

  /** remove todos os estilos de destaque */
  const reset = () =>
    setEdges(e => e.map(ed => ({ ...ed, className: '' })));

  /** helper para pintar um caminho */
  const mark = (path: string[], className: string) =>
    setEdges(e =>
      e.map(ed =>
        path.includes(ed.source) && path.includes(ed.target)
          ? { ...ed, className }
          : ed
      )
    );

  /* -------------------- botões -------------------- */
  const webOk = () => {
    reset();
    mark(['web', 'gw-web', 'auth', 'bff', 'svc-prod', 'svc-stock', 'svc-rev'], 'ok');
  };
  const mobOk = () => {
    reset();
    mark(['mobile', 'gw-mobile', 'auth', 'bff', 'svc-prod', 'svc-stock', 'svc-rev'], 'ok');
  };
  const authFail = () => {
    reset();
    mark(['web', 'gw-web', 'auth'], 'fail');
  };
  const rateLimit = () => {
    reset();
    mark(['mobile', 'gw-mobile'], 'warn');
  };

  /* -------------------- estilos extras -------------------- */
  const extraCss = `
    .ok .react-flow__edge-path   { stroke: #007acc; stroke-width: 2; animation: dash 16s linear infinite; }
    .fail .react-flow__edge-path { stroke: #cc002c; stroke-width: 3;  stroke-dasharray: 6; }
    .warn .react-flow__edge-path { stroke: #ff9900; stroke-width: 3;  stroke-dasharray: 2; }
    @keyframes dash { to { stroke-dashoffset: 1000; } }
  `;

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <style>{extraCss}</style>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={edgeOpts}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(p: Connection) => setEdges(e => addEdge(p, e))}
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />

        {/* ---- painel de simulação ---- */}
        <Panel position="top-left" style={{ display:'flex', gap:8, padding:10, background:'#f0f2f3', border:'1px solid #ddd', borderRadius:8 }}>
          <button onClick={webOk}>▶︎ Web OK</button>
          <button onClick={mobOk}>▶︎ Mobile OK</button>
          <button onClick={authFail} style={{color:'#fff', background:'#cc002c'}}>✖︎ Auth Fail</button>
          <button onClick={rateLimit} style={{background:'#ff9900'}}>⚠︎ Rate Limit</button>
        </Panel>

        {/* ---- legenda rate-limit ---- */}
        <Panel position="bottom-left" style={{ padding:8 }}>
          <span style={{ fontSize:12, background:'#ff9900', padding:'2px 6px', borderRadius:4 }}>Rate Limit ❗️</span>
        </Panel>
      </ReactFlow>
    </div>
  );
};

/* Wrapper para habilitar hooks */
export default function AwsArchitectureDiagram2() {
  return (
    <ReactFlowProvider>
      <ApiGatewayBff />
    </ReactFlowProvider>
  );
}

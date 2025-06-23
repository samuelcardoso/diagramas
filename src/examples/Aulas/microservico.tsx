import {
  ReactFlow, ReactFlowProvider, useNodesState, useEdgesState,
  addEdge, Controls, Background, Handle, Position,
  Node, Edge, Connection, Panel, BackgroundVariant, MarkerType, NodeProps,
} from '@xyflow/react';
import { useState, CSSProperties, FC } from 'react';

import iconAmplify   from '@/assets/Front-End-Web-Mobile/Amplify.svg';
import iconMobileApp from '@/assets/App-Integration/Console-Mobile-Application.svg';
import iconEc2       from '@/assets/Compute/EC2.svg';
import iconRds       from '@/assets/Database/RDS.svg';

/* ===============================================================
   1. COMPONENTES DE NÓS
   =============================================================== */
const base: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: 10, borderRadius: 8, fontSize: 12, width: 170,
  background: '#fff', border: '1px solid #ddd', textAlign: 'center',
};

const AwsNode: FC<NodeProps> = ({ data, selected }) => (
  <div style={{ ...base, borderColor: selected ? '#252f3e'
                       : data.highlighted ? 'red' : base.border }}>
    <Handle type="target" position={Position.Left}  style={{ opacity: 0 }} />
    <img src={data.icon} style={{ width: 46, marginBottom: 6 }} />
    <strong>{data.label}</strong>
    <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
  </div>
);

const ClientNode: FC<NodeProps> = ({ data, selected }) => (
  <div style={{ ...base, background: '#f7f7f7',
                borderColor: selected ? '#252f3e'
                         : data.highlighted ? 'red' : base.border }}>
    <img src={data.icon} style={{ width: 46, marginBottom: 6 }} />
    <strong>{data.label}</strong>
    <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
  </div>
);

/* camada de domínio dentro do monólito – agora com handles invisíveis */
const LayerNode: FC<NodeProps> = ({ data }) => (
  <div style={{
    padding: '4px 6px', borderRadius: 4, fontSize: 10,
    background: data.highlighted ? '#fffae6' : '#fffbe6',
    border: data.highlighted ? '2px solid red' : '1px solid #e8e8e8',
    width: 120, textAlign: 'center',
  }}>
    <Handle type="target" position={Position.Left}  style={{ opacity: 0 }} />
    <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    {data.label}
  </div>
);

/* contêiner visual do grupo */
const GroupNode: FC<NodeProps> = ({ data }) => (
  <div style={{
    width: '100%', height: '100%',
    border: '2px dashed #66788a', borderRadius: 12,
    background: 'rgba(239,242,243,0.5)',
    position: 'relative', pointerEvents: 'none', zIndex: -1,
  }}>
    <div style={{
      position: 'absolute', top: 10, left: 15,
      fontWeight: 700, fontSize: 16, color: '#232f3e',
    }}>
      {data.label}
    </div>
  </div>
);

const nodeTypes = { aws: AwsNode, client: ClientNode, layer: LayerNode, group: GroupNode };
const edgeOpts  = { type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#232f3e' } };

/* ===============================================================
   2. CENÁRIO “ANTES” – MONÓLITO
   =============================================================== */
const monoNodes: Node[] = [
  { id: 'web',    type: 'client', position: { x: -450, y:  160 }, data: { label: 'Web',    icon: iconAmplify   } },
  { id: 'mobile', type: 'client', position: { x: -450, y: 260 }, data: { label: 'Mobile', icon: iconMobileApp } },

  { id: 'grupo-monolito', type: 'group',
    position: { x: -50, y: 40 },
    style: { width: 420, height: 350 },
    data: { label: 'Monólito' } },

  { id: 'mono-app', type: 'aws', parentId: 'grupo-monolito', extent: 'parent',
    position: { x: 210, y: 170 },
    data: { label: 'Aplicação Monolítica', icon: iconEc2 } },

  { id: 'layer-auth',    type: 'layer', parentId: 'grupo-monolito', extent: 'parent',
    position: { x: 40, y:  60 }, data: { label: 'Camada Autenticação' } },
  { id: 'layer-order',   type: 'layer', parentId: 'grupo-monolito', extent: 'parent',
    position: { x: 40, y: 140 }, data: { label: 'Camada Pedidos'      } },
  { id: 'layer-product', type: 'layer', parentId: 'grupo-monolito', extent: 'parent',
    position: { x: 40, y: 220 }, data: { label: 'Camada Produtos'     } },
  { id: 'layer-pay',     type: 'layer', parentId: 'grupo-monolito', extent: 'parent',
    position: { x: 40, y: 300 }, data: { label: 'Camada Pagamentos'   } },

  { id: 'db', type: 'aws', position: { x: 420, y: 180 }, data: { label: 'BD Compartilhado', icon: iconRds } },
];

const monoEdges: Edge[] = [
  { id: 'm1', source: 'web',    target: 'layer-auth',    ...edgeOpts },
  { id: 'm2', source: 'mobile', target: 'layer-auth',    ...edgeOpts },
  {
    id: 'm3',
    source: 'layer-auth',
    target: 'layer-order',
    style: { strokeDasharray: 4 },
    ...edgeOpts
  },
  { id: 'm4', source: 'layer-order', target: 'mono-app',     ...edgeOpts },
  { id: 'm5', source: 'mono-app',    target: 'db',           ...edgeOpts },
];

/* ===============================================================
   3. CENÁRIO “DEPOIS” – MICROSSERVIÇOS
   =============================================================== */
const microNodes: Node[] = [
  { id: 'c-web',    type: 'client', position: { x: -450, y:  160 }, data: { label: 'Web',    icon: iconAmplify   } },
  { id: 'c-mobile', type: 'client', position: { x: -450, y: 260 }, data: { label: 'Mobile', icon: iconMobileApp } },


  { id: 'svc-auth',     type: 'aws', position: { x: 50, y:  20 }, data: { label: 'Serviço Auth',     icon: iconEc2 } },
  { id: 'svc-pedidos',  type: 'aws', position: { x: 50, y: 120 }, data: { label: 'Serviço Pedidos',  icon: iconEc2 } },
  { id: 'svc-produtos', type: 'aws', position: { x: 50, y: 220 }, data: { label: 'Serviço Produtos', icon: iconEc2 } },
  { id: 'svc-pagto',    type: 'aws', position: { x: 50, y: 320 }, data: { label: 'Serviço Pagto',    icon: iconEc2 } },

  { id: 'db-auth',     type: 'aws', position: { x: 420, y:  20 }, data: { label: 'BD Auth',     icon: iconRds } },
  { id: 'db-pedidos',  type: 'aws', position: { x: 420, y: 120 }, data: { label: 'BD Pedidos',  icon: iconRds } },
  { id: 'db-produtos', type: 'aws', position: { x: 420, y: 220 }, data: { label: 'BD Produtos', icon: iconRds } },
  { id: 'db-pagto',    type: 'aws', position: { x: 420, y: 320 }, data: { label: 'BD Pagto',    icon: iconRds } },
];

const microEdges: Edge[] = [
  { id: 'g1', source: 'c-web',    target: 'svc-auth',    ...edgeOpts },
  { id: 'g2', source: 'c-mobile', target: 'svc-auth',    ...edgeOpts },

  // NOVA aresta: Auth → Pedidos  (usei estilo tracejado só para diferenciar, opcional)
  { id: 'g3', source: 'svc-auth', target: 'svc-pedidos',
    style: { strokeDasharray: 4 }, ...edgeOpts },

  // pedido acessa seu banco
  { id: 'g4', source: 'svc-pedidos', target: 'db-pedidos', ...edgeOpts },
];

/* ===============================================================
   4. CSS EXTRA (animação + z-index das arestas)
   =============================================================== */
const extraCss = `
@keyframes dash { to { stroke-dashoffset: 1000; } }
.anim .react-flow__edge-path {
  stroke-width: 1;
  stroke: red;
  stroke-dasharray: 5;
  animation: dash 14s linear infinite;
}
/* garante que o SVG das arestas fique acima do contêiner do grupo */
.react-flow__edges { z-index: 2; }
`;

/* ===============================================================
   5. COMPONENTE PRINCIPAL
   =============================================================== */
const Diagram = () => {
  const [modo, setModo] = useState<'mono' | 'micro'>('mono');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>(monoNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>(monoEdges);

  /* limpa destaques */
  const clear = () => {
    setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, highlighted: false } })));
    setEdges(es => es.map(e => ({ ...e, className: '', animated: false })));
  };

  /* troca de cenário */
  const switchTo = (m: 'mono' | 'micro') => {
    clear();
    setModo(m);
    if (m === 'mono') { setNodes(monoNodes); setEdges(monoEdges); }
    else              { setNodes(microNodes); setEdges(microEdges); }
  };

  /* destaca nós + arestas */
  const highlight = (nIds: string[], eIds: string[]) => {
    clear();
    setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, highlighted: nIds.includes(n.id) } })));
    setEdges(es => es.map(e => eIds.includes(e.id)
      ? { ...e, className: 'anim', animated: true }
      : e));
  };

  /* fluxos de demonstração */
  const fluxoMono  = () =>
    highlight(['web', 'mobile', 'layer-auth', 'layer-order', 'mono-app', 'db'],
              ['m1', 'm2', 'm3', 'm4', 'm5']);

  const fluxoMicro = () =>
  highlight(
    ['c-web', 'c-mobile', 'svc-auth', 'svc-pedidos', 'db-pedidos'],
    ['g1', 'g2', 'g3', 'g4']   // agora inclui a nova aresta g4
  );

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
        onConnect={(c: Connection) => setEdges(es => addEdge(c, es))}
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />

        {/* Painel de interação */}
        <Panel position="top-left"
               style={{ padding: 10, background: '#f0f2f3', border: '1px solid #ddd',
                        borderRadius: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => switchTo('mono')}
                  style={{ background: modo === 'mono' ? 'red' : '#fff',
                           color: modo === 'mono' ? '#fff' : '#000' }}>
            Monólito
          </button>
          <button onClick={fluxoMono} >▶ Fluxo Monólito</button>
          <button onClick={() => switchTo('micro')}
                  style={{ background: modo === 'micro' ? 'red' : '#fff',
                           color: modo === 'micro' ? '#fff' : '#000' }}>
            Microserviços
          </button>
          <button onClick={fluxoMicro}>▶ Fluxo Micro</button>
        </Panel>

        <Panel position="bottom-left" style={{ fontSize: 12, padding: 6 }}>
        </Panel>
      </ReactFlow>
    </div>
  );
};

/* ===============================================================
   6. EXPORT DEFAULT
   =============================================================== */
export default function Microservice() {
  return (
    <ReactFlowProvider>
      <Diagram />
    </ReactFlowProvider>
  );
}

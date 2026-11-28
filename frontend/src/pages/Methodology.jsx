import { useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  Drawer,
  IconButton,
  Paper,
  Tooltip,
} from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded'

import { methodologyConfig } from '../data/methodologyConfig'

const componentById = new Map(methodologyConfig.architecture.nodes.map(node => [node.id, node]))
const connectionBySource = new Map(methodologyConfig.architecture.connections.map(edge => [edge.from, edge]))

function statusClass(status) {
  return `meth-status-${status.toLowerCase()}`
}

function StatusBadge({ status }) {
  return <Chip size="small" label={status} className={`meth-status ${statusClass(status)}`} />
}

function SectionHeading({ eyebrow, title, description, id }) {
  return (
    <div className="meth-section-heading">
      <div>
        <span className="meth-eyebrow">{eyebrow}</span>
        <h2 id={id}>{title}</h2>
      </div>
      {description && <p>{description}</p>}
    </div>
  )
}

function ComponentDetails({ node, onSelectRelated, onClose }) {
  if (!node) return null
  const related = methodologyConfig.architecture.connections
    .filter(edge => edge.from === node.id || edge.to === node.id)
    .map(edge => edge.from === node.id ? edge.to : edge.from)
    .filter((id, index, list) => list.indexOf(id) === index)

  return (
    <Drawer
      anchor="right"
      open={Boolean(node)}
      onClose={onClose}
      PaperProps={{ className: 'meth-drawer', 'aria-labelledby': 'meth-details-title' }}
    >
      <div className="meth-drawer-header">
        <div>
          <span className="meth-eyebrow">ARCHITECTURE DETAILS / 05</span>
          <h2 id="meth-details-title">{node.name}</h2>
          <span className="meth-drawer-tech">{node.technology}</span>
        </div>
        <IconButton aria-label="Close component details" onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </div>

      <div className="meth-drawer-content">
        <div className="meth-drawer-status"><StatusBadge status={node.status} /></div>
        <p className="meth-detail-role">{node.role}</p>
        <p className="meth-detail-description">{node.description}</p>

        <div className="meth-detail-pair">
          <div><span>Receives</span><p>{node.receives}</p></div>
          <div><span>Produces</span><p>{node.produces}</p></div>
        </div>

        {node.runtimeNote && <Alert severity="info" className="meth-runtime-note">{node.runtimeNote}</Alert>}

        <div className="meth-evidence">
          <span>Repository evidence</span>
          <p>{node.evidence}</p>
        </div>

        {related.length > 0 && (
          <div className="meth-related">
            <span>Connected components</span>
            <div>
              {related.map(id => {
                const relatedNode = componentById.get(id)
                return relatedNode ? (
                  <button key={id} type="button" onClick={() => onSelectRelated(id)}>
                    {relatedNode.name}<ArrowOutwardRounded fontSize="inherit" />
                  </button>
                ) : null
              })}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}

function Methodology() {
  const [selectedComponentId, setSelectedComponentId] = useState('pyspark')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const selectedNode = componentById.get(selectedComponentId)

  const openDetails = id => {
    setSelectedComponentId(id)
    setDetailsOpen(true)
  }

  const selectRelated = id => setSelectedComponentId(id)

  return (
    <Box className="meth-page">
      <header className="meth-header">
        <div>
          <span className="meth-eyebrow">05 / SYSTEM ARCHITECTURE</span>
          <h1>Methodology</h1>
          <p>Explore the architecture, data processing pipeline and detection workflow behind CyberGuard.</p>
        </div>
        <nav className="meth-page-nav" aria-label="Methodology sections">
          <a href="#methodology-architecture">Architecture</a>
          <a href="#methodology-pipeline">Pipeline</a>
          <a href="#methodology-stack">Technology</a>
          <a href="#methodology-workflow">Workflow</a>
        </nav>
      </header>

      <Alert severity="info" className="meth-status-note">
        This map combines code confirmed in the repository with planned or unverified components. Statuses describe implementation evidence, not live service availability.
      </Alert>

      <section className="meth-section" id="methodology-architecture" aria-labelledby="meth-architecture-title">
        <SectionHeading
          eyebrow="SYSTEM MAP / 01"
          title="CyberGuard architecture"
          description="Select a block to inspect its inputs, outputs and repository evidence."
          id="meth-architecture-title"
        />
        <Paper className="meth-architecture-panel" elevation={0}>
          <div className="meth-architecture-grid">
            {methodologyConfig.architecture.nodes.map(node => {
              const edge = connectionBySource.get(node.id)
              return (
                <div
                  className="meth-architecture-position"
                  key={node.id}
                  style={{ '--meth-column': node.position.column, '--meth-row': node.position.row }}
                >
                  <Tooltip title={node.description} arrow placement="top">
                    <button type="button" className="meth-architecture-node" onClick={() => openDetails(node.id)} aria-label={`Open details for ${node.name}`}>
                      <span className="meth-node-topline">
                        <span className="meth-node-index">{String(methodologyConfig.architecture.nodes.indexOf(node) + 1).padStart(2, '0')}</span>
                        <StatusBadge status={node.status} />
                      </span>
                      <strong>{node.name}</strong>
                      <span className="meth-node-technology">{node.technology}</span>
                      <span className="meth-node-role">{node.role}</span>
                    </button>
                  </Tooltip>
                  {edge && (
                    <span className={`meth-connector is-${edge.direction}`} aria-hidden="true">
                      <i />
                      <small>{edge.label}</small>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="meth-diagram-footer">
            <span><i className="meth-legend-implemented" /> Implemented in code</span>
            <span><i className="meth-legend-planned" /> Planned</span>
            <span><i className="meth-legend-unknown" /> Not verified</span>
          </div>
        </Paper>
      </section>

      <section className="meth-section" id="methodology-pipeline" aria-labelledby="meth-pipeline-title">
        <SectionHeading
          eyebrow="DATA LIFECYCLE / 02"
          title="Data processing pipeline"
          description="A short view of confirmed preparation steps and work still ahead."
          id="meth-pipeline-title"
        />
        <div className="meth-pipeline-grid">
          {methodologyConfig.pipelineSteps.map((step, index) => {
            const node = componentById.get(step.componentId)
            return (
              <button
                className="meth-pipeline-step"
                key={step.id}
                type="button"
                onClick={() => openDetails(step.componentId)}
                aria-label={`Open ${node?.name ?? step.title} details`}
              >
                <span className="meth-step-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="meth-step-title">{step.title}</span>
                <span className="meth-step-description">{step.description}</span>
                <StatusBadge status={step.status} />
              </button>
            )
          })}
        </div>
      </section>

      <section className="meth-section" id="methodology-stack" aria-labelledby="meth-stack-title">
        <SectionHeading
          eyebrow="IMPLEMENTATION LAYERS / 03"
          title="Technology stack"
          description="Installed packages and source files confirm presence; they do not prove that a service is running."
          id="meth-stack-title"
        />
        <div className="meth-stack-grid">
          {methodologyConfig.technologies.map(technology => {
            const node = componentById.get(technology.componentId)
            return (
              <button
                className="meth-stack-card"
                key={technology.name}
                type="button"
                onClick={() => openDetails(technology.componentId)}
                aria-label={`Open ${technology.name} details`}
              >
                <span className="meth-stack-category">{technology.category}</span>
                <span className="meth-stack-name-row">
                  <strong>{technology.name}</strong>
                  <StatusBadge status={node?.status ?? 'Unknown'} />
                </span>
                <span className="meth-stack-role">{technology.role}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="meth-section" id="methodology-workflow" aria-labelledby="meth-workflow-title">
        <SectionHeading
          eyebrow="DETECTION PATH / 04"
          title="Detection workflow"
          description="Conceptual flow; prediction and automatic alert generation are not yet implemented in the checked source."
          id="meth-workflow-title"
        />
        <Paper className="meth-workflow-panel" elevation={0}>
          <div className="meth-workflow-grid">
            {methodologyConfig.workflow.map((step, index) => (
              <div className="meth-workflow-wrap" key={step.id}>
                <Tooltip title={step.description} arrow>
                  <button type="button" className="meth-workflow-step" onClick={() => openDetails(step.componentId)}>
                    <span className="meth-workflow-index">{String(index + 1).padStart(2, '0')}</span>
                    <strong>{step.label}</strong>
                    <StatusBadge status={step.status} />
                  </button>
                </Tooltip>
                {index < methodologyConfig.workflow.length - 1 && <span className="meth-workflow-arrow" aria-hidden="true">→</span>}
              </div>
            ))}
          </div>
          <div className="meth-workflow-caption">
            <span className="meth-live-dot" />
            <p>Only repository-confirmed stages are marked implemented. No thresholds or confidence rules are inferred.</p>
          </div>
        </Paper>
      </section>

      <section className="meth-section meth-details-teaser" aria-label="Selected component details">
        <div>
          <span className="meth-eyebrow">INSPECT A COMPONENT</span>
          <strong>{selectedNode?.name}</strong>
          <span>{selectedNode?.role}</span>
        </div>
        <button type="button" onClick={() => setDetailsOpen(true)}>View details <ArrowOutwardRounded fontSize="small" /></button>
      </section>

      <ComponentDetails
        node={detailsOpen ? selectedNode : null}
        onSelectRelated={selectRelated}
        onClose={() => setDetailsOpen(false)}
      />
    </Box>
  )
}

export default Methodology

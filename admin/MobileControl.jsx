import React, { useState, useEffect } from 'react';
import { fetchAgentsStatus, triggerAgentAction, fetchLogs, scheduleTask } from '../api/admin'; // assume existing API helpers

// Mobile-friendly Admin Control Component
export default function MobileControl() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [logs, setLogs] = useState('');
  const [taskSpec, setTaskSpec] = useState({ cron: '', command: '' });
  const [loading, setLoading] = useState(false);

  // Load agents status on mount and when returning to page
  useEffect(() => {
    async function loadStatus() {
      const status = await fetchAgentsStatus();
      setAgents(status);
    }
    loadStatus();
  }, []);

  const handleAction = async (action) => {
    if (!selectedAgent) return;
    setLoading(true);
    await triggerAgentAction(selectedAgent.id, action);
    // refresh status after action
    const status = await fetchAgentsStatus();
    setAgents(status);
    setLoading(false);
  };

  const loadLogs = async () => {
    if (!selectedAgent) return;
    const logText = await fetchLogs(selectedAgent.id);
    setLogs(logText);
  };

  const createSchedule = async () => {
    if (!taskSpec.cron || !taskSpec.command) return;
    setLoading(true);
    await scheduleTask(taskSpec.cron, taskSpec.command);
    setLoading(false);
    alert('Task scheduled');
    setTaskSpec({ cron: '', command: '' });
  };

  return (
    <div className="mobile-admin">
      <h2>Antigravity Mobile Admin</h2>
      <select
        value={selectedAgent?.id || ''}
        onChange={e => setSelectedAgent(agents.find(a => a.id === e.target.value))}
      >
        <option value="" disabled>Select an agent</option>
        {agents.map(agent => (
          <option key={agent.id} value={agent.id}>
            {agent.name} – {agent.status}
          </option>
        ))}
      </select>

      {selectedAgent && (
        <div className="agent-controls">
          <button onClick={() => handleAction('start')} disabled={loading}>Start</button>
          <button onClick={() => handleAction('stop')} disabled={loading}>Stop</button>
          <button onClick={() => handleAction('restart')} disabled={loading}>Restart</button>
          <button onClick={loadLogs} disabled={loading}>View Logs</button>
          <pre className="log-output">{logs}</pre>
        </div>
      )}

      <div className="schedule-section">
        <h3>Schedule One‑Shot / Recurring Task</h3>
        <input
          type="text"
          placeholder="Cron expression (e.g. */5 * * * *)"
          value={taskSpec.cron}
          onChange={e => setTaskSpec({ ...taskSpec, cron: e.target.value })}
        />
        <input
          type="text"
          placeholder="Command (e.g. git pull)"
          value={taskSpec.command}
          onChange={e => setTaskSpec({ ...taskSpec, command: e.target.value })}
        />
        <button onClick={createSchedule} disabled={loading}>Create Schedule</button>
      </div>

      <style jsx>{`
        .mobile-admin {
          padding: 1rem;
          font-family: Arial, sans-serif;
        }
        select, input {
          width: 100%;
          margin: 0.5rem 0;
          padding: 0.5rem;
          font-size: 1rem;
        }
        button {
          margin: 0.25rem;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
        }
        .log-output {
          max-height: 200px;
          overflow-y: auto;
          background: #f5f5f5;
          padding: 0.5rem;
          border: 1px solid #ddd;
        }
      `}</style>
    </div>
  );
}

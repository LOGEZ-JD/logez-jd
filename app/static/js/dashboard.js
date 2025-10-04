async function loadDashboard() {
  try {
    const res = await fetch('/dashboard/data');
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    const data = await res.json();

    document.getElementById('metric-total').textContent = data.totals.messages;
    document.getElementById('metric-24h').textContent = data.totals.messages_24h;

    const tbody = document.getElementById('events-body');
    tbody.innerHTML = '';
    data.recent_events.forEach(ev => {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = ev.name;
      const value = document.createElement('td');
      value.textContent = ev.value ?? '';
      const created = document.createElement('td');
      created.textContent = new Date(ev.created_at).toLocaleString();
      tr.appendChild(name);
      tr.appendChild(value);
      tr.appendChild(created);
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

window.addEventListener('DOMContentLoaded', loadDashboard);

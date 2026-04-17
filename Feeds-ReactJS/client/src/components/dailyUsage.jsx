import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import '../styles/dailyUsage.css';

/*
ISSUES/Improvements:
1. Add Daily Usage in sidebar navigation.
2. Implement date range filter for more granular data viewing.
3. Optimize data fetching with pagination or lazy loading for large datasets.
4. Enhance chart interactivity with zoom and pan features.
5. Make it mobile responsive for better accessibility on different devices.
6. Include comparison with previous periods (week/month) for trend analysis.
*/

export default function DailyUsagePage() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    async function loadUsage() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/dailyUsage`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        const data = await res.json();
        setSessions(data.user);
      } catch (err) {
        console.error('Failed to load usage data', err);
      }
    }

    loadUsage();
  }, []);

  useEffect(() => {
    if (!sessions || sessions?.length === 0) return;

    const dailyData = {};
    let totalHours = 0;
    let maxHours = 0;

    sessions.forEach(session => {
      const loginDate = new Date(session.loginAt);
      const dateKey = loginDate.toLocaleDateString();
      const durationMs =
        new Date(session.logoutAt).getTime() -
        new Date(session.loginAt).getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      if (!dailyData[dateKey]) dailyData[dateKey] = 0;

      dailyData[dateKey] += durationHours;
      totalHours += durationHours;
      maxHours = Math.max(maxHours, dailyData[dateKey]);
    });

    const sortedDates = Object.keys(dailyData).sort(
      (a, b) => new Date(a) - new Date(b),
    );

    const avgHours = totalHours / sortedDates.length;

    setStats({
      sortedDates,
      values: sortedDates.map(d => dailyData[d]),
      totalHours,
      avgHours,
      maxHours,
      totalDays: sortedDates.length,
      dailyData,
    });
  }, [sessions]);

  useEffect(() => {
    if (!stats) return;

    const ctx = chartRef.current;

    if (chartInstance.current) chartInstance.current.destroy();

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
    gradient.addColorStop(1, 'rgba(118, 75, 162, 0.4)');

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: stats.sortedDates,
        datasets: [
          {
            label: 'Usage Time (Hours)',
            data: stats.values,
            backgroundColor: gradient,
            borderColor: 'rgba(102, 126, 234, 1)',
            borderWidth: 2,
            borderRadius: 8,
            hoverBackgroundColor: 'rgba(102, 126, 234, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 14, weight: '500' },
              color: '#2d3748',
              padding: 15,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(26, 32, 44, 0.9)',
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 14, weight: '600' },
            bodyFont: { size: 13 },
            callbacks: {
              label: function (context) {
                return 'Usage: ' + context?.parsed?.y?.toFixed(2) + ' hours';
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours',
              font: { size: 14, weight: '600' },
              color: '#4a5568',
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              font: { size: 12 },
              color: '#718096',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Date',
              font: { size: 14, weight: '600' },
              color: '#4a5568',
            },
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              color: '#718096',
              maxRotation: 45,
              minRotation: 45,
            },
          },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });
  }, [stats]);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>📊 Daily Usage Statistics</h1>
          <p>Track your daily usage patterns and trends</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="chart-card">
          <div className="empty-state">
            <div className="empty-state-icon">📈</div>
            <div className="empty-state-text">No usage data available yet</div>
          </div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Usage</div>
              <div className="stat-value">
                {stats?.totalHours?.toFixed(1)}
                <span className="stat-unit">hours</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Average Daily</div>
              <div className="stat-value">
                {stats?.avgHours?.toFixed(1)}
                <span className="stat-unit">hours</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Peak Usage</div>
              <div className="stat-value">
                {stats?.maxHours?.toFixed(1)}
                <span className="stat-unit">hours</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Days Tracked</div>
              <div className="stat-value">
                {stats?.totalDays}
                <span className="stat-unit">days</span>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h2 className="chart-title">Usage Trends</h2>
            <div className="chart-container">
              <canvas ref={chartRef} id="usageChart"></canvas>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

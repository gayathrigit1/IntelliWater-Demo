import React from 'react';
import './FlowChart.css';

const FlowChart = ({ data, title, unit }) => {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    if (!data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const width = rect.width;
    const height = rect.height;
    const padding = 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find min and max values
    const values = data.map(d => d.value);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 1);
    const valueRange = maxValue - minValue || 1;

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw data line
    ctx.strokeStyle = '#0d4f6e';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * (index / (data.length - 1));
      const y = height - padding - ((point.value - minValue) / valueRange) * (height - 2 * padding);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#0d4f6e';
    data.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * (index / (data.length - 1));
      const y = height - padding - ((point.value - minValue) / valueRange) * (height - 2 * padding);
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';

    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (valueRange * (i / 5));
      const y = padding + (height - 2 * padding) * (i / 5);
      ctx.fillText(value.toFixed(1), padding - 8, y + 4);
    }

    // X-axis labels (time)
    ctx.textAlign = 'center';
    const timeLabels = data.length <= 6 ? data : [
      data[0],
      data[Math.floor(data.length / 4)],
      data[Math.floor(data.length / 2)],
      data[Math.floor(data.length * 3 / 4)],
      data[data.length - 1]
    ];

    timeLabels.forEach((point) => {
      const index = data.indexOf(point);
      const x = padding + (width - 2 * padding) * (index / (data.length - 1));
      const time = new Date(point.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      ctx.fillText(time, x, height - padding + 20);
    });

  }, [data]);

  return (
    <div className="flow-chart">
      <div className="chart-header">
        <h3>{title}</h3>
        <span className="chart-unit">{unit}</span>
      </div>
      <div className="chart-container">
        <canvas 
          ref={canvasRef}
          style={{ width: '100%', height: '250px' }}
        />
      </div>
    </div>
  );
};

export default FlowChart;

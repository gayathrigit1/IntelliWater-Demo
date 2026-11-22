import React from 'react';
import './ConsumptionChart.css';

// Canvas bar chart for hourly/daily water consumption (litres)
const ConsumptionChart = ({ data, title, unit = 'L', color = '#1a8fb5', labelEvery = 1, badge }) => {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const width = rect.width;
      const height = rect.height;
      const padding = { top: 20, right: 16, bottom: 36, left: 48 };
      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      const maxValue = Math.max(...data.map(d => d.value), 1);
      const niceMax = Math.ceil(maxValue / 5) * 5 || 5;

      ctx.strokeStyle = '#e6ebf0';
      ctx.fillStyle = '#6b7c8f';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + plotHeight * (i / 4);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText((niceMax * (1 - i / 4)).toFixed(0), padding.left - 8, y + 4);
      }

      const slot = plotWidth / data.length;
      const barWidth = Math.max(2, slot * 0.7);
      ctx.textAlign = 'center';

      // Skip labels so they never overlap on narrow screens
      const labelWidth = Math.max(...data.map(d => ctx.measureText(d.label).width), 0) + 8;
      const step = Math.max(labelEvery, Math.ceil(labelWidth / slot));
      const lastIndex = data.length - 1;

      data.forEach((point, index) => {
        const barHeight = (point.value / niceMax) * plotHeight;
        const x = padding.left + slot * index + (slot - barWidth) / 2;
        const y = padding.top + plotHeight - barHeight;

        ctx.fillStyle = index === data.length - 1 ? '#0d4f6e' : color;
        ctx.fillRect(x, y, barWidth, barHeight);

        const isLast = index === lastIndex;
        const fitsBeforeLast = (lastIndex - index) * slot >= labelWidth;
        if (isLast || (index % step === 0 && fitsBeforeLast)) {
          const half = ctx.measureText(point.label).width / 2;
          const labelX = Math.min(Math.max(x + barWidth / 2, half), width - half);
          ctx.fillStyle = '#6b7c8f';
          ctx.fillText(point.label, labelX, height - padding.bottom + 16);
        }
      });
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [data, color, labelEvery]);

  const total = (data || []).reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="consumption-chart">
      <div className="consumption-chart-header">
        <div>
          <h3>{title}</h3>
          <span className="consumption-chart-total">
            Total: {total.toFixed(1)} {unit}
          </span>
        </div>
        {badge}
      </div>
      <canvas ref={canvasRef} className="consumption-chart-canvas" />
    </div>
  );
};

export default ConsumptionChart;

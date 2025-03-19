const config = require('./config.js');
const os = require('os');

function makeMetricObj(name, unit, type, value, attributes) {
    attributes = { ...attributes, source: config.metrics.source };
    let obj = {
        name: name,
        unit: unit,
        [type]: {
            dataPoints: [
                {
                    asInt: value,
                    timeUnixNano: Date.now() * 1000000,
                    attributes: []
                }
            ],
        }
    }
    if (type == "sum") {
        obj.sum.aggregationTemporality= 'AGGREGATION_TEMPORALITY_CUMULATIVE';
        obj.sum.isMonotonic= true;
    }
    Object.keys(attributes).forEach((key) => {
        obj[type].dataPoints[0].attributes.push({
            key: key,
            value: { stringValue: attributes[key] },
        });
    });
    return obj
}
const requests = {};
function requestTracker(req, res, next) {
    const method = req.method;
    requests[method] = (requests[method] || 0) + 1;
    next();
}

function sendHttp() {
    Object.keys(requests).forEach((method) => {
        sendMetricToGrafana('requests', requests[method], { method });
    });
}

function getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
}

function sendSys() {
    sendMetricToGrafana('cpu', getCpuUsagePercentage, {});
}

// This will periodically send metrics to Grafana
const timer = setInterval(() => {
    sendHttp();
    sendSys();
}, 10000);

function sendMetricToGrafana(metricName, metricValue, attributes) {
  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: '1',
                sum: {
                  dataPoints: [
                    {
                      asInt: metricValue,
                      timeUnixNano: Date.now() * 1000000,
                      attributes: [],
                    },
                  ],
                  aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                  isMonotonic: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        console.error('Failed to push metrics data to Grafana');
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = { requestTracker };
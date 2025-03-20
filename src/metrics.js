const config = require('./config.js');
const os = require('os');

function makeMetricObj(name, unit, type, value, attributes= {}) {
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
const users = new Set();
function requestTracker(req, res, next) {
    const method = req.method;
    requests[method] = (requests[method] || 0) + 1;
    if (req.path == "/api/auth") {
        if (method == "POST" || method == "PUT") {
            const ogJson = res.json
            res.json = function (body) {
                if (body.token) {
                    users.add(body.token)
                }
                ogJson.call(this, body); // Send response as usual
            };
            users.add(res.token);
        }
        if (method == "DELETE") {
            users.delete(req.headers.authorization.split()[1]);
        }
    }
    next();
}

function httpMetrics(metricArray) {
    Object.keys(requests).forEach((method) => {
        metricArray.push(makeMetricObj('requests','1','sum',requests[method],{ method }))
    });
}

function getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return Math.round(cpuUsage * 100);
}

function getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return Math.round(memoryUsage);
}

function sysMetrics(metricArray) {
    metricArray.push(makeMetricObj('cpu', '%', 'gauge', getCpuUsagePercentage()));
    metricArray.push(makeMetricObj('memory', '%', 'gauge', getMemoryUsagePercentage()));
}

function userMetrics(metricArray) {
    metricArray.push(makeMetricObj('users','1','sum',users.size));
}

// This will periodically send metrics to Grafana
const timer = setInterval(() => {
    const metricArray = [];
    httpMetrics(metricArray);
    sysMetrics(metricArray);
    userMetrics(metricArray);
    sendMetricToGrafana(metricArray);
}, 10000);

function sendMetricToGrafana(metricArray) {
  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: metricArray
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
        console.log(`Pushed ${metricArray.length} metrics successfully`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = { requestTracker };
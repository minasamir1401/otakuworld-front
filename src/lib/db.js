const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const BACKEND_SECRET = process.env.BACKEND_SECRET || 'otakuworld-secret-2025';

// Recursive reviver for Date strings in JSON query results
function reviveDates(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    if (isoDateRegex.test(obj)) {
      return new Date(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(reviveDates);
  }
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = reviveDates(obj[key]);
      }
    }
  }
  return obj;
}

const makeQuery = async (model, method, args) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/db-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BACKEND_SECRET}`
      },
      body: JSON.stringify({ model, method, args }),
      // Keep-alive connection to prevent overhead on frequent queries
      keepalive: true
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `HTTP error ${res.status}`);
    }
    const data = await res.json();
    return reviveDates(data);
  } catch (error) {
    console.error(`[DB Proxy Error] Failed query: ${model}.${method}:`, error.message);
    throw error;
  }
};

const createModelProxy = (model) => {
  return new Proxy({}, {
    get(target, prop) {
      return (...args) => makeQuery(model, prop, args);
    }
  });
};

const prisma = new Proxy({}, {
  get(target, prop) {
    return createModelProxy(prop);
  }
});

export default prisma;

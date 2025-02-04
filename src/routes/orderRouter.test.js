const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(registerRes.body.token === loginRes.body.token);
  testUserAuthToken = registerRes.body.token;
});

test('get menu', async () => {
    const menuRes = await request(app).get('/api/order/menu');
    expect(menuRes.status).toBe(200);
    expect(menuRes.body).not.toBeNull();
});

test('make order', async () => {
    const req = {"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}
    const orderRes = await request(app).post('/api/order').set("Authorization", `Bearer ${testUserAuthToken}`).send(req);
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.order).toMatchObject(req);
    expect(orderRes.body.jwt).not.toBeNull();
});
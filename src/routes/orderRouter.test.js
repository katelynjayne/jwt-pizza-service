const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken, testUserIdNum;

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
}

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

beforeAll(async () => {
  testUser.email = randomName() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserIdNum = registerRes.body.user.id;
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

test('get orders', async () => {
    const getRes = await request(app).get('/api/order').set("Authorization", `Bearer ${testUserAuthToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.dinerId).toBe(testUserIdNum);
});

test('add menu unauthorized', async () => {
    const addRes = await request(app).put('/api/order/menu').set("Authorization", `Bearer ${testUserAuthToken}`);
    expect(addRes.status).toBe(403);
});

test('add menu authorized', async() => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({email: admin.email, password: admin.password});
    const menuItem = { "title":`${randomName()}`, "description": "test pizza", "image":"pizza.png", "price": 0.0001 };
    const addRes = await request(app).put('/api/order/menu').set("Authorization", `Bearer ${loginRes.body.token}`).send(menuItem);
    expect(addRes.status).toBe(200);
    expect(addRes.body[addRes.body.length-1]).toMatchObject(menuItem);
})
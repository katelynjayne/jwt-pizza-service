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
    const loginRes = await request(app).put('/api/auth').send({email: user.email, password: "toomanysecrets"});
    return loginRes.body.token;
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
    const adminToken = await createAdminUser();
    const new_franchise = {"name": `${randomName()}`, "admins": [{"email": testUser.email}]};
    const createFranRes = await request(app).post('/api/franchise').set("Authorization", `Bearer ${adminToken}`).send(new_franchise);
    const createStoreRes = await request(app).post(`/api/franchise/${createFranRes.body.id}/store`).set("Authorization", `Bearer ${adminToken}`).send({"franchiseId": createFranRes.body.id, "name":"test"});
    const menuItem = { "title":`${randomName()}`, "description": "test pizza", "image":"pizza.png", "price": 0.0001 };
    const createMenuRes = await request(app).put('/api/order/menu').set("Authorization", `Bearer ${adminToken}`).send(menuItem);
    const req = {"franchiseId": createFranRes.body.id, "storeId":createStoreRes.body.id, "items":[{ "menuId": createMenuRes.body[createMenuRes.body.length-1].id, "description": "test pizza", "price": 0.0001 }]};
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
    const adminToken = await createAdminUser();
    const menuItem = { "title":`${randomName()}`, "description": "test pizza", "image":"pizza.png", "price": 0.0001 };
    const addRes = await request(app).put('/api/order/menu').set("Authorization", `Bearer ${adminToken}`).send(menuItem);
    expect(addRes.status).toBe(200);
    expect(addRes.body[addRes.body.length-1]).toMatchObject(menuItem);
})
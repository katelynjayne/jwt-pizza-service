const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
    user = await DB.addUser(user);
    const loginRes = await request(app).put('/api/auth').send({email: user.email, password: 'toomanysecrets'});
    return { ...user, password: 'toomanysecrets', token: loginRes.body.token };
}

async function createFranchisee(adminToken) {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Diner }] };
    user.name = randomName();
    user.email = user.name + '@franchisee.com';
    user = await DB.addUser(user);
    const new_franchise = {"name": `${randomName()}`, "admins": [{"email": user.email}]};
    const createRes = await request(app).post('/api/franchise').set("Authorization", `Bearer ${adminToken}`).send(new_franchise);
    const loginRes = await request(app).put('/api/auth').send({email: user.email, password: 'toomanysecrets'});
    return { ...user, password: 'toomanysecrets', token: loginRes.body.token, franchiseId: createRes.body.id };
}

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

let admin, franchisee;

beforeAll(async () => {
    admin = await createAdminUser();
    franchisee = await createFranchisee(admin.token);
});

test('get franchises', async () => {
    const getRes = await request(app).get('/api/franchise');
    expect(getRes.status).toBe(200);
    expect(getRes.body.length).not.toBe(0);
});

test('get user franchises', async () => {
    const getRes = await request(app).get(`/api/franchise/${franchisee.id}`).set("Authorization", `Bearer ${franchisee.token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.length).toBe(1);
});

test('create franchise authorized', async () => {
    const new_franchise = {"name": `${randomName()}`, "admins": [{"email": franchisee.email}]};
    const createRes = await request(app).post('/api/franchise').set("Authorization", `Bearer ${admin.token}`).send(new_franchise);
    expect(createRes.status).toBe(200);
    expect(createRes.body).toMatchObject(new_franchise);
});

test('create franchise unauthorized', async () => {
    const new_franchise = {"name": "irrelevant", "admins": [{"email": franchisee.email}]};
    const createRes = await request(app).post('/api/franchise').set("Authorization", `Bearer ${franchisee.token}`).send(new_franchise);
    expect(createRes.status).toBe(403);
});

// test('delete franchise', async () => {
//     const new_franchise = {"name": `${randomName()}`, "admins": [{"email": franchisee.email}]};
//     const createRes = await request(app).post('/api/franchise').set("Authorization", `Bearer ${admin.token}`).send(new_franchise);
//     console.log(createRes.body)
//     const deleteRes = await request(app).delete(`/api/franchise/${createRes.body.id}`);
//     expect(deleteRes.status).toBe(200);
//     const getRes = await request(app).get('/api/franchise');
//     console.log(getRes.body)
//     expect(getRes.body).not.toContain({ ...new_franchise, id: createRes.body.id, stores: []});
// });

test('create store', async () => {
    const new_franchise = {"name": `${randomName()}`, "admins": [{"email": franchisee.email}]};
    const createFranRes = await request(app).post('/api/franchise').set("Authorization", `Bearer ${admin.token}`).send(new_franchise);
    const createStoreRes = await request(app).post(`/api/franchise/${createFranRes.body.id}/store`).set("Authorization", `Bearer ${admin.token}`).send({"franchiseId": createFranRes.body.id, "name":"test"});
    expect(createStoreRes.status).toBe(200);
    expect(createStoreRes.body.id).toBeGreaterThan(0);
});

test('delete store', async () => {
    const new_franchise = {"name": `${randomName()}`, "admins": [{"email": franchisee.email}]};
    const createFranRes = await request(app).post('/api/franchise').set("Authorization", `Bearer ${admin.token}`).send(new_franchise);
    const createStoreRes = await request(app).post(`/api/franchise/${createFranRes.body.id}/store`).set("Authorization", `Bearer ${admin.token}`).send({"franchiseId": createFranRes.body.id, "name":"test"});
    const delRes = await request(app).delete(`/api/franchise/${createFranRes.body.id}/store/${createStoreRes.body.id}`).set("Authorization", `Bearer ${admin.token}`);
    expect(delRes.status).toBe(200);
    const getRes = await request(app).get('/api/franchise');
    expect(getRes.body).toContainEqual({"id":createFranRes.body.id, "name":new_franchise.name, "stores":[]});
});
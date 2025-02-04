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
    expect(getRes.body).not.toBe(0);
});

test('get user franchises', async () => {

});

test('create franchise authorized', async () => {
    const new_franchise = {"name": `${randomName()}`, "admins": [{"email": franchisee.email}]};
    const createRes = await request(app).post('/api/franchise').set("Authorization", `Bearer ${admin.token}`).send(new_franchise);
    expect(createRes.status).toBe(200);
    expect(createRes.body).toMatchObject(new_franchise);
});

test('create franchise unauthorized', async () => {
    const new_franchise = {"name": `${randomName()}`, "admins": [{"email": franchisee.email}]};
    const createRes = await request(app).post('/api/franchise').set("Authorization", `Bearer ${franchisee.token}`).send(new_franchise);
    expect(createRes.status).toBe(403);
});

test('delete franchise', async () => {

});

test('create store', async () => {

});

test('delete store', async () => {

});
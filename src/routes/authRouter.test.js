const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken, testUserIdNum;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserIdNum = registerRes.body.user.id;
});

test('register', async () => {
    const user = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    user.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const regRes = await request(app).post('/api/auth').send(user);
    expect(regRes.status).toBe(200);
});

test('register without password', async () => {
    const user = { name: 'pizza diner', email: 'reg@test.com' };
    const regRes = await request(app).post('/api/auth').send(user);
    expect(regRes.status).toBe(400);
});
  

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  // eslint-disable-next-line no-unused-vars
  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
});

test('update', async () => {
  const newUser = {email: "newemail@test.com", password: testUser.password};
  const updateRes = await request(app).put(`/api/auth/${testUserIdNum}`).set("Authorization", `Bearer ${testUserAuthToken}`).send(newUser);
  expect(updateRes.status).toBe(200);
  expect(updateRes.body.email).toBe(newUser.email);
});

test('update unauthorized', async () => {
  const newUser = {email: "newemail@test.com", password: testUser.password};
  const updateRes = await request(app).put(`/api/auth/${testUserIdNum+1}`).set("Authorization", `Bearer ${testUserAuthToken}`).send(newUser);
  expect(updateRes.status).toBe(403);
  expect(updateRes.body.message).toBe("unauthorized");
});

test('logout', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes).not.toBeNull();
  const logoutRes = await request(app).delete('/api/auth').set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});
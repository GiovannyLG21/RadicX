import request from 'supertest'
import { authenticate, onFail } from '.'

describe('Roles API', () => {
    let req: ReturnType<typeof request.agent>

    beforeAll(async () => {
        req = await authenticate()          
    })

    describe('GET /roles', () => {
        test('Get /roles should return 200', async () => {
            const res = await req
                .get('/api/roles')
            onFail(res)
            expect(res.status).toBe(200)
        })
    })

    describe('GET /roles/:id', () => {
        test('Get /roles/1 should return 200', async () => {
            const res = await req
                .get('/api/roles/1')
            onFail(res)
            expect(res.status).toBe(200)
            expect(res.body).toHaveProperty('data')
        })

        test('Get /roles/1000 should return 404', async () => {
            const res = await req
                .get('/api/roles/1000')
            onFail(res)
            expect(res.status).toBe(404)
        })
    })

    let newRoleId = 0
    describe('POST /roles', () => {
        it('Post /roles should create a role', async () => {
            const res = await req
                .post('/api/roles')
                .send({ name: 'Role prueba' })
            if (res.status == 200) newRoleId = res.body.data.id
            onFail(res)
            expect(res.status).toBe(200)
        })

        it('Post /roles existing role should return 409', async () => {
            const res = await req
                .post('/api/roles')
                .send({ name: 'Role prueba' })
            onFail(res)
            expect(res.status).toBe(409)
        })
    })

    describe('PUT /roles', () => {
        test(`Put /roles/:id should update a role`, async () => {
            const res = await req
                .put(`/api/roles/${newRoleId}`)
                .send({ name: 'Rol actualizado' })
            onFail(res)
            expect(res.status).toBe(200)
        })

        test(`Put /roles/1000 should return 404`, async () => {
            const res = await req
                .put(`/api/roles/1000`)
                .send({ name: 'Rol actualizado' })
            onFail(res)
            expect(res.status).toBe(404)
        })

        test(`Put existing /roles/${newRoleId} should return 409`, async () => {
            const res = await req
                .put(`/api/roles/${newRoleId}`)
                .send({ name: 'Usuario' })
            onFail(res)
            expect(res.status).toBe(409)
        })
    })

    describe('DELETE /role', () => {
        test(`Delete /roles/${newRoleId} should delete a role`, async () => {
            const res = await req
                .delete(`/api/roles/${newRoleId}`)
            onFail(res)
            expect(res.status).toBe(200)
        })

        test(`Delete /roles/1000 should return 404`, async () => {
            const res = await req
                .delete(`/api/roles/1000`)
            onFail(res)
            expect(res.status).toBe(404)
        })
    })
})

import request from 'supertest'
import { onFail } from '.'
import app from '@/app'

describe('EPS API', () => {

    describe('GET /eps', () => {
        test('Get /eps should return 200', async () => {
            const res = await request(app)
                .get('/api/eps')
            onFail(res)
            expect(res.status).toBe(200)
        })
    })

    describe('GET /eps/:code', () => {
        test('Get /eps/EPS001 should return 200', async () => {
            const res = await request(app)
                .get('/api/eps/EPS001')
            onFail(res)
            expect(res.status).toBe(200)
            expect(res.body).toHaveProperty('data')
        })

        test('Get /eps/1000 should return 404', async () => {
            const res = await request(app)
                .get('/api/eps/1000')
            expect(res.status).toBe(404)
        })
    })

    const newepsCode = 'EPS002'
    describe('POST /eps', () => {
        test('Post /eps should create a eps', async () => {
            const res = await request(app)
                .post('/api/eps')
                .send({ name: 'EPS Nueva S.A', code: 'EPS002' })
            onFail(res)
            expect(res.status).toBe(200)
        })

        test('Post /eps existing eps should return 409', async () => {
            const res = await request(app)
                .post('/api/eps')
                .send({ name: 'EPS Nueva S.A', code: 'EPS002' })
            onFail(res)
            expect(res.status).toBe(409)
        })
    })

    describe('PUT /eps', () => {
        test(`Put /eps/:code should update a eps`, async () => {
            const res = await request(app)
                .put(`/api/eps/${newepsCode}`)
                .send({ name: 'EPS Actualizada', code: 'EPS003' })
            onFail(res)
            expect(res.status).toBe(200)
        })

        test(`Put /eps/1000 should return 404`, async () => {
            const res = await request(app)
                .put(`/api/eps/1000`)
                .send({ name: 'EPS Actualizada', code: 'EPS003' })
            onFail(res)
            expect(res.status).toBe(404)
        })

        test(`Put existing /eps/EPS003 should return 409`, async () => {
            const res = await request(app)
                .put(`/api/eps/EPS003`)
                .send({ name: 'EPS Actualizada', code: 'EPS001' })
            onFail(res)
            expect(res.status).toBe(409)
        })
    })
})

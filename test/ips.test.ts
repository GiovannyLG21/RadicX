import request from 'supertest'
import { onFail } from '.'
import app from '@/app'

describe('IPS API', () => {

    describe('GET /ips', () => {
        test('Get /ips should return 200', async () => {
            const res = await request(app)
                .get('/api/ips')
            onFail(res)
            expect(res.status).toBe(200)
        })
    })

    describe('GET /ips/:code', () => {
        test('Get /ips/901011395 should return 200', async () => {
            const res = await request(app)
                .get('/api/ips/901011395')
            onFail(res)
            expect(res.status).toBe(200)
            expect(res.body).toHaveProperty('data')
        })

        test('Get /ips/1000 should return 404', async () => {
            const res = await request(app)
                .get('/api/ips/1000')            
            expect(res.status).toBe(404)
        })
    })

    let newIPSCode = '010101010'
    describe('POST /ips', () => {
        test('Post /ips should create a ips', async () => {
            const res = await request(app)
                .post('/api/ips')
                .send({ name: 'IPS Prueba', code: '010101010' })            
            onFail(res)
            expect(res.status).toBe(200)
        })

        test('Post /ips existing ips should return 409', async () => {
            const res = await request(app)
                .post('/api/ips')
                .send({ name: 'IPS Prueba', code: '010101010' })
            onFail(res)
            expect(res.status).toBe(409)
        })
    })

    describe('PUT /ips', () => {
        test(`Put /ips/:code should update a ips`, async () => {
            const res = await request(app)
                .put(`/api/ips/${newIPSCode}`)
                .send({ name: 'IPS Actualizada', code: '111111111' })
            onFail(res)
            expect(res.status).toBe(200)
        })

        test(`Put /ips/1000 should return 404`, async () => {
            const res = await request(app)
                .put(`/api/ips/1000`)
                .send({ name: 'IPS Actualizada', code: '111111111' })
            onFail(res)
            expect(res.status).toBe(404)
        })

        test(`Put existing /ips/111111111 should return 409`, async () => {
            const res = await request(app)
                .put(`/api/ips/111111111`)
                .send({ name: 'Horisoes IPS', code: '111111111' })
            onFail(res)
            expect(res.status).toBe(409)
        })
    })
})

/* eslint-disable @typescript-eslint/no-explicit-any */
import request, { Response } from 'supertest'
import app from '../src/app'
export type TestRequest = ReturnType<typeof request.agent>

// Aux
export const authenticate = async () => {
    const req = request.agent(app)
    await req
        .post('/api/auth/login')
        .send({ username: 'admin@test', password: '1234567890' })
    return req
}

export const onFail = (res: Response) => {
    if (res.status != 200) console.log(res.body)
}


// Tests
export const getTest = async (endpoint: string, req: TestRequest) => {
    test(`Get /${endpoint} should return 200`, async () => {
        const res = await req
            .get(`/api/${endpoint}`)
        onFail(res)
        expect(res.status).toBe(200)
    })
}

export const getOneTest = async (endpoint: string, req: TestRequest) => {
    test(`Get /${endpoint}/1 should return 200`, async () => {
        const res = await req
            .get(`/api/${endpoint}/1`)
        onFail(res)
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('data')
    })

    test(`Get /${endpoint}/1000 should return 404`, async () => {
        const res = await req
            .get(`/api/${endpoint}/1000`)
        onFail(res)
        expect(res.status).toBe(404)
    })
}

export const postTest = async (endpoint: string, req: TestRequest, body: Record<string, any>) => {
    let newRecordId = 0
    it(`Post /${endpoint} should create a role`, async () => {
        const res = await req
            .post(`/api/${endpoint}`)
            .send(body)
        if (res.status == 200) newRecordId = res.body.data.id
        onFail(res)
        expect(res.status).toBe(200)
    })

    it(`Post /${endpoint} existing role should return 409`, async () => {
        const res = await req
            .post(`/api/${endpoint}`)
            .send(body)
        onFail(res)
        expect(res.status).toBe(409)
    })

    return newRecordId
}

export const putTest = async (endpoint: string, req: TestRequest, body: Record<string, any>, id: number) => {
    test(`Put /${endpoint}/:id should update a role`, async () => {
        const res = await req
            .put(`/api/${endpoint}/${id}`)
            .send(body)
        onFail(res)
        expect(res.status).toBe(200)
    })

    test(`Put /${endpoint}/1000 should return 404`, async () => {
        const res = await req
            .put(`/api/${endpoint}/1000`)
            .send(body)
        onFail(res)
        expect(res.status).toBe(404)
    })

    test(`Put existing /${endpoint}/${id} should return 409`, async () => {
        const res = await req
            .put(`/api/${endpoint}/${id}`)
            .send(body)
        onFail(res)
        expect(res.status).toBe(409)
    })
}

export const deleteTest = async (endpoint: string, req: TestRequest, id: number) => {
    test(`Delete /${endpoint}/${id} should delete a role`, async () => {
        const res = await req
            .delete(`/api/${endpoint}/${id}`)
        onFail(res)
        expect(res.status).toBe(200)
    })

    test(`Delete /${endpoint}/1000 should return 404`, async () => {
        const res = await req
            .delete(`/api/${endpoint}/1000`)
        onFail(res)
        expect(res.status).toBe(404)
    })
}
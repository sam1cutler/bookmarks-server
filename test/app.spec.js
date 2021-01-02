const app = require('../src/app');

describe ('App', () => {
    it('GET / responds with 200 and message', () => {
        return supertest(app)
            .get('/')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200, 'Howdy, pardner.')
    })
})

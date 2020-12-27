const app = require('../src/app');

describe ('App', () => {
    it('GET / responds with 200 and message', () => {
        return supertest(app)
            .get('/')
            .expect(200, 'Hello, you!')
    })
})
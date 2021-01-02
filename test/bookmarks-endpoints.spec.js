const { expect } = require('chai');
const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks.fixtures');

describe('Bookmarks Endpoints', function() {

    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('db', db);
    })

    after('disconnect from database', () => db.destroy() );

    before('clean the table', () => db('bookmarks').truncate() );

    afterEach('cleanup', () => db('bookmarks').truncate() );

    describe('GET /bookmarks', () => {
        context('Given bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('endpoint responds with 200 and all the bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks);
            });
        });

        context('Given NO bookmarks in the database', () => {
            it('Endpoint responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            });
        })
    });

    describe('GET /bookmarks/:bookmarkId endpoint', () => {
        context('Given bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('endpoint responds with 200 and the requested bookmark', () => {
                const bookmarkId = 2;
                const expectedBookmark = testBookmarks[bookmarkId - 1];
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark);
            });
        });
        context('Given no bookmarks in the database', () => {
            it('responds with 404 and error message', () => {
                //const bookmarkId = 35;
                return supertest(app)
                    .get(`/bookmarks/35`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: 'Bookmark not found.' } } );
            });
        });
    });

});
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
                const bookmarkId = 35;
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: 'Bookmark not found.' } } );
            });
        });
        context(`Given an XSS attack bookmark`, () => {
            const maliciousBookmark = {
                id: 666,
                title: 'Bad news bears <script>alert("xss");</script>',
                url: 'http://bad.news.bears',
                description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
                rating: 4
            }

            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert( [maliciousBookmark] )
            })

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(`Bad news bears &lt;script&gt;alert("xss");&lt;/script&gt;`)
                        expect(res.body.description).to.eql(`Bad image <img src=\"https://url.to.file.which/does-not.exist\">. But not <strong>all</strong> bad.`)
                    })
            })
        })
    });

    describe('POST /bookmarks', () => {
        it(`creates a book, responding with 201 and the new bookmark`, function() {
            const newBookmark = {
                id: 511,
                title: 'New bookmark title',
                url: 'http://www.new-site.biz',
                description: `Stupid nonsense that doesn't need to exist`,
                rating: 2
            }
            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(res => {
                    console.log(res.body)
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`bookmarks/${res.body.id}`)
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/bookmarks/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body)
                )
        })
    })

});
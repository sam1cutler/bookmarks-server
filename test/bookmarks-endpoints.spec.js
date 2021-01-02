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

    describe('GET /api/bookmarks', () => {
        context('Given bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('endpoint responds with 200 and all the bookmarks', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks);
            });
        });

        context('Given NO bookmarks in the database', () => {
            it('Endpoint responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            });
        })
    });

    describe('GET /api/bookmarks/:bookmarkId endpoint', () => {
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
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark);
            });
        });
        context('Given no bookmarks in the database', () => {
            it('responds with 404 and error message', () => {
                const bookmarkId = 350;
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
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
                    .get(`/api/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(`Bad news bears &lt;script&gt;alert("xss");&lt;/script&gt;`)
                        expect(res.body.description).to.eql(`Bad image <img src=\"https://url.to.file.which/does-not.exist\">. But not <strong>all</strong> bad.`)
                    })
            })
        })
    });

    describe('POST /api/bookmarks', () => {
        it(`creates a book, responding with 201 and the new bookmark`, function() {
            const newBookmark = {
                id: 511,
                title: 'New bookmark title',
                url: 'http://www.new-site.biz',
                description: `Miscellaneous sundries`,
                rating: 2
            }
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(res => {
                    console.log(res.body)
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/api/bookmarks/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body)
                )
        })

        //Test for missing pieces of POSTed bookmarks
        const requiredFields = [ 'title', 'url', 'rating' ];
        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'Test new title',
                url: 'http://www.testtest123.com',
                rating: 5
            }
            it(`responds with 400 and error message when lacking the ${field} component`, () => {
                delete newBookmark[field]

                return supertest(app)
                    .post('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `'${field}' is required in request body.` }
                    })
            })
        })
    })

    describe(`DELETE /api/bookmarks/:bookmarkId`, () => {
        context('Given there are articles in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('responds with 204 and removes the bookmark', () => {
                const idToRemove = 2;
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get('/api/bookmarks')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks))
            })
        })
        
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const bookmarkId = 12345
                return supertest(app)
                    .delete(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: 'Bookmark not found.' } } )
            })
        })
    })

    describe(`PATCH /api/bookmarks/:bookmarkId`, () => {
        context(`Given no bookmarks`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 12345;
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: 'Bookmark not found.' } } )
            })
        })

        context('Given there are articles in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('responds with 204 and updates the bookmark', () => {
                const idToUpdate = 2;
                const updatedBookmarkContent = {
                    title: 'Updated bookmark title',
                    url: 'http://www.updated-site.com',
                    description: 'Updated description',
                    rating: 3
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updatedBookmarkContent
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updatedBookmarkContent)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    )
            })
            it('responds with 204 and updates the bookmark when updating only a subset of fields', () => {
                const idToUpdate = 2;
                const updatedBookmarkContent = {
                    title: 'Updated bookmark title'
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updatedBookmarkContent
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({
                        ...updatedBookmarkContent,
                        fieldToIgnore: 'should not see this in GET response'
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    )
            })

            it(`responds with 400 when no required fields are supplied`, () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send( { irrelevantField: 'foo' } )
                    .expect(400, {
                        error: { message: `Request body must contain at least one of 'title, 'url', or 'rating'.`}
                    })
            })
        })
    })

});
const express = require('express');
// const { v4: uuid } = require('uuid');
const logger = require('../logger');
const xss = require('xss');
const BookmarksService = require('./bookmarks-service');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: xss(bookmark.url),
    description: xss(bookmark.description),
    rating: bookmark.rating,
})

bookmarksRouter
    .route('/')
    .get( (req, res, next) => {      
        const knexInstance = req.app.get('db');
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks.map(serializeBookmark))
            })
            .catch(next);
    })
    .post(bodyParser, (req, res, next) => {
        const { title, url, description, rating } = req.body;
        const newBookmark = { title, url, description, rating }

        // Confirm required fields are present
        for (const [key, value] of Object.entries(newBookmark)) {
            if (value === null) {
                logger.error(`'${value}' is required.`);
                return res
                    .status(400)
                    .json({
                        error: { message: `'${value}' is required in request body.` }
                    })
            }
        }

        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
                logger.info(`Bookmark with id ${bookmark.id} was created.`);
                res
                    .status(201)
                    .location(`bookmarks/${bookmark.id}`)
                    .json(serializeBookmark(bookmark))
            })
    });

bookmarksRouter
    .route('/:bookmarkId')
    .all( (req, res, next) => {
        const { bookmarkId } = req.params
        const knexInstance = req.app.get('db');

        BookmarksService.getById(knexInstance, bookmarkId)
            .then(bookmark => {
                if (!bookmark) {
                    logger.error(`Could not find a bookmark with the id '${bookmarkId}'.`)
                    return res
                        .status(404)
                        .json({
                            error: { message: `Bookmark not found.` }
                        })
                }
                res.bookmark = bookmark
                next()
            })
            .catch(next)
    })
    .get( (req, res, next) => {
        res.json(serializeBookmark(res.bookmark))
    })
    .delete( (req, res, next) => {
        BookmarksService.deleteBookmark(
            req.app.get('db'),
            req.params.bookmarkId
        )
            .then( () => {
                logger.info(`Bookmark with id '${req.params.bookmarkId}' deleted.`);
                res.status(204).end()
            })
            .catch(next)
    });

module.exports = bookmarksRouter;

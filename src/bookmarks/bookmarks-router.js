const path = require('path');
const express = require('express');
// const { v4: uuid } = require('uuid');
const { isWebUri } = require('valid-url');
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
    rating: Number(bookmark.rating),
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
        // Confirm required fields are present
        for (const field of ['title', 'url', 'rating']) {
            if (!req.body[field]) {
                logger.error(`'${field}' is required.`);
                return res
                    .status(400)
                    .json({
                        error: { message: `'${field}' is required in request body.` }
                    })
            }
        }

        // Check validity of rating and URL
        const { title, url, description, rating } = req.body;
        
        const ratingValue = Number(rating);

        if (!Number.isInteger(ratingValue) || ratingValue < 0 || ratingValue > 5) {
            logger.error(`Invalid rating of '${rating}' was submitted.`)
            return res.status(400).send({
                error: { message: `Rating must be an integer between 0 and 5.`}
            })
        }

        if (!isWebUri(url)) {
            logger.error(`Invalid url of '${url}' was provided.`);
            return res
                .status(400)
                .send({
                    error: { message: `'url' must be valid.`}
                })
        }
        
        const newBookmark = { title, url, description, rating }

        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
                logger.info(`Bookmark with id ${bookmark.id} was created.`);
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
                    .json(serializeBookmark(bookmark))
            })
            .catch(next)
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
    .get( (req, res) => {
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
    })
    .patch(bodyParser, (req, res, next) => {
        const { title, url, description, rating } = req.body;
        const bookmarkUpdatedContent = { title, url, description, rating };

        const numberOfValues = Object.values(bookmarkUpdatedContent).filter(Boolean).length;
        if (numberOfValues === 0) {
            return res
                .status(400)
                .json({
                    error: { message: `Request body must contain at least one of 'title, 'url', or 'rating'.`}
                })
        }

        BookmarksService.updateBookmark(
            req.app.get('db'),
            req.params.bookmarkId,
            bookmarkUpdatedContent
        )
            .then( () => {
                res.status(204).end()
            })
            .catch(next)
    });

module.exports = bookmarksRouter;

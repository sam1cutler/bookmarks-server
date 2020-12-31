const express = require('express');
const { v4: uuid } = require('uuid');
const logger = require('../logger');
const { bookmarksList } = require('../store');
const BookmarksService = require('../bookmarks-service');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
    .route('/bookmarks')
    
    .get( (req, res, next) => {
        //res.json(bookmarksList);
        
        const knexInstance = req.app.get('db');
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks)
            })
            .catch(next);
    })
    
    .post(bodyParser, (req, res) => {
        const { title, url, description, rating } = req.body;

        // Confirm required fields are present
        if (!title) {
            logger.error('Title is required.');
            return res
                .status(400)
                .send('Invalid submission.');
        }
        if (!url) {
            logger.error('URL is required.');
            return res
                .status(400)
                .send('Invalid submission.');
        }
        if (!rating) {
            logger.error('Rating is required.');
            return res
                .status(400)
                .send('Invalid submission.');
        }

        const id = uuid();

        const newBookmark = {
            id,
            title,
            url,
            description,
            rating
        };
        bookmarksList.push(newBookmark);

        logger.info(`Bookmark with id ${id} was created.`);

        res
            .status(201)
            .location(`http://localhost:8000/bookmarks/${id}`)
            .json(newBookmark);
    });

bookmarksRouter
    .route('/bookmarks/:bookmarkId')
    .get( (req, res) => {
        const { bookmarkId } = req.params;
        const bookmark = bookmarksList.find( bookmark => bookmark.id == bookmarkId )

        // Confirm bookmark exists
        if (!bookmark) {
            logger.error(`Could not find a bookmark with the id '${bookmarkId}'.`);
            return res
                .status(404)
                .send('Bookmark not found.')
        }

        res.json(bookmark);
    })
    .delete( (req, res) => {
        const { bookmarkId } = req.params;
        const bookmarkIndex = bookmarksList.findIndex( bookmark => bookmark.id == bookmarkId )

        // Confirm bookmark exists
        if (bookmarkIndex === -1) {
            logger.error(`Could not find a bookmark with the id '${bookmarkId}'.`);
            return res
                .status(404)
                .send('Bookmark not found.')
        }

        // remove bookmark from bookmarks list
        bookmarksList.splice(bookmarkIndex, 1);

        logger.info(`Bookmark with id '${bookmarkId}' deleted.`);

        res
            .status(204)
            .end();
    });

module.exports = bookmarksRouter;

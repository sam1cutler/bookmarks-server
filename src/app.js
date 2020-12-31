require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config');
const validateBearerToken = require('./validate-bearer-token');
const errorHandler = require('./error-handler');
const bookmarksRouter = require('./bookmarks/bookmarks-router');
const BookmarksService = require('./bookmarks-service');

const app = express();

const morganOption = (NODE_ENV === 'production')
    ? 'tiny'
    : 'dev' ;

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use(validateBearerToken);

app.get('/', (req, res) => {
    res.send('Howdy, pardner.');
})

/*
app.get('/bookmarks', (req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
        .then(bookmarks => {
            res.json(bookmarks)
        })
        .catch(next)
})
*/

app.use(bookmarksRouter);

app.use(errorHandler);

module.exports = app;
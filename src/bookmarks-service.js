const BookmarksService = {
    getAllBookmarks(knex) {
        console.log('Attempting something')
        return knex.select('*').from('bookmarks');
    },
};

module.exports = BookmarksService;
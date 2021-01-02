const BookmarksService = {
    
    getAllBookmarks(knex) {
        console.log('Attempting something')
        return knex.select('*').from('bookmarks');
    },

    insertBookmark(knex, newBookmark) {
        return knex
            .insert(newBookmark)
            .into('bookmarks')
            .returning('*')
            .then(rows => {
                return rows[0]
            })
    },

    getById(knex, id) {
        return knex
            .from('bookmarks')
            .select('*')
            .where('id', id)
            .first()
    },

    deleteBookmark(knex, id) {
        return knex
            .from('bookmarks')
            .where( {id} )
            .delete()
    },

    updateBookmark(knex, id, newBookMarkFields) {
        return knex
            .from('bookmarks')
            .where( {id} )
            .update(newBookMarkFields)
    },

};

module.exports = BookmarksService;
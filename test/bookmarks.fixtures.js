function makeBookmarksArray() {
    return [
        {
            id: 1,
            title: 'REI',
            url: 'https://www.rei.com/',
            description: 'stuffs',
            rating: 4,
        },
        {
            id: 2,
            title: 'EVO',
            url: 'https://www.evo.com/',
            description: 'other stuffs',
            rating: 4,
        },
        {
            id: 3,
            title: 'Weather near Crystal',
            url: 'https://forecast.weather.gov/MapClick.php?lat=46.92912043955674&lon=-121.50098133017309&site=sew&unit=0&lg=en&FcstType=text#.X9ZNf2RKg-Q',
            description: 'Weather near Crystal MT',
            rating: 4,
        },
    ]
}

module.exports = {
    makeBookmarksArray
}
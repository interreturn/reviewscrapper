import gplay from "google-play-scraper";

// This example will return 3000 reviews
// on a single call
gplay.reviews({
    appId: 'com.dxco.pandavszombies',
    sort: gplay.sort.RATING,
    num: 3000
}).then(console.log, console.log);

// This example will return the first page with 150 reviews paginated
// just send an empty nexPaginationToken
// you will receive a nextPaginationToken parameter in your response
gplay.reviews({
    appId: 'com.pazugames.avatarworld',
    sort: gplay.sort.NEWEST,
    paginate: true,
    nextPaginationToken: null // you can omit this parameter
}).then(console.log, console.log);

// This example will return 150 reviews paginated
// for the next page (next page is the token return by the previous call)
// you will receive a nextPaginationToken parameter in your response
gplay.reviews({
    appId: 'com.dxco.pandavszombies',
    sort: gplay.sort.RATING,
    paginate: true,
    nextPaginationToken: 'TOKEN_FROM_THE_PREVIOUS_REQUEST' // you can omit this parameter
}).then(console.log, console.log);
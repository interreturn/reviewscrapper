const gplay = require('google-play-scraper');
const fs = require('fs');

let allReviews = [];

async function fetchReviews() {
    let nextPaginationToken = undefined;

    for (let i = 0; i < 50; i++) {   // 50 x 100 = ~5000 reviews
        console.log(`Fetching page ${i + 1}...`);

        const result = await gplay.reviews({
            appId: 'com.pazugames.avatarworld',    // change to the actual app ID
            sort: 'newest',                        // fixed sort
            num: 100,
            paginate: true,
            nextPaginationToken
        });

        allReviews.push(...result.data);
        nextPaginationToken = result.nextPaginationToken;

        if (!nextPaginationToken) break;
    }

    const csvLines = allReviews.map(r =>
        `"${r.userName.replace(/"/g, '""')}","${r.score}","${r.text.replace(/"/g, '""')}","${r.date}"`
    );

    const header = 'user,score,text,date\n';
    fs.writeFileSync('pazu_reviews.csv', header + csvLines.join('\n'));

    console.log(`✅ Done! Saved ${allReviews.length} reviews to pazu_reviews.csv`);
}

fetchReviews().catch(console.error);

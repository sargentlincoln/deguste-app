const testFetch = async () => {
    try {
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': 'AIzaSyDp2ku5Z6MCTB_UB4z4U4Hgvav16nAojXc',
                'X-Goog-FieldMask': 'places.id,places.displayName,places.location'
            },
            body: JSON.stringify({
                textQuery: "restaurante em Taubate",
                languageCode: "pt-BR",
                maxResultCount: 2
            })
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
};
testFetch();
